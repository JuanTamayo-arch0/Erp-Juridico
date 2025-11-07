from rest_framework.permissions import BasePermission
from typing import Tuple
from django.contrib.contenttypes.models import ContentType


def _action_to_codename(action: str) -> str:
    """Map DRF action to permission codename prefix (add/change/view/delete).

    list/retrieve -> view
    create -> add
    update/partial_update -> change
    destroy -> delete
    """
    if action in ('list', 'retrieve'):
        return 'view'
    if action == 'create':
        return 'add'
    if action in ('update', 'partial_update'):
        return 'change'
    if action == 'destroy':
        return 'delete'
    # default to view for unknown actions
    return 'view'


class RoleBasedPermission(BasePermission):
    """Permission class that enforces a simple role->capability mapping.

    This intentionally mirrors the seed_role_permissions mapping used during
    bootstrap. It does not rely on Role.permissions stored in the DB so it
    works even if Role has no permissions M2M.
    """

    # mapping: role -> list of (app_label, model, [actions])
    MAPPINGS = {
        'admin': 'ALL',
        'partner': [
            ('backend_cases', 'case', ['add', 'change', 'view', 'delete']),
            ('backend_clients', 'client', ['add', 'change', 'view']),
            ('backend_documents', 'document', ['add', 'change', 'view']),
            ('events', 'event', ['add', 'change', 'view', 'delete']),
            ('tasks', 'task', ['add', 'change', 'view', 'delete']),
        ],
        'associate': [
            ('backend_cases', 'case', ['add', 'change', 'view']),
            ('backend_clients', 'client', ['add', 'change', 'view']),
            ('events', 'event', ['add', 'change', 'view']),
            # Allow associates to view/change tasks so they can use case kanban
            ('tasks', 'task', ['view', 'change']),
        ],
        'paralegal': [
            ('backend_cases', 'case', ['view']),
            ('backend_documents', 'document', ['view']),
            ('tasks', 'task', ['view', 'change']),
        ],
        'client': [
            ('backend_cases', 'case', ['view']),
        ],
        'hr': [
            # Gestión de usuarios (ver/crear/editar)
            ('users', 'user', ['view', 'add', 'change']),
            # Roles (ver/crear/editar) — podemos reducir a solo 'view' si se requiere
            ('users', 'role', ['view', 'add', 'change']),
            # Gestión de clientes (ver/crear/editar)
            ('backend_clients', 'client', ['view', 'add', 'change']),
        ],
    }

    def has_permission(self, request, view) -> bool:
        # allow unauthenticated checks to be handled by IsAuthenticated
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return False

        # superuser bypass
        if getattr(user, 'is_superuser', False):
            return True

        # gather role names
        role_qs = getattr(user, 'roles', None)
        role_names = []
        if role_qs is not None:
            try:
                role_names = [r.name for r in role_qs.all()]
            except Exception:
                # roles may be an iterable-like attribute in some contexts
                try:
                    role_names = [r.name for r in role_qs]
                except Exception:
                    role_names = []

        # admin role bypass
        if 'admin' in role_names:
            return True

        # determine target app_label/model
        model = None
        app_label = None
        # For viewsets, prefer queryset.model; fallback to serializer.Meta.model
        queryset = getattr(view, 'queryset', None)
        if queryset is not None and hasattr(queryset, 'model'):
            model = queryset.model
        else:
            serializer_class = getattr(view, 'serializer_class', None)
            if serializer_class is not None:
                meta = getattr(serializer_class, 'Meta', None)
                if meta is not None and hasattr(meta, 'model'):
                    model = getattr(meta, 'model')

        if model is None:
            # for non-model views (like presign) deny if no role grants access
            return False

        app_label = model._meta.app_label
        model_name = model._meta.model_name

        # determine required action prefix
        action = getattr(view, 'action', None) or ''
        # For APIViews we may inspect the request method
        if not action and hasattr(view, 'request'):
            method = request.method.upper()
            if method == 'GET':
                action = 'retrieve'
            elif method == 'POST':
                action = 'create'
            elif method in ('PUT', 'PATCH'):
                action = 'update'
            elif method == 'DELETE':
                action = 'destroy'

        codename_action = _action_to_codename(action)

        # check DB-driven permissions first: if any role grants the exact permission
        required_codename = f"{codename_action}_{model_name}"
        for rn in role_names:
            try:
                role_obj = user.roles.filter(name=rn).first()
            except Exception:
                role_obj = None
            if not role_obj:
                continue
            # if role has permissions set in DB, use that
            try:
                if role_obj.permissions.filter(codename=required_codename, content_type__app_label=app_label).exists():
                    return True
            except Exception:
                # fall back to in-memory mapping below
                pass

        # fallback to in-code MAPPINGS (useful during bootstrap)
        for rn in role_names:
            perms = self.MAPPINGS.get(rn)
            if not perms:
                continue
            if perms == 'ALL':
                return True
            for (a_label, a_model, actions) in perms:
                if a_label == app_label and a_model == model_name and codename_action in actions:
                    return True

        return False
