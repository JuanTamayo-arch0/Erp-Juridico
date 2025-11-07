from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from .models import Client
from .serializers import ClientSerializer
from backend.apps.users.permissions import RoleBasedPermission

# avoid hard import cycles; import Case related pieces lazily inside methods


class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all().order_by('-created_at')
    serializer_class = ClientSerializer
    permission_classes = [permissions.IsAuthenticated, RoleBasedPermission]

    def perform_create(self, serializer):
        if not serializer.validated_data.get('created_by'):
            serializer.save(created_by=self.request.user)
        else:
            serializer.save()

    @action(detail=True, methods=['get'], url_path='cases')
    def cases(self, request, pk=None):
        """Return cases for this client.

        Added fields:
        - participated: user is currently an active responsible (left_at is null)
        - participated_historical: user participated in the past (has a responsibility row with left_at set)
        - left_at_for_me: timestamp when the user left (if historical)
        These allow the frontend to present both current and historical involvement.
        """
        try:
            from backend.apps.cases.models import CaseResponsible
            from backend.apps.cases.models import Case as CaseModel
            from backend.apps.cases.utils import cases_accessible_by
            from django.db.models import Q
        except Exception:
            return Response({'detail': 'cases functionality not available'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        client = self.get_object()
        # Include cases by FK (client_id) OR by snapshot name match (client_name contains client's name)
        # Then restrict to cases accessible by the requesting user to avoid leaking data.
        name = (client.name or '').strip()
        base_q = Q(client_id=client.id)
        if name:
            # exact (case-insensitive) match on snapshot name
            base_q |= Q(client_name__iexact=name)
        raw_qs = CaseModel.objects.filter(base_q).order_by('-created_at').distinct()
        # HR y staff/admin pueden ver todos los casos del cliente; otros quedan restringidos a su alcance
        try:
            role_names = [r.name for r in getattr(request.user, 'roles', []).all()]
        except Exception:
            role_names = []
        if getattr(request.user, 'is_superuser', False) or getattr(request.user, 'is_staff', False) or 'admin' in role_names or 'partner' in role_names or 'hr' in role_names:
            qs = raw_qs
        else:
            qs = cases_accessible_by(request.user, raw_qs)

        # Return a lightweight representation to avoid heavy nesting in client UI.
        out = []
        seen_ids = set()
        for case_obj in qs[:200]:
            if case_obj.id in seen_ids:
                continue
            seen_ids.add(case_obj.id)
            participated = False
            participated_historical = False
            left_at_for_me = None
            try:
                resp_qs = CaseResponsible.objects.filter(case=case_obj, user=request.user)
                active = resp_qs.filter(left_at__isnull=True).first()
                historical = resp_qs.filter(left_at__isnull=False).order_by('-left_at').first()
                if active:
                    participated = True
                elif historical:
                    participated_historical = True
                    left_at_for_me = historical.left_at
            except Exception:
                pass

            out.append({
                'id': case_obj.id,
                'title': case_obj.title,
                'status': getattr(case_obj, 'status', None),
                'owner': getattr(case_obj.owner, 'id', None) if getattr(case_obj, 'owner', None) else None,
                'owner_display': getattr(case_obj.owner, 'get_full_name', lambda: str(case_obj.owner))() if getattr(case_obj, 'owner', None) else None,
                'created_at': case_obj.created_at,
                'participated': participated,
                'participated_historical': participated_historical,
                'left_at_for_me': left_at_for_me,
            })

        return Response(out)
