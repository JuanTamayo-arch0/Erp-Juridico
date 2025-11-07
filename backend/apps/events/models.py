from django.db import models
from django.conf import settings


class Event(models.Model):
    """Audiencia / calendar event linked to a Case."""
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    case = models.ForeignKey('backend_cases.Case', on_delete=models.CASCADE, related_name='events', null=True, blank=True)
    TYPE_CHOICES = [
        ('audiencia', 'Audiencia'),
        ('plazo', 'Plazo / Deadline'),
        ('tarea', 'Tarea'),
        ('otro', 'Otro'),
    ]
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='otro')
    start = models.DateTimeField()
    end = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_events')
    assignee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_events')
    remind_at = models.DateTimeField(null=True, blank=True)
    reminded = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-start']

    def __str__(self):
        return f"{self.title} ({self.start.isoformat()})"


class Notification(models.Model):
    """Simple in-app notification tied to a user and optionally an event."""
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='notifications')
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='notifications', null=True, blank=True)
    message = models.TextField()
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification to {self.user_id}: {self.message[:40]}"
