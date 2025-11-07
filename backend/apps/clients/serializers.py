from rest_framework import serializers
from .models import Client


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ['id', 'name', 'email', 'phone', 'mobile', 'nit', 'address', 'notes', 'created_by', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate_nit(self, value):
        if not value:
            return value
        # simple normalization: strip spaces
        v = value.strip()
        if len(v) > 64:
            raise serializers.ValidationError('NIT demasiado largo')
        return v
