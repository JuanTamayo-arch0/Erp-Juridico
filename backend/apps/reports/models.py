from django.db import models
from django.conf import settings


class ReportTemplate(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='report_templates')
    filters = models.JSONField(default=dict, blank=True)
    schedule = models.CharField(max_length=100, blank=True, null=True, help_text='Optional cron or schedule identifier')
    last_run = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.owner})"
