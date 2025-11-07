from rest_framework import serializers
from .models import Case


class CaseCommentSerializer(serializers.ModelSerializer):
    author_display = serializers.SerializerMethodField()

    class Meta:
        model = getattr(__import__('backend.apps.cases.models', fromlist=['CaseComment']), 'CaseComment')
        fields = ['id', 'case', 'author', 'author_display', 'content', 'created_at']
        read_only_fields = ['id', 'created_at', 'author', 'author_display']

    def get_author_display(self, obj):
        if obj.author:
            return getattr(obj.author, 'get_full_name', lambda: str(obj.author))()
        return None


class CaseSerializer(serializers.ModelSerializer):
    # embed read-only documents related to this case (if present)
    documents = serializers.SerializerMethodField()
    comments = serializers.SerializerMethodField()
    responsibles = serializers.SerializerMethodField()
    actuaciones = serializers.SerializerMethodField()
    left_at_for_me = serializers.SerializerMethodField()

    class Meta:
        model = Case
        fields = ['id', 'title', 'description', 'client_name', 'client', 'process_type', 'owner', 'status', 'created_at', 'updated_at', 'documents', 'comments', 'responsibles', 'actuaciones', 'left_at_for_me']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_documents(self, obj):
        # import locally to avoid circular import issues
        try:
            from backend.apps.documents.serializers import DocumentSerializer
        except Exception:
            return []
        qs = getattr(obj, 'documents', None)
        if qs is None:
            return []
        # If the requesting user left the case, apply a cutoff at left_at
        request = self.context.get('request') if isinstance(self.context, dict) else None
        if request is not None and getattr(request, 'user', None):
            try:
                from backend.apps.cases.models import CaseResponsible
                left = CaseResponsible.objects.filter(case=obj, user=request.user, left_at__isnull=False).first()
                if left and left.left_at:
                    qs = qs.filter(created_at__lte=left.left_at)
            except Exception:
                pass
        return DocumentSerializer(qs.all(), many=True, context=self.context).data

    def get_comments(self, obj):
        qs = getattr(obj, 'comments', None)
        if qs is None:
            return []
        # Apply left_at cutoff for users who already left this case
        request = self.context.get('request') if isinstance(self.context, dict) else None
        if request is not None and getattr(request, 'user', None):
            try:
                from backend.apps.cases.models import CaseResponsible
                left = CaseResponsible.objects.filter(case=obj, user=request.user, left_at__isnull=False).first()
                if left and left.left_at:
                    qs = qs.filter(created_at__lte=left.left_at)
            except Exception:
                pass
        return CaseCommentSerializer(qs.order_by('-created_at')[:20], many=True, context=self.context).data

    def get_responsibles(self, obj):
        qs = getattr(obj, 'responsibles', None)
        if qs is None:
            return []
        # avoid importing user serializers here to prevent import-time errors
        data = []
        for r in qs.filter(left_at__isnull=True).all():
            data.append({
                'id': r.id,
                'user': r.user_id,
                'user_display': getattr(r.user, 'get_full_name', lambda: str(r.user))(),
                'role': r.role,
                'assigned_at': r.assigned_at,
                'left_at': r.left_at,
            })
        return data

    def get_actuaciones(self, obj):
        qs = getattr(obj, 'actuaciones', None)
        if qs is None:
            return []
        # Apply left_at cutoff for users who already left this case
        request = self.context.get('request') if isinstance(self.context, dict) else None
        if request is not None and getattr(request, 'user', None):
            try:
                from backend.apps.cases.models import CaseResponsible
                left = CaseResponsible.objects.filter(case=obj, user=request.user, left_at__isnull=False).first()
                if left and left.left_at:
                    qs = qs.filter(created_at__lte=left.left_at)
            except Exception:
                pass
        out = []
        for a in qs.all().order_by('-created_at')[:50]:
            out.append({
                'id': a.id,
                'actor': a.actor_id,
                'actor_display': getattr(a.actor, 'get_full_name', lambda: str(a.actor))(),
                'action_type': a.action_type,
                'details': a.details,
                'created_at': a.created_at,
            })
        return out

    def get_left_at_for_me(self, obj):
        request = self.context.get('request') if isinstance(self.context, dict) else None
        if not request or not getattr(request, 'user', None):
            return None
        try:
            from backend.apps.cases.models import CaseResponsible
            left = CaseResponsible.objects.filter(case=obj, user=request.user, left_at__isnull=False).first()
            return getattr(left, 'left_at', None)
        except Exception:
            return None

    def validate(self, attrs):
        """On create: require an existing Client. If only client_name is provided,
        resolve it to an existing Client by iexact; otherwise error.
        """
        # Only enforce on create
        if self.instance is None:
            client = attrs.get('client')
            client_name = (attrs.get('client_name') or '').strip()
            if client:
                # ensure snapshot matches
                if not client_name or client_name != getattr(client, 'name', ''):
                    attrs['client_name'] = getattr(client, 'name', client_name)
            else:
                if not client_name:
                    raise serializers.ValidationError({'client': 'Debe seleccionar un cliente existente o indicar un nombre válido.'})
                try:
                    from backend.apps.clients.models import Client
                    obj = Client.objects.filter(name__iexact=client_name).first()
                except Exception:
                    obj = None
                if not obj:
                    raise serializers.ValidationError({'client_name': 'El cliente indicado no existe.'})
                attrs['client'] = obj
                attrs['client_name'] = obj.name
        return attrs
