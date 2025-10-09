"""
Campaign Template API Views
RESTful API for template management
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError

from ..models import CampaignTemplate, SMSCampaign
from ..template_service import CampaignTemplateService
from .serializers import CampaignTemplateSerializer, CampaignTemplateCreateSerializer


class CampaignTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for managing campaign templates"""
    
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get templates accessible to the user"""
        return CampaignTemplate.objects.filter(
            user=self.request.user
        ).order_by('-usage_count', '-created_at')
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action in ['create', 'update', 'partial_update']:
            return CampaignTemplateCreateSerializer
        return CampaignTemplateSerializer
    
    def perform_create(self, serializer):
        """Create template with current user"""
        serializer.save(user=self.request.user)
    
    def list(self, request):
        """List all available templates including built-in ones"""
        service = CampaignTemplateService(request.user)
        
        category = request.query_params.get('category')
        include_public = request.query_params.get('include_public', 'true').lower() == 'true'
        
        templates = service.get_available_templates(
            category=category,
            include_public=include_public
        )
        
        return Response({
            'count': len(templates),
            'results': templates
        })
    
    def retrieve(self, request, pk=None):
        """Get a specific template by ID"""
        service = CampaignTemplateService(request.user)
        template = service.get_template_by_id(pk)
        
        if not template:
            return Response(
                {'error': 'Template not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response(template)
    
    def create(self, request):
        """Create a new template"""
        service = CampaignTemplateService(request.user)
        
        try:
            template = service.create_template(
                name=request.data.get('name'),
                description=request.data.get('description', ''),
                category=request.data.get('category'),
                settings=request.data.get('settings', {}),
                is_public=request.data.get('is_public', False)
            )
            
            serializer = CampaignTemplateSerializer(template)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except ValidationError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def update(self, request, pk=None):
        """Update a template"""
        service = CampaignTemplateService(request.user)
        
        try:
            template = service.update_template(pk, **request.data)
            serializer = CampaignTemplateSerializer(template)
            return Response(serializer.data)
            
        except ValidationError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def destroy(self, request, pk=None):
        """Delete a template"""
        service = CampaignTemplateService(request.user)
        
        try:
            service.delete_template(pk)
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except ValidationError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def use_template(self, request, pk=None):
        """Use a template to create campaign configuration"""
        service = CampaignTemplateService(request.user)
        
        try:
            config = service.use_template(pk, request.data)
            return Response({
                'template_id': pk,
                'campaign_config': config
            })
            
        except ValidationError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'])
    def performance(self, request, pk=None):
        """Get performance statistics for a template"""
        service = CampaignTemplateService(request.user)
        stats = service.get_template_performance_stats(pk)
        
        return Response(stats)
    
    @action(detail=True, methods=['post'])
    def share(self, request, pk=None):
        """Share a template by making it public"""
        service = CampaignTemplateService(request.user)
        
        try:
            make_public = request.data.get('make_public', True)
            template = service.share_template(pk, make_public)
            serializer = CampaignTemplateSerializer(template)
            
            return Response({
                'message': f"Template {'shared publicly' if make_public else 'made private'}",
                'template': serializer.data
            })
            
        except ValidationError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def public_library(self, request):
        """Get public templates from the template library"""
        service = CampaignTemplateService(request.user)
        
        category = request.query_params.get('category')
        templates = service.get_public_template_library(category)
        
        return Response({
            'count': len(templates),
            'results': templates
        })
    
    @action(detail=False, methods=['get'])
    def categories(self, request):
        """Get all available template categories"""
        categories = [
            {'value': 'marketing', 'label': 'Marketing', 'description': 'Promotional and sales campaigns'},
            {'value': 'alerts', 'label': 'Alerts', 'description': 'Urgent notifications and warnings'},
            {'value': 'notifications', 'label': 'Notifications', 'description': 'General notifications and updates'},
            {'value': 'custom', 'label': 'Custom', 'description': 'Custom templates for specific use cases'}
        ]
        
        return Response(categories)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_template_from_campaign(request):
    """Create a template from an existing campaign"""
    service = CampaignTemplateService(request.user)
    
    campaign_id = request.data.get('campaign_id')
    template_name = request.data.get('template_name')
    template_description = request.data.get('template_description', '')
    is_public = request.data.get('is_public', False)
    
    if not campaign_id or not template_name:
        return Response(
            {'error': 'campaign_id and template_name are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        template = service.create_template_from_campaign(
            campaign_id=campaign_id,
            template_name=template_name,
            template_description=template_description,
            is_public=is_public
        )
        
        serializer = CampaignTemplateSerializer(template)
        return Response({
            'message': 'Template created successfully from campaign',
            'template': serializer.data
        }, status=status.HTTP_201_CREATED)
        
    except ValidationError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_campaign_template_suggestions(request, campaign_id):
    """Get template suggestions based on a campaign's characteristics"""
    try:
        campaign = SMSCampaign.objects.get(id=campaign_id, user=request.user)
    except SMSCampaign.DoesNotExist:
        return Response(
            {'error': 'Campaign not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    service = CampaignTemplateService(request.user)
    
    # Analyze campaign message to suggest similar templates
    message_lower = campaign.message_template.lower()
    suggestions = []
    
    # Get all available templates
    all_templates = service.get_available_templates()
    
    # Score templates based on similarity
    for template in all_templates:
        template_message = template.get('message_template', '').lower()
        
        # Simple keyword matching score
        campaign_words = set(message_lower.split())
        template_words = set(template_message.split())
        
        if campaign_words and template_words:
            similarity = len(campaign_words.intersection(template_words)) / len(campaign_words.union(template_words))
            
            if similarity > 0.1:  # At least 10% similarity
                suggestions.append({
                    'template': template,
                    'similarity_score': similarity,
                    'reason': f"Similar keywords and structure ({similarity:.1%} match)"
                })
    
    # Sort by similarity score
    suggestions.sort(key=lambda x: x['similarity_score'], reverse=True)
    
    # Limit to top 5 suggestions
    suggestions = suggestions[:5]
    
    return Response({
        'campaign_id': campaign_id,
        'campaign_name': campaign.name,
        'suggestions': suggestions
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_template_operations(request):
    """Perform bulk operations on templates"""
    operation = request.data.get('operation')
    template_ids = request.data.get('template_ids', [])
    
    if not operation or not template_ids:
        return Response(
            {'error': 'operation and template_ids are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    service = CampaignTemplateService(request.user)
    results = []
    errors = []
    
    for template_id in template_ids:
        try:
            if operation == 'delete':
                service.delete_template(template_id)
                results.append({'template_id': template_id, 'status': 'deleted'})
            
            elif operation == 'make_public':
                template = service.share_template(template_id, True)
                results.append({'template_id': template_id, 'status': 'made_public'})
            
            elif operation == 'make_private':
                template = service.share_template(template_id, False)
                results.append({'template_id': template_id, 'status': 'made_private'})
            
            else:
                errors.append({'template_id': template_id, 'error': f'Unknown operation: {operation}'})
                
        except ValidationError as e:
            errors.append({'template_id': template_id, 'error': str(e)})
    
    return Response({
        'operation': operation,
        'results': results,
        'errors': errors,
        'success_count': len(results),
        'error_count': len(errors)
    })