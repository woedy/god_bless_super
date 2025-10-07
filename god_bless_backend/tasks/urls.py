from django.urls import path
from . import views

app_name = 'tasks'

urlpatterns = [
    # Task status and management
    path('status/<str:task_id>/', views.get_task_status, name='task_status'),
    path('cancel/<str:task_id>/', views.cancel_task, name='cancel_task'),
    path('retry/<str:task_id>/', views.retry_task, name='retry_task'),
    
    # User tasks
    path('user/', views.get_user_tasks, name='user_tasks'),
    path('active/', views.get_active_tasks, name='active_tasks'),
    
    # Notifications
    path('notifications/', views.get_notifications, name='get_notifications'),
    path('notifications/<int:notification_id>/read/', views.mark_notification_read, name='mark_notification_read'),
    path('notifications/read-all/', views.mark_all_notifications_read, name='mark_all_notifications_read'),
    path('notifications/<int:notification_id>/delete/', views.delete_notification, name='delete_notification'),
    
    # Utility endpoints
    path('cleanup/', views.cleanup_old_tasks, name='cleanup_tasks'),
    path('categories/', views.get_task_categories, name='task_categories'),
    path('statuses/', views.get_task_statuses, name='task_statuses'),
    
    # Test endpoints
    path('test/start/', views.start_test_task, name='start_test_task'),
    path('test/websocket/', views.test_websocket_page, name='test_websocket_page'),
]