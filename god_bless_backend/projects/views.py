from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
from django.core.paginator import Paginator, PageNotAnInteger, EmptyPage
from django.db.models import Q, Count
from datetime import datetime

from projects.models import Project, ProjectTask, ProjectNote, ProjectActivity
from projects.serializers import (
    AllProjectsSerializer, 
    ProjectDetailSerializer,
    ProjectTaskSerializer,
    ProjectNoteSerializer,
    ProjectActivitySerializer
)

User = get_user_model()


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def add_project_view(request):
    payload = {}
    data = {}
    errors = {}

    if request.method == "POST":
        project_name = request.data.get("project_name", "")
        description = request.data.get("description", "")
        user_id = request.data.get("user_id", "")
        status_val = request.data.get("status", "planning")
        priority = request.data.get("priority", "medium")
        start_date = request.data.get("start_date", None)
        due_date = request.data.get("due_date", None)
        target_phone_count = request.data.get("target_phone_count", 0)
        target_sms_count = request.data.get("target_sms_count", 0)
        budget = request.data.get("budget", None)

        if not project_name:
            errors["project_name"] = ["Project Name is required."]
      
        if not user_id:
            errors["user_id"] = ["User ID is required."]

        try:
            user = User.objects.get(user_id=user_id)
        except:
            errors["user_id"] = ["User does not exist."]

        if Project.objects.filter(user=user, project_name=project_name).exists():
            errors["project_name"] = ["A Project with this name already exists."]

        if errors:
            payload["message"] = "Errors"
            payload["errors"] = errors
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        new_project = Project.objects.create(
            user=user,
            project_name=project_name,
            description=description,
            status=status_val,
            priority=priority,
            start_date=start_date,
            due_date=due_date,
            target_phone_count=target_phone_count,
            target_sms_count=target_sms_count,
            budget=budget
        )
        
        # Create activity log
        ProjectActivity.objects.create(
            project=new_project,
            user=user,
            activity_type='created',
            description=f'Project "{project_name}" was created'
        )

        serializer = ProjectDetailSerializer(new_project)
        payload["message"] = "Project added successfully"
        payload["data"] = serializer.data

    return Response(payload, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def get_all_projects_view(request):
    payload = {}
    data = {}
    errors = {}

    search_query = request.query_params.get("search", "")
    user_id = request.query_params.get("user_id", "")
    status_filter = request.query_params.get("status", "")
    priority_filter = request.query_params.get("priority", "")
    page_number = request.query_params.get("page", 1)
    page_size = int(request.query_params.get("page_size", 10))

    if not user_id:
        errors["user_id"] = ["User ID is required."]

    try:
        user = User.objects.get(user_id=user_id)
    except:
        errors["user_id"] = ["User does not exist."]
        
    if errors:
        payload["message"] = "Errors"
        payload["errors"] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    all_projects = Project.objects.filter(
        Q(user=user) | Q(collaborators=user),
        is_archived=False
    ).distinct()

    if search_query:
        all_projects = all_projects.filter(
            Q(project_name__icontains=search_query) | 
            Q(description__icontains=search_query)
        )
    
    if status_filter:
        all_projects = all_projects.filter(status=status_filter)
    
    if priority_filter:
        all_projects = all_projects.filter(priority=priority_filter)

    all_projects = all_projects.order_by('-created_at')
    
    paginator = Paginator(all_projects, page_size)

    try:
        paginated_projects = paginator.page(page_number)
    except PageNotAnInteger:
        paginated_projects = paginator.page(1)
    except EmptyPage:
        paginated_projects = paginator.page(paginator.num_pages)

    all_projects_serializer = AllProjectsSerializer(paginated_projects, many=True)

    data["projects"] = all_projects_serializer.data
    data["pagination"] = {
        "page_number": paginated_projects.number,
        "total_pages": paginator.num_pages,
        "total_count": paginator.count,
        "next": paginated_projects.next_page_number() if paginated_projects.has_next() else None,
        "previous": paginated_projects.previous_page_number() if paginated_projects.has_previous() else None,
    }

    payload["message"] = "Successful"
    payload["data"] = data

    return Response(payload, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def get_project_detail_view(request, project_id):
    payload = {}
    errors = {}

    try:
        project = Project.objects.get(id=project_id)
    except Project.DoesNotExist:
        errors["project_id"] = ["Project does not exist."]
        payload["message"] = "Errors"
        payload["errors"] = errors
        return Response(payload, status=status.HTTP_404_NOT_FOUND)

    serializer = ProjectDetailSerializer(project)
    payload["message"] = "Successful"
    payload["data"] = serializer.data

    return Response(payload, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def edit_project_view(request):
    payload = {}
    data = {}
    errors = {}

    if request.method == "POST":
        project_id = request.data.get("project_id", "")
        project_name = request.data.get("project_name", "")
        description = request.data.get("description", "")
        status_val = request.data.get("status", "")
        priority = request.data.get("priority", "")
        start_date = request.data.get("start_date", None)
        due_date = request.data.get("due_date", None)
        target_phone_count = request.data.get("target_phone_count", None)
        target_sms_count = request.data.get("target_sms_count", None)
        budget = request.data.get("budget", None)

        if not project_id:
            errors["project_id"] = ["Project ID is required."]

        try:
            project = Project.objects.get(id=project_id)
        except:
            errors["project_id"] = ["Project does not exist."]

        if errors:
            payload["message"] = "Errors"
            payload["errors"] = errors
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        changes = []
        
        if project_name and project_name != project.project_name:
            if Project.objects.filter(user=project.user, project_name=project_name).exclude(id=project_id).exists():
                errors["project_name"] = ["A Project with this name already exists."]
                payload["message"] = "Errors"
                payload["errors"] = errors
                return Response(payload, status=status.HTTP_400_BAD_REQUEST)
            project.project_name = project_name
            changes.append("name")
            
        if description is not None:
            project.description = description
            changes.append("description")
            
        if status_val and status_val != project.status:
            old_status = project.status
            project.status = status_val
            changes.append(f"status from {old_status} to {status_val}")
            
            # Log status change
            ProjectActivity.objects.create(
                project=project,
                user=request.user,
                activity_type='status_changed',
                description=f'Status changed from {old_status} to {status_val}'
            )
            
        if priority:
            project.priority = priority
            changes.append("priority")
            
        if start_date:
            project.start_date = start_date
            changes.append("start date")
            
        if due_date:
            project.due_date = due_date
            changes.append("due date")
            
        if target_phone_count is not None:
            project.target_phone_count = target_phone_count
            
        if target_sms_count is not None:
            project.target_sms_count = target_sms_count
            
        if budget is not None:
            project.budget = budget

        project.save()
        
        if changes:
            ProjectActivity.objects.create(
                project=project,
                user=request.user,
                activity_type='updated',
                description=f'Project updated: {", ".join(changes)}'
            )

        serializer = ProjectDetailSerializer(project)
        payload["message"] = "Successful"
        payload["data"] = serializer.data

    return Response(payload)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def archive_project(request):
    payload = {}
    data = {}
    errors = {}

    if request.method == "POST":
        project_id = request.data.get("project_id", "")

        if not project_id:
            errors["project_id"] = ["Project ID is required."]

        try:
            project = Project.objects.get(id=project_id)
        except:
            errors["project_id"] = ["Project does not exist."]

        if errors:
            payload["message"] = "Errors"
            payload["errors"] = errors
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        project.is_archived = True
        project.save()

        payload["message"] = "Successful"
        payload["data"] = data

    return Response(payload)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def unarchive_project(request):
    payload = {}
    data = {}
    errors = {}

    if request.method == "POST":
        project_id = request.data.get("project_id", "")

        if not project_id:
            errors["project_id"] = ["Project ID is required."]

        try:
            project = Project.objects.get(id=project_id)
        except:
            errors["project_id"] = ["Project does not exist."]

        if errors:
            payload["message"] = "Errors"
            payload["errors"] = errors
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        project.is_archived = False
        project.save()

        payload["message"] = "Successful"
        payload["data"] = data

    return Response(payload)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def delete_project(request):
    payload = {}
    data = {}
    errors = {}

    if request.method == "POST":
        project_id = request.data.get("project_id", "")

        if not project_id:
            errors["project_id"] = ["Project ID is required."]

        try:
            project = Project.objects.get(id=project_id)
        except:
            errors["project_id"] = ["Project does not exist."]

        if errors:
            payload["message"] = "Errors"
            payload["errors"] = errors
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        project.delete()

        payload["message"] = "Successful"
        payload["data"] = data

    return Response(payload)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def get_all_archived_projects_view(request):
    payload = {}
    data = {}
    errors = {}

    search_query = request.query_params.get("search", "")
    user_id = request.query_params.get("user_id", "")
    page_number = request.query_params.get("page", 1)
    page_size = 10

    if not user_id:
        errors["user_id"] = ["User ID is required."]

    try:
        user = User.objects.get(user_id=user_id)
    except:
        errors["user_id"] = ["User does not exist."]
        
    if errors:
        payload["message"] = "Errors"
        payload["errors"] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    all_projects = Project.objects.filter(is_archived=True, user=user)

    if search_query:
        all_projects = all_projects.filter(Q(project_name__icontains=search_query))

    paginator = Paginator(all_projects, page_size)

    try:
        paginated_projects = paginator.page(page_number)
    except PageNotAnInteger:
        paginated_projects = paginator.page(1)
    except EmptyPage:
        paginated_projects = paginator.page(paginator.num_pages)

    all_projects_serializer = AllProjectsSerializer(paginated_projects, many=True)

    data["projects"] = all_projects_serializer.data
    data["pagination"] = {
        "page_number": paginated_projects.number,
        "total_pages": paginator.num_pages,
        "next": paginated_projects.next_page_number() if paginated_projects.has_next() else None,
        "previous": paginated_projects.previous_page_number() if paginated_projects.has_previous() else None,
    }

    payload["message"] = "Successful"
    payload["data"] = data

    return Response(payload, status=status.HTTP_200_OK)


# Task Management Views
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def add_task_view(request):
    payload = {}
    errors = {}

    project_id = request.data.get("project_id", "")
    title = request.data.get("title", "")
    description = request.data.get("description", "")
    priority = request.data.get("priority", "medium")
    due_date = request.data.get("due_date", None)
    assigned_to_id = request.data.get("assigned_to", None)

    if not project_id:
        errors["project_id"] = ["Project ID is required."]
    if not title:
        errors["title"] = ["Title is required."]

    try:
        project = Project.objects.get(id=project_id)
    except:
        errors["project_id"] = ["Project does not exist."]

    if errors:
        payload["message"] = "Errors"
        payload["errors"] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    assigned_to = None
    if assigned_to_id:
        try:
            assigned_to = User.objects.get(id=assigned_to_id)
        except:
            pass

    task = ProjectTask.objects.create(
        project=project,
        title=title,
        description=description,
        priority=priority,
        due_date=due_date,
        assigned_to=assigned_to,
        created_by=request.user
    )
    
    # Log activity
    ProjectActivity.objects.create(
        project=project,
        user=request.user,
        activity_type='task_added',
        description=f'Task "{title}" was added'
    )

    serializer = ProjectTaskSerializer(task)
    payload["message"] = "Task added successfully"
    payload["data"] = serializer.data

    return Response(payload, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def get_project_tasks_view(request, project_id):
    payload = {}
    errors = {}

    try:
        project = Project.objects.get(id=project_id)
    except:
        errors["project_id"] = ["Project does not exist."]
        payload["message"] = "Errors"
        payload["errors"] = errors
        return Response(payload, status=status.HTTP_404_NOT_FOUND)

    status_filter = request.query_params.get("status", "")
    tasks = project.tasks.all()
    
    if status_filter:
        tasks = tasks.filter(status=status_filter)

    serializer = ProjectTaskSerializer(tasks, many=True)
    payload["message"] = "Successful"
    payload["data"] = serializer.data

    return Response(payload, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def update_task_view(request):
    payload = {}
    errors = {}

    task_id = request.data.get("task_id", "")
    title = request.data.get("title", "")
    description = request.data.get("description", "")
    status_val = request.data.get("status", "")
    priority = request.data.get("priority", "")
    due_date = request.data.get("due_date", None)

    if not task_id:
        errors["task_id"] = ["Task ID is required."]

    try:
        task = ProjectTask.objects.get(id=task_id)
    except:
        errors["task_id"] = ["Task does not exist."]

    if errors:
        payload["message"] = "Errors"
        payload["errors"] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    if title:
        task.title = title
    if description is not None:
        task.description = description
    if status_val:
        old_status = task.status
        task.status = status_val
        if status_val == 'completed' and old_status != 'completed':
            task.completed_date = datetime.now()
            ProjectActivity.objects.create(
                project=task.project,
                user=request.user,
                activity_type='task_completed',
                description=f'Task "{task.title}" was completed'
            )
    if priority:
        task.priority = priority
    if due_date:
        task.due_date = due_date

    task.save()

    serializer = ProjectTaskSerializer(task)
    payload["message"] = "Task updated successfully"
    payload["data"] = serializer.data

    return Response(payload, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def delete_task_view(request):
    payload = {}
    errors = {}

    task_id = request.data.get("task_id", "")

    if not task_id:
        errors["task_id"] = ["Task ID is required."]

    try:
        task = ProjectTask.objects.get(id=task_id)
    except:
        errors["task_id"] = ["Task does not exist."]

    if errors:
        payload["message"] = "Errors"
        payload["errors"] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    task.delete()

    payload["message"] = "Task deleted successfully"
    payload["data"] = {}

    return Response(payload, status=status.HTTP_200_OK)


# Note Management Views
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def add_note_view(request):
    payload = {}
    errors = {}

    project_id = request.data.get("project_id", "")
    content = request.data.get("content", "")

    if not project_id:
        errors["project_id"] = ["Project ID is required."]
    if not content:
        errors["content"] = ["Content is required."]

    try:
        project = Project.objects.get(id=project_id)
    except:
        errors["project_id"] = ["Project does not exist."]

    if errors:
        payload["message"] = "Errors"
        payload["errors"] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    note = ProjectNote.objects.create(
        project=project,
        user=request.user,
        content=content
    )
    
    # Log activity
    ProjectActivity.objects.create(
        project=project,
        user=request.user,
        activity_type='note_added',
        description=f'Note was added by {request.user.username}'
    )

    serializer = ProjectNoteSerializer(note)
    payload["message"] = "Note added successfully"
    payload["data"] = serializer.data

    return Response(payload, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def get_project_notes_view(request, project_id):
    payload = {}
    errors = {}

    try:
        project = Project.objects.get(id=project_id)
    except:
        errors["project_id"] = ["Project does not exist."]
        payload["message"] = "Errors"
        payload["errors"] = errors
        return Response(payload, status=status.HTTP_404_NOT_FOUND)

    notes = project.notes.all()
    serializer = ProjectNoteSerializer(notes, many=True)
    
    payload["message"] = "Successful"
    payload["data"] = serializer.data

    return Response(payload, status=status.HTTP_200_OK)


# Analytics Views
@api_view(["GET"])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def get_project_analytics_view(request, project_id):
    payload = {}
    errors = {}

    try:
        project = Project.objects.get(id=project_id)
    except:
        errors["project_id"] = ["Project does not exist."]
        payload["message"] = "Errors"
        payload["errors"] = errors
        return Response(payload, status=status.HTTP_404_NOT_FOUND)

    analytics = {
        'task_stats': project.task_stats,
        'phone_stats': project.phone_stats,
        'sms_stats': project.sms_stats,
        'progress': {
            'phone_progress': (project.phone_stats['total'] / project.target_phone_count * 100) if project.target_phone_count > 0 else 0,
            'sms_progress': (project.sms_stats['total'] / project.target_sms_count * 100) if project.target_sms_count > 0 else 0,
        }
    }

    payload["message"] = "Successful"
    payload["data"] = analytics

    return Response(payload, status=status.HTTP_200_OK)


# Collaboration Views
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def add_collaborator_view(request):
    payload = {}
    errors = {}

    project_id = request.data.get("project_id", "")
    user_id = request.data.get("user_id", "")

    if not project_id:
        errors["project_id"] = ["Project ID is required."]
    if not user_id:
        errors["user_id"] = ["User ID is required."]

    try:
        project = Project.objects.get(id=project_id)
    except:
        errors["project_id"] = ["Project does not exist."]

    try:
        user = User.objects.get(user_id=user_id)
    except:
        errors["user_id"] = ["User does not exist."]

    if errors:
        payload["message"] = "Errors"
        payload["errors"] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    project.collaborators.add(user)
    
    # Log activity
    ProjectActivity.objects.create(
        project=project,
        user=request.user,
        activity_type='collaborator_added',
        description=f'{user.username} was added as a collaborator'
    )

    payload["message"] = "Collaborator added successfully"
    payload["data"] = {}

    return Response(payload, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def remove_collaborator_view(request):
    payload = {}
    errors = {}

    project_id = request.data.get("project_id", "")
    user_id = request.data.get("user_id", "")

    if not project_id:
        errors["project_id"] = ["Project ID is required."]
    if not user_id:
        errors["user_id"] = ["User ID is required."]

    try:
        project = Project.objects.get(id=project_id)
    except:
        errors["project_id"] = ["Project does not exist."]

    try:
        user = User.objects.get(user_id=user_id)
    except:
        errors["user_id"] = ["User does not exist."]

    if errors:
        payload["message"] = "Errors"
        payload["errors"] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    project.collaborators.remove(user)

    payload["message"] = "Collaborator removed successfully"
    payload["data"] = {}

    return Response(payload, status=status.HTTP_200_OK)

