from django.contrib import admin
from .models import Case


@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display = ('title', 'status', 'owner', 'created_at')
    list_filter = ('status',)
    search_fields = ('title', 'client_name', 'description')
