from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Event
from .serializers import EventSerializer, NotificationSerializer
from .models import Notification
from .tasks import schedule_event_reminder
from django.utils import timezone
from backend.apps.audit.models import AuditLog
from django.db import models
from backend.apps.cases.utils import cases_accessible_by
from backend.apps.cases.models import Case, CaseResponsible


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all().order_by('-start')
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = getattr(self.request, 'user', None)
        # Staff can see everything
        if getattr(user, 'is_staff', False):
            base = qs
        else:
            # Events linked to cases the user can access, or uncased events created/assigned to the user
            accessible_cases = cases_accessible_by(user, Case.objects.all()).values('id')
            base = qs.filter(
                models.Q(case_id__in=accessible_cases)
                | (models.Q(case__isnull=True) & (models.Q(created_by=user) | models.Q(assignee=user)))
            )

        # Filters
        case_id = self.request.query_params.get('case')
        only_mine = self.request.query_params.get('mine') in ('1', 'true', 'True')
        assignee = self.request.query_params.get('assignee')

        if case_id:
            # If active participant -> full access to events of the case
            if Case.objects.filter(id=case_id, id__in=cases_accessible_by(user, Case.objects.all()).values('id')).exists():
                base = base.filter(case_id=case_id)
            else:
                # If left the case -> allow only up to left_at cutoff
                left = CaseResponsible.objects.filter(case_id=case_id, user=user, left_at__isnull=False).first()
                if left and left.left_at:
                    base = base.filter(case_id=case_id, start__lte=left.left_at)
                else:
                    return qs.none()

        if only_mine:
            base = base.filter(models.Q(created_by=user) | models.Q(assignee=user))

        if assignee:
            try:
                base = base.filter(assignee_id=int(assignee))
            except ValueError:
                base = base.none()

        return base.order_by('-start')

    def perform_create(self, serializer):
        # validate case participation if a case is set
        case = serializer.validated_data.get('case')
        if case is not None and not getattr(self.request.user, 'is_staff', False):
            owner_ok = getattr(case, 'owner_id', None) == self.request.user.id
            responsible_ok = case.responsibles.filter(user=self.request.user, left_at__isnull=True).exists()
            if not (owner_ok or responsible_ok):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('You are not an active participant of the target case')

        # set creator
        ev = serializer.save(created_by=self.request.user)
        # audit
        try:
            AuditLog.objects.create(
                user=str(self.request.user),
                action='event.created',
                object_type='Event',
                object_id=str(ev.id),
                details={'title': ev.title, 'start': ev.start.isoformat()}
            )
        except Exception:
            pass
        # schedule reminder if requested
        if ev.remind_at:
            # ensure remind_at is timezone-aware
            eta = ev.remind_at
            if timezone.is_naive(eta):
                eta = timezone.make_aware(eta)
            schedule_event_reminder.apply_async(args=[ev.id], eta=eta)

    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    def perform_update(self, serializer):
        old = self.get_object()
        prev_remind_at = getattr(old, 'remind_at', None)

        # permission: if case event, must be active participant (or staff). For uncased, allow creator/assignee.
        user = self.request.user
        new_case = serializer.validated_data.get('case', old.case)
        if not getattr(user, 'is_staff', False):
            if new_case is not None:
                owner_ok = getattr(new_case, 'owner_id', None) == user.id
                responsible_ok = new_case.responsibles.filter(user=user, left_at__isnull=True).exists()
                if not (owner_ok or responsible_ok):
                    from rest_framework.exceptions import PermissionDenied
                    raise PermissionDenied('Only active participants can modify case events')
            else:
                if not (getattr(old, 'created_by_id', None) == user.id or getattr(old, 'assignee_id', None) == user.id):
                    from rest_framework.exceptions import PermissionDenied
                    raise PermissionDenied('Only creator or assignee can modify this event')

        ev = serializer.save()
        # audit update
        try:
            AuditLog.objects.create(
                user=str(self.request.user),
                action='event.updated',
                object_type='Event',
                object_id=str(ev.id),
                details={'title': ev.title, 'start': ev.start.isoformat()}
            )
        except Exception:
            pass
        # reschedule reminder if changed
        try:
            if ev.remind_at != prev_remind_at and ev.remind_at:
                eta = ev.remind_at
                if timezone.is_naive(eta):
                    eta = timezone.make_aware(eta)
                schedule_event_reminder.apply_async(args=[ev.id], eta=eta)
        except Exception:
            pass

    def destroy(self, request, *args, **kwargs):
        ev = self.get_object()
        user = request.user
        # permission: same rules as update
        if not getattr(user, 'is_staff', False):
            if ev.case_id:
                try:
                    case = Case.objects.get(id=ev.case_id)
                except Case.DoesNotExist:
                    case = None
                if case is not None:
                    owner_ok = getattr(case, 'owner_id', None) == user.id
                    responsible_ok = case.responsibles.filter(user=user, left_at__isnull=True).exists()
                    if not (owner_ok or responsible_ok):
                        return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)
            else:
                if not (getattr(ev, 'created_by_id', None) == user.id or getattr(ev, 'assignee_id', None) == user.id):
                    return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)

        eid = ev.id
        title = ev.title
        resp = super().destroy(request, *args, **kwargs)
        try:
            AuditLog.objects.create(
                user=str(request.user),
                action='event.deleted',
                object_type='Event',
                object_id=str(eid),
                details={'title': title}
            )
        except Exception:
            pass
        return resp


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only access for a user's notifications (in-app)."""
    queryset = Notification.objects.all().order_by('-created_at')
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # only return notifications for the requesting user
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark a single notification as read."""
        try:
            notif = self.get_queryset().get(pk=pk)
        except Notification.DoesNotExist:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        notif.read = True
        notif.save(update_fields=['read'])
        return Response({'ok': True})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications for the current user as read."""
        qs = self.get_queryset().filter(read=False)
        updated = qs.update(read=True)
        return Response({'ok': True, 'updated': updated})
