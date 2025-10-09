from django.urls import path
from projects.views import (
    add_project_view, 
    archive_project, 
    delete_project, 
    edit_project_view, 
    get_all_archived_projects_view, 
    get_all_projects_view, 
    unarchive_project,
    get_project_detail_view,
    add_task_view,
    get_project_tasks_view,
    update_task_view,
    delete_task_view,
    add_note_view,
    get_project_notes_view,
    get_project_analytics_view,
    add_collaborator_view,
    remove_collaborator_view
)

app_name = "projects"

urlpatterns = [
    # Project Management
    path("add-new-project/", add_project_view, name="add_project_view"),
    path("get-all-projects/", get_all_projects_view, name="get_all_projects_view"),
    path("project/<int:project_id>/", get_project_detail_view, name="get_project_detail"),
    path("edit-project/", edit_project_view, name="edit_project_view"),
    path("archive-project/", archive_project, name="archive_project"),
    path("unarchive-project/", unarchive_project, name="unarchive_project"),
    path("get-all-archived-project/", get_all_archived_projects_view, name="get_all_archived_project_view"),
    path("delete-project/", delete_project, name="delete_project"),
    
    # Task Management
    path("add-task/", add_task_view, name="add_task"),
    path("project/<int:project_id>/tasks/", get_project_tasks_view, name="get_project_tasks"),
    path("update-task/", update_task_view, name="update_task"),
    path("delete-task/", delete_task_view, name="delete_task"),
    
    # Notes
    path("add-note/", add_note_view, name="add_note"),
    path("project/<int:project_id>/notes/", get_project_notes_view, name="get_project_notes"),
    
    # Analytics
    path("project/<int:project_id>/analytics/", get_project_analytics_view, name="get_project_analytics"),
    
    # Collaboration
    path("add-collaborator/", add_collaborator_view, name="add_collaborator"),
    path("remove-collaborator/", remove_collaborator_view, name="remove_collaborator"),
]
