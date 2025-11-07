from rest_framework import viewsets, permissions
from rest_framework.permissions import SAFE_METHODS
from .models import Case
from .serializers import CaseSerializer
from backend.apps.audit.models import AuditLog


from rest_framework import mixins
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from .serializers import CaseCommentSerializer
from backend.apps.cases.models import CaseComment, CaseResponsible, CaseActuacion
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Q
from .utils import cases_accessible_by


class CaseCommentViewSet(mixins.CreateModelMixin,
                         mixins.ListModelMixin,
                         mixins.DestroyModelMixin,
                         viewsets.GenericViewSet):
    """Simple viewset for creating/listing/deleting case comments."""
    queryset = CaseComment.objects.all().order_by('-created_at')
    serializer_class = CaseCommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        # Ensure the user can comment on the target case
        target_case = serializer.validated_data.get('case')
        if target_case is None:
            raise PermissionDenied('case is required')
        from .models import Case  # local import to avoid circular issues
        if not cases_accessible_by(self.request.user, Case.objects.filter(id=target_case.id)).exists():
            raise PermissionDenied('you are not a participant of this case')

        comment = serializer.save(author=self.request.user)
        # write an audit entry
        try:
            AuditLog.objects.create(
                user=str(self.request.user),
                action='case.comment.created',
                object_type='Case',
                object_id=str(comment.case_id),
                details={'comment_id': comment.id}
            )
        except Exception:
            pass
        # also register an actuacion (save state)
        try:
            CaseActuacion.objects.create(
                case_id=comment.case_id,
                actor=self.request.user,
                action_type='case.comment.created',
                details={'comment_id': comment.id}
            )
        except Exception:
            pass
    
    def destroy(self, request, *args, **kwargs):
        comment = self.get_object()
        cid = comment.id
        case_id = comment.case_id
        # allow only admins, case principal, or the comment author to delete
        try:
            case = comment.case
            is_principal = CaseResponsible.objects.filter(case=case, user=request.user, role='principal', left_at__isnull=True).exists()
            if not (request.user.is_staff or is_principal or (comment.author and comment.author_id == request.user.id)):
                return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)
        except Exception:
            pass

        resp = super().destroy(request, *args, **kwargs)
        try:
            AuditLog.objects.create(
                user=str(request.user),
                action='case.comment.deleted',
                object_type='CaseComment',
                object_id=str(cid),
                details={'case_id': case_id}
            )
        except Exception:
            pass
        return resp
    
    def get_queryset(self):
        qs = super().get_queryset()
        # restrict to comments whose case is accessible by the current user
        user = getattr(self.request, 'user', None)
        from .models import Case  # local import to avoid circular issues
        accessible_cases = cases_accessible_by(user, Case.objects.all()).values('id')

        case_id = self.request.query_params.get('case')
        if case_id:
            # If user left this case, allow viewing only up to left_at
            from .models import CaseResponsible
            left = CaseResponsible.objects.filter(case_id=case_id, user=user, left_at__isnull=False).first()
            if left is not None:
                qs = qs.filter(case_id=case_id, created_at__lte=left.left_at)
            else:
                qs = qs.filter(case_id__in=accessible_cases, case_id=case_id)
        else:
            # No specific case requested -> only show for active accessible cases
            qs = qs.filter(case_id__in=accessible_cases)
        return qs


class CaseViewSet(viewsets.ModelViewSet):
    queryset = Case.objects.all().order_by('-created_at')
    serializer_class = CaseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = getattr(self.request, 'user', None)
        qs = cases_accessible_by(user, qs)
        # Apply status filtering only for list action so detail/update on closed cases works
        action = getattr(self, 'action', None)
        if action in ('list',):
            status_param = self.request.query_params.get('status')
            include_all = self.request.query_params.get('include_closed') in ('1', 'true', 'True')
            if not status_param and not include_all:
                qs = qs.filter(status='open')
            elif status_param:
                qs = qs.filter(status=status_param)
        return qs

    def get_object(self):
        """Allow active participants full access; allow users who left the case
        to read the case (safe methods) but not modify it. Non-participants -> 404.
        """
        # fetch raw object
        obj = Case.objects.get(pk=self.kwargs['pk'])
        user = getattr(self.request, 'user', None)

        # Staff can access
        if getattr(user, 'is_staff', False):
            return obj

        # Active participant?
        from .models import CaseResponsible
        if cases_accessible_by(user, Case.objects.filter(id=obj.id)).exists():
            return obj

        # Left participant? allow only safe methods
        left = CaseResponsible.objects.filter(case=obj, user=user, left_at__isnull=False).first()
        if left is not None and self.request.method in SAFE_METHODS:
            return obj

        # Not allowed
        from rest_framework.exceptions import NotFound
        raise NotFound()

    def perform_create(self, serializer):
        # serializer validation already resolved client from client_name if needed.
        if not serializer.validated_data.get('owner'):
            obj = serializer.save(owner=self.request.user)
        else:
            obj = serializer.save()

        # ensure snapshot alignment (extra safety)
        client_obj = getattr(obj, 'client', None)
        if client_obj and obj.client_name != getattr(client_obj, 'name', None):
            obj.client_name = client_obj.name
            try:
                obj.save(update_fields=['client_name'])
            except Exception:
                pass

        # write an audit entry for case creation
        try:
            AuditLog.objects.create(
                user=str(self.request.user),
                action='case.created',
                object_type='Case',
                object_id=str(obj.id),
                details={'title': obj.title}
            )
        except Exception:
            pass

    def _is_principal(self, case, user) -> bool:
        try:
            return CaseResponsible.objects.filter(case=case, user=user, role='principal', left_at__isnull=True).exists()
        except Exception:
            return False

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        old_status = instance.status
        # Block changing client after creation
        new_client = request.data.get('client')
        if new_client is not None and new_client != '' and str(new_client) != str(getattr(instance, 'client_id', '')):
            return Response({'detail': 'client cannot be changed once the case is created'}, status=status.HTTP_400_BAD_REQUEST)
        # If status is being changed, restrict to principal or admins
        new_status = request.data.get('status')
        if new_status and new_status != instance.status:
            if not (request.user.is_staff or self._is_principal(instance, request.user)):
                return Response({'detail': 'only case principal or admins can change case status'}, status=status.HTTP_403_FORBIDDEN)
        # Block any mutation by users who already left the case
        from .models import CaseResponsible
        left = CaseResponsible.objects.filter(case=instance, user=request.user, left_at__isnull=False).first()
        if left is not None and not request.user.is_staff:
            return Response({'detail': 'you have left this case and cannot modify it'}, status=status.HTTP_403_FORBIDDEN)
        resp = super().update(request, partial=partial, *args, **kwargs)
        # If status changed, register an actuacion (save state)
        try:
            instance.refresh_from_db()
            if new_status and instance.status != old_status:
                CaseActuacion.objects.create(
                    case=instance,
                    actor=request.user,
                    action_type='case.status.changed',
                    details={'from': old_status, 'to': instance.status}
                )
        except Exception:
            pass
        return resp

    def partial_update(self, request, *args, **kwargs):
        # DRF routes partial_update here; reuse update logic
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='assign-responsible')
    def assign_responsible(self, request, pk=None):
        """Assign a user to the case with a role. Payload: { user: id, role: str }

        Returns the created/updated responsible record.
        """
        case = self.get_object()
        user_id = request.data.get('user')
        role = request.data.get('role', '')
        if not user_id:
            return Response({'detail': 'user is required'}, status=status.HTTP_400_BAD_REQUEST)
        User = get_user_model()
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'user not found'}, status=status.HTTP_404_NOT_FOUND)

        # if assigning principal, enforce single-principal rule and permission checks
        if role == 'principal':
            # find current active principal if any
            current_principal = CaseResponsible.objects.filter(case=case, role='principal', left_at__isnull=True).first()
            # if there is a current principal and it's not the requester and requester is not staff, forbid
            if current_principal and current_principal.user_id != request.user.id and not request.user.is_staff:
                return Response({'detail': 'only the current principal or admins can assign a new principal'}, status=status.HTTP_403_FORBIDDEN)
            # if there is NO principal yet, allow only admins or the case owner to set the first principal
            if not current_principal and not (request.user.is_staff or getattr(case, 'owner_id', None) == request.user.id):
                return Response({'detail': 'only admins or the case owner can set the first principal'}, status=status.HTTP_403_FORBIDDEN)
            # if there is a principal and it's the requester (transfer), demote the existing principal
            if current_principal and current_principal.user_id != user.id:
                current_principal.role = ''
                current_principal.save()
                try:
                    AuditLog.objects.create(
                        user=str(request.user),
                        action='case.responsible.demoted',
                        object_type='Case',
                        object_id=str(case.id),
                        details={'previous_responsible_id': current_principal.id, 'previous_user_id': current_principal.user_id}
                    )
                except Exception:
                    pass
                try:
                    CaseActuacion.objects.create(
                        case=case,
                        actor=request.user,
                        action_type='case.responsible.demoted',
                        details={'previous_responsible_id': current_principal.id, 'previous_user_id': current_principal.user_id}
                    )
                except Exception:
                    pass

        # create or update existing responsible
        obj, created = CaseResponsible.objects.get_or_create(case=case, user=user, defaults={'role': role})
        if not created:
            obj.role = role
            obj.left_at = None
            obj.assigned_at = obj.assigned_at or timezone.now()
            obj.save()

        try:
            AuditLog.objects.create(
                user=str(request.user),
                action='case.responsible.assigned',
                object_type='Case',
                object_id=str(case.id),
                details={'responsible_id': obj.id, 'user_id': user.id, 'role': obj.role}
            )
        except Exception:
            pass
        try:
            CaseActuacion.objects.create(
                case=case,
                actor=request.user,
                action_type='case.responsible.assigned',
                details={'responsible_id': obj.id, 'user_id': user.id, 'role': obj.role}
            )
        except Exception:
            pass

        return Response({
            'id': obj.id,
            'user': obj.user_id,
            'user_display': getattr(obj.user, 'get_full_name', lambda: str(obj.user))(),
            'role': obj.role,
            'assigned_at': obj.assigned_at,
            'left_at': obj.left_at,
        })

    @action(detail=True, methods=['post'], url_path='leave')
    def leave(self, request, pk=None):
        """Mark the requesting user as left for this case (set left_at).

        This implements the "snapshot at leaving" semantic: clients can
        use the left_at timestamp to filter additional data when showing
        what a leaving user is allowed to see.
        """
        case = self.get_object()
        user = request.user
        try:
            resp = CaseResponsible.objects.get(case=case, user=user)
        except CaseResponsible.DoesNotExist:
            return Response({'detail': 'you are not a responsible for this case'}, status=status.HTTP_400_BAD_REQUEST)

        if resp.left_at:
            return Response({'detail': 'already left'}, status=status.HTTP_400_BAD_REQUEST)

        # prevent principal from leaving without transferring leadership
        if resp.role == 'principal':
            return Response({'detail': 'the current principal must transfer leadership before leaving'}, status=status.HTTP_400_BAD_REQUEST)

        resp.left_at = timezone.now()
        resp.save()

        try:
            AuditLog.objects.create(
                user=str(request.user),
                action='case.responsible.left',
                object_type='Case',
                object_id=str(case.id),
                details={'responsible_id': resp.id}
            )
        except Exception:
            pass

        # register actuacion for leaving
        try:
            CaseActuacion.objects.create(
                case=case,
                actor=request.user,
                action_type='case.responsible.left',
                details={'responsible_id': resp.id}
            )
        except Exception:
            pass

        return Response({'detail': 'left', 'left_at': resp.left_at})

    @action(detail=True, methods=['post'], url_path='remove-responsible')
    def remove_responsible(self, request, pk=None):
        """Remove (mark left_at) a responsible by user id. Payload: { user: id }

        Only the case principal or admins can remove other responsibles.
        """
        case = self.get_object()
        user_id = request.data.get('user')
        if not user_id:
            return Response({'detail': 'user is required'}, status=status.HTTP_400_BAD_REQUEST)
        # permission: allow if request.user is staff or current principal
        try:
            is_principal = CaseResponsible.objects.filter(case=case, user=request.user, role='principal', left_at__isnull=True).exists()
        except Exception:
            is_principal = False

        if not (request.user.is_staff or is_principal):
            return Response({'detail': 'only case principal or admins can remove responsibles'}, status=status.HTTP_403_FORBIDDEN)

        try:
            resp = CaseResponsible.objects.get(case=case, user_id=user_id)
        except CaseResponsible.DoesNotExist:
            return Response({'detail': 'responsible not found'}, status=status.HTTP_404_NOT_FOUND)

        if resp.left_at:
            return Response({'detail': 'responsible already left'}, status=status.HTTP_400_BAD_REQUEST)

        # do not allow removing the active principal unless admin
        if resp.role == 'principal' and not request.user.is_staff:
            return Response({'detail': 'only admins can remove the active principal'}, status=status.HTTP_403_FORBIDDEN)

        resp.left_at = timezone.now()
        resp.save()

        try:
            AuditLog.objects.create(
                user=str(request.user),
                action='case.responsible.removed',
                object_type='Case',
                object_id=str(case.id),
                details={'responsible_id': resp.id, 'user_id': resp.user_id}
            )
        except Exception:
            pass

        # register actuacion for removal
        try:
            CaseActuacion.objects.create(
                case=case,
                actor=request.user,
                action_type='case.responsible.removed',
                details={'responsible_id': resp.id, 'user_id': resp.user_id}
            )
        except Exception:
            pass

        return Response({'detail': 'removed', 'left_at': resp.left_at})

    @action(detail=True, methods=['post'], url_path='transfer-principal')
    def transfer_principal(self, request, pk=None):
        """Transfer the principal role to another user.

        Payload: { user: <id> }
        Only the current principal or admins can transfer. Demotes the current principal.
        """
        case = self.get_object()
        target_user_id = request.data.get('user')
        if not target_user_id:
            return Response({'detail': 'user is required'}, status=status.HTTP_400_BAD_REQUEST)

        # permissions: only current principal or admins
        current_principal = CaseResponsible.objects.filter(case=case, role='principal', left_at__isnull=True).first()
        if not (request.user.is_staff or (current_principal and current_principal.user_id == request.user.id)):
            return Response({'detail': 'only the current principal or admins can transfer leadership'}, status=status.HTTP_403_FORBIDDEN)

        # if transferring to self, no-op
        if current_principal and current_principal.user_id == int(target_user_id):
            return Response({'detail': 'already principal'}, status=status.HTTP_200_OK)

        # ensure target user is a responsible (create if needed)
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            target_user = User.objects.get(pk=target_user_id)
        except User.DoesNotExist:
            return Response({'detail': 'target user not found'}, status=status.HTTP_404_NOT_FOUND)

        resp_obj, created = CaseResponsible.objects.get_or_create(case=case, user=target_user, defaults={'role': ''})

        # demote current principal if exists
        if current_principal:
            current_principal.role = ''
            current_principal.save()

        # promote target
        resp_obj.role = 'principal'
        resp_obj.left_at = None
        resp_obj.save()

        try:
            AuditLog.objects.create(
                user=str(request.user),
                action='case.principal.transferred',
                object_type='Case',
                object_id=str(case.id),
                details={'from_user_id': getattr(current_principal, 'user_id', None), 'to_user_id': target_user.id}
            )
        except Exception:
            pass

        # register actuacion for principal transfer
        try:
            CaseActuacion.objects.create(
                case=case,
                actor=request.user,
                action_type='case.principal.transferred',
                details={'from_user_id': getattr(current_principal, 'user_id', None), 'to_user_id': target_user.id}
            )
        except Exception:
            pass

        return Response({'detail': 'transferred', 'principal_user_id': target_user.id})

    @action(detail=True, methods=['get', 'post'], url_path='actuaciones')
    def actuaciones(self, request, pk=None):
        case = self.get_object()
        if request.method == 'GET':
            qs = case.actuaciones.all().order_by('-created_at')
            # Apply left_at cutoff for users who already left this case
            from .models import CaseResponsible
            left = CaseResponsible.objects.filter(case=case, user=request.user, left_at__isnull=False).first()
            if left and left.left_at:
                qs = qs.filter(created_at__lte=left.left_at)
            out = []
            for a in qs[:100]:
                out.append({
                    'id': a.id,
                    'actor': a.actor_id,
                    'actor_display': getattr(a.actor, 'get_full_name', lambda: str(a.actor))(),
                    'action_type': a.action_type,
                    'details': a.details,
                    'created_at': a.created_at,
                })
            return Response(out)

        # POST -> create a new actuación
        action_type = request.data.get('action_type')
        details = request.data.get('details')
        if not action_type:
            return Response({'detail': 'action_type is required'}, status=status.HTTP_400_BAD_REQUEST)
        # Prevent users who left the case from creating actuaciones
        from .models import CaseResponsible
        left = CaseResponsible.objects.filter(case=case, user=request.user, left_at__isnull=False).first()
        if left is not None and not request.user.is_staff:
            return Response({'detail': 'you have left this case and cannot add activity'}, status=status.HTTP_403_FORBIDDEN)

        act = CaseActuacion.objects.create(case=case, actor=request.user, action_type=action_type, details=details)
        try:
            AuditLog.objects.create(
                user=str(request.user),
                action='case.actuacion.created',
                object_type='Case',
                object_id=str(case.id),
                details={'actuacion_id': act.id, 'action_type': action_type}
            )
        except Exception:
            pass
        return Response({'id': act.id, 'created_at': act.created_at}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='activity')
    def activity(self, request, pk=None):
        """Combined activity feed for a case: merges CaseActuacion and AuditLog entries.

        Returns a list sorted by created_at desc. Each item contains a `source` field
        ('actuacion' or 'audit') and normalized fields.
        """
        case = self.get_object()

        # load actuaciones
        acts_qs = case.actuaciones.all().select_related('actor')[:200]
        items = []
        for a in acts_qs:
            items.append({
                'id': a.id,
                'source': 'actuacion',
                'type': a.action_type,
                'actor': a.actor_id,
                'actor_display': getattr(a.actor, 'get_full_name', lambda: str(a.actor))(),
                'details': a.details,
                'created_at': a.created_at,
                'meta': {'actuacion_id': a.id}
            })

        # load audit logs referencing this case: either object_type/object_id or details.case_id
        try:
            q1 = AuditLog.objects.filter(object_type='Case', object_id=str(case.id))
            q2 = AuditLog.objects.filter(details__case_id=str(case.id))
            audits = (q1 | q2).order_by('-created_at')[:200]
        except Exception:
            audits = AuditLog.objects.none()

        for ad in audits:
            # AuditLog.user is often stored as a string in this project
            actor_display = getattr(ad, 'user', None)
            items.append({
                'id': ad.id,
                'source': 'audit',
                'type': getattr(ad, 'action', None),
                'actor': None,
                'actor_display': actor_display,
                'details': getattr(ad, 'details', None),
                'created_at': getattr(ad, 'created_at', None),
                'meta': {'audit_id': ad.id, 'object_type': getattr(ad, 'object_type', None), 'object_id': getattr(ad, 'object_id', None)}
            })

        # sort combined list by created_at desc and trim
        items.sort(key=lambda x: x.get('created_at') or 0, reverse=True)
        items = items[:200]

        return Response(items)

    @action(detail=False, methods=['get'], url_path='history/by-user')
    def history_by_user(self, request):
        """Return a combined activity feed across cases for a given user id.

        Query params:
        - user: target user id (required)
        - limit: number of items (default 100)

        Only includes items for cases accessible to the requesting user.
        """
        target_user_id = request.query_params.get('user')
        if not target_user_id:
            return Response({'detail': 'user is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            limit = int(request.query_params.get('limit', '100'))
        except ValueError:
            limit = 100

        # resolve target user for display and audit lookup by username
        User = get_user_model()
        try:
            target_user = User.objects.get(pk=target_user_id)
        except User.DoesNotExist:
            return Response({'detail': 'user not found'}, status=status.HTTP_404_NOT_FOUND)

        # Gather accessible cases for the requester
        from .models import Case
        base_cases = cases_accessible_by(request.user, Case.objects.all())

        items = []
        # Actuaciones performed by target user on accessible cases
        acts = CaseActuacion.objects.filter(case__in=base_cases, actor_id=target_user_id).select_related('case').order_by('-created_at')[:limit]
        for a in acts:
            items.append({
                'id': a.id,
                'source': 'actuacion',
                'case_id': a.case_id,
                'case_title': getattr(a.case, 'title', None),
                'type': a.action_type,
                'details': a.details,
                'created_at': a.created_at,
                'actor_display': getattr(a.actor, 'get_full_name', lambda: str(a.actor))() if a.actor else None,
            })

        # Audit logs authored by that user (stored as string user in AuditLog) for accessible cases
        try:
            # attempt match by username instead of numeric id substring
            q1 = AuditLog.objects.filter(object_type='Case', object_id__in=[str(cid) for cid in base_cases.values_list('id', flat=True)], user__iexact=getattr(target_user, 'username', ''))
            audits = q1.order_by('-created_at')[:limit]
        except Exception:
            audits = AuditLog.objects.none()
        for ad in audits:
            items.append({
                'id': ad.id,
                'source': 'audit',
                'case_id': None,
                'type': getattr(ad, 'action', None),
                'details': getattr(ad, 'details', None),
                'created_at': getattr(ad, 'created_at', None),
                'actor_display': getattr(target_user, 'get_full_name', lambda: str(target_user))(),
            })

        items.sort(key=lambda x: x.get('created_at') or 0, reverse=True)
        return Response(items[:limit])

    @action(detail=False, methods=['get'], url_path='history/mine')
    def history_mine(self, request):
        """List cases where the current user participated and already left.

        Returns minimal case info with left_at timestamp, ordered by left_at desc.
        """
        user = request.user
        try:
            from .models import CaseResponsible
            left_records = CaseResponsible.objects.filter(user=user, left_at__isnull=False).select_related('case').order_by('-left_at')
        except Exception:
            left_records = []

        data = []
        for r in left_records:
            if not getattr(r, 'case', None):
                continue
            data.append({
                'id': r.case.id,
                'title': r.case.title,
                'status': r.case.status,
                'left_at': r.left_at,
                'owner': r.case.owner_id,
            })
        return Response(data)

    @action(detail=False, methods=['get'], url_path='by-user')
    def by_user(self, request):
        """List cases where the target user has been a responsible (active or historical).

        Query params:
        - user: target user id (required)
        
        Respects access rules: returns only cases the requesting user may access, except that staff may see all, and a user may see their own list entirely.
        """
        target_user_id = request.query_params.get('user')
        if not target_user_id:
            return Response({'detail': 'user is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            target_user_id_int = int(target_user_id)
        except ValueError:
            return Response({'detail': 'invalid user'}, status=status.HTTP_400_BAD_REQUEST)

        from .models import Case, CaseResponsible

        # base queryset of participation records
        recs = CaseResponsible.objects.filter(user_id=target_user_id_int).select_related('case').order_by('-assigned_at')

        # Permission filter: staff can see all; the user can see their own; otherwise restrict to accessible cases
        can_see_all = getattr(request.user, 'is_staff', False) or getattr(request.user, 'id', None) == target_user_id_int
        if not can_see_all:
            accessible_ids = set(cases_accessible_by(request.user, Case.objects.all()).values_list('id', flat=True))
            recs = [r for r in recs if getattr(r, 'case_id', None) in accessible_ids]

        out = []
        for r in recs:
            c = getattr(r, 'case', None)
            if not c:
                continue
            out.append({
                'id': c.id,
                'title': getattr(c, 'title', ''),
                'status': getattr(c, 'status', ''),
                'client_name': getattr(c, 'client_name', ''),
                'owner': getattr(c, 'owner_id', None),
                'role': getattr(r, 'role', ''),
                'assigned_at': getattr(r, 'assigned_at', None),
                'left_at': getattr(r, 'left_at', None),
            })
        return Response(out)
