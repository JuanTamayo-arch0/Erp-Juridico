from django.contrib import admin
from .models import Task

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'case', 'assigned_to', 'status', 'due_date', 'weight', 'created_at')
    list_editable = ('weight',)
    search_fields = ('title', 'description')
    list_filter = ('status',)
