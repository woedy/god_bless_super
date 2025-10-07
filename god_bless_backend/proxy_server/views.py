"""
Proxy Server Management Views
"""
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model

from .models import ProxyServer, RotationSettings
from .serializers import ProxyServerSerializer, RotationSettingsSerializer
from .rotation_service import ProxyRotationService
from .delivery_delay_service import DeliveryDelayService

User = get_user_model()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def add_proxy_view(request):
    """Add a new proxy server"""
    payload = {}
    errors = {}
    
    user_id = request.data.get('user_id', '')
    host = request.data.get('host', '')
    port = request.data.get('port', '')
    username = request.data.get('username', '')
    password = request.data.get('password', '')
    protocol = request.data.get('protocol', 'http')
    
    # Validate input
    if not user_id:
        errors['user_id'] = ['User ID is required.']
    if not host:
        errors['host'] = ['Host is required.']
    if not port:
        errors['port'] = ['Port is required.']
    
    if errors:
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
    
    # Create proxy
    proxy = ProxyServer.objects.create(
        user=user,
        host=host,
        port=int(port),
        username=username if username else None,
        password=password if password else None,
        protocol=protocol
    )
    
    serializer = ProxyServerSerializer(proxy)
    payload['message'] = 'Successful'
    payload['data'] = serializer.data
    
    return Response(payload, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def get_proxies_view(request):
    """Get all proxies for a user"""
    payload = {}
    errors = {}
    
    user_id = request.query_params.get('user_id', None)
    
    if not user_id:
        errors['user_id'] = ['User ID is required.']
    
    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        errors['user_id'] = ['User does not exist.']
    
    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    proxies = ProxyServer.objects.filter(user=user, is_archived=False).order_by('-created_at')
    serializer = ProxyServerSerializer(proxies, many=True)
    
    payload['message'] = 'Successful'
    payload['data'] = {'proxies': serializer.data}
    
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def delete_proxy_view(request):
    """Delete a proxy server"""
    payload = {}
    errors = {}
    
    user_id = request.data.get('user_id', '')
    proxy_id = request.data.get('id', '')
    
    if not user_id:
        errors['user_id'] = ['User ID is required.']
    if not proxy_id:
        errors['id'] = ['Proxy ID is required.']
    
    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(user_id=user_id)
        proxy = ProxyServer.objects.get(id=proxy_id, user=user)
        proxy.delete()
        
        payload['message'] = 'Successful'
        payload['data'] = {}
        return Response(payload, status=status.HTTP_200_OK)
        
    except User.DoesNotExist:
        errors['user_id'] = ['User does not exist.']
    except ProxyServer.DoesNotExist:
        errors['id'] = ['Proxy does not exist.']
    
    payload['message'] = 'Errors'
    payload['errors'] = errors
    return Response(payload, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def check_proxy_health_view(request):
    """Check health of a specific proxy"""
    payload = {}
    errors = {}
    
    user_id = request.data.get('user_id', '')
    proxy_id = request.data.get('proxy_id', '')
    
    if not user_id:
        errors['user_id'] = ['User ID is required.']
    if not proxy_id:
        errors['proxy_id'] = ['Proxy ID is required.']
    
    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(user_id=user_id)
        proxy = ProxyServer.objects.get(id=proxy_id, user=user)
        
        rotation_service = ProxyRotationService(user)
        is_healthy = rotation_service.check_proxy_health(proxy)
        
        payload['message'] = 'Successful'
        payload['data'] = {
            'proxy_id': proxy.id,
            'is_healthy': is_healthy,
            'health_check_failures': proxy.health_check_failures
        }
        return Response(payload, status=status.HTTP_200_OK)
        
    except User.DoesNotExist:
        errors['user_id'] = ['User does not exist.']
    except ProxyServer.DoesNotExist:
        errors['proxy_id'] = ['Proxy does not exist.']
    
    payload['message'] = 'Errors'
    payload['errors'] = errors
    return Response(payload, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def check_all_proxies_health_view(request):
    """Check health of all user's proxies"""
    payload = {}
    errors = {}
    
    user_id = request.data.get('user_id', '')
    
    if not user_id:
        errors['user_id'] = ['User ID is required.']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(user_id=user_id)
        rotation_service = ProxyRotationService(user)
        results = rotation_service.check_all_proxies_health()
        
        payload['message'] = 'Successful'
        payload['data'] = {'health_checks': results}
        return Response(payload, status=status.HTTP_200_OK)
        
    except User.DoesNotExist:
        errors['user_id'] = ['User does not exist.']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def get_proxy_rotation_stats_view(request):
    """Get proxy rotation statistics"""
    payload = {}
    errors = {}
    
    user_id = request.query_params.get('user_id', None)
    
    if not user_id:
        errors['user_id'] = ['User ID is required.']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(user_id=user_id)
        rotation_service = ProxyRotationService(user)
        stats = rotation_service.get_rotation_stats()
        
        payload['message'] = 'Successful'
        payload['data'] = stats
        return Response(payload, status=status.HTTP_200_OK)
        
    except User.DoesNotExist:
        errors['user_id'] = ['User does not exist.']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def rotation_settings_view(request):
    """Get or update rotation settings"""
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
    
    settings_obj, created = RotationSettings.objects.get_or_create(user=user)
    
    if request.method == 'GET':
        serializer = RotationSettingsSerializer(settings_obj)
        payload['message'] = 'Successful'
        payload['data'] = serializer.data
        return Response(payload, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        serializer = RotationSettingsSerializer(settings_obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            payload['message'] = 'Successful'
            payload['data'] = serializer.data
            return Response(payload, status=status.HTTP_200_OK)
        else:
            payload['message'] = 'Errors'
            payload['errors'] = serializer.errors
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)
