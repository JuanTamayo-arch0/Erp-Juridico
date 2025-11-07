from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q
from .models import Task
from .serializers import TaskSerializer
from backend.apps.cases.utils import cases_accessible_by


class TaskViewSet(viewsets.ModelViewSet):
    """Task viewset. By default non-elevated users only see tasks related to cases
    where they are the owner or an active responsible. Elevated roles (admin, staff, partner)
    can see all tasks.
    """
    queryset = Task.objects.all().order_by('-created_at')
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        """Fetch task by pk and enforce object-level access based on the task's case.
        This allows detail operations (/tasks/{id}/) without requiring the ?case param,
        while ensuring only participants of the case can access.
        """
        obj = Task.objects.select_related('case').get(pk=self.kwargs['pk'])
        # task must belong to a case to be part of a per-case board
        if getattr(obj, 'case_id', None) is None:
            raise PermissionDenied('Task is not associated to a case')

        from backend.apps.cases.models import Case
        user = self.request.user
        if not cases_accessible_by(user, Case.objects.filter(id=obj.case_id)).exists():
            # allow users who left this case to read tasks up to left_at
            from backend.apps.cases.models import CaseResponsible
            left = CaseResponsible.objects.filter(case_id=obj.case_id, user=user, left_at__isnull=False).first()
            if not (left and self.request.method in ('GET', 'HEAD', 'OPTIONS') and obj.created_at <= left.left_at):
                raise PermissionDenied('You are not a participant of this case')
        return obj

    def get_queryset(self):
        user = self.request.user
        # Require a case filter to enforce per-case board isolation for listing
        case_param = self.request.query_params.get('case')
        if not case_param:
            # No board selected -> no tasks returned
            return Task.objects.none()

        try:
            case_id = int(case_param)
        except (TypeError, ValueError):
            return Task.objects.none()

        # Only allow tasks from cases the user can access
        from backend.apps.cases.models import Case, CaseResponsible
        accessible_cases = cases_accessible_by(user, Case.objects.all()).values('id')
        if Case.objects.filter(id=case_id, id__in=accessible_cases).exists():
            qs = Task.objects.filter(case_id=case_id).order_by('-created_at')
        else:
            # allow users who left the case to see tasks up to left_at
            left = CaseResponsible.objects.filter(case_id=case_id, user=user, left_at__isnull=False).first()
            if left and left.left_at:
                qs = Task.objects.filter(case_id=case_id, created_at__lte=left.left_at).order_by('-created_at')
            else:
                qs = Task.objects.none()
        return qs

    def perform_create(self, serializer):
        # ensure user can create a task for the target case and that case is provided
        case = serializer.validated_data.get('case')
        user = self.request.user
        if case is None:
            raise PermissionDenied('Tasks must belong to a case (per-case boards)')
        # Staff can always create; others must be owner or active responsible of the case
        if not getattr(user, 'is_staff', False):
            owner_ok = getattr(case, 'owner_id', None) == user.id
            responsible_ok = case.responsibles.filter(user=user, left_at__isnull=True).exists()
            if not (owner_ok or responsible_ok):
                raise PermissionDenied('You are not a participant of the target case')
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        # similar check when updating case association
        case = serializer.validated_data.get('case')
        user = self.request.user
        if case is not None and not getattr(user, 'is_staff', False):
            owner_ok = getattr(case, 'owner_id', None) == user.id
            responsible_ok = case.responsibles.filter(user=user, left_at__isnull=True).exists()
            if not (owner_ok or responsible_ok):
                raise PermissionDenied('You are not a participant of the target case')
        return super().perform_update(serializer)

    @action(detail=False, methods=['get'], url_path='workload')
    def workload(self, request):
        """Aggregate workload per assigned user across accessible cases.

        Query params:
        - case: optional case id to restrict.
        - user: optional user id to restrict to a single assignee in the output.
        - include_done: if '1', include done; otherwise exclude done.
        Returns list of { user_id, count, todo, in_progress, done, overdue, score, user? }.
        """
        # determine accessible cases
        from backend.apps.cases.models import Case
        user = request.user
        # HR, staff, admin and partner can see toda la carga (todas los casos)
        try:
            role_names = [r.name for r in getattr(user, 'roles', []).all()]
        except Exception:
            role_names = []
        if getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False) or 'admin' in role_names or 'partner' in role_names or 'hr' in role_names:
            base_cases = Case.objects.all()
        else:
            base_cases = cases_accessible_by(user, Case.objects.all())
        case_param = request.query_params.get('case')
        user_param = request.query_params.get('user')
        include_done = request.query_params.get('include_done') in ('1','true','True')

        qs = Task.objects.filter(case_id__in=base_cases.values('id'))
        if case_param:
            try:
                cid = int(case_param)
                qs = qs.filter(case_id=cid)
            except (TypeError, ValueError):
                return Response([])
        if user_param:
            try:
                uid = int(user_param)
                qs = qs.filter(assigned_to_id=uid)
            except (TypeError, ValueError):
                return Response([])
        if not include_done:
            qs = qs.exclude(status='done')

        # build counts and weighted score per assigned_to
        from django.utils import timezone
        today = timezone.localdate() if hasattr(timezone, 'localdate') else timezone.now().date()
        data = {}
        for t in qs.values('assigned_to_id', 'status', 'due_date', 'weight'):
            uid = t['assigned_to_id'] or 0
            if uid not in data:
                data[uid] = {'user_id': uid, 'count': 0, 'todo': 0, 'in_progress': 0, 'done': 0, 'overdue': 0, 'score': 0.0}
            data[uid]['count'] += 1
            st = t['status']
            data[uid][st] = data[uid].get(st, 0) + 1
            # compute score as weekly hours approximation: sum of task weights
            # (only includes 'done' when include_done was requested above).
            try:
                base_weight = float(t.get('weight') or 1.0)
            except Exception:
                base_weight = 1.0
            data[uid]['score'] = round(data[uid].get('score', 0.0) + base_weight, 2)
            # track overdue count (for display only, not part of hours)
            due = t.get('due_date')
            if due and st != 'done' and due < today:
                data[uid]['overdue'] = data[uid].get('overdue', 0) + 1

        # enrich with basic user info (name, username, avatar) for convenience
        user_ids = [uid for uid in data.keys() if uid]
        if user_ids:
            try:
                from backend.apps.users.models import User
                users = {u.id: u for u in User.objects.filter(id__in=user_ids)}
                for uid, item in data.items():
                    if uid == 0:
                        item['user'] = None
                        continue
                    u = users.get(uid)
                    if u:
                        full_name = (f"{u.first_name} {u.last_name}".strip() or u.username)
                        item['user'] = {
                            'id': u.id,
                            'username': u.username,
                            'name': full_name,
                            'avatar': u.avatar.url if getattr(u, 'avatar', None) else None,
                        }
                    else:
                        item['user'] = {'id': uid}
            except Exception:
                # If anything goes wrong, fall back without user info
                pass

        # return as list sorted by score desc (then count)
        out = sorted(data.values(), key=lambda x: (x['score'], x['count']), reverse=True)
        return Response(out)
