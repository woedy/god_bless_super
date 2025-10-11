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
from django.db import models

from django.conf import settings
from rest_framework.authentication import TokenAuthentication

from phone_generator.api.serializers import AllPhoneNumbersSerializer, PhoneGenerationTaskSerializer
from phone_generator.models import PhoneNumber, PhoneGenerationTask
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated

from projects.models import Project
from sms_sender.api.etext.providers import PROVIDERS_LIST
from phone_generator.tasks import generate_phone_numbers_task, validate_phone_numbers_task
from tasks.models import TaskProgress

### Twilio, NumVerify, or Nexmo , apilayer , phonenumbers
User = get_user_model()

NUMVERIFY_API_KEY = 'your_numverify_api_key'

def is_valid_number2222(phone_number):
    url = f'http://apilayer.net/api/validate?access_key={NUMVERIFY_API_KEY}&number={phone_number}'
    response = requests.get(url)
    data = response.json()
    return data.get('valid', False), data.get('carrier')

def generate_phone_numbers222(area_code):
    phone_numbers = []
    for _ in range(100):
        central_office_code = str(random.randint(100, 999))
        line_number = str(random.randint(1000, 9999))
        phone_number = f"{area_code}{central_office_code}{line_number}"  # No formatting for validation
        is_valid, carrier = is_valid_number(phone_number)
        if is_valid:
            phone_numbers.append({
                'number': f"({area_code}) {central_office_code}-{line_number}",
                'carrier': carrier
            })
    return phone_numbers

def generate_numbers_viewwww(request, area_code):
    if len(area_code) != 3 or not area_code.isdigit():
        return JsonResponse({"error": "Invalid area code."}, status=400)

    phone_numbers = generate_phone_numbers(area_code)
    return JsonResponse({"phone_numbers": phone_numbers})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def generate_numbers_view(request):
    """Legacy endpoint - kept for backward compatibility"""
    payload = {}
    data = {}
    errors = {}

    if request.method == 'POST':
        user_id = request.data.get('user_id', "")
        project_id = request.data.get('project_id', "")
        area_code = request.data.get('area_code', "")
        size = int(request.data.get('size', ""))

        # Validate input
        if not user_id:
            errors['user_id'] = ['User ID is required.']
        if not project_id:
            errors['project_id'] = ['Project ID is required.']

        if not area_code:
            errors['area_code'] = ['Area code is required.']

        if len(area_code) != 3 or not area_code.isdigit():
            errors['area_code'] = ['Invalid area code.']

        if not size:
            errors['size'] = ['Phone numbers size is required.']

        try:
            user = User.objects.get(user_id=user_id)
        except User.DoesNotExist:
            errors['user_id'] = ['User does not exist.']

        try:
            project = Project.objects.get(id=project_id)
        except:
            errors['project_id'] = ['Project does not exist.']

        if errors:
            payload['message'] = "Errors"
            payload['errors'] = errors
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        # For small batches (< 10000), use synchronous generation
        if size < 10000:
            # Generate unique phone numbers
            phone_numbers = generate_phone_numbers(area_code, size)

            # Check for existing phone numbers in the database
            existing_phone_numbers = set(
                PhoneNumber.objects.filter(phone_number__in=phone_numbers)
                .values_list('phone_number', flat=True)
            )

            # Filter out any phone numbers that already exist in the database
            unique_phone_numbers = [num for num in phone_numbers if num not in existing_phone_numbers]

            # Prepare PhoneNumber instances for bulk creation
            phone_number_objects = [
                PhoneNumber(user=user, project=project, phone_number=number) for number in unique_phone_numbers
            ]

            # Bulk create phone numbers in batches
            if phone_number_objects:
                batch_size = 1000  # Adjust this value if necessary
                for i in range(0, len(phone_number_objects), batch_size):
                    PhoneNumber.objects.bulk_create(phone_number_objects[i:i+batch_size])

            # Return the list of generated numbers
            data['numbers'] = unique_phone_numbers
            payload['message'] = "Successful"
            payload['data'] = data
        else:
            # For large batches, redirect to background task
            task = generate_phone_numbers_task.delay(
                user_id=user.user_id,
                project_id=project.id,
                area_code=area_code,
                quantity=size,
                auto_validate=False  # Default to False for legacy calls
            )
            
            data['task_id'] = task.id
            data['message'] = 'Large generation started in background. Use task_id to track progress.'
            payload['message'] = "Task Started"
            payload['data'] = data

    return Response(payload)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def generate_numbers_enhanced_view(request):
    """Enhanced phone number generation with background processing and progress tracking"""
    payload = {}
    data = {}
    errors = {}

    if request.method == 'POST':
        user_id = request.data.get('user_id', "")
        project_id = request.data.get('project_id', "")
        area_code = request.data.get('area_code', "")
        quantity = request.data.get('quantity', 0)
        carrier_filter = request.data.get('carrier_filter', None)
        type_filter = request.data.get('type_filter', None)
        batch_size = request.data.get('batch_size', 1000)

        # Validate input
        if not user_id:
            errors['user_id'] = ['User ID is required.']
        if not project_id:
            errors['project_id'] = ['Project ID is required.']
        if not area_code:
            errors['area_code'] = ['Area code is required.']
        if len(area_code) != 3 or not area_code.isdigit():
            errors['area_code'] = ['Invalid area code format. Must be 3 digits.']
        if not quantity or quantity <= 0:
            errors['quantity'] = ['Quantity must be a positive integer.']
        if quantity > 1000000:
            errors['quantity'] = ['Maximum quantity is 1,000,000 numbers.']

        try:
            user = User.objects.get(user_id=user_id)
        except User.DoesNotExist:
            errors['user_id'] = ['User does not exist.']

        try:
            project = Project.objects.get(id=project_id)
        except:
            errors['project_id'] = ['Project does not exist.']

        if errors:
            payload['message'] = "Errors"
            payload['errors'] = errors
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        # Start background task for phone number generation
        task = generate_phone_numbers_task.delay(
            user_id=user.user_id,
            project_id=project.id,
            area_code=area_code,
            quantity=quantity,
            carrier_filter=carrier_filter,
            type_filter=type_filter,
            batch_size=batch_size,
            auto_validate=False  # Default to False for legacy calls
        )

        data['task_id'] = task.id
        data['area_code'] = area_code
        data['quantity'] = quantity
        data['estimated_time'] = f"{quantity // 1000} minutes"  # Rough estimate
        
        payload['message'] = "Phone number generation started"
        payload['data'] = data

    return Response(payload, status=status.HTTP_201_CREATED)



def generate_phone_numbers(area_code, size):
    phone_numbers = set()  # Use a set to avoid duplicates during generation

    while len(phone_numbers) < size:  # Keep generating until we get the required unique numbers
        central_office_code = str(random.randint(100, 999))
        line_number = str(random.randint(1000, 9999))
        phone_number = f"1{area_code}{central_office_code}{line_number}"  # Unformatted version for database
        phone_numbers.add(phone_number)  # Sets automatically handle uniqueness

    return list(phone_numbers)  # Convert the set back to a list to return


    return phone_numbers






@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def get_all_numbers_view(request):
    payload = {}
    data = {}
    errors = {}

    user_id = request.query_params.get('user_id', None)
    project_id = request.query_params.get('project_id', None)
    search_query = request.query_params.get('search', '')
    date = request.query_params.get('date', '')
    valid_number = request.query_params.get('valid_number', '')
    carrier = request.query_params.get('carrier', '')
    phone_type = request.query_params.get('type', '')
    country_name = request.query_params.get('country_name', '')
    page_number = request.query_params.get('page', 1)
    page_size = int(request.query_params.get('page_size', 20))  # Default to 20, allow custom page size

    # Debug logging
    print(f"DEBUG - Received filters: valid_number={valid_number}, carrier={carrier}, phone_type={phone_type}, country_name={country_name}, search={search_query}")

    
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

    all_numbers = PhoneNumber.objects.all().filter(is_archived=False, user=user, project=project).order_by('-id')

    if search_query:
        all_numbers = all_numbers.filter(
            Q(phone_number__icontains=search_query) 
        )

    if date:
        all_numbers = all_numbers.filter(
            created_at=date
        )

    # Filter by validation status
    if valid_number:
        if valid_number.lower() == 'true':
            all_numbers = all_numbers.filter(valid_number=True)
        elif valid_number.lower() == 'false':
            all_numbers = all_numbers.filter(valid_number=False)
        elif valid_number.lower() == 'null':
            all_numbers = all_numbers.filter(valid_number__isnull=True)

    # Filter by carrier
    if carrier:
        all_numbers = all_numbers.filter(carrier__icontains=carrier)

    # Filter by phone type
    if phone_type:
        all_numbers = all_numbers.filter(type__iexact=phone_type)

    # Filter by country name
    if country_name:
        all_numbers = all_numbers.filter(country_name__icontains=country_name)


    paginator = Paginator(all_numbers, page_size)

    try:
        paginated_meetings = paginator.page(page_number)
    except PageNotAnInteger:
        paginated_meetings = paginator.page(1)
    except EmptyPage:
        paginated_meetings = paginator.page(paginator.num_pages)

    all_numbers_serializer = AllPhoneNumbersSerializer(paginated_meetings, many=True)


    data['numbers'] = all_numbers_serializer.data
    data['pagination'] = {
        'page_number': paginated_meetings.number,
        'count': all_numbers.count(),
        'total_pages': paginator.num_pages,
        'next': paginated_meetings.next_page_number() if paginated_meetings.has_next() else None,
        'previous': paginated_meetings.previous_page_number() if paginated_meetings.has_previous() else None,
    }

    payload['message'] = "Successful"
    payload['data'] = data

    return Response(payload, status=status.HTTP_200_OK)







@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def get_valid_numbers(request):
    payload = {}
    data = {}
    errors = {}

    user_id = request.query_params.get('user_id', None)
    project_id = request.query_params.get('project_id', None)
    search_query = request.query_params.get('search', '')
    date = request.query_params.get('date', '')
    page_number = request.query_params.get('page', 1)
    page_size = 100

    
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
    

    all_numbers = PhoneNumber.objects.all().filter(is_archived=False, valid_number=True, type='Mobile', user=user, project=project).order_by('-id')


    if search_query:
        all_numbers = all_numbers.filter(
            Q(phone_number__icontains=search_query) 
        )

    if date:
        all_numbers = all_numbers.filter(
            created_at=date
        )


    paginator = Paginator(all_numbers, page_size)

    try:
        paginated_meetings = paginator.page(page_number)
    except PageNotAnInteger:
        paginated_meetings = paginator.page(1)
    except EmptyPage:
        paginated_meetings = paginator.page(paginator.num_pages)

    all_numbers_serializer = AllPhoneNumbersSerializer(paginated_meetings, many=True)


    data['numbers'] = all_numbers_serializer.data
    data['pagination'] = {
        'page_number': paginated_meetings.number,
        'count': all_numbers.count(),
        'total_pages': paginator.num_pages,
        'next': paginated_meetings.next_page_number() if paginated_meetings.has_next() else None,
        'previous': paginated_meetings.previous_page_number() if paginated_meetings.has_previous() else None,
    }

    payload['message'] = "Successful"
    payload['data'] = data

    return Response(payload, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def download_csv_view(request):
    payload = {}
    data = {}
    errors = {}

    # Extract user_id, carrier, and code from the query parameters
    user_id = request.query_params.get('user_id', None)
    carrier = request.query_params.get('carrier', None)
    code = request.query_params.get('code', None)

    # Validate user_id
    if not user_id:
        errors['user_id'] = ['User ID is required.']

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        errors['user_id'] = ['User does not exist.']

    # If there are errors, return a 400 response
    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Start building the filter conditions
    filters = {
        'is_archived': False,
        'valid_number': True,
        'type': 'mobile',
        'user': user
    }

    # Add carrier filter if provided
    if carrier:
        filters['carrier'] = carrier

    # Add code filter if provided
    if code:
        filters['code'] = code

    # Filter phone numbers for the specified user, valid numbers, and additional filters
    all_numbers = PhoneNumber.objects.filter(**filters).order_by('-id')

    # Extract just the phone numbers as a list of strings
    phone_numbers = all_numbers.values_list('phone_number', flat=True)

    data['numbers'] = list(phone_numbers)  # Convert queryset to a list of phone numbers


    data['providers'] = PROVIDERS_LIST

    payload['message'] = "Successful"
    payload['data'] = data

    return Response(payload, status=status.HTTP_200_OK)








@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def clear_numbers_view(request):
    payload = {}
    data = {}
    errors = {}

    if request.method == 'GET':
        user_id = request.query_params.get('user_id', None)
        project_id = request.query_params.get('project_id', None)

        if not user_id:
            errors['user_id'] = ['User ID is required.']
        if not project_id:
            errors['project_id'] = ['Project ID is required.']

        try:
            user = User.objects.get(user_id=user_id)
        except User.DoesNotExist:
            errors['user_id'] = ['User does not exist.']
        try:
            project = Project.objects.get(id=project_id)
        except:
            errors['project_id'] = ['Project does not exist.']

        if errors:
            payload['message'] = "Errors"
            payload['errors'] = errors
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        # Delete invalid numbers (valid_number=False)
        PhoneNumber.objects.filter(user=user, project=project, valid_number=False).delete()

        # Delete valid numbers where type is not "mobile"
        PhoneNumber.objects.filter(user=user, project=project, valid_number=True).exclude(type="Mobile").exclude(type='mobile').delete()

        payload['message'] = "Successful"
        payload['data'] = data

    return Response(payload, status=status.HTTP_200_OK)





@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def delete_all_view(request):
    payload = {}
    data = {}
    errors = {}

    if request.method == 'GET':
        user_id = request.query_params.get('user_id', None)
        project_id = request.query_params.get('project_id', None)

        if not user_id:
            errors['user_id'] = ['User ID is required.']
        if not project_id:
            errors['project_id'] = ['Project ID is required.']

        try:
            user = User.objects.get(user_id=user_id)
        except User.DoesNotExist:
            errors['user_id'] = ['User does not exist.']
        try:
            project = Project.objects.get(id=project_id)
        except:
            errors['project_id'] = ['Project does not exist.']

        if errors:
            payload['message'] = "Errors"
            payload['errors'] = errors
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        PhoneNumber.objects.filter(user=user, project=project).delete()

        payload['message'] = "Successful"
        payload['data'] = data

    return Response(payload, status=status.HTTP_200_OK)





@api_view(['GET'])

def total_wipe_view(request):
    payload = {}

    if request.method == 'GET':
        try:
            # Bulk delete all records in one query
            phone_numbers = PhoneNumber.objects.all()
            deleted_count, _ = phone_numbers.delete()

            payload['message'] = "Successfully deleted {} phone numbers".format(deleted_count)

        except Exception as e:
            payload['message'] = "Error occurred"
            payload['errors'] = str(e)
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def delete_numbers_view(request):
    payload = {}
    data = {}
    errors = {}

    if request.method == 'POST':
        user_id = request.query_params.get('user_id', None)
        selected_numbers = request.data.get('selectedNumbers', [])

        if not user_id:
            errors['user_id'] = ['User ID is required.']

        if not selected_numbers:
            errors['selected_numbers'] = ['Selected Numbers is required.']

        try:
            user = User.objects.get(user_id=user_id)
        except:
            errors['user_id'] = ['User does not exist.']


        if errors:
            payload['message'] = "Errors"
            payload['errors'] = errors
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

 
        PhoneNumber.objects.filter(id__in=selected_numbers, user=user).delete()


        payload['message'] = "Successful"
        payload['data'] = data

    return Response(payload)




@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def validate_numbers_view(request):
    """Legacy validation endpoint - kept for backward compatibility"""
    payload = {}
    data = {}
    errors = {}

    if request.method == 'POST':
        user_id = request.data.get('user_id', "")

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

        numbers = PhoneNumber.objects.all().filter(status='Pending', user=user)
        for number in numbers:
            is_valid, carrier, phone = is_valid_number(number)
            if is_valid:
                number.valid_number = True
                number.telco = carrier
                number.telco_validated = True
                number.status = 'Active'
                number.save()

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def delete_filtered_numbers_view(request):
    """Delete phone numbers based on applied filters"""
    payload = {}
    data = {}
    errors = {}

    if request.method == 'POST':
        user_id = request.data.get('user_id', None)
        project_id = request.data.get('project_id', None)

        # Get filter parameters (same as list-numbers endpoint)
        search_query = request.data.get('search', '')
        valid_number = request.data.get('valid_number', '')
        carrier = request.data.get('carrier', '')
        phone_type = request.data.get('type', '')
        country_name = request.data.get('country_name', '')

        if not user_id:
            errors['user_id'] = ['User ID is required.']
        if not project_id:
            errors['project_id'] = ['Project ID is required.']

        try:
            user = User.objects.get(user_id=user_id)
        except User.DoesNotExist:
            errors['user_id'] = ['User does not exist.']

        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            errors['project_id'] = ['Project does not exist.']

        if errors:
            payload['message'] = "Errors"
            payload['errors'] = errors
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        # Build the base query for numbers to delete
        numbers_to_delete = PhoneNumber.objects.filter(user=user, project=project, is_archived=False)

        # Apply the same filters as the list-numbers endpoint
        if search_query:
            numbers_to_delete = numbers_to_delete.filter(
                Q(phone_number__icontains=search_query)
            )

        # Filter by validation status
        if valid_number:
            if valid_number.lower() == 'true':
                numbers_to_delete = numbers_to_delete.filter(valid_number=True)
            elif valid_number.lower() == 'false':
                numbers_to_delete = numbers_to_delete.filter(valid_number=False)
            elif valid_number.lower() == 'null':
                numbers_to_delete = numbers_to_delete.filter(valid_number__isnull=True)

        # Filter by carrier
        if carrier:
            numbers_to_delete = numbers_to_delete.filter(carrier__icontains=carrier)

        # Filter by phone type
        if phone_type:
            numbers_to_delete = numbers_to_delete.filter(type__iexact=phone_type)

        # Filter by country name
        if country_name:
            numbers_to_delete = numbers_to_delete.filter(country_name__icontains=country_name)

        # Count how many numbers will be deleted before deleting
        count_to_delete = numbers_to_delete.count()

        if count_to_delete == 0:
            data['message'] = 'No numbers match the specified filters'
            data['deleted_count'] = 0
        else:
            # Perform the deletion
            deleted_count, _ = numbers_to_delete.delete()

            data['message'] = f'Successfully deleted {deleted_count} phone numbers'
            data['deleted_count'] = deleted_count

        payload['message'] = "Successful"
        payload['data'] = data

    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def validate_numbers_enhanced_view(request):
    """Enhanced phone number validation with background processing"""
    payload = {}
    data = {}
    errors = {}

    if request.method == 'POST':
        user_id = request.data.get('user_id', "")
        project_id = request.data.get('project_id', None)
        phone_ids = request.data.get('phone_ids', None)  # Optional: specific phone IDs to validate
        batch_size = request.data.get('batch_size', 1000)

        if not user_id:
            errors['user_id'] = ['User ID is required.']

        try:
            user = User.objects.get(user_id=user_id)
        except User.DoesNotExist:
            errors['user_id'] = ['User does not exist.']

        if project_id:
            try:
                project = Project.objects.get(id=project_id)
            except:
                errors['project_id'] = ['Project does not exist.']

        if errors:
            payload['message'] = "Errors"
            payload['errors'] = errors
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        # Start background task for phone number validation
        task = validate_phone_numbers_task.delay(
            user_id=user.user_id,
            project_id=project_id,
            phone_ids=phone_ids,
            batch_size=batch_size
        )

        data['task_id'] = task.id
        data['message'] = 'Phone number validation started in background'
        
        payload['message'] = "Validation task started"
        payload['data'] = data

    return Response(payload, status=status.HTTP_201_CREATED)


def is_valid_number(phone_number):

    data = {}

    data['valid'] = True
    data['carrier'] = 'AT&t'
    data['number'] = phone_number

    return data.get('valid', False), data.get('carrier'), data.get('number')





@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def send_sms_view222(request):
    payload = {}
    data = {}
    errors = {}

    if request.method == 'POST':


        if errors:
            payload['message'] = "Errors"
            payload['errors'] = errors
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)


        numbers = PhoneNumber.objects.all().filter(status='Active', dispatch=False)
       
        for number in numbers:
            link = 'http://ds.sdfds.ft'
            msg = f'Hello ${number}, an amount of $956.08 has been transfered from your account. if this is not you follow this link. {link} to recover your account and cancel the transaction. '
            sms_sid = send_sms(number, msg)


        payload['message'] = "Successful"
        payload['data'] = sms_sid

    return Response(payload)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def get_generation_tasks_view(request):
    """Get phone generation tasks for a user"""
    payload = {}
    data = {}
    errors = {}

    user_id = request.query_params.get('user_id', None)
    project_id = request.query_params.get('project_id', None)
    status_filter = request.query_params.get('status', None)
    page_number = request.query_params.get('page', 1)
    page_size = int(request.query_params.get('page_size', 20))

    if not user_id:
        errors['user_id'] = ['User ID is required.']

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        errors['user_id'] = ['User does not exist.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Build query
    tasks = PhoneGenerationTask.objects.filter(user=user)
    
    if project_id:
        tasks = tasks.filter(project_id=project_id)
    
    if status_filter:
        tasks = tasks.filter(status=status_filter)

    tasks = tasks.order_by('-created_at')

    # Paginate
    paginator = Paginator(tasks, page_size)
    try:
        paginated_tasks = paginator.page(page_number)
    except PageNotAnInteger:
        paginated_tasks = paginator.page(1)
    except EmptyPage:
        paginated_tasks = paginator.page(paginator.num_pages)

    serializer = PhoneGenerationTaskSerializer(paginated_tasks, many=True)

    data['tasks'] = serializer.data
    data['pagination'] = {
        'page_number': paginated_tasks.number,
        'count': tasks.count(),
        'total_pages': paginator.num_pages,
        'next': paginated_tasks.next_page_number() if paginated_tasks.has_next() else None,
        'previous': paginated_tasks.previous_page_number() if paginated_tasks.has_previous() else None,
    }

    payload['message'] = "Successful"
    payload['data'] = data

    return Response(payload, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def get_task_progress_view(request, task_id):
    """Get progress of a specific task"""
    payload = {}
    data = {}
    errors = {}

    user_id = request.query_params.get('user_id', None)

    if not user_id:
        errors['user_id'] = ['User ID is required.']

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        errors['user_id'] = ['User does not exist.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Try to get from TaskProgress first (for Celery tasks)
        task_progress = TaskProgress.objects.get(task_id=task_id, user=user)
        
        data['task_id'] = task_progress.task_id
        data['status'] = task_progress.status
        data['progress'] = task_progress.progress
        data['current_step'] = task_progress.current_step
        data['processed_items'] = task_progress.processed_items
        data['total_items'] = task_progress.total_items
        data['created_at'] = task_progress.created_at
        data['started_at'] = task_progress.started_at
        data['completed_at'] = task_progress.completed_at
        data['estimated_completion'] = task_progress.estimated_completion
        data['error_message'] = task_progress.error_message
        data['result_data'] = task_progress.result_data
        
    except TaskProgress.DoesNotExist:
        # Fallback to PhoneGenerationTask
        try:
            generation_task = PhoneGenerationTask.objects.get(celery_task_id=task_id, user=user)
            
            data['task_id'] = generation_task.celery_task_id
            data['status'] = generation_task.status
            data['progress'] = generation_task.progress
            data['current_step'] = generation_task.current_step
            data['processed_items'] = generation_task.processed_items
            data['total_items'] = generation_task.total_items
            data['created_at'] = generation_task.created_at
            data['started_at'] = generation_task.started_at
            data['completed_at'] = generation_task.completed_at
            data['estimated_completion'] = generation_task.estimated_completion
            data['error_message'] = generation_task.error_message
            data['result_data'] = generation_task.result_data
            
        except PhoneGenerationTask.DoesNotExist:
            errors['task_id'] = ['Task not found.']
            payload['message'] = "Errors"
            payload['errors'] = errors
            return Response(payload, status=status.HTTP_404_NOT_FOUND)

    payload['message'] = "Successful"
    payload['data'] = data

    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def cancel_task_view(request, task_id):
    """Cancel a running task"""
    payload = {}
    data = {}
    errors = {}

    user_id = request.data.get('user_id', "")

    if not user_id:
        errors['user_id'] = ['User ID is required.']

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        errors['user_id'] = ['User does not exist.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    try:
        from celery import current_app
        
        # Revoke the Celery task
        current_app.control.revoke(task_id, terminate=True)
        
        # Update task status in database
        try:
            task_progress = TaskProgress.objects.get(task_id=task_id, user=user)
            task_progress.status = 'REVOKED'
            task_progress.error_message = 'Task cancelled by user'
            task_progress.completed_at = timezone.now()
            task_progress.save()
        except TaskProgress.DoesNotExist:
            pass
        
        try:
            generation_task = PhoneGenerationTask.objects.get(celery_task_id=task_id, user=user)
            generation_task.status = 'cancelled'
            generation_task.error_message = 'Task cancelled by user'
            generation_task.completed_at = timezone.now()
            generation_task.save()
        except PhoneGenerationTask.DoesNotExist:
            pass
        
        data['task_id'] = task_id
        data['status'] = 'cancelled'
        payload['message'] = "Task cancelled successfully"
        payload['data'] = data
        
        return Response(payload, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error cancelling task {task_id}: {e}")
        errors['task_cancellation'] = [f'Failed to cancel task: {str(e)}']
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def bulk_validate_numbers_view(request):
    """Bulk validate specific phone numbers"""
    payload = {}
    data = {}
    errors = {}

    if request.method == 'POST':
        user_id = request.data.get('user_id', "")
        phone_ids = request.data.get('phone_ids', [])
        batch_size = request.data.get('batch_size', 500)

        if not user_id:
            errors['user_id'] = ['User ID is required.']

        if not phone_ids or not isinstance(phone_ids, list):
            errors['phone_ids'] = ['Phone IDs list is required.']

        try:
            user = User.objects.get(user_id=user_id)
        except User.DoesNotExist:
            errors['user_id'] = ['User does not exist.']

        if errors:
            payload['message'] = "Errors"
            payload['errors'] = errors
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        # Start background task for bulk phone number validation
        from phone_generator.tasks import bulk_validate_phone_numbers_task
        
        task = bulk_validate_phone_numbers_task.delay(
            user_id=user.user_id,
            phone_ids=phone_ids,
            batch_size=batch_size
        )

        data['task_id'] = task.id
        data['phone_count'] = len(phone_ids)
        data['message'] = 'Bulk phone number validation started in background'
        
        payload['message'] = "Bulk validation task started"
        payload['data'] = data

    return Response(payload, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def get_phone_statistics_view(request):
    """Get phone number statistics for a user/project"""
    payload = {}
    data = {}
    errors = {}

    user_id = request.query_params.get('user_id', None)
    project_id = request.query_params.get('project_id', None)

    if not user_id:
        errors['user_id'] = ['User ID is required.']

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        errors['user_id'] = ['User does not exist.']

    if project_id:
        try:
            project = Project.objects.get(id=project_id)
        except:
            errors['project_id'] = ['Project does not exist.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Build base query
    base_query = PhoneNumber.objects.filter(user=user, is_archived=False)
    if project_id:
        base_query = base_query.filter(project_id=project_id)

    # Calculate statistics
    total_numbers = base_query.count()
    validated_numbers = base_query.filter(validation_attempted=True).count()
    valid_numbers = base_query.filter(valid_number=True).count()
    invalid_numbers = base_query.filter(valid_number=False, validation_attempted=True).count()
    pending_validation = base_query.filter(validation_attempted=False).count()
    
    # Carrier breakdown
    carrier_stats = base_query.filter(valid_number=True).values('carrier').annotate(
        count=models.Count('id')
    ).order_by('-count')[:10]
    
    # Type breakdown
    type_stats = base_query.filter(valid_number=True).values('type').annotate(
        count=models.Count('id')
    ).order_by('-count')
    
    # State breakdown
    state_stats = base_query.filter(valid_number=True).values('state').annotate(
        count=models.Count('id')
    ).order_by('-count')[:10]

    data['statistics'] = {
        'total_numbers': total_numbers,
        'validated_numbers': validated_numbers,
        'valid_numbers': valid_numbers,
        'invalid_numbers': invalid_numbers,
        'pending_validation': pending_validation,
        'validation_rate': (validated_numbers / total_numbers * 100) if total_numbers > 0 else 0,
        'success_rate': (valid_numbers / validated_numbers * 100) if validated_numbers > 0 else 0,
        'carrier_breakdown': list(carrier_stats),
        'type_breakdown': list(type_stats),
        'state_breakdown': list(state_stats)
    }

    payload['message'] = "Successful"
    payload['data'] = data

    return Response(payload, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def get_active_tasks_view(request):
    """Get all active tasks for a user"""
    payload = {}
    data = {}
    errors = {}

    user_id = request.query_params.get('user_id', None)

    if not user_id:
        errors['user_id'] = ['User ID is required.']

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        errors['user_id'] = ['User does not exist.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Get active tasks from TaskProgress
    active_tasks = TaskProgress.objects.filter(
        user=user,
        status__in=['PENDING', 'STARTED', 'PROGRESS']
    ).order_by('-created_at')

    # Get active generation tasks
    active_generation_tasks = PhoneGenerationTask.objects.filter(
        user=user,
        status__in=['pending', 'in_progress']
    ).order_by('-created_at')

    tasks_data = []
    
    # Add TaskProgress tasks
    for task in active_tasks:
        tasks_data.append({
            'task_id': task.task_id,
            'task_name': task.task_name,
            'category': task.category,
            'status': task.status,
            'progress': task.progress,
            'current_step': task.current_step,
            'processed_items': task.processed_items,
            'total_items': task.total_items,
            'created_at': task.created_at,
            'started_at': task.started_at,
            'estimated_completion': task.estimated_completion
        })
    
    # Add PhoneGenerationTask tasks
    for task in active_generation_tasks:
        tasks_data.append({
            'task_id': task.celery_task_id,
            'task_name': 'Phone Number Generation',
            'category': 'phone_generation',
            'status': task.status,
            'progress': task.progress,
            'current_step': task.current_step,
            'processed_items': task.processed_items,
            'total_items': task.total_items,
            'created_at': task.created_at,
            'started_at': task.started_at,
            'estimated_completion': task.estimated_completion,
            'area_code': task.area_code,
            'quantity': task.quantity
        })

    data['active_tasks'] = tasks_data
    data['count'] = len(tasks_data)

    payload['message'] = "Successful"
    payload['data'] = data

    return Response(payload, status=status.HTTP_200_OK)


def send_sms(to, body):
    client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

    message = client.messages.create(
        body=body,
        from_=settings.TWILIO_PHONE_NUMBER,
        to=to
    )

    return message.sid


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def generate_numbers_with_config_view(request):
    """Generate phone numbers with advanced configuration options"""
    payload = {}
    data = {}
    errors = {}

    if request.method == 'POST':
        user_id = request.data.get('user_id', "")
        project_id = request.data.get('project_id', "")
        area_code = request.data.get('area_code', "")
        quantity = request.data.get('quantity', 0)
        
        # Advanced configuration options - check both top-level and config object
        config = request.data.get('config', {})
        carrier_filter = config.get('carrier_filter', None)
        type_filter = config.get('type_filter', None)
        batch_size = request.data.get('batch_size', config.get('batch_size', 1000))
        auto_validate = request.data.get('auto_validate', config.get('auto_validate', False))
        validation_batch_size = config.get('validation_batch_size', 500)

        # Validate input
        if not user_id:
            errors['user_id'] = ['User ID is required.']
        if not project_id:
            errors['project_id'] = ['Project ID is required.']
        if not area_code:
            errors['area_code'] = ['Area code is required.']
        if len(area_code) != 3 or not area_code.isdigit():
            errors['area_code'] = ['Invalid area code format. Must be 3 digits.']
        if not quantity or quantity <= 0:
            errors['quantity'] = ['Quantity must be a positive integer.']
        if quantity > 1000000:
            errors['quantity'] = ['Maximum quantity is 1,000,000 numbers.']
        if batch_size < 100 or batch_size > 10000:
            errors['batch_size'] = ['Batch size must be between 100 and 10,000.']

        try:
            user = User.objects.get(user_id=user_id)
        except User.DoesNotExist:
            errors['user_id'] = ['User does not exist.']

        try:
            project = Project.objects.get(id=project_id)
        except:
            errors['project_id'] = ['Project does not exist.']

        if errors:
            payload['message'] = "Errors"
            payload['errors'] = errors
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        # Start background task for phone number generation
        generation_task = generate_phone_numbers_task.delay(
            user_id=user.user_id,
            project_id=project.id,
            area_code=area_code,
            quantity=quantity,
            carrier_filter=carrier_filter,
            type_filter=type_filter,
            batch_size=batch_size,
            auto_validate=auto_validate
        )

        # If auto-validate is enabled, chain validation task
        validation_task_id = None
        if auto_validate:
            # Note: In a real implementation, you'd want to chain this task
            # after the generation task completes
            validation_task_id = f"validation_will_start_after_{generation_task.id}"

        data['generation_task_id'] = generation_task.id
        data['validation_task_id'] = validation_task_id
        data['area_code'] = area_code
        data['quantity'] = quantity
        data['config'] = {
            'batch_size': batch_size,
            'auto_validate': auto_validate,
            'carrier_filter': carrier_filter,
            'type_filter': type_filter
        }
        data['estimated_time'] = f"{max(1, quantity // 1000)} minutes"
        
        payload['message'] = "Advanced phone number generation started"
        payload['data'] = data

    return Response(payload, status=status.HTTP_201_CREATED)



@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def bulk_validate_numbers_view(request):
    """Bulk validate specific phone numbers by IDs"""
    payload = {}
    data = {}
    errors = {}

    if request.method == 'POST':
        user_id = request.data.get('user_id', "")
        phone_ids = request.data.get('phone_ids', [])
        batch_size = request.data.get('batch_size', 500)

        if not user_id:
            errors['user_id'] = ['User ID is required.']
        
        if not phone_ids or not isinstance(phone_ids, list):
            errors['phone_ids'] = ['Phone IDs list is required.']

        try:
            user = User.objects.get(user_id=user_id)
        except User.DoesNotExist:
            errors['user_id'] = ['User does not exist.']

        if errors:
            payload['message'] = "Errors"
            payload['errors'] = errors
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        # Import the bulk validation task
        from phone_generator.tasks import bulk_validate_phone_numbers_task
        
        # Start background task for bulk validation
        task = bulk_validate_phone_numbers_task.delay(
            user_id=user.user_id,
            phone_ids=phone_ids,
            batch_size=batch_size
        )

        data['task_id'] = task.id
        data['phone_count'] = len(phone_ids)
        data['message'] = f'Bulk validation started for {len(phone_ids)} phone numbers'
        
        payload['message'] = "Bulk validation task started"
        payload['data'] = data

    return Response(payload, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def get_phone_statistics_view(request):
    """Get phone number statistics for a user/project"""
    payload = {}
    data = {}
    errors = {}

    user_id = request.query_params.get('user_id', None)
    project_id = request.query_params.get('project_id', None)

    if not user_id:
        errors['user_id'] = ['User ID is required.']

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        errors['user_id'] = ['User does not exist.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Build query filters
    filters = {'user': user, 'is_archived': False}
    if project_id:
        try:
            project = Project.objects.get(id=project_id)
            filters['project'] = project
        except:
            errors['project_id'] = ['Project does not exist.']
            payload['message'] = "Errors"
            payload['errors'] = errors
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Get statistics
    phone_numbers = PhoneNumber.objects.filter(**filters)
    
    total_count = phone_numbers.count()
    validated_count = phone_numbers.filter(validation_attempted=True).count()
    valid_count = phone_numbers.filter(valid_number=True).count()
    invalid_count = phone_numbers.filter(valid_number=False, validation_attempted=True).count()
    pending_validation = phone_numbers.filter(validation_attempted=False).count()
    
    # Get carrier breakdown
    carrier_stats = phone_numbers.filter(valid_number=True).values('carrier').annotate(
        count=Count('id')
    ).order_by('-count')
    
    # Get type breakdown
    type_stats = phone_numbers.filter(valid_number=True).values('type').annotate(
        count=Count('id')
    ).order_by('-count')
    
    # Get area code breakdown
    area_code_stats = phone_numbers.values('area_code').annotate(
        count=Count('id')
    ).order_by('-count')[:10]  # Top 10 area codes
    
    # Get status breakdown
    status_stats = phone_numbers.values('status').annotate(
        count=Count('id')
    ).order_by('-count')

    data['total_numbers'] = total_count
    data['validated_numbers'] = validated_count
    data['valid_numbers'] = valid_count
    data['invalid_numbers'] = invalid_count
    data['pending_validation'] = pending_validation
    data['validation_rate'] = round((validated_count / total_count * 100), 2) if total_count > 0 else 0
    data['validity_rate'] = round((valid_count / validated_count * 100), 2) if validated_count > 0 else 0
    data['carrier_breakdown'] = list(carrier_stats)
    data['type_breakdown'] = list(type_stats)
    data['area_code_breakdown'] = list(area_code_stats)
    data['status_breakdown'] = list(status_stats)

    payload['message'] = "Successful"
    payload['data'] = data

    return Response(payload, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def get_active_tasks_view(request):
    """Get all active tasks for a user"""
    payload = {}
    data = {}
    errors = {}

    user_id = request.query_params.get('user_id', None)

    if not user_id:
        errors['user_id'] = ['User ID is required.']

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        errors['user_id'] = ['User does not exist.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Get active generation tasks
    active_generation_tasks = PhoneGenerationTask.objects.filter(
        user=user,
        status__in=['pending', 'in_progress']
    ).order_by('-created_at')

    # Get active task progress records
    from tasks.models import TaskProgress, TaskStatus
    active_task_progress = TaskProgress.objects.filter(
        user=user,
        status__in=[TaskStatus.PENDING, TaskStatus.STARTED, TaskStatus.PROGRESS]
    ).order_by('-created_at')

    # Serialize generation tasks
    generation_tasks_data = PhoneGenerationTaskSerializer(active_generation_tasks, many=True).data

    # Serialize task progress
    task_progress_data = []
    for task in active_task_progress:
        task_progress_data.append({
            'task_id': task.task_id,
            'task_name': task.task_name,
            'category': task.category,
            'status': task.status,
            'progress': task.progress,
            'current_step': task.current_step,
            'processed_items': task.processed_items,
            'total_items': task.total_items,
            'created_at': task.created_at,
            'started_at': task.started_at,
            'estimated_completion': task.estimated_completion
        })

    data['generation_tasks'] = generation_tasks_data
    data['all_tasks'] = task_progress_data
    data['total_active_tasks'] = len(generation_tasks_data) + len(task_progress_data)

    payload['message'] = "Successful"
    payload['data'] = data

    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def generate_numbers_with_config_view(request):
    """
    Advanced phone number generation with comprehensive configuration options
    Supports up to 1M numbers with auto-validation and custom batch processing
    """
    payload = {}
    data = {}
    errors = {}

    if request.method == 'POST':
        user_id = request.data.get('user_id', "")
        project_id = request.data.get('project_id', "")
        area_code = request.data.get('area_code', "")
        quantity = request.data.get('quantity', 0)
        
        # Advanced configuration options
        carrier_filter = request.data.get('carrier_filter', None)
        type_filter = request.data.get('type_filter', None)
        batch_size = request.data.get('batch_size', 1000)
        auto_validate = request.data.get('auto_validate', False)

        # Validate input
        if not user_id:
            errors['user_id'] = ['User ID is required.']
        if not project_id:
            errors['project_id'] = ['Project ID is required.']
        if not area_code:
            errors['area_code'] = ['Area code is required.']
        if len(area_code) != 3 or not area_code.isdigit():
            errors['area_code'] = ['Invalid area code format. Must be 3 digits.']
        if not quantity or quantity <= 0:
            errors['quantity'] = ['Quantity must be a positive integer.']
        if quantity > 1000000:
            errors['quantity'] = ['Maximum quantity is 1,000,000 numbers.']
        if batch_size < 100 or batch_size > 10000:
            errors['batch_size'] = ['Batch size must be between 100 and 10,000.']

        try:
            user = User.objects.get(user_id=user_id)
        except User.DoesNotExist:
            errors['user_id'] = ['User does not exist.']

        try:
            project = Project.objects.get(id=project_id)
        except:
            errors['project_id'] = ['Project does not exist.']

        if errors:
            payload['message'] = "Errors"
            payload['errors'] = errors
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        # Start background task for phone number generation
        generation_task = generate_phone_numbers_task.delay(
            user_id=user.user_id,
            project_id=project.id,
            area_code=area_code,
            quantity=quantity,
            carrier_filter=carrier_filter,
            type_filter=type_filter,
            batch_size=batch_size,
            auto_validate=auto_validate
        )

        # If auto-validate is enabled, chain validation task
        validation_task_id = None
        if auto_validate:
            # Note: In a real implementation, you'd want to chain this task
            # after the generation task completes using Celery's chain
            validation_task_id = f"validation_will_start_after_{generation_task.id}"

        data['generation_task_id'] = generation_task.id
        data['validation_task_id'] = validation_task_id
        data['area_code'] = area_code
        data['quantity'] = quantity
        data['config'] = {
            'batch_size': batch_size,
            'auto_validate': auto_validate,
            'carrier_filter': carrier_filter,
            'type_filter': type_filter
        }
        data['estimated_time'] = f"{max(1, quantity // 1000)} minutes"
        
        payload['message'] = "Advanced phone number generation started"
        payload['data'] = data

    return Response(payload, status=status.HTTP_201_CREATED)



@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def export_phone_numbers_view(request):
    """Export phone numbers with optional filtering"""
    from phone_generator.tasks import export_phone_numbers_task
    from phone_generator.export_utils import export_phone_numbers, create_export_response
    
    payload = {}
    data = {}
    errors = {}

    user_id = request.data.get('user_id', "")
    project_id = request.data.get('project_id', None)
    format = request.data.get('format', 'csv')
    filters = request.data.get('filters', {})
    fields = request.data.get('fields', None)
    use_background = request.data.get('use_background', False)
    include_invalid = request.data.get('include_invalid', False)
    include_metadata = request.data.get('include_metadata', False)

    # Validate input
    if not user_id:
        errors['user_id'] = ['User ID is required.']
    
    if format not in ['csv', 'txt', 'json', 'doc']:
        errors['format'] = ['Invalid format. Must be csv, txt, json, or doc.']

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        errors['user_id'] = ['User does not exist.']

    if project_id:
        try:
            project = Project.objects.get(id=project_id)
        except:
            errors['project_id'] = ['Project does not exist.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Build queryset
    queryset = PhoneNumber.objects.filter(user=user, is_archived=False)
    
    if project_id:
        queryset = queryset.filter(project_id=project_id)
    
    # Apply include_invalid filter - if False, only include valid numbers
    if not include_invalid:
        queryset = queryset.filter(valid_number=True)
    
    # Apply filters (same as list view for consistency)
    if filters.get('search'):
        queryset = queryset.filter(
            Q(phone_number__icontains=filters['search'])
        )
    
    if filters.get('valid_number') is not None:
        if str(filters['valid_number']).lower() == 'true':
            queryset = queryset.filter(valid_number=True)
        elif str(filters['valid_number']).lower() == 'false':
            queryset = queryset.filter(valid_number=False)
        elif str(filters['valid_number']).lower() == 'null':
            queryset = queryset.filter(valid_number__isnull=True)
    
    if filters.get('carrier'):
        queryset = queryset.filter(carrier__icontains=filters['carrier'])
    
    # Handle line type filter (mobile/landline)
    if filters.get('type'):
        queryset = queryset.filter(type__iexact=filters['type'])
    
    if filters.get('country_name'):
        queryset = queryset.filter(country_name__icontains=filters['country_name'])
    
    if filters.get('area_code'):
        queryset = queryset.filter(area_code=filters['area_code'])

    print(f"DEBUG - Export filters applied: {filters}")
    print(f"DEBUG - Export queryset count: {queryset.count()}")

    total_count = queryset.count()

    # For large datasets, use background task
    if use_background or total_count > 10000:
        task = export_phone_numbers_task.delay(
            user_id=user.user_id,
            project_id=project_id,
            format=format,
            filters=filters,
            fields=fields
        )
        
        data['task_id'] = task.id
        data['total_records'] = total_count
        data['message'] = 'Export started in background. Use task_id to track progress.'
        payload['message'] = "Export task started"
        payload['data'] = data
        return Response(payload, status=status.HTTP_201_CREATED)
    
    # For small datasets, export immediately
    try:
        if fields is None:
            fields = ['phone_number', 'carrier', 'type', 'area_code', 'valid_number', 'created_at']
        
        content = export_phone_numbers(queryset, format, fields)
        
        timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
        filename = f"phone_numbers_{timestamp}.{format}"
        
        # Instead of returning file directly, return JSON with content
        data['content'] = content
        data['filename'] = filename
        data['format'] = format
        data['total_records'] = total_count
        payload['message'] = "Export completed"
        payload['data'] = data
        return Response(payload, status=status.HTTP_200_OK)
        
    except Exception as e:
        errors['export'] = [str(e)]
        payload['message'] = "Export failed"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def import_phone_numbers_view(request):
    """Import phone numbers from file"""
    from phone_generator.tasks import import_phone_numbers_task
    
    payload = {}
    data = {}
    errors = {}

    user_id = request.data.get('user_id', "")
    project_id = request.data.get('project_id', "")
    file_format = request.data.get('format', 'csv')
    validate_on_import = request.data.get('validate_on_import', False)
    
    # Get file from request
    if 'file' not in request.FILES:
        errors['file'] = ['File is required.']
    
    if not user_id:
        errors['user_id'] = ['User ID is required.']
    
    if not project_id:
        errors['project_id'] = ['Project ID is required.']
    
    if file_format not in ['csv', 'txt', 'json']:
        errors['format'] = ['Invalid format. Must be csv, txt, or json.']

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        errors['user_id'] = ['User does not exist.']

    try:
        project = Project.objects.get(id=project_id)
    except:
        errors['project_id'] = ['Project does not exist.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Read file content
        uploaded_file = request.FILES['file']
        file_content = uploaded_file.read().decode('utf-8')
        
        # Start background import task
        task = import_phone_numbers_task.delay(
            user_id=user.user_id,
            project_id=project.id,
            file_content=file_content,
            file_format=file_format,
            validate_on_import=validate_on_import
        )
        
        data['task_id'] = task.id
        data['message'] = 'Import started in background. Use task_id to track progress.'
        payload['message'] = "Import task started"
        payload['data'] = data
        
        return Response(payload, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        errors['import'] = [str(e)]
        payload['message'] = "Import failed"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def import_sms_recipients_view(request):
    """Import SMS recipients for a campaign"""
    from phone_generator.tasks import import_sms_recipients_task
    
    payload = {}
    data = {}
    errors = {}

    user_id = request.data.get('user_id', "")
    campaign_id = request.data.get('campaign_id', "")
    file_format = request.data.get('format', 'csv')
    
    # Get file from request
    if 'file' not in request.FILES:
        errors['file'] = ['File is required.']
    
    if not user_id:
        errors['user_id'] = ['User ID is required.']
    
    if not campaign_id:
        errors['campaign_id'] = ['Campaign ID is required.']
    
    if file_format not in ['csv', 'txt', 'json']:
        errors['format'] = ['Invalid format. Must be csv, txt, or json.']

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        errors['user_id'] = ['User does not exist.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Read file content
        uploaded_file = request.FILES['file']
        file_content = uploaded_file.read().decode('utf-8')
        
        # Start background import task
        task = import_sms_recipients_task.delay(
            user_id=user.user_id,
            campaign_id=campaign_id,
            file_content=file_content,
            file_format=file_format
        )
        
        data['task_id'] = task.id
        data['message'] = 'Recipient import started in background. Use task_id to track progress.'
        payload['message'] = "Import task started"
        payload['data'] = data
        
        return Response(payload, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        errors['import'] = [str(e)]
        payload['message'] = "Import failed"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

