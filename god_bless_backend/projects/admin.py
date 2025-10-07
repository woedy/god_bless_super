from django.contrib import admin
from projects.models import Project, ProjectTask, ProjectNote, ProjectActivity


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['project_name', 'user', 'status', 'priority', 'created_at', 'is_archived']
    list_filter = ['status', 'priority', 'is_archived', 'created_at']
    search_fields = ['project_name', 'description', 'user__username']
    filter_horizontal = ['collaborators']
    date_hierarchy = 'created_at'


@admin.register(ProjectTask)
class ProjectTaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'project', 'status', 'priority', 'assigned_to', 'due_date', 'created_at']
    list_filter = ['status', 'priority', 'created_at']
    search_fields = ['title', 'description', 'project__project_name']
    date_hierarchy = 'created_at'


@admin.register(ProjectNote)
class ProjectNoteAdmin(admin.ModelAdmin):
    list_display = ['project', 'user', 'created_at']
    list_filter = ['created_at']
    search_fields = ['content', 'project__project_name', 'user__username']
    date_hierarchy = 'created_at'


@admin.register(ProjectActivity)
class ProjectActivityAdmin(admin.ModelAdmin):
    list_display = ['project', 'user', 'activity_type', 'created_at']
    list_filter = ['activity_type', 'created_at']
    search_fields = ['description', 'project__project_name', 'user__username']
    date_hierarchy = 'created_at'
