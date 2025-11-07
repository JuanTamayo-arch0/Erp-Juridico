from django.db import models
from django.conf import settings


class Task(models.Model):
    STATUS_CHOICES = [
        ('todo', 'To Do'),
        ('in_progress', 'In Progress'),
        ('done', 'Done'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    case = models.ForeignKey('backend_cases.Case', on_delete=models.CASCADE, related_name='tasks', null=True, blank=True)
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_tasks')
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='todo')
    # Peso o puntaje de la tarea (usado para la carga de trabajo).
    # Permite que un admin ajuste la "importancia" relativa de esta tarea.
    weight = models.DecimalField(max_digits=5, decimal_places=2, default=1.0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.status})"
