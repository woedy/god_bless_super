"""
Dashboard Analytics Views
Provides comprehensive analytics and metrics for the dashboard
"""
from django.http import JsonResponse
from django.db.models import Count, Q, Avg, Sum
from django.db.models.functions import TruncDate, TruncHour
from django.utils import timezone
from datetime import timedelta
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from collections import defaultdict
import psutil
import sys

from phone_generator.models import PhoneNumber
from tasks.models import TaskProgress, TaskStatus, TaskCategory
from tasks.serializers import TaskProgressSummarySerializer
from activities.models import AllActivity
from projects.models import Project
from smtps.models import SmtpManager


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def dashboard_analytics(request):
    """
    Get comprehensive dashboard analytics including:
    - Platform metrics
    - Task statistics
    - System health
    - User activity
    """
    try:
        user = request.user
        project_id = request.query_params.get('project_id')
        
        if not project_id:
            return Response(
                {'message': 'Project ID is required', 'errors': {'project_id': ['This field is required']}},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            project = Project.objects.get(id=project_id, user=user)
        except Project.DoesNotExist:
            return Response(
                {'message': 'Project not found', 'errors': {'project_id': ['Project does not exist']}},
                status=status.HTTP_404_NOT_FOUND
            )
    except Exception as e:
        print(f"Error in dashboard_analytics initial validation: {e}")
        import traceback
        traceback.print_exc()
        return Response(
            {'message': 'Failed to process request', 'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    try:
        # Get time ranges
        now = timezone.now()
        last_24h = now - timedelta(hours=24)
        last_7d = now - timedelta(days=7)
        last_30d = now - timedelta(days=30)
        
        # Platform Metrics
        platform_metrics = {
            'total_projects': Project.objects.filter(user=user, is_archived=False).count(),
            'total_phone_numbers': PhoneNumber.objects.filter(user=user, project=project, is_archived=False).count(),
            'valid_phone_numbers': PhoneNumber.objects.filter(
                user=user, project=project, is_archived=False, valid_number=True
            ).count(),
            'total_smtps': SmtpManager.objects.filter(user=user, is_archived=False).count(),
            'active_tasks': TaskProgress.objects.filter(
                user=user,
                status__in=[TaskStatus.STARTED, TaskStatus.PROGRESS]
            ).count(),
        }
        
        # Task Statistics
        task_stats = {
            'total_tasks': TaskProgress.objects.filter(user=user).count(),
            'completed_tasks': TaskProgress.objects.filter(user=user, status=TaskStatus.SUCCESS).count(),
            'failed_tasks': TaskProgress.objects.filter(user=user, status=TaskStatus.FAILURE).count(),
            'pending_tasks': TaskProgress.objects.filter(user=user, status=TaskStatus.PENDING).count(),
            'tasks_24h': TaskProgress.objects.filter(user=user, created_at__gte=last_24h).count(),
        }
        
        # Task breakdown by category
        task_by_category = list(
            TaskProgress.objects.filter(user=user)
            .values('category')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        
        # Recent activity (last 24 hours)
        # Use SQLite-compatible approach for date truncation
        if 'sqlite' in settings.DATABASES['default']['ENGINE']:
            # For SQLite, fetch all records and group in Python
            recent_tasks = TaskProgress.objects.filter(user=user, created_at__gte=last_24h).values('created_at')
            activity_by_hour = defaultdict(int)
            for task in recent_tasks:
                hour = task['created_at'].replace(minute=0, second=0, microsecond=0)
                activity_by_hour[hour] += 1
            recent_activity_data = [{'hour': hour, 'count': count} for hour, count in sorted(activity_by_hour.items())]
        else:
            recent_activity_data = list(
                TaskProgress.objects.filter(user=user, created_at__gte=last_24h)
                .annotate(hour=TruncHour('created_at'))
                .values('hour')
                .annotate(count=Count('id'))
                .order_by('hour')
            )
        
        # Phone number generation trend (last 7 days)
        # Use SQLite-compatible approach for date truncation
        if 'sqlite' in settings.DATABASES['default']['ENGINE']:
            # For SQLite, fetch all records and group in Python
            phone_numbers = PhoneNumber.objects.filter(user=user, project=project, created_at__gte=last_7d).values('created_at')
            phones_by_date = defaultdict(int)
            for phone in phone_numbers:
                created_at = phone['created_at']
                # Handle both datetime and date objects
                date = created_at.date() if hasattr(created_at, 'date') and callable(created_at.date) else created_at
                phones_by_date[date] += 1
            phone_generation_trend = [{'date': date, 'count': count} for date, count in sorted(phones_by_date.items())]
        else:
            phone_generation_trend = list(
                PhoneNumber.objects.filter(user=user, project=project, created_at__gte=last_7d)
                .annotate(date=TruncDate('created_at'))
                .values('date')
                .annotate(count=Count('id'))
                .order_by('date')
            )
    except Exception as e:
        print(f"Error fetching analytics data: {e}")
        import traceback
        traceback.print_exc()
        return Response(
            {'message': 'Failed to retrieve analytics data', 'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # System Health Metrics
    try:
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Determine individual component statuses
        cpu_status = 'healthy' if cpu_percent < 70 else ('warning' if cpu_percent < 90 else 'critical')
        memory_status = 'healthy' if memory.percent < 70 else ('warning' if memory.percent < 90 else 'critical')
        disk_status = 'healthy' if disk.percent < 70 else ('warning' if disk.percent < 90 else 'critical')
        
        # Determine overall status
        if cpu_status == 'critical' or memory_status == 'critical' or disk_status == 'critical':
            overall_status = 'critical'
        elif cpu_status == 'warning' or memory_status == 'warning' or disk_status == 'warning':
            overall_status = 'warning'
        else:
            overall_status = 'healthy'
        
        system_health = {
            'cpu': {
                'usage_percent': round(cpu_percent, 2),
                'count': cpu_count,
                'status': cpu_status,
            },
            'memory': {
                'usage_percent': round(memory.percent, 2),
                'available_gb': round(memory.available / (1024 ** 3), 2),
                'total_gb': round(memory.total / (1024 ** 3), 2),
                'used_gb': round(memory.used / (1024 ** 3), 2),
                'status': memory_status,
            },
            'disk': {
                'usage_percent': round(disk.percent, 2),
                'free_gb': round(disk.free / (1024 ** 3), 2),
                'total_gb': round(disk.total / (1024 ** 3), 2),
                'used_gb': round(disk.used / (1024 ** 3), 2),
                'status': disk_status,
            },
            'overall_status': overall_status,
        }
    except Exception as e:
        print(f"Error getting system health: {e}")
        system_health = {
            'cpu': {
                'usage_percent': 0,
                'count': 0,
                'status': 'unavailable',
            },
            'memory': {
                'usage_percent': 0,
                'available_gb': 0,
                'total_gb': 0,
                'used_gb': 0,
                'status': 'unavailable',
            },
            'disk': {
                'usage_percent': 0,
                'free_gb': 0,
                'total_gb': 0,
                'used_gb': 0,
                'status': 'unavailable',
            },
            'overall_status': 'unavailable',
        }
    
    try:
        # User Activity Summary
        user_activity = {
            'total_activities': AllActivity.objects.filter(user=user).count(),
            'activities_24h': AllActivity.objects.filter(user=user, created_at__gte=last_24h).count(),
            'activities_7d': AllActivity.objects.filter(user=user, created_at__gte=last_7d).count(),
        }
        
        payload = {
            'message': 'Dashboard analytics retrieved successfully',
            'data': {
                'platform_metrics': platform_metrics,
                'task_stats': task_stats,
                'task_by_category': task_by_category,
                'recent_activity': recent_activity_data,
                'phone_generation_trend': phone_generation_trend,
                'system_health': system_health,
                'user_activity': user_activity,
            }
        }
        
        return Response(payload, status=status.HTTP_200_OK)
    except Exception as e:
        print(f"Error building final response: {e}")
        import traceback
        traceback.print_exc()
        return Response(
            {'message': 'Failed to build analytics response', 'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def active_tasks(request):
    """Get all active/running tasks for the user"""
    user = request.user
    
    # Get active tasks (not in terminal state)
    active_tasks = TaskProgress.objects.filter(
        user=user,
        status__in=[TaskStatus.PENDING, TaskStatus.STARTED, TaskStatus.PROGRESS]
    ).order_by('-created_at')[:10]
    
    serializer = TaskProgressSummarySerializer(active_tasks, many=True)
    
    return Response({
        'message': 'Active tasks retrieved successfully',
        'data': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def recent_tasks(request):
    """Get recent tasks (completed, failed, or active)"""
    user = request.user
    limit = int(request.query_params.get('limit', 20))
    
    recent_tasks = TaskProgress.objects.filter(user=user).order_by('-created_at')[:limit]
    serializer = TaskProgressSummarySerializer(recent_tasks, many=True)
    
    return Response({
        'message': 'Recent tasks retrieved successfully',
        'data': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def system_health(request):
    """Get detailed system health metrics"""
    try:
        # CPU metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()
        
        # Memory metrics
        memory = psutil.virtual_memory()
        
        # Disk metrics
        disk = psutil.disk_usage('/')
        
        # Process info
        process = psutil.Process()
        process_memory = process.memory_info()
        
        health_data = {
            'cpu': {
                'usage_percent': round(cpu_percent, 2),
                'count': cpu_count,
                'status': 'healthy' if cpu_percent < 70 else 'warning' if cpu_percent < 90 else 'critical',
            },
            'memory': {
                'usage_percent': round(memory.percent, 2),
                'available_gb': round(memory.available / (1024 ** 3), 2),
                'total_gb': round(memory.total / (1024 ** 3), 2),
                'used_gb': round(memory.used / (1024 ** 3), 2),
                'status': 'healthy' if memory.percent < 70 else 'warning' if memory.percent < 90 else 'critical',
            },
            'disk': {
                'usage_percent': round(disk.percent, 2),
                'free_gb': round(disk.free / (1024 ** 3), 2),
                'total_gb': round(disk.total / (1024 ** 3), 2),
                'used_gb': round(disk.used / (1024 ** 3), 2),
                'status': 'healthy' if disk.percent < 70 else 'warning' if disk.percent < 90 else 'critical',
            },
            'process': {
                'memory_mb': round(process_memory.rss / (1024 ** 2), 2),
                'threads': process.num_threads(),
            },
            'overall_status': 'healthy' if cpu_percent < 70 and memory.percent < 70 and disk.percent < 70 else 'warning',
        }
        
        return Response({
            'message': 'System health retrieved successfully',
            'data': health_data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'message': 'Failed to retrieve system health',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def performance_metrics(request):
    """Get performance metrics for tasks"""
    user = request.user
    days = int(request.query_params.get('days', 7))
    
    start_date = timezone.now() - timedelta(days=days)
    
    # Task completion metrics
    completed_tasks = TaskProgress.objects.filter(
        user=user,
        status=TaskStatus.SUCCESS,
        completed_at__gte=start_date
    )
    
    # Calculate average duration for completed tasks
    avg_duration = 0
    if completed_tasks.exists():
        total_duration = sum([task.duration for task in completed_tasks])
        avg_duration = total_duration / completed_tasks.count()
    
    # Success rate
    total_tasks = TaskProgress.objects.filter(user=user, created_at__gte=start_date).count()
    success_count = completed_tasks.count()
    success_rate = (success_count / total_tasks * 100) if total_tasks > 0 else 0
    
    # Task performance by category
    category_performance = []
    for category in TaskCategory:
        category_tasks = TaskProgress.objects.filter(
            user=user,
            category=category.value,
            created_at__gte=start_date
        )
        
        if category_tasks.exists():
            category_completed = category_tasks.filter(status=TaskStatus.SUCCESS)
            category_success_rate = (category_completed.count() / category_tasks.count() * 100)
            
            category_performance.append({
                'category': category.label,
                'total': category_tasks.count(),
                'completed': category_completed.count(),
                'success_rate': round(category_success_rate, 2),
            })
    
    return Response({
        'message': 'Performance metrics retrieved successfully',
        'data': {
            'avg_task_duration': round(avg_duration, 2),
            'success_rate': round(success_rate, 2),
            'total_tasks': total_tasks,
            'completed_tasks': success_count,
            'category_performance': category_performance,
        }
    }, status=status.HTTP_200_OK)
