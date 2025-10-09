"""
Enhanced Settings Management Views
Handles user preferences, rotation settings, and system configuration
"""
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model

from accounts.models import SystemSettings
from proxy_server.models import RotationSettings
from accounts.api.serializers import UserPreferencesSerializer, SystemSettingsSerializer

User = get_user_model()


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def user_preferences_view(request):
    """Get or update user preferences (theme, notifications)"""
    payload = {}
    errors = {}
    
    user_id = request.data.get('user_id') if request.method == 'POST' else request.query_params.get('user_id')
    
    if not user_id:
        errors['user_id'] = ['User ID is required.']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        errors['user_id'] = ['User does not exist.']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    if request.method == 'GET':
        serializer = UserPreferencesSerializer(user)
        payload['message'] = 'Successful'
        payload['data'] = serializer.data
        return Response(payload, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        # Update user preferences
        theme_preference = request.data.get('theme_preference')
        notification_preferences = request.data.get('notification_preferences')
        
        if theme_preference:
            user.theme_preference = theme_preference
        
        if notification_preferences is not None:
            user.notification_preferences = notification_preferences
        
        user.save()
        
        serializer = UserPreferencesSerializer(user)
        payload['message'] = 'Successful'
        payload['data'] = serializer.data
        return Response(payload, status=status.HTTP_200_OK)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def system_settings_view(request):
    """Get or update system settings"""
    payload = {}
    errors = {}
    
    user_id = request.data.get('user_id') if request.method == 'POST' else request.query_params.get('user_id')
    
    if not user_id:
        errors['user_id'] = ['User ID is required.']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        errors['user_id'] = ['User does not exist.']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    settings_obj, created = SystemSettings.objects.get_or_create(user=user)
    
    if request.method == 'GET':
        serializer = SystemSettingsSerializer(settings_obj)
        payload['message'] = 'Successful'
        payload['data'] = serializer.data
        return Response(payload, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        serializer = SystemSettingsSerializer(settings_obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            payload['message'] = 'Successful'
            payload['data'] = serializer.data
            return Response(payload, status=status.HTTP_200_OK)
        else:
            payload['message'] = 'Errors'
            payload['errors'] = serializer.errors
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def get_all_settings_view(request):
    """Get all settings in one call (user preferences, system settings, rotation settings)"""
    payload = {}
    errors = {}
    
    user_id = request.query_params.get('user_id')
    
    if not user_id:
        errors['user_id'] = ['User ID is required.']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        errors['user_id'] = ['User does not exist.']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    # Get or create settings
    system_settings, _ = SystemSettings.objects.get_or_create(user=user)
    rotation_settings, _ = RotationSettings.objects.get_or_create(user=user)
    
    # Serialize all settings
    user_prefs_serializer = UserPreferencesSerializer(user)
    system_settings_serializer = SystemSettingsSerializer(system_settings)
    
    from proxy_server.serializers import RotationSettingsSerializer
    rotation_settings_serializer = RotationSettingsSerializer(rotation_settings)
    
    payload['message'] = 'Successful'
    payload['data'] = {
        'user_preferences': user_prefs_serializer.data,
        'system_settings': system_settings_serializer.data,
        'rotation_settings': rotation_settings_serializer.data
    }
    
    return Response(payload, status=status.HTTP_200_OK)
