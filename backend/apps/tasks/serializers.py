from rest_framework import serializers
from .models import Task


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ['id', 'title', 'description', 'case', 'assigned_to', 'created_by', 'due_date', 'status', 'weight', 'created_at']
        read_only_fields = ['id', 'created_by', 'created_at']
