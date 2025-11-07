from rest_framework import serializers
from .models import Event, Notification


class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ['id', 'title', 'description', 'type', 'case', 'start', 'end', 'remind_at', 'reminded', 'created_by', 'assignee', 'created_at']
        read_only_fields = ['id', 'reminded', 'created_by', 'created_at']


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'user', 'event', 'message', 'read', 'created_at']
        read_only_fields = ['id', 'created_at']
