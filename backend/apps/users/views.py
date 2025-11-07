from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.auth.models import Permission
from .models import User, Role
from .serializers import UserSerializer, RoleSerializer
from backend.apps.users.permissions import RoleBasedPermission


class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated, RoleBasedPermission]

    def _ensure_base_roles(self):
        """Ensure base roles exist so the frontend can assign them without manual seeding."""
        base = [
            ('admin', 'Administrador del sistema'),
            ('partner', 'Socio'),
            ('associate', 'Abogado asociado'),
            ('paralegal', 'Auxiliar/Paralegal'),
            ('client', 'Usuario cliente'),
            ('hr', 'Recurso humano'),
        ]
        for name, desc in base:
            try:
                Role.objects.get_or_create(name=name, defaults={'description': desc})
            except Exception:
                # ignore race conditions or DB issues
                pass

    def get_queryset(self):
        # ensure roles before listing
        try:
            self._ensure_base_roles()
        except Exception:
            pass
        return super().get_queryset()

    def get_serializer(self, *args, **kwargs):
        # set permission queryset dynamically to avoid import-time issues
        serializer_class = self.get_serializer_class()
        kwargs.setdefault('context', self.get_serializer_context())
        ser = serializer_class(*args, **kwargs)
        # assign queryset for permissions field
        try:
            ser.fields['permissions'].queryset = Permission.objects.all()
        except Exception:
            pass
        return ser


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('username')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, RoleBasedPermission]

    def create(self, request, *args, **kwargs):
        # override to return generated password (if any) to the caller once
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        headers = self.get_success_headers(serializer.data)
        data = serializer.data
        # if serializer generated a password, include it in the response
        try:
            gen = getattr(user, '_generated_password', None)
            if gen:
                data = dict(data)
                data['generated_password'] = gen
        except Exception:
            pass
        return Response(data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['post'])
    def set_password(self, request, pk=None):
        user = self.get_object()
        pwd = request.data.get('password')
        if not pwd:
            return Response({'detail': 'password required'}, status=400)
        user.set_password(pwd)
        user.save()
        return Response({'ok': True})

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def avatar(self, request, pk=None):
        """Upload avatar for the specified user (admin or self)."""
        try:
            file = request.FILES.get('avatar')
            if not file:
                return Response({'detail': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
            user = self.get_object()
            # sanitize filename lightly
            import unicodedata, re, uuid
            name = file.name
            name = unicodedata.normalize('NFKD', name)
            name = name.encode('ascii', 'ignore').decode('ascii')
            name = name.replace(' ', '_')
            name = re.sub(r'[^A-Za-z0-9_.-]', '', name)
            if not name:
                name = str(uuid.uuid4())
            user.avatar.save(name, file, save=True)
            request_url = request.build_absolute_uri(user.avatar.url)
            return Response({'avatar': request_url})
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PermissionList(APIView):
    permission_classes = [permissions.IsAuthenticated, RoleBasedPermission]

    def get(self, request):
        perms = Permission.objects.select_related('content_type').all().order_by('content_type__app_label', 'codename')
        out = []
        for p in perms:
            out.append({
                'id': p.id,
                'codename': p.codename,
                'name': p.name,
                'app_label': p.content_type.app_label,
                'model': p.content_type.model,
            })
        return Response(out)
