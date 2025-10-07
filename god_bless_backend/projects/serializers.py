from django.contrib.auth import get_user_model
from rest_framework import serializers
from projects.models import Project, ProjectTask, ProjectNote, ProjectActivity

User = get_user_model()


class UserBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'photo']


class ProjectTaskSerializer(serializers.ModelSerializer):
    assigned_to_details = UserBasicSerializer(source='assigned_to', read_only=True)
    created_by_details = UserBasicSerializer(source='created_by', read_only=True)
    
    class Meta:
        model = ProjectTask
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at', 'updated_at']


class ProjectNoteSerializer(serializers.ModelSerializer):
    user_details = UserBasicSerializer(source='user', read_only=True)
    
    class Meta:
        model = ProjectNote
        fields = '__all__'
        read_only_fields = ['user', 'created_at', 'updated_at']


class ProjectActivitySerializer(serializers.ModelSerializer):
    user_details = UserBasicSerializer(source='user', read_only=True)
    
    class Meta:
        model = ProjectActivity
        fields = '__all__'
        read_only_fields = ['user', 'created_at']


class ProjectDetailSerializer(serializers.ModelSerializer):
    collaborators_details = UserBasicSerializer(source='collaborators', many=True, read_only=True)
    user_details = UserBasicSerializer(source='user', read_only=True)
    task_stats = serializers.ReadOnlyField()
    phone_stats = serializers.ReadOnlyField()
    sms_stats = serializers.ReadOnlyField()
    tasks = ProjectTaskSerializer(many=True, read_only=True)
    recent_activities = serializers.SerializerMethodField()
    
    class Meta:
        model = Project
        fields = '__all__'
        
    def get_recent_activities(self, obj):
        activities = obj.activities.all()[:10]
        return ProjectActivitySerializer(activities, many=True).data


class AllProjectsSerializer(serializers.ModelSerializer):
    user_details = UserBasicSerializer(source='user', read_only=True)
    task_stats = serializers.SerializerMethodField()
    collaborators_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Project
        fields = [
            'id', 'user', 'user_details', 'project_name', 'description', 
            'status', 'priority', 'target_phone_count', 'target_sms_count',
            'budget', 'start_date', 'due_date', 'completed_date',
            'is_archived', 'active', 'created_at', 'updated_at',
            'task_stats', 'collaborators_count'
        ]
        
    def get_task_stats(self, obj):
        try:
            return obj.task_stats
        except Exception as e:
            print(f"Error getting task stats for project {obj.id}: {e}")
            return {
                'total': 0,
                'completed': 0,
                'in_progress': 0,
                'pending': 0,
                'completion_rate': 0
            }
        
    def get_collaborators_count(self, obj):
        try:
            return obj.collaborators.count()
        except Exception as e:
            print(f"Error getting collaborators count for project {obj.id}: {e}")
            return 0

