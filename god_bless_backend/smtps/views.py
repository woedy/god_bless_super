from django.shortcuts import render
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.contrib.auth import get_user_model

from smtps.models import SmtpManager
from rest_framework.response import Response

from rest_framework.decorators import api_view, permission_classes, authentication_classes

from smtps.serializers import SmtpManagerSerializer
from smtps.rotation_service import SMTPRotationService

User = get_user_model()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def add_smtp_view(request):
    payload = {}
    errors = {}
    data = {}

    # Get data from the request
    user_id = request.data.get('user_id', "")
    host = request.data.get('host', "")
    port = request.data.get('port', "")
    username = request.data.get('username', "")
    password = request.data.get('password', "")
    ssl = request.data.get('ssl',)

    # Validate input data
    if not user_id:
        errors['user_id'] = ['User ID is required.']
    
    if not host:
        errors['host'] = ['Host is required.']
    
    if not port:
        errors['port'] = ['Port is required.']

    if not username:
        errors['username'] = ['Username is required.']
    if not password:
        errors['password'] = ['Password is required.']

    # Return error response if validation fails
    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        errors['user_id'] = ['User does not exist.']
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    new_smtp = SmtpManager.objects.create(
        user=user,
        host=host,
        port=port,
        username=username,
        password=password,
        ssl=True
    )



    payload['message'] = "Successful"
    payload['data'] = data

    return Response(payload, status=status.HTTP_201_CREATED)
    




@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def get_smtps_view(request):
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



    payload['message'] = "Successful"
    payload['data'] = data

    return Response(payload, status=status.HTTP_200_OK)





@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def delete_smtp(request):
    payload = {}
    errors = {}
    data = {}

    # Get data from the request
    user_id = request.data.get('user_id', "")
    id = request.data.get('id', "")

    print(user_id)
    print(id)

    # Validate input data
    if not user_id:
        errors['user_id'] = ['User ID is required.']

    if not id:
        errors['id'] = ['ID is required.']

    # Return error response if validation fails
    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        errors['user_id'] = ['User does not exist.']
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    smtp = SmtpManager.objects.get(
        user=user,
        id=id
    )


    smtp.delete()


    payload['message'] = "Successful"
    payload['data'] = data

    return Response(payload, status=status.HTTP_200_OK)
    



@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def check_smtp_health_view(request):
    """Check health of a specific SMTP server"""
    payload = {}
    errors = {}
    
    user_id = request.data.get('user_id', '')
    smtp_id = request.data.get('smtp_id', '')
    
    if not user_id:
        errors['user_id'] = ['User ID is required.']
    if not smtp_id:
        errors['smtp_id'] = ['SMTP ID is required.']
    
    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(user_id=user_id)
        smtp = SmtpManager.objects.get(id=smtp_id, user=user)
        
        rotation_service = SMTPRotationService(user)
        is_healthy = rotation_service.check_smtp_health(smtp)
        
        payload['message'] = 'Successful'
        payload['data'] = {
            'smtp_id': smtp.id,
            'is_healthy': is_healthy,
            'health_check_failures': smtp.health_check_failures
        }
        return Response(payload, status=status.HTTP_200_OK)
        
    except User.DoesNotExist:
        errors['user_id'] = ['User does not exist.']
    except SmtpManager.DoesNotExist:
        errors['smtp_id'] = ['SMTP server does not exist.']
    
    payload['message'] = 'Errors'
    payload['errors'] = errors
    return Response(payload, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def check_all_smtp_health_view(request):
    """Check health of all user's SMTP servers"""
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
        rotation_service = SMTPRotationService(user)
        results = rotation_service.check_all_smtp_health()
        
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
def get_smtp_rotation_stats_view(request):
    """Get SMTP rotation statistics"""
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
        rotation_service = SMTPRotationService(user)
        stats = rotation_service.get_rotation_stats()
        
        payload['message'] = 'Successful'
        payload['data'] = stats
        return Response(payload, status=status.HTTP_200_OK)
        
    except User.DoesNotExist:
        errors['user_id'] = ['User does not exist.']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)
