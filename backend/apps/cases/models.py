from django.db import models
from django.db.models import Q
from django.conf import settings


class Case(models.Model):
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('closed', 'Closed'),
        ('archived', 'Archived'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    # keep a free-text client name for legacy/imported data and snapshots
    client_name = models.CharField(max_length=255, blank=True)
    # link to a Client record when available
    client = models.ForeignKey('backend_clients.Client', on_delete=models.SET_NULL, null=True, blank=True, related_name='cases')
    process_type = models.CharField(max_length=100, blank=True, null=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='cases')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.status})"


class CaseComment(models.Model):
    """Internal comments/messages attached to a Case for collaboration.

    These are intended for private, internal notes between users working on
    a case (not client-visible).
    """
    case = models.ForeignKey('backend_cases.Case', on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='case_comments')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Comment by {self.author} on {self.case_id}"


class CaseResponsible(models.Model):
    """Represents a user assigned to a case with a specific role.

    We keep assigned_at and left_at timestamps to allow producing a
    "snapshot" of a case as-of when a user left it.
    """
    case = models.ForeignKey('backend_cases.Case', on_delete=models.CASCADE, related_name='responsibles')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='case_responsibilities')
    role = models.CharField(max_length=100, blank=True)
    assigned_at = models.DateTimeField(auto_now_add=True)
    left_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('case', 'user')
        constraints = [
            # ensure at most one active principal per case
            models.UniqueConstraint(fields=['case'], condition=Q(role='principal', left_at__isnull=True), name='unique_principal_per_case')
        ]

    def __str__(self):
        return f"{self.user} on {self.case} ({self.role})"


class CaseActuacion(models.Model):
    """A recorded action / actuación / event related to a Case.

    This can be used to store the chronological history of things that
    happened on a case (events, filings, hearings, notes). The details
    field can encode a small JSON payload or free-form text.
    """
    case = models.ForeignKey('backend_cases.Case', on_delete=models.CASCADE, related_name='actuaciones')
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='case_actuaciones')
    action_type = models.CharField(max_length=100)
    details = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.action_type} @ {self.created_at} on {self.case_id}"
