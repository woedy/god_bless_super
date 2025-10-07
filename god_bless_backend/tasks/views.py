from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404, render
from django.http import HttpResponse
from .models import TaskProgress, TaskStatus, TaskCategory
from .utils import TaskManager
from .serializers import TaskProgressSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_task_status(request, task_id):
    """Get detailed status of a specific task"""
    try:
        task_status = TaskManager.get_task_status(task_id)
        
        # Verify the task belongs to the requesting user
        task_progress = TaskProgress.objects.filter(task_id=task_id, user=request.user).first()
        if not task_progress:
            return Response(
                {'error': 'Task not found or access denied'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response(task_status)
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_task(request, task_id):
    """Cancel a running task"""
    try:
        # Verify the task belongs to the requesting user
        task_progress = get_object_or_404(TaskProgress, task_id=task_id, user=request.user)
        
        if task_progress.is_complete:
            return Response(
                {'error': 'Task is already completed'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        success = TaskManager.cancel_task(task_id)
        
        if success:
            return Response({'message': 'Task cancelled successfully'})
        else:
            return Response(
                {'error': 'Failed to cancel task'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_tasks(request):
    """Get tasks for the authenticated user"""
    try:
        status_filter = request.GET.get('status')
        category_filter = request.GET.get('category')
        limit = int(request.GET.get('limit', 50))
        
        tasks = TaskManager.get_user_tasks(
            user=request.user,
            status=status_filter,
            category=category_filter,
            limit=limit
        )
        
        serializer = TaskProgressSerializer(tasks, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_active_tasks(request):
    """Get all active tasks for the authenticated user"""
    try:
        tasks = TaskManager.get_active_tasks(request.user)
        serializer = TaskProgressSerializer(tasks, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def retry_task(request, task_id):
    """Retry a failed task"""
    try:
        # Verify the task belongs to the requesting user
        task_progress = get_object_or_404(TaskProgress, task_id=task_id, user=request.user)
        
        if task_progress.status != TaskStatus.FAILURE:
            return Response(
                {'error': 'Only failed tasks can be retried'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        success = TaskManager.retry_failed_task(task_id)
        
        if success:
            return Response({'message': 'Task queued for retry'})
        else:
            return Response(
                {'error': 'Failed to retry task'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def cleanup_old_tasks(request):
    """Clean up old completed tasks"""
    try:
        days = int(request.GET.get('days', 7))
        deleted_count = TaskManager.cleanup_old_tasks(days)
        
        return Response({
            'message': f'Cleaned up {deleted_count} old tasks',
            'deleted_count': deleted_count
        })
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_task_categories(request):
    """Get available task categories"""
    categories = [
        {'value': choice[0], 'label': choice[1]} 
        for choice in TaskCategory.choices
    ]
    return Response(categories)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_task_statuses(request):
    """Get available task statuses"""
    statuses = [
        {'value': choice[0], 'label': choice[1]} 
        for choice in TaskStatus.choices
    ]
    return Response(statuses)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_test_task(request):
    """Start a test task for demonstration purposes"""
    try:
        from .tasks import example_progress_task, example_batch_task, long_running_task
        
        task_type = request.data.get('task_type', 'progress')
        
        if task_type == 'progress':
            total_items = int(request.data.get('total_items', 100))
            task = example_progress_task.delay(
                user_id=request.user.id,
                total_items=total_items,
                category=TaskCategory.GENERAL
            )
        elif task_type == 'batch':
            items = list(range(int(request.data.get('total_items', 50))))
            batch_size = int(request.data.get('batch_size', 10))
            task = example_batch_task.delay(
                user_id=request.user.id,
                items=items,
                batch_size=batch_size,
                category=TaskCategory.GENERAL
            )
        elif task_type == 'long_running':
            duration = int(request.data.get('duration', 30))
            task = long_running_task.delay(
                user_id=request.user.id,
                duration=duration,
                category=TaskCategory.GENERAL
            )
        else:
            return Response(
                {'error': 'Invalid task type'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({
            'task_id': task.id,
            'message': f'Test task ({task_type}) started successfully'
        })
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def test_websocket_page(request):
    """Serve the WebSocket test page"""
    return render(request, 'tasks/test_websocket.html')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_notifications(request):
    """Get task notifications for the authenticated user"""
    try:
        from .models import TaskNotification
        
        unread_only = request.GET.get('unread_only', 'false').lower() == 'true'
        limit = int(request.GET.get('limit', 50))
        
        notifications = TaskNotification.objects.filter(user=request.user)
        
        if unread_only:
            notifications = notifications.filter(is_read=False)
        
        notifications = notifications[:limit]
        
        data = [
            {
                'id': notif.id,
                'task_id': notif.task.task_id,
                'task_name': notif.task.task_name,
                'notification_type': notif.notification_type,
                'message': notif.message,
                'is_read': notif.is_read,
                'created_at': notif.created_at.isoformat(),
            }
            for notif in notifications
        ]
        
        return Response(data)
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    """Mark a notification as read"""
    try:
        from .models import TaskNotification
        
        notification = get_object_or_404(
            TaskNotification, 
            id=notification_id, 
            user=request.user
        )
        
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        
        return Response({'message': 'Notification marked as read'})
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read(request):
    """Mark all notifications as read for the authenticated user"""
    try:
        from .models import TaskNotification
        
        updated_count = TaskNotification.objects.filter(
            user=request.user,
            is_read=False
        ).update(is_read=True)
        
        return Response({
            'message': f'Marked {updated_count} notifications as read',
            'updated_count': updated_count
        })
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_notification(request, notification_id):
    """Delete a notification"""
    try:
        from .models import TaskNotification
        
        notification = get_object_or_404(
            TaskNotification, 
            id=notification_id, 
            user=request.user
        )
        
        notification.delete()
        
        return Response({'message': 'Notification deleted'})
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )