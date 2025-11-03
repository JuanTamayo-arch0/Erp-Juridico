from django.db import models


class AuditLog(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True)
    user = models.CharField(max_length=255, null=True, blank=True)
    action = models.CharField(max_length=255)
    object_type = models.CharField(max_length=128, null=True, blank=True)
    object_id = models.CharField(max_length=128, null=True, blank=True)
    details = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ['-timestamp']
