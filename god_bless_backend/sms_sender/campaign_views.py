"""
SMS Campaign API Views
Comprehensive campaign management endpoints
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q, Count, Sum

from .models import SMSCampaign, SMSMessage
from .serializers import (
    SMSCampaignSerializer,
    SMSCampaignCreateSerializer,
    SMSMessageSerializer,
    CampaignStatsSerializer
)
from .tasks import process_sms_campaign_task, schedule_campaign_task
from .macro_processor import macro_processor, extract_macros, validate_template
from .campaign_templates import (
    get_all_templates,
    get_template_by_id,
    get_templates_by_category,
    get_all_categories,
    serialize_all_templates,
    AVAILABLE_MACROS
)
from .rate_limiter import rate_limiter


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def campaign_list_create(request):
    """
    GET: List all campaigns for the authenticated user
    POST: Create a new campaign
    """
    if request.method == 'GET':
        campaigns = SMSCampaign.objects.filter(user=request.user).order_by('-created_at')
        
        # Filter by status if provided
        status_filter = request.GET.get('status')
        if status_filter:
            campaigns = campaigns.filter(status=status_filter)
        
        # Filter by date range
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        if start_date:
            campaigns = campaigns.filter(created_at__gte=start_date)
        if end_date:
            campaigns = campaigns.filter(created_at__lte=end_date)
        
        serializer = SMSCampaignSerializer(campaigns, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = SMSCampaignCreateSerializer(data=request.data)
        if serializer.is_valid():
            campaign = serializer.save(user=request.user)
            
            # If scheduled, schedule the task
            if campaign.scheduled_time and campaign.scheduled_time > timezone.now():
                schedule_campaign_task.delay(campaign.id)
            
            return Response(
                SMSCampaignSerializer(campaign).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def campaign_detail(request, campaign_id):
    """
    GET: Retrieve campaign details
    PUT: Update campaign
    DELETE: Delete campaign
    """
    campaign = get_object_or_404(SMSCampaign, id=campaign_id, user=request.user)
    
    if request.method == 'GET':
        serializer = SMSCampaignSerializer(campaign)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        # Don't allow updates to campaigns that are in progress
        if campaign.status in ['in_progress', 'completed']:
            return Response(
                {'error': 'Cannot update campaign that is in progress or completed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = SMSCampaignCreateSerializer(campaign, data=request.data, partial=True)
        if serializer.is_valid():
            campaign = serializer.save()
            return Response(SMSCampaignSerializer(campaign).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        # Don't allow deletion of campaigns in progress
        if campaign.status == 'in_progress':
            return Response(
                {'error': 'Cannot delete campaign that is in progress'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        campaign.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def campaign_start(request, campaign_id):
    """Start a campaign"""
    campaign = get_object_or_404(SMSCampaign, id=campaign_id, user=request.user)
    
    if campaign.status not in ['draft', 'paused']:
        return Response(
            {'error': f'Cannot start campaign with status: {campaign.status}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if there are messages to send
    pending_messages = campaign.messages.filter(delivery_status='pending').count()
    if pending_messages == 0:
        return Response(
            {'error': 'No pending messages to send'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Start the campaign task
    task = process_sms_campaign_task.delay(campaign.id)
    campaign.celery_task_id = task.id
    campaign.status = 'in_progress'
    campaign.save()
    
    return Response({
        'message': 'Campaign started successfully',
        'task_id': task.id,
        'campaign_id': campaign.id
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def campaign_pause(request, campaign_id):
    """Pause a running campaign"""
    campaign = get_object_or_404(SMSCampaign, id=campaign_id, user=request.user)
    
    if campaign.status != 'in_progress':
        return Response(
            {'error': 'Campaign is not in progress'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    campaign.status = 'paused'
    campaign.save()
    
    return Response({'message': 'Campaign paused successfully'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def campaign_cancel(request, campaign_id):
    """Cancel a campaign"""
    campaign = get_object_or_404(SMSCampaign, id=campaign_id, user=request.user)
    
    if campaign.status not in ['in_progress', 'paused', 'scheduled']:
        return Response(
            {'error': f'Cannot cancel campaign with status: {campaign.status}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    campaign.status = 'cancelled'
    campaign.save()
    
    # Revoke the Celery task if it exists
    if campaign.celery_task_id:
        from celery import current_app
        current_app.control.revoke(campaign.celery_task_id, terminate=True)
    
    return Response({'message': 'Campaign cancelled successfully'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def campaign_stats(request, campaign_id):
    """Get campaign statistics"""
    campaign = get_object_or_404(SMSCampaign, id=campaign_id, user=request.user)
    
    stats = {
        'campaign_id': campaign.id,
        'campaign_name': campaign.name,
        'status': campaign.status,
        'progress': campaign.progress,
        'total_messages': campaign.messages.count(),
        'messages_sent': campaign.messages_sent,
        'messages_failed': campaign.messages_failed,
        'pending_messages': campaign.messages.filter(delivery_status='pending').count(),
        'created_at': campaign.created_at,
        'started_at': campaign.started_at,
        'completed_at': campaign.completed_at,
        'scheduled_time': campaign.scheduled_time,
    }
    
    # Message status breakdown
    status_breakdown = campaign.messages.values('delivery_status').annotate(
        count=Count('id')
    )
    stats['status_breakdown'] = {item['delivery_status']: item['count'] for item in status_breakdown}
    
    # Carrier breakdown
    carrier_breakdown = campaign.messages.values('carrier').annotate(
        count=Count('id')
    )
    stats['carrier_breakdown'] = {item['carrier']: item['count'] for item in carrier_breakdown if item['carrier']}
    
    return Response(stats)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def campaign_messages(request, campaign_id):
    """Get messages for a campaign"""
    campaign = get_object_or_404(SMSCampaign, id=campaign_id, user=request.user)
    
    messages = campaign.messages.all().order_by('-created_at')
    
    # Filter by delivery status
    status_filter = request.GET.get('status')
    if status_filter:
        messages = messages.filter(delivery_status=status_filter)
    
    # Pagination
    page = int(request.GET.get('page', 1))
    page_size = int(request.GET.get('page_size', 50))
    start = (page - 1) * page_size
    end = start + page_size
    
    total_count = messages.count()
    messages = messages[start:end]
    
    serializer = SMSMessageSerializer(messages, many=True)
    
    return Response({
        'count': total_count,
        'page': page,
        'page_size': page_size,
        'results': serializer.data
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def campaign_add_recipients(request, campaign_id):
    """Add recipients to a campaign"""
    campaign = get_object_or_404(SMSCampaign, id=campaign_id, user=request.user)
    
    if campaign.status not in ['draft', 'paused']:
        return Response(
            {'error': 'Can only add recipients to draft or paused campaigns'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    recipients = request.data.get('recipients', [])
    if not recipients:
        return Response(
            {'error': 'No recipients provided'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    created_count = 0
    errors = []
    
    for recipient in recipients:
        phone_number = recipient.get('phone_number')
        if not phone_number:
            errors.append({'error': 'Missing phone_number', 'recipient': recipient})
            continue
        
        # Process message with macros
        recipient_data = recipient.get('data', {})
        processed_message = macro_processor.process_message(
            campaign.message_template,
            campaign.custom_macros,
            recipient_data
        )
        
        # Create message
        SMSMessage.objects.create(
            campaign=campaign,
            phone_number=phone_number,
            carrier=recipient.get('carrier'),
            message_content=processed_message,
            recipient_data=recipient_data
        )
        created_count += 1
    
    return Response({
        'message': f'Added {created_count} recipients',
        'created_count': created_count,
        'errors': errors
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def process_message_template(request):
    """Process a message template with macros"""
    template = request.data.get('template', '')
    custom_data = request.data.get('custom_data', {})
    recipient_data = request.data.get('recipient_data', {})
    
    if not template:
        return Response(
            {'error': 'Template is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Process the template
    processed = macro_processor.process_message(template, custom_data, recipient_data)
    
    # Extract macros
    macros = extract_macros(template)
    
    # Validate template
    validation = validate_template(template, {**custom_data, **recipient_data})
    
    return Response({
        'original': template,
        'processed': processed,
        'macros_found': macros,
        'validation': validation
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_available_macros(request):
    """Get list of available macros"""
    return Response({
        'macros': AVAILABLE_MACROS,
        'sample_data': macro_processor._get_sample_data()
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_campaign_templates(request):
    """Get all campaign templates"""
    category = request.GET.get('category')
    
    if category:
        templates = get_templates_by_category(category)
    else:
        templates = get_all_templates()
    
    return Response({
        'templates': [
            {
                'id': t.id,
                'name': t.name,
                'category': t.category,
                'description': t.description,
                'message_template': t.message_template,
                'suggested_macros': t.suggested_macros,
                'use_case': t.use_case
            }
            for t in templates
        ],
        'categories': get_all_categories()
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_template_by_id_view(request, template_id):
    """Get a specific template by ID"""
    template = get_template_by_id(template_id)
    
    if not template:
        return Response(
            {'error': 'Template not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    return Response({
        'id': template.id,
        'name': template.name,
        'category': template.category,
        'description': template.description,
        'message_template': template.message_template,
        'suggested_macros': template.suggested_macros,
        'use_case': template.use_case
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_rate_limit_info(request):
    """Get rate limiting information for all carriers"""
    carrier = request.GET.get('carrier')
    
    if carrier:
        stats = rate_limiter.get_stats(carrier)
        return Response(stats)
    
    # Get info for all carriers
    from .rate_limiter import CARRIER_RATE_LIMITS, CARRIER_DELAYS
    
    return Response({
        'rate_limits': CARRIER_RATE_LIMITS,
        'delays': CARRIER_DELAYS,
        'carriers': list(CARRIER_RATE_LIMITS.keys())
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def test_rate_limit(request):
    """Test rate limiting for a specific carrier"""
    carrier = request.data.get('carrier', 'default')
    campaign_id = request.data.get('campaign_id')
    
    stats = rate_limiter.get_stats(carrier, campaign_id)
    
    return Response({
        'carrier': carrier,
        'can_send': stats['can_send'],
        'stats': stats
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def campaign_dashboard(request):
    """Get dashboard statistics for all campaigns"""
    campaigns = SMSCampaign.objects.filter(user=request.user)
    
    total_campaigns = campaigns.count()
    active_campaigns = campaigns.filter(status='in_progress').count()
    completed_campaigns = campaigns.filter(status='completed').count()
    
    # Total messages stats
    total_messages = SMSMessage.objects.filter(campaign__user=request.user).count()
    sent_messages = SMSMessage.objects.filter(
        campaign__user=request.user,
        delivery_status='sent'
    ).count()
    failed_messages = SMSMessage.objects.filter(
        campaign__user=request.user,
        delivery_status='failed'
    ).count()
    
    # Recent campaigns
    recent_campaigns = campaigns.order_by('-created_at')[:5]
    
    return Response({
        'total_campaigns': total_campaigns,
        'active_campaigns': active_campaigns,
        'completed_campaigns': completed_campaigns,
        'total_messages': total_messages,
        'sent_messages': sent_messages,
        'failed_messages': failed_messages,
        'success_rate': (sent_messages / total_messages * 100) if total_messages > 0 else 0,
        'recent_campaigns': SMSCampaignSerializer(recent_campaigns, many=True).data
    })
