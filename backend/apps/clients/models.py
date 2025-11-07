from django.db import models
from django.conf import settings


class Client(models.Model):
    name = models.CharField(max_length=255)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    mobile = models.CharField(max_length=50, blank=True)
    nit = models.CharField(max_length=64, blank=True)
    address = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_clients')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
