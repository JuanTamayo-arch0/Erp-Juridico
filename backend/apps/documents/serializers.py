from rest_framework import serializers
from .models import Document


class DocumentVersionSerializer(serializers.ModelSerializer):
    uploaded_by_display = serializers.SerializerMethodField()

    class Meta:
        model = getattr(__import__('backend.apps.documents.models', fromlist=['DocumentVersion']), 'DocumentVersion')
        fields = ['id', 'document', 'title', 'key', 'url', 'uploaded_by', 'uploaded_by_display', 'created_at']
        read_only_fields = ['id', 'created_at', 'uploaded_by', 'uploaded_by_display']

    def get_uploaded_by_display(self, obj):
        if obj.uploaded_by:
            return getattr(obj.uploaded_by, 'get_full_name', lambda: str(obj.uploaded_by))()
        return None


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ['id', 'title', 'key', 'url', 'case', 'uploaded_by', 'created_at']
        read_only_fields = ['id', 'created_at', 'uploaded_by']


class DocumentVersionSerializer(serializers.ModelSerializer):
    uploaded_by_display = serializers.SerializerMethodField()

    class Meta:
        model = getattr(__import__('backend.apps.documents.models', fromlist=['DocumentVersion']), 'DocumentVersion')
        fields = ['id', 'document', 'title', 'key', 'url', 'uploaded_by', 'uploaded_by_display', 'created_at']
        read_only_fields = ['id', 'created_at', 'uploaded_by', 'uploaded_by_display']

    def get_uploaded_by_display(self, obj):
        if obj.uploaded_by:
            return getattr(obj.uploaded_by, 'get_full_name', lambda: str(obj.uploaded_by))()
        return None
