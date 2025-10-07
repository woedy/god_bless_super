import random
import requests
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework import status
from django.core.paginator import Paginator, PageNotAnInteger, EmptyPage
from django.db.models import Q, Count
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
import psutil
import sys

from django.conf import settings
from rest_framework.authentication import TokenAuthentication

from dashboard.api.serializers import PhoneNumberSerializer
from phone_generator.api.serializers import AllPhoneNumbersSerializer
from phone_generator.models import PhoneNumber
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated

from projects.models import Project
from smtps.models import SmtpManager
from smtps.serializers import SmtpManagerSerializer
from tasks.models import TaskProgress, TaskStatus, TaskCategory
from tasks.serializers import TaskProgressSerializer

### Twilio, NumVerify, or Nexmo , apilayer , phonenumbers
User = get_user_model()





@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def dashboard_view(request):
    """
    Optimized dashboard view with caching and query optimization.
    """
    from django.core.cache import cache
    from god_bless_pro.query_optimization import count_with_cache
    
    payload = {}
    data = {}
    errors = {}

    user_id = request.query_params.get('user_id', None)
    project_id = request.query_params.get('project_id', None)

    if not user_id:
        errors['user_id'] = ['User ID is required.']
    
    if not project_id:
        errors['project_id'] = ['Project ID is required.']

    try:
        user = User.objects.get(user_id=user_id)
    except:
        errors['user_id'] = ['User does not exist.']

    try:
        project = Project.objects.get(id=project_id)
    except:
        errors['project_id'] = ['Project does not exist.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    # Generate cache key for this user/project combination
    cache_key = f"dashboard:user:{user_id}:project:{project_id}"
    
    # Try to get cached dashboard data
    cached_data = cache.get(cache_key)
    if cached_data:
        payload['message'] = "Successful"
        payload['data'] = cached_data
        payload['cached'] = True
        return Response(payload, status=status.HTTP_200_OK)
    
    # Optimize queries with select_related
    all_numbers_qs = PhoneNumber.objects.select_related('user', 'project').filter(
        is_archived=False, project=project, user=user
    ).order_by('-id')
    
    valid_numbers_qs = PhoneNumber.objects.select_related('user', 'project').filter(
        is_archived=False, valid_number=True, type='Mobile', project=project, user=user
    ).order_by('-id')

    # Use cached counts
    data['projects_count'] = count_with_cache(
        Project.objects.filter(is_archived=False, user=user),
        f"count:projects:user:{user_id}",
        timeout=300
    )
    data['generated_count'] = count_with_cache(
        all_numbers_qs,
        f"count:generated:user:{user_id}:project:{project_id}",
        timeout=60
    )
    data['validated_count'] = count_with_cache(
        valid_numbers_qs,
        f"count:validated:user:{user_id}:project:{project_id}",
        timeout=60
    )
    data['loaded_smtps'] = count_with_cache(
        SmtpManager.objects.filter(is_archived=False, user=user),
        f"count:smtps:user:{user_id}",
        timeout=300
    )
    
    # Static counts (can be enhanced later)
    data['sms_sent_count'] = 0
    data['api_usage_count'] = 0
    data['sent_email'] = 0
    data['sent_sms'] = 0
    data['email_templates'] = 0

    # Get recent items (only fetch 5)
    all_numbers_serializer = PhoneNumberSerializer(all_numbers_qs[:5], many=True)
    valid_numbers_serializer = PhoneNumberSerializer(valid_numbers_qs[:5], many=True)

    data['recent_generated'] = all_numbers_serializer.data
    data['recent_validated'] = valid_numbers_serializer.data

    # Cache the dashboard data for 60 seconds
    cache.set(cache_key, data, 60)

    payload['message'] = "Successful"
    payload['data'] = data
    payload['cached'] = False

    return Response(payload, status=status.HTTP_200_OK)

