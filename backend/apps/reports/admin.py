from django.contrib import admin
from .models import ReportTemplate

@admin.register(ReportTemplate)
class ReportTemplateAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'owner', 'schedule', 'last_run', 'created_at')
    list_filter = ('owner',)
    search_fields = ('name', 'description')
