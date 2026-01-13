import logging

from rest_framework.response import Response
from rest_framework import status
from sms_sender.api.etext.providers import PROVIDERS_LIST
from smtps.models import SmtpManager
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from rest_framework.decorators import (
    api_view,
    permission_classes,
    authentication_classes,
)
from rest_framework.authentication import TokenAuthentication
from rest_framework.exceptions import ValidationError

from smtps.serializers import SmtpManagerSerializer
from sms_sender.serializers import (
    SingleSMSRequestSerializer,
    BulkSMSRequestSerializer,
)
from sms_sender.simple_sender import SimpleSMSSender

User = get_user_model()
logger = logging.getLogger(__name__)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def single_SMS_sender_view(request):
    serializer = SingleSMSRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    service = SimpleSMSSender(request.user)

    try:
        result = service.send_single(serializer.validated_data)
    except ValidationError as exc:
        return Response(
            {"message": "Errors", "errors": exc.detail},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.exception("Unexpected error while sending single SMS")
        return Response(
            {"message": "Errors", "errors": {"non_field_errors": [str(exc)]}},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {
            "message": "SMS successfully sent",
            "data": result,
        },
        status=status.HTTP_200_OK,
    )



@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def get_smtps_providers_view(request):
    payload = {}
    data = {}
    errors = {}

    user_id = request.query_params.get('user_id', None)


    
    if not user_id:
        errors['user_id'] = ['User ID is required.']

    try:
        user = User.objects.get(user_id=user_id)
    except:
        errors['user_id'] = ['User does not exist.']

    
    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    

    smtps = SmtpManager.objects.all().filter(is_archived=False, user=user).order_by('-id')
    smtps_serializer = SmtpManagerSerializer(smtps, many=True)


    data['smtps'] = smtps_serializer.data
    data['providers'] = PROVIDERS_LIST



    payload['message'] = "Successful"
    payload['data'] = data

    return Response(payload, status=status.HTTP_200_OK)



@api_view(["POST"])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def bulk_SMS_sender_view(request):
    serializer = BulkSMSRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    service = SimpleSMSSender(request.user)

    try:
        result = service.send_bulk(serializer.validated_data)
    except ValidationError as exc:
        return Response(
            {"message": "Errors", "errors": exc.detail},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.exception("Unexpected error while queueing bulk SMS task")
        return Response(
            {"message": "Errors", "errors": {"non_field_errors": [str(exc)]}},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {
            "message": "Bulk SMS task started",
            "data": result,
        },
        status=status.HTTP_202_ACCEPTED,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def get_all_sent_SMSs(request):
    payload = {}
    data = {}
    errors = {}

    user_id = request.query_params.get("user_id", None)
    search_query = request.query_params.get("search", "")
    date = request.query_params.get("date", "")
    page_number = request.query_params.get("page", 1)
    page_size = 100

    if not user_id:
        errors["user_id"] = ["User ID is required."]

    try:
        user = User.objects.get(user_id=user_id)
    except:
        errors["user_id"] = ["User does not exist."]

    if errors:
        payload["message"] = "Errors"
        payload["errors"] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    all_numbers = (
        PhoneNumber.objects.all().filter(is_archived=False, user=user).order_by("-id")
    )

    if search_query:
        all_numbers = all_numbers.filter(Q(phone_number__icontains=search_query))

    if date:
        all_numbers = all_numbers.filter(created_at=date)

    paginator = Paginator(all_numbers, page_size)

    try:
        paginated_meetings = paginator.page(page_number)
    except PageNotAnInteger:
        paginated_meetings = paginator.page(1)
    except EmptyPage:
        paginated_meetings = paginator.page(paginator.num_pages)

    all_numbers_serializer = AllPhoneNumbersSerializer(paginated_meetings, many=True)

    data["numbers"] = all_numbers_serializer.data
    data["pagination"] = {
        "page_number": paginated_meetings.number,
        "count": all_numbers.count(),
        "total_pages": paginator.num_pages,
        "next": (
            paginated_meetings.next_page_number()
            if paginated_meetings.has_next()
            else None
        ),
        "previous": (
            paginated_meetings.previous_page_number()
            if paginated_meetings.has_previous()
            else None
        ),
    }

    payload["message"] = "Successful"
    payload["data"] = data

    return Response(payload, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def get_all_carrier_list_view(request):
    payload = {}
    data = {}
    errors = {}

    if errors:
        payload["message"] = "Errors"
        payload["errors"] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    data["providers"] = PROVIDERS_LIST

    payload["message"] = "Successful"
    payload["data"] = data

    return Response(payload, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def get_dashboard_stats_view(request):
    """Get aggregated campaign statistics for the authenticated user"""
    from django.db.models import Sum, Count
    from sms_sender.models import SMSCampaign
    
    user = request.user
    
    # Aggregate stats from all campaigns
    campaign_stats = SMSCampaign.objects.filter(user=user).aggregate(
        total_campaigns=Count('id'),
        total_sent=Sum('messages_sent'),
        total_failed=Sum('messages_failed')
    )
    
    data = {
        'total_campaigns': campaign_stats['total_campaigns'] or 0,
        'messages_sent': campaign_stats['total_sent'] or 0,
        'messages_failed': campaign_stats['total_failed'] or 0
    }
    
    return Response({
        'message': 'Successful',
        'data': data
    }, status=status.HTTP_200_OK)
