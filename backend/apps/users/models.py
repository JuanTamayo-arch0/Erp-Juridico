from django.contrib.auth.models import AbstractUser, Permission
from django.db import models


class Role(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    # allow assigning Django permissions to roles
    permissions = models.ManyToManyField(Permission, blank=True, related_name='roles')

    def __str__(self):
        return self.name


class User(AbstractUser):
    roles = models.ManyToManyField(Role, blank=True, related_name='users')
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
