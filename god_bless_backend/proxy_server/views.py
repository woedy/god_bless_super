"""
Proxy Server Management Views
"""
from rest_framework import status, viewsets, permissions
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.authentication import TokenAuthentication
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from celery.result import AsyncResult

from .models import ProxyServer, RotationSettings
from .serializers import ProxyServerSerializer, RotationSettingsSerializer
from .rotation_service import ProxyRotationService
from .delivery_delay_service import DeliveryDelayService
from .tasks import download_and_test_proxies_task, cleanup_unhealthy_proxies_task

User = get_user_model()


class ProxyServerViewSet(viewsets.ModelViewSet):
    """Authenticated CRUD for proxy servers owned by the requesting user."""

    serializer_class = ProxyServerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ProxyServer.objects.filter(user=self.request.user, is_archived=False).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)

    def perform_destroy(self, instance):
        if instance.user_id != self.request.user.id:
            raise PermissionDenied("You do not have permission to delete this proxy server.")
        instance.delete()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def add_proxy_view(request):
    """Add a new proxy server"""
    payload = {}
    errors = {}
    
    host = request.data.get('host', '')
    port = request.data.get('port', '')
    username = request.data.get('username', '')
    password = request.data.get('password', '')
    protocol = request.data.get('protocol', 'http')
    
    # Validate input
    if not host:
        errors['host'] = ['Host is required.']
    if not port:
        errors['port'] = ['Port is required.']
    
    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    # Create proxy
    proxy = ProxyServer.objects.create(
        user=request.user,
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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def update_proxy_view(request):
    """Update an existing proxy server configuration."""
    payload = {}
    errors = {}

    proxy_id = request.data.get('id')

    if not proxy_id:
        errors['id'] = ['Proxy ID is required.']

    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    try:
        proxy = ProxyServer.objects.get(id=proxy_id, user=request.user)
    except ProxyServer.DoesNotExist:
        errors['id'] = ['Proxy does not exist.']

    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    update_payload = {}

    for field in ['host', 'username', 'password', 'protocol']:
        if field in request.data:
            update_payload[field] = request.data[field]

    if 'port' in request.data:
        try:
            update_payload['port'] = int(request.data['port'])
        except (TypeError, ValueError):
            errors['port'] = ['Port must be a valid integer.']

    if 'is_active' in request.data:
        raw_is_active = request.data['is_active']
        if isinstance(raw_is_active, bool):
            update_payload['is_active'] = raw_is_active
        elif isinstance(raw_is_active, str):
            lowered = raw_is_active.lower()
            if lowered in ['true', '1', 'yes', 'on']:
                update_payload['is_active'] = True
            elif lowered in ['false', '0', 'no', 'off']:
                update_payload['is_active'] = False
            else:
                errors['is_active'] = ['is_active must be true or false.']
        else:
            update_payload['is_active'] = bool(raw_is_active)

    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    for field, value in update_payload.items():
        setattr(proxy, field, value)

    proxy.save()

    serializer = ProxyServerSerializer(proxy)
    payload['message'] = 'Successful'
    payload['data'] = serializer.data

    return Response(payload, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def get_proxies_view(request):
    """Get all proxies for a user with pagination"""
    payload = {}
    errors = {}
    
    try:
        # Get pagination parameters
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        
        # Validate pagination parameters
        if page < 1:
            page = 1
        if page_size < 1 or page_size > 100:
            page_size = 20
        
        proxies = ProxyServer.objects.filter(user=request.user, is_archived=False).order_by('-created_at')
        
        # Apply pagination
        from django.core.paginator import Paginator
        paginator = Paginator(proxies, page_size)
        page_obj = paginator.get_page(page)
        
        # Serialize the page results
        serializer = ProxyServerSerializer(page_obj.object_list, many=True)
        
        payload['message'] = 'Successful'
        payload['data'] = {
            'results': serializer.data,
            'count': paginator.count,
            'current_page': page,
            'total_pages': paginator.num_pages,
            'page_size': page_size,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous()
        }
        
        return Response(payload, status=status.HTTP_200_OK)
        
    except Exception as e:
        errors['server'] = [str(e)]
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def delete_proxy_view(request):
    """Delete a proxy server"""
    payload = {}
    errors = {}
    
    proxy_id = request.data.get('id', '')

    if not proxy_id:
        errors['id'] = ['Proxy ID is required.']
    
    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        proxy = ProxyServer.objects.get(id=proxy_id, user=request.user)
        proxy.delete()

        payload['message'] = 'Successful'
        payload['data'] = {}
        return Response(payload, status=status.HTTP_200_OK)

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
    
    proxy_id = request.data.get('proxy_id', '')
    
    if not proxy_id:
        errors['proxy_id'] = ['Proxy ID is required.']
    
    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        proxy = ProxyServer.objects.get(id=proxy_id, user=request.user, is_archived=False)

        rotation_service = ProxyRotationService(request.user)
        rotation_service.check_proxy_health(proxy)

        serializer = ProxyServerSerializer(proxy)
        payload['message'] = 'Successful'
        payload['data'] = serializer.data
        return Response(payload, status=status.HTTP_200_OK)

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

    rotation_service = ProxyRotationService(request.user)
    results = rotation_service.check_all_proxies_health()

    proxies = ProxyServer.objects.filter(user=request.user, is_archived=False).order_by('-created_at')
    serializer = ProxyServerSerializer(proxies, many=True)

    payload['message'] = 'Successful'
    payload['data'] = {
        'health_checks': results,
        'proxies': serializer.data
    }
    return Response(payload, status=status.HTTP_200_OK)


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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def download_and_test_proxies_view(request):
    """Download proxies from GeoNode and test their health in background"""
    payload = {}
    errors = {}
    
    protocols = request.data.get('protocols', ['http', 'socks5'])
    limit = request.data.get('limit', 500)
    
    # Validate protocols
    valid_protocols = ['http', 'socks4', 'socks5']
    if isinstance(protocols, str):
        protocols = [protocols]
    
    for protocol in protocols:
        if protocol not in valid_protocols:
            errors['protocols'] = [f'Invalid protocol: {protocol}. Valid options: {valid_protocols}']
    
    # Validate limit
    try:
        limit = int(limit)
        if limit <= 0 or limit > 1000:
            errors['limit'] = ['Limit must be between 1 and 1000']
    except (TypeError, ValueError):
        errors['limit'] = ['Limit must be a valid integer']
    
    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Start background task
        task = download_and_test_proxies_task.delay(
            user_id=request.user.id,
            protocols=protocols,
            limit=limit
        )
        
        payload['message'] = 'Download task started'
        payload['data'] = {
            'task_id': task.id,
            'status': 'PENDING',
            'protocols': protocols,
            'limit': limit
        }
        return Response(payload, status=status.HTTP_202_ACCEPTED)
        
    except Exception as e:
        payload['message'] = 'Error'
        payload['errors'] = {'server': [str(e)]}
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def get_proxy_download_status_view(request, task_id):
    """Get status of proxy download task"""
    payload = {}
    errors = {}
    
    try:
        task = AsyncResult(task_id)
        
        if task.state == 'PENDING':
            response_data = {
                'task_id': task_id,
                'status': 'PENDING',
                'message': 'Task is waiting to be processed'
            }
        elif task.state == 'PROGRESS':
            response_data = task.info
            response_data['task_id'] = task_id
            response_data['status'] = 'PROGRESS'
        elif task.state == 'SUCCESS':
            response_data = task.result
            response_data['task_id'] = task_id
            response_data['status'] = 'SUCCESS'
        elif task.state == 'FAILURE':
            response_data = {
                'task_id': task_id,
                'status': 'FAILURE',
                'message': str(task.info)
            }
        else:
            response_data = {
                'task_id': task_id,
                'status': task.state,
                'message': 'Unknown status'
            }
        
        payload['message'] = 'Successful'
        payload['data'] = response_data
        return Response(payload, status=status.HTTP_200_OK)
        
    except Exception as e:
        payload['message'] = 'Error'
        payload['errors'] = {'server': [str(e)]}
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def cleanup_unhealthy_proxies_view(request):
    """Clean up unhealthy proxies in background"""
    payload = {}
    
    try:
        # Start background task
        task = cleanup_unhealthy_proxies_task.delay(user_id=request.user.id)
        
        payload['message'] = 'Cleanup task started'
        payload['data'] = {
            'task_id': task.id,
            'status': 'PENDING'
        }
        return Response(payload, status=status.HTTP_202_ACCEPTED)
        
    except Exception as e:
        payload['message'] = 'Error'
        payload['errors'] = {'server': [str(e)]}
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
