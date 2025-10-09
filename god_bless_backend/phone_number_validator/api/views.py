import json
import re
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
from rest_framework.permissions import IsAuthenticated
from django.http import JsonResponse
from phone_generator.models import PhoneNumber
from phone_number_validator.models import PhonePrefix
from projects.models import Project
from rest_framework.authentication import TokenAuthentication


User = get_user_model()




# Legacy external API validation functions removed - use internal database validation instead










########################################
#######################################
#########################################################



@api_view(['GET'])
def load_phone_prefixes(request):
    payload = {}
    data = {}
    errors = {}

    with open('data.json', 'r') as f:
        data = json.load(f)
        
        # Loop through the data and create entries in the database
        for prefix, info in data.items():
            PhonePrefix.objects.create(
                prefix=info['prefix'],
                carrier=info['carrier'],
                city=info['city'],
                state=info['state'],
                line_type=info['type']
            )


    payload['message'] = "Successful"
    payload['data'] = data

    return Response(payload, status=status.HTTP_200_OK)



@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def validate_phone_number_free(request):
    payload = {}
    errors = {}

    # Get data from the request
    user_id = request.data.get('user_id', "")
    phone_id = request.data.get('phone_id', "")  # Expecting a single phone ID

    if not phone_id:
        errors['phone_id'] = ['Phone ID is required.']

    # Validation checks for required fields
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

    # Fetch the phone number
    phone_number = PhoneNumber.objects.filter(id=phone_id, user=user).first()

    if not phone_number:
        errors['phone_id'] = ['Phone number does not exist.']
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    if phone_number.validation_attempted:
        errors['phone_id'] = ['Phone number already attempted validation.']
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Clean the phone number (remove non-numeric characters)
    cleaned_number = re.sub(r'\D', '', phone_number.phone_number)[1:]

    # Extract the prefix (first 6 digits)
    prefix = cleaned_number[:6]

    try:
        # Look up the PhoneRecord for the prefix in the database
        record = PhonePrefix.objects.get(prefix=prefix)

        # Map the PhoneRecord data to the PhoneNumber model
        phone_number.valid_number = True  # Mark it as a valid number
        phone_number.carrier = record.carrier
        phone_number.state = record.state
        phone_number.type = record.line_type
        phone_number.location = record.city  # Use city from PhoneRecord
        phone_number.country_name = "United States"  # You can adjust this if needed
        phone_number.prefix = '+1'
        phone_number.validation_attempted = True  # Mark as validated
        phone_number.save()

        payload['message'] = "Validation successful"
        payload['data'] = {
            'carrier': record.carrier,
            'line_type': record.line_type,
            'state': record.state,
            'location': record.city
        }
        return Response(payload, status=status.HTTP_200_OK)

    except PhonePrefix.DoesNotExist:
        phone_number.valid_number = False  
        phone_number.save()

        errors['phone_id'] = [f'No record found for prefix {prefix}']
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)




from django.db import transaction

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def validate_all_phone_numbers_free(request):
    payload = {}
    errors = {}

    # Get data from the request
    user_id = request.data.get('user_id', "")
    project_id = request.data.get('project_id', "")
    
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

    # Fetch all phone numbers for the user that need validation
    phone_numbers = PhoneNumber.objects.filter(user=user, project=project, validation_attempted=False)

    if not phone_numbers:
        errors['phone_id'] = ['No phone numbers found for validation.']
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Prepare for bulk updates and counters
    total_validated = 0
    total_failed = 0

    # Batch processing (using chunks to process in smaller batches)
    batch_size = 1000  # Adjust as needed, depending on performance
    for i in range(0, len(phone_numbers), batch_size):
        batch = phone_numbers[i:i+batch_size]
        
        # Prepare batch lists
        batch_updated_numbers = []
        batch_error_numbers = []

        # Start a database transaction for batch processing
        with transaction.atomic():
            for phone_number in batch:
                # Clean the phone number (remove non-numeric characters)
                cleaned_number = re.sub(r'\D', '', phone_number.phone_number)[1:]  # Remove the country code (assuming it starts with +1)
                
                # Extract the prefix (first 6 digits)
                prefix = cleaned_number[:6]

                try:
                    # Look up the PhoneRecord for the prefix in the database
                    record = PhonePrefix.objects.get(prefix=prefix)

                    # Update the phone number with the validated data
                    phone_number.valid_number = True  # Mark it as a valid number
                    phone_number.carrier = record.carrier
                    phone_number.state = record.state
                    phone_number.type = record.line_type
                    phone_number.location = record.city  # Use city from PhoneRecord
                    phone_number.country_name = "United States"  # Adjust this if needed
                    phone_number.prefix = '+1'  # Assuming all numbers are US-based
                    phone_number.validation_attempted = True  # Mark as validated
                    batch_updated_numbers.append(phone_number)

                except PhonePrefix.DoesNotExist:
                    # If no matching record is found, mark as invalid
                    phone_number.valid_number = False
                    phone_number.validation_attempted = True
                    batch_error_numbers.append(phone_number)

            # Bulk update the valid phone numbers in the batch
            if batch_updated_numbers:
                PhoneNumber.objects.bulk_update(batch_updated_numbers, ['valid_number', 'carrier', 'state', 'type', 'location', 'country_name', 'prefix', 'validation_attempted'])
                total_validated += len(batch_updated_numbers)

            # Bulk update the invalid phone numbers in the batch
            if batch_error_numbers:
                PhoneNumber.objects.bulk_update(batch_error_numbers, ['valid_number', 'validation_attempted'])
                total_failed += len(batch_error_numbers)

    # Return a summary response
    payload['message'] = "Validation completed successfully"
    payload['data'] = {
        'validated_count': total_validated,
        'error_count': total_failed,
        'total_processed': total_validated + total_failed
    }
    return Response(payload, status=status.HTTP_200_OK)