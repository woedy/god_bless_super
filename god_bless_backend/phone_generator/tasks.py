"""
Celery tasks for phone number generation and validation
"""
import random
import re
from celery import shared_task
from celery.utils.log import get_task_logger
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from tasks.base import ProgressTrackingTask, BatchProcessingTask
from tasks.models import TaskCategory
from phone_generator.models import PhoneNumber, PhoneGenerationTask
from phone_number_validator.models import PhonePrefix
from projects.models import Project

logger = get_task_logger(__name__)
User = get_user_model()


@shared_task(bind=True, base=ProgressTrackingTask)
def generate_phone_numbers_task(self, user_id, project_id, area_code, quantity, 
                               carrier_filter=None, type_filter=None, 
                               batch_size=1000, auto_validate=False, category=TaskCategory.PHONE_GENERATION):
    """
    Generate large-scale phone numbers (up to 1M) with progress tracking and WebSocket notifications
    """
    try:
        # Get user and project
        user = User.objects.get(user_id=user_id)
        project = Project.objects.get(id=project_id)
        
        # Create or get the generation task record
        generation_task, created = PhoneGenerationTask.objects.get_or_create(
            celery_task_id=self.request.id,
            defaults={
                'user': user,
                'project': project,
                'area_code': area_code,
                'quantity': quantity,
                'carrier_filter': carrier_filter,
                'type_filter': type_filter,
                'total_items': quantity,
                'status': 'in_progress'
            }
        )
        
        self.mark_started()
        logger.info(f"Starting phone generation: {quantity} numbers for area code {area_code}")
        
        # Send task started notification
        self._send_task_notification('task_started', {
            'task_id': self.request.id,
            'task_name': 'Phone Number Generation',
            'area_code': area_code,
            'quantity': quantity,
            'timestamp': timezone.now().isoformat()
        })
        
        # Generate unique phone numbers in batches
        generated_numbers = set()
        total_generated = 0
        batch_count = 0
        failed_attempts = 0
        max_failed_attempts = 10
        
        # Calculate number of batches
        total_batches = (quantity + batch_size - 1) // batch_size
        
        while total_generated < quantity and failed_attempts < max_failed_attempts:
            batch_count += 1
            current_batch_size = min(batch_size, quantity - total_generated)
            
            # Update progress with detailed step information
            progress_percent = int((total_generated / quantity) * 100)
            current_step = f"Generating batch {batch_count}/{total_batches} ({current_batch_size} numbers)"
            
            self.update_progress(
                progress=progress_percent,
                current_step=current_step,
                processed_items=total_generated,
                total_items=quantity
            )
            
            # Generate batch of unique numbers
            batch_numbers = _generate_unique_numbers_batch(
                area_code, current_batch_size, generated_numbers
            )
            
            if not batch_numbers:
                failed_attempts += 1
                logger.warning(f"Could not generate unique numbers for batch {batch_count}. Attempt {failed_attempts}/{max_failed_attempts}")
                continue
            
            # Check for existing numbers in database
            existing_numbers = set(
                PhoneNumber.objects.filter(
                    phone_number__in=batch_numbers
                ).values_list('phone_number', flat=True)
            )
            
            # Filter out existing numbers
            unique_batch = [num for num in batch_numbers if num not in existing_numbers]
            
            if unique_batch:
                # Prepare PhoneNumber objects for bulk creation
                phone_objects = [
                    PhoneNumber(
                        user=user,
                        project=project,
                        phone_number=number,
                        area_code=area_code,
                        validation_source='internal',
                        status='pending'
                    ) for number in unique_batch
                ]
                
                # Bulk create in smaller chunks to avoid memory issues
                chunk_size = 500
                created_count = 0
                for i in range(0, len(phone_objects), chunk_size):
                    chunk = phone_objects[i:i + chunk_size]
                    try:
                        PhoneNumber.objects.bulk_create(chunk, ignore_conflicts=True)
                        created_count += len(chunk)
                    except Exception as e:
                        logger.error(f"Error creating phone number chunk: {e}")
                        continue
                
                total_generated += created_count
                generated_numbers.update(unique_batch)
                
                # Update generation task
                generation_task.processed_items = total_generated
                generation_task.successful_items = total_generated
                generation_task.progress = progress_percent
                generation_task.current_step = current_step
                generation_task.save(update_fields=['processed_items', 'successful_items', 'progress', 'current_step'])
                
                # Reset failed attempts on successful batch
                failed_attempts = 0
                
                logger.info(f"Generated batch {batch_count}: {created_count} unique numbers (Total: {total_generated})")
            else:
                failed_attempts += 1
                logger.warning(f"No unique numbers in batch {batch_count}. Attempt {failed_attempts}/{max_failed_attempts}")
        
        # Mark task as completed
        generation_task.status = 'completed'
        generation_task.completed_at = timezone.now()
        generation_task.result_data = {
            'total_generated': total_generated,
            'area_code': area_code,
            'batches_processed': batch_count,
            'success_rate': (total_generated / quantity) * 100 if quantity > 0 else 0
        }
        generation_task.save()
        
        # Final progress update
        self.update_progress(
            progress=100,
            current_step=f"Generation completed - {total_generated} numbers created",
            processed_items=total_generated,
            total_items=quantity
        )
        
        # Send completion notification
        self._send_task_notification('task_completed', {
            'task_id': self.request.id,
            'status': 'completed',
            'result_data': generation_task.result_data,
            'timestamp': timezone.now().isoformat()
        })
        
        logger.info(f"Phone generation completed: {total_generated} numbers generated")
        
        # Auto-validate generated numbers if requested
        if auto_validate and total_generated > 0:
            logger.info(f"Starting auto-validation for {total_generated} generated numbers")
            
            # Update progress to show validation starting
            self.update_progress(
                progress=100,
                current_step=f"Auto-validating {total_generated} generated numbers...",
                processed_items=total_generated,
                total_items=quantity
            )
            
            # Get the generated phone numbers for this task
            generated_phone_ids = list(
                PhoneNumber.objects.filter(
                    user=user,
                    project=project,
                    area_code=area_code,
                    created_at__gte=generation_task.created_at
                ).values_list('id', flat=True)[:total_generated]
            )
            
            if generated_phone_ids:
                # Start validation task for the generated numbers
                from phone_generator.tasks import validate_phone_numbers_task
                validation_task = validate_phone_numbers_task.delay(
                    user_id=user.user_id,
                    phone_ids=generated_phone_ids,
                    batch_size=500
                )
                
                logger.info(f"Auto-validation task started: {validation_task.id}")
                
                # Update result data to include validation task info
                generation_task.result_data['auto_validation_task_id'] = validation_task.id
                generation_task.save()
        
        return {
            'message': f'Successfully generated {total_generated} phone numbers',
            'total_generated': total_generated,
            'area_code': area_code,
            'task_id': generation_task.id,
            'success_rate': (total_generated / quantity) * 100 if quantity > 0 else 0
        }
        
    except Exception as e:
        logger.error(f"Phone generation failed: {str(e)}")
        
        # Update generation task on failure
        if 'generation_task' in locals():
            generation_task.status = 'failed'
            generation_task.error_message = str(e)
            generation_task.completed_at = timezone.now()
            generation_task.save()
        
        # Send failure notification
        self._send_task_notification('task_failed', {
            'task_id': self.request.id,
            'status': 'failed',
            'error_message': str(e),
            'timestamp': timezone.now().isoformat()
        })
        
        raise


@shared_task(bind=True, base=BatchProcessingTask)
def validate_phone_numbers_task(self, user_id, project_id=None, phone_ids=None, 
                               batch_size=1000, category=TaskCategory.PHONE_VALIDATION):
    """
    Validate phone numbers using internal database with progress tracking and WebSocket notifications
    """
    try:
        user = User.objects.get(user_id=user_id)
        
        self.mark_started()
        
        # Send task started notification
        self._send_task_notification('task_started', {
            'task_id': self.request.id,
            'task_name': 'Phone Number Validation',
            'timestamp': timezone.now().isoformat()
        })
        
        # Build query for phone numbers to validate
        query_filters = {'user': user, 'validation_attempted': False}
        
        if project_id:
            project = Project.objects.get(id=project_id)
            query_filters['project'] = project
        
        if phone_ids:
            query_filters['id__in'] = phone_ids
            # Remove validation_attempted filter when validating specific IDs
            del query_filters['validation_attempted']
        
        # Get phone numbers to validate
        phone_numbers = PhoneNumber.objects.filter(**query_filters)
        total_count = phone_numbers.count()
        
        if total_count == 0:
            result = {
                'message': 'No phone numbers found for validation',
                'validated_count': 0,
                'valid_count': 0,
                'invalid_count': 0
            }
            
            # Send completion notification
            self._send_task_notification('task_completed', {
                'task_id': self.request.id,
                'status': 'completed',
                'result_data': result,
                'timestamp': timezone.now().isoformat()
            })
            
            return result
        
        logger.info(f"Starting validation of {total_count} phone numbers")
        
        validated_count = 0
        valid_count = 0
        invalid_count = 0
        error_count = 0
        
        # Process in batches
        def validate_batch(batch):
            nonlocal validated_count, valid_count, invalid_count, error_count
            
            updated_phones = []
            batch_start_time = timezone.now()
            
            for phone_number in batch:
                try:
                    # Clean the phone number (remove non-numeric characters)
                    cleaned_number = re.sub(r'\D', '', phone_number.phone_number)
                    if cleaned_number.startswith('1'):
                        cleaned_number = cleaned_number[1:]  # Remove country code
                    
                    # Extract the prefix (first 6 digits)
                    if len(cleaned_number) >= 6:
                        prefix = cleaned_number[:6]
                        
                        try:
                            # Look up the PhonePrefix for validation
                            record = PhonePrefix.objects.get(prefix=prefix)
                            
                            # Update phone number with validation data
                            phone_number.valid_number = True
                            phone_number.carrier = record.carrier
                            phone_number.state = record.state
                            phone_number.type = record.line_type
                            phone_number.location = record.city
                            phone_number.country_name = "United States"
                            phone_number.prefix = '+1'
                            phone_number.validation_attempted = True
                            phone_number.validation_date = timezone.now()
                            phone_number.status = 'active'
                            
                            valid_count += 1
                            
                        except PhonePrefix.DoesNotExist:
                            # Mark as invalid if no matching record found
                            phone_number.valid_number = False
                            phone_number.validation_attempted = True
                            phone_number.validation_date = timezone.now()
                            phone_number.status = 'inactive'
                            
                            invalid_count += 1
                    else:
                        # Invalid number format
                        phone_number.valid_number = False
                        phone_number.validation_attempted = True
                        phone_number.validation_date = timezone.now()
                        phone_number.status = 'inactive'
                        invalid_count += 1
                    
                    updated_phones.append(phone_number)
                    validated_count += 1
                    
                except Exception as e:
                    logger.error(f"Error validating phone number {phone_number.phone_number}: {e}")
                    error_count += 1
                    continue
            
            # Bulk update the batch
            if updated_phones:
                try:
                    PhoneNumber.objects.bulk_update(
                        updated_phones,
                        ['valid_number', 'carrier', 'state', 'type', 'location', 
                         'country_name', 'prefix', 'validation_attempted', 'validation_date', 'status']
                    )
                    
                    batch_duration = (timezone.now() - batch_start_time).total_seconds()
                    logger.info(f"Validated batch of {len(updated_phones)} numbers in {batch_duration:.2f}s")
                    
                except Exception as e:
                    logger.error(f"Error bulk updating phone numbers: {e}")
                    error_count += len(updated_phones)
        
        # Process all phone numbers in batches with enhanced progress tracking
        phone_list = list(phone_numbers)
        
        # Override the batch processing to provide more detailed progress
        total = len(phone_list)
        processed = 0
        
        for i in range(0, total, batch_size):
            batch = phone_list[i:i + batch_size]
            batch_num = (i // batch_size) + 1
            total_batches = (total + batch_size - 1) // batch_size
            
            # Update progress before processing batch
            progress = int((processed / total) * 100)
            current_step = f"Validating batch {batch_num}/{total_batches} ({len(batch)} numbers)"
            
            self.update_progress(
                progress=progress,
                current_step=current_step,
                processed_items=processed,
                total_items=total
            )
            
            # Process the batch
            validate_batch(batch)
            processed += len(batch)
        
        # Final progress update
        self.update_progress(
            progress=100,
            current_step=f"Validation completed - {validated_count} numbers processed",
            processed_items=validated_count,
            total_items=total_count
        )
        
        result = {
            'message': f'Successfully validated {validated_count} phone numbers',
            'validated_count': validated_count,
            'valid_count': valid_count,
            'invalid_count': invalid_count,
            'error_count': error_count,
            'total_processed': validated_count,
            'success_rate': (valid_count / validated_count) * 100 if validated_count > 0 else 0
        }
        
        # Send completion notification
        self._send_task_notification('task_completed', {
            'task_id': self.request.id,
            'status': 'completed',
            'result_data': result,
            'timestamp': timezone.now().isoformat()
        })
        
        logger.info(f"Validation completed: {validated_count} validated, {valid_count} valid, {invalid_count} invalid, {error_count} errors")
        
        return result
        
    except Exception as e:
        logger.error(f"Phone validation failed: {str(e)}")
        
        # Send failure notification
        self._send_task_notification('task_failed', {
            'task_id': self.request.id,
            'status': 'failed',
            'error_message': str(e),
            'timestamp': timezone.now().isoformat()
        })
        
        raise


def _generate_unique_numbers_batch(area_code, batch_size, existing_numbers):
    """
    Generate a batch of unique phone numbers for the given area code with improved algorithm
    """
    batch_numbers = set()
    max_attempts = batch_size * 20  # Increased attempts for better success rate
    attempts = 0
    
    # Pre-generate a larger pool to improve uniqueness
    pool_size = min(batch_size * 5, 10000)  # Generate 5x the needed amount or max 10k
    candidate_pool = set()
    
    # Generate candidate pool
    while len(candidate_pool) < pool_size and attempts < max_attempts:
        # Avoid certain central office codes that are reserved or invalid
        central_office_code = str(random.randint(200, 999))  # Start from 200 to avoid reserved codes
        
        # Avoid line numbers starting with 0 or 1 (some are reserved)
        line_number = str(random.randint(2000, 9999))
        
        phone_number = f"1{area_code}{central_office_code}{line_number}"
        
        if phone_number not in existing_numbers:
            candidate_pool.add(phone_number)
        
        attempts += 1
    
    # Select from the candidate pool
    batch_numbers = set()
    for number in candidate_pool:
        if len(batch_numbers) >= batch_size:
            break
        batch_numbers.add(number)
    
    # If we still need more numbers, generate them directly
    if len(batch_numbers) < batch_size:
        additional_attempts = 0
        max_additional = batch_size * 10
        
        while len(batch_numbers) < batch_size and additional_attempts < max_additional:
            central_office_code = str(random.randint(200, 999))
            line_number = str(random.randint(2000, 9999))
            phone_number = f"1{area_code}{central_office_code}{line_number}"
            
            if (phone_number not in existing_numbers and 
                phone_number not in batch_numbers):
                batch_numbers.add(phone_number)
            
            additional_attempts += 1
    
    return list(batch_numbers)


@shared_task(bind=True, base=ProgressTrackingTask)
def bulk_validate_phone_numbers_task(self, user_id, phone_ids, 
                                    batch_size=500, category=TaskCategory.PHONE_VALIDATION):
    """
    Bulk validate specific phone numbers with progress tracking
    """
    try:
        user = User.objects.get(user_id=user_id)
        
        self.mark_started()
        
        # Send task started notification
        self._send_task_notification('task_started', {
            'task_id': self.request.id,
            'task_name': 'Bulk Phone Number Validation',
            'phone_count': len(phone_ids),
            'timestamp': timezone.now().isoformat()
        })
        
        # Get phone numbers to validate
        phone_numbers = PhoneNumber.objects.filter(id__in=phone_ids, user=user)
        total_count = phone_numbers.count()
        
        if total_count == 0:
            result = {
                'message': 'No phone numbers found for validation',
                'validated_count': 0,
                'valid_count': 0,
                'invalid_count': 0
            }
            
            self._send_task_notification('task_completed', {
                'task_id': self.request.id,
                'status': 'completed',
                'result_data': result,
                'timestamp': timezone.now().isoformat()
            })
            
            return result
        
        logger.info(f"Starting bulk validation of {total_count} specific phone numbers")
        
        validated_count = 0
        valid_count = 0
        invalid_count = 0
        
        # Process in batches
        phone_list = list(phone_numbers)
        total_batches = (total_count + batch_size - 1) // batch_size
        
        for batch_num, i in enumerate(range(0, total_count, batch_size), 1):
            batch = phone_list[i:i + batch_size]
            
            # Update progress
            progress = int((validated_count / total_count) * 100)
            current_step = f"Validating batch {batch_num}/{total_batches}"
            
            self.update_progress(
                progress=progress,
                current_step=current_step,
                processed_items=validated_count,
                total_items=total_count
            )
            
            updated_phones = []
            
            for phone_number in batch:
                try:
                    # Clean the phone number
                    cleaned_number = re.sub(r'\D', '', phone_number.phone_number)
                    if cleaned_number.startswith('1'):
                        cleaned_number = cleaned_number[1:]
                    
                    if len(cleaned_number) >= 6:
                        prefix = cleaned_number[:6]
                        
                        try:
                            record = PhonePrefix.objects.get(prefix=prefix)
                            
                            phone_number.valid_number = True
                            phone_number.carrier = record.carrier
                            phone_number.state = record.state
                            phone_number.type = record.line_type
                            phone_number.location = record.city
                            phone_number.country_name = "United States"
                            phone_number.prefix = '+1'
                            phone_number.validation_attempted = True
                            phone_number.validation_date = timezone.now()
                            phone_number.status = 'active'
                            
                            valid_count += 1
                            
                        except PhonePrefix.DoesNotExist:
                            phone_number.valid_number = False
                            phone_number.validation_attempted = True
                            phone_number.validation_date = timezone.now()
                            phone_number.status = 'inactive'
                            
                            invalid_count += 1
                    else:
                        phone_number.valid_number = False
                        phone_number.validation_attempted = True
                        phone_number.validation_date = timezone.now()
                        phone_number.status = 'inactive'
                        invalid_count += 1
                    
                    updated_phones.append(phone_number)
                    validated_count += 1
                    
                except Exception as e:
                    logger.error(f"Error validating phone number {phone_number.phone_number}: {e}")
                    continue
            
            # Bulk update the batch
            if updated_phones:
                PhoneNumber.objects.bulk_update(
                    updated_phones,
                    ['valid_number', 'carrier', 'state', 'type', 'location', 
                     'country_name', 'prefix', 'validation_attempted', 'validation_date', 'status']
                )
        
        # Final progress update
        self.update_progress(
            progress=100,
            current_step=f"Bulk validation completed - {validated_count} numbers processed",
            processed_items=validated_count,
            total_items=total_count
        )
        
        result = {
            'message': f'Successfully validated {validated_count} phone numbers',
            'validated_count': validated_count,
            'valid_count': valid_count,
            'invalid_count': invalid_count,
            'success_rate': (valid_count / validated_count) * 100 if validated_count > 0 else 0
        }
        
        # Send completion notification
        self._send_task_notification('task_completed', {
            'task_id': self.request.id,
            'status': 'completed',
            'result_data': result,
            'timestamp': timezone.now().isoformat()
        })
        
        logger.info(f"Bulk validation completed: {validated_count} validated, {valid_count} valid, {invalid_count} invalid")
        
        return result
        
    except Exception as e:
        logger.error(f"Bulk phone validation failed: {str(e)}")
        
        self._send_task_notification('task_failed', {
            'task_id': self.request.id,
            'status': 'failed',
            'error_message': str(e),
            'timestamp': timezone.now().isoformat()
        })
        
        raise


@shared_task(bind=True, base=ProgressTrackingTask)
def export_phone_numbers_task(self, user_id, project_id, format, filters=None, 
                              fields=None, category=TaskCategory.DATA_EXPORT):
    """
    Export phone numbers with progress tracking for large datasets
    """
    from phone_generator.export_utils import export_phone_numbers
    from django.core.files.base import ContentFile
    from django.core.files.storage import default_storage
    import os
    
    try:
        user = User.objects.get(user_id=user_id)
        project = Project.objects.get(id=project_id) if project_id else None
        
        self.mark_started()
        logger.info(f"Starting phone number export: format={format}, user={user_id}")
        
        # Build queryset with filters
        queryset = PhoneNumber.objects.filter(user=user, is_archived=False)
        
        if project:
            queryset = queryset.filter(project=project)
        
        if filters:
            if filters.get('carrier'):
                queryset = queryset.filter(carrier=filters['carrier'])
            if filters.get('type'):
                queryset = queryset.filter(type=filters['type'])
            if filters.get('area_code'):
                queryset = queryset.filter(area_code=filters['area_code'])
            if filters.get('valid_number') is not None:
                queryset = queryset.filter(valid_number=filters['valid_number'])
        
        total_count = queryset.count()
        self.update_progress(10, f"Found {total_count} records to export")
        
        if total_count == 0:
            self.mark_completed(result_data={'error': 'No records found to export'})
            return {'success': False, 'error': 'No records found'}
        
        # Export data
        self.update_progress(30, "Generating export file")
        
        if fields is None:
            fields = ['phone_number', 'carrier', 'type', 'area_code', 'valid_number', 'created_at']
        
        content = export_phone_numbers(queryset, format, fields)
        
        self.update_progress(70, "Saving export file")
        
        # Save to media storage
        timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
        filename = f"exports/phone_numbers_{timestamp}.{format}"
        file_path = default_storage.save(filename, ContentFile(content.encode('utf-8')))
        
        self.update_progress(90, "Export completed")
        
        result_data = {
            'file_path': file_path,
            'file_url': default_storage.url(file_path),
            'total_records': total_count,
            'format': format,
            'filename': os.path.basename(file_path)
        }
        
        self.mark_completed(result_data=result_data)
        logger.info(f"Export completed: {total_count} records exported to {file_path}")
        
        return {'success': True, **result_data}
        
    except Exception as e:
        logger.error(f"Export failed: {str(e)}", exc_info=True)
        self.mark_failed(error_message=str(e))
        raise


@shared_task(bind=True, base=ProgressTrackingTask)
def import_phone_numbers_task(self, user_id, project_id, file_content, file_format, 
                              validate_on_import=False, category=TaskCategory.DATA_IMPORT):
    """
    Import phone numbers from file with validation and progress tracking
    """
    from phone_generator.import_utils import parse_import_file, validate_import_data
    
    try:
        user = User.objects.get(user_id=user_id)
        project = Project.objects.get(id=project_id)
        
        self.mark_started()
        logger.info(f"Starting phone number import: format={file_format}, user={user_id}")
        
        # Parse file
        self.update_progress(10, "Parsing import file")
        records, parse_errors = parse_import_file(file_content, file_format)
        
        if parse_errors:
            logger.warning(f"Parse errors: {len(parse_errors)} errors found")
        
        if not records:
            error_msg = "No valid records found in import file"
            if parse_errors:
                error_msg += f". Errors: {'; '.join(parse_errors[:5])}"
            self.mark_failed(error_message=error_msg)
            return {'success': False, 'error': error_msg, 'parse_errors': parse_errors}
        
        self.update_progress(30, f"Found {len(records)} valid records")
        
        # Validate data
        self.update_progress(40, "Validating import data")
        valid_records, validation_errors = validate_import_data(records)
        
        if validation_errors:
            logger.warning(f"Validation errors: {len(validation_errors)} errors found")
        
        # Check for existing phone numbers
        self.update_progress(50, "Checking for duplicates")
        phone_numbers = [r['phone_number'] for r in valid_records]
        existing_numbers = set(
            PhoneNumber.objects.filter(phone_number__in=phone_numbers)
            .values_list('phone_number', flat=True)
        )
        
        # Filter out existing numbers
        new_records = [r for r in valid_records if r['phone_number'] not in existing_numbers]
        duplicate_count = len(valid_records) - len(new_records)
        
        if duplicate_count > 0:
            logger.info(f"Skipping {duplicate_count} duplicate phone numbers")
        
        if not new_records:
            error_msg = "All phone numbers already exist in database"
            self.mark_completed(result_data={
                'total_parsed': len(records),
                'duplicates_skipped': duplicate_count,
                'imported': 0,
                'parse_errors': parse_errors,
                'validation_errors': validation_errors
            })
            return {
                'success': True,
                'imported': 0,
                'duplicates_skipped': duplicate_count,
                'message': error_msg
            }
        
        # Import in batches
        self.update_progress(60, f"Importing {len(new_records)} new records")
        
        batch_size = 1000
        imported_count = 0
        
        for i in range(0, len(new_records), batch_size):
            batch = new_records[i:i + batch_size]
            
            phone_objects = [
                PhoneNumber(
                    user=user,
                    project=project,
                    phone_number=record['phone_number'],
                    carrier=record.get('carrier', ''),
                    type=record.get('type', ''),
                    area_code=record.get('area_code', ''),
                    validation_attempted=False
                )
                for record in batch
            ]
            
            with transaction.atomic():
                PhoneNumber.objects.bulk_create(phone_objects, ignore_conflicts=True)
            
            imported_count += len(batch)
            progress = 60 + int((imported_count / len(new_records)) * 30)
            self.update_progress(progress, f"Imported {imported_count}/{len(new_records)} records")
        
        # Optionally validate imported numbers
        if validate_on_import and imported_count > 0:
            self.update_progress(95, "Queuing validation task")
            # Queue validation task
            validate_phone_numbers_task.delay(
                user_id=user_id,
                project_id=project_id,
                phone_ids=None  # Validate all pending
            )
        
        result_data = {
            'total_parsed': len(records),
            'valid_records': len(valid_records),
            'imported': imported_count,
            'duplicates_skipped': duplicate_count,
            'parse_errors': parse_errors[:10],  # Limit to first 10 errors
            'validation_errors': validation_errors[:10],
            'total_errors': len(parse_errors) + len(validation_errors)
        }
        
        self.mark_completed(result_data=result_data)
        logger.info(f"Import completed: {imported_count} records imported")
        
        return {'success': True, **result_data}
        
    except Exception as e:
        logger.error(f"Import failed: {str(e)}", exc_info=True)
        self.mark_failed(error_message=str(e))
        raise


@shared_task(bind=True, base=ProgressTrackingTask)
def import_sms_recipients_task(self, user_id, campaign_id, file_content, file_format,
                               category=TaskCategory.DATA_IMPORT):
    """
    Import SMS recipients for a campaign with validation
    """
    from phone_generator.import_utils import parse_import_file, validate_import_data
    from sms_sender.models import SMSCampaign, SMSMessage
    
    try:
        user = User.objects.get(user_id=user_id)
        campaign = SMSCampaign.objects.get(id=campaign_id, user=user)
        
        self.mark_started()
        logger.info(f"Starting SMS recipient import: campaign={campaign_id}")
        
        # Parse file
        self.update_progress(10, "Parsing import file")
        records, parse_errors = parse_import_file(file_content, file_format)
        
        if not records:
            error_msg = "No valid records found in import file"
            self.mark_failed(error_message=error_msg)
            return {'success': False, 'error': error_msg}
        
        self.update_progress(30, f"Found {len(records)} valid records")
        
        # Validate data
        valid_records, validation_errors = validate_import_data(records)
        
        # Check for existing recipients in campaign
        self.update_progress(50, "Checking for duplicates")
        phone_numbers = [r['phone_number'] for r in valid_records]
        existing_numbers = set(
            SMSMessage.objects.filter(campaign=campaign, phone_number__in=phone_numbers)
            .values_list('phone_number', flat=True)
        )
        
        new_records = [r for r in valid_records if r['phone_number'] not in existing_numbers]
        duplicate_count = len(valid_records) - len(new_records)
        
        if not new_records:
            self.mark_completed(result_data={'imported': 0, 'duplicates_skipped': duplicate_count})
            return {'success': True, 'imported': 0, 'duplicates_skipped': duplicate_count}
        
        # Import recipients
        self.update_progress(60, f"Importing {len(new_records)} recipients")
        
        batch_size = 1000
        imported_count = 0
        
        for i in range(0, len(new_records), batch_size):
            batch = new_records[i:i + batch_size]
            
            message_objects = [
                SMSMessage(
                    campaign=campaign,
                    phone_number=record['phone_number'],
                    carrier=record.get('carrier', ''),
                    message_content=campaign.message_template,  # Will be processed later
                    recipient_data=record
                )
                for record in batch
            ]
            
            with transaction.atomic():
                SMSMessage.objects.bulk_create(message_objects)
            
            imported_count += len(batch)
            progress = 60 + int((imported_count / len(new_records)) * 35)
            self.update_progress(progress, f"Imported {imported_count}/{len(new_records)} recipients")
        
        # Update campaign recipient count
        campaign.total_recipients = SMSMessage.objects.filter(campaign=campaign).count()
        campaign.save(update_fields=['total_recipients'])
        
        result_data = {
            'imported': imported_count,
            'duplicates_skipped': duplicate_count,
            'total_recipients': campaign.total_recipients
        }
        
        self.mark_completed(result_data=result_data)
        logger.info(f"SMS recipient import completed: {imported_count} recipients imported")
        
        return {'success': True, **result_data}
        
    except Exception as e:
        logger.error(f"SMS recipient import failed: {str(e)}", exc_info=True)
        self.mark_failed(error_message=str(e))
        raise

