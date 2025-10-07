from django.urls import path

from phone_generator.api.views import (
    clear_numbers_view, delete_all_view, delete_numbers_view, download_csv_view, 
    generate_numbers_view, get_all_numbers_view, get_valid_numbers, total_wipe_view, 
    validate_numbers_view, generate_numbers_enhanced_view, validate_numbers_enhanced_view,
    get_generation_tasks_view, get_task_progress_view, cancel_task_view,
    bulk_validate_numbers_view, get_phone_statistics_view, get_active_tasks_view,
    generate_numbers_with_config_view, export_phone_numbers_view, import_phone_numbers_view,
    import_sms_recipients_view
)


app_name = 'phone_generator'

urlpatterns = [
    # Legacy endpoints (kept for backward compatibility)
    path('generate-numbers/', generate_numbers_view, name="generate_numbers_view"),
    path('validate-numbers/', validate_numbers_view, name="validate_numbers_view"),
    
    # Enhanced endpoints with background processing
    path('generate-numbers-enhanced/', generate_numbers_enhanced_view, name="generate_numbers_enhanced_view"),
    path('generate-numbers-config/', generate_numbers_with_config_view, name="generate_numbers_with_config_view"),
    path('validate-numbers-enhanced/', validate_numbers_enhanced_view, name="validate_numbers_enhanced_view"),
    
    # Task management endpoints
    path('tasks/', get_generation_tasks_view, name="get_generation_tasks_view"),
    path('tasks/active/', get_active_tasks_view, name="get_active_tasks_view"),
    path('tasks/<str:task_id>/progress/', get_task_progress_view, name="get_task_progress_view"),
    path('tasks/<str:task_id>/cancel/', cancel_task_view, name="cancel_task_view"),
    
    # Enhanced validation endpoints
    path('bulk-validate/', bulk_validate_numbers_view, name="bulk_validate_numbers_view"),
    path('statistics/', get_phone_statistics_view, name="get_phone_statistics_view"),
    
    # Export and Import endpoints
    path('export/', export_phone_numbers_view, name="export_phone_numbers_view"),
    path('import/', import_phone_numbers_view, name="import_phone_numbers_view"),
    path('import-sms-recipients/', import_sms_recipients_view, name="import_sms_recipients_view"),
    
    # Existing endpoints
    path('clear-numbers/', clear_numbers_view, name="clear_numbers_view"),
    path('delete-all/', delete_all_view, name="delete_all"),
    path('total-wipe/', total_wipe_view, name="total_wipe_view"),
    path('delete-numbers/', delete_numbers_view, name="delete_numbers_view"),
    path('list-numbers/', get_all_numbers_view, name="get_all_numbers_view"),
    path('get-valid-numbers/', get_valid_numbers, name="get_valid_numbers"),
    path('download-numbers/', download_csv_view, name="download_vsc_view"),
]
