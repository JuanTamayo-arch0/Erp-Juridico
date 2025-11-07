from django.contrib import admin
from .models import Document


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('title', 'case', 'uploaded_by', 'created_at')
    search_fields = ('title', 'key', 'url')
