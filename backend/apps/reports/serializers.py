from rest_framework import serializers
from .models import ReportTemplate


class ReportTemplateSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source='owner.id')

    class Meta:
        model = ReportTemplate
        fields = ['id', 'name', 'description', 'owner', 'filters', 'schedule', 'last_run', 'created_at', 'updated_at']
        read_only_fields = ['last_run', 'created_at', 'updated_at']
