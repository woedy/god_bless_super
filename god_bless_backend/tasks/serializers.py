from rest_framework import serializers
from .models import TaskProgress


class TaskProgressSerializer(serializers.ModelSerializer):
    """Serializer for TaskProgress model"""
    
    duration = serializers.ReadOnlyField()
    is_complete = serializers.ReadOnlyField()
    
    class Meta:
        model = TaskProgress
        fields = [
            'task_id',
            'category',
            'status',
            'progress',
            'current_step',
            'total_items',
            'processed_items',
            'task_name',
            'task_args',
            'result_data',
            'error_message',
            'created_at',
            'started_at',
            'completed_at',
            'estimated_completion',
            'duration',
            'is_complete',
        ]
        read_only_fields = [
            'task_id',
            'created_at',
            'started_at',
            'completed_at',
            'duration',
            'is_complete',
        ]


class TaskProgressSummarySerializer(serializers.ModelSerializer):
    """Lightweight serializer for task summaries"""
    
    duration = serializers.ReadOnlyField()
    is_complete = serializers.ReadOnlyField()
    
    class Meta:
        model = TaskProgress
        fields = [
            'task_id',
            'category',
            'status',
            'progress',
            'current_step',
            'task_name',
            'created_at',
            'estimated_completion',
            'duration',
            'is_complete',
        ]