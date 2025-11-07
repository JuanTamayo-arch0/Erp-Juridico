from django.db import models
from django.conf import settings


class Document(models.Model):
    title = models.CharField(max_length=255)
    key = models.CharField(max_length=512, blank=True)
    url = models.CharField(max_length=1024, blank=True)
    # Reference the Case model using the app label. The Cases app AppConfig sets
    # label = 'backend_cases', so use 'backend_cases.Case' here to ensure the
    # lazy relation resolves correctly when migrations run.
    case = models.ForeignKey('backend_cases.Case', on_delete=models.CASCADE, related_name='documents', null=True, blank=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='uploaded_documents')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class DocumentVersion(models.Model):
    """Keep simple version history for Documents.

    Stores a reference to a stored file (key), an optional display title or
    notes, and who uploaded the version.
    """
    document = models.ForeignKey('backend_documents.Document', on_delete=models.CASCADE, related_name='versions')
    title = models.CharField(max_length=255, blank=True)
    key = models.CharField(max_length=512, blank=True)
    url = models.CharField(max_length=1024, blank=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='document_versions')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Version for {self.document_id} @ {self.created_at}"
