from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.db.models import Count
from backend.apps.cases.models import Case
from backend.apps.events.models import Event
from backend.apps.tasks.models import Task
from backend.apps.cases.serializers import CaseSerializer
import csv
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from django.db.models import Count
from backend.apps.cases.models import Case
from backend.apps.events.models import Event
from backend.apps.tasks.models import Task
from backend.apps.cases.serializers import CaseSerializer
import csv
from django.http import HttpResponse
from django.utils import timezone
from django.db.models import Q
from .models import ReportTemplate
from .serializers import ReportTemplateSerializer
from rest_framework.views import APIView as DRFAPIView
from rest_framework.response import Response as DRFResponse
from django.db.models.functions import TruncDate
import datetime


class CasesReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # filters
        status_q = request.query_params.get('status')
        process_type = request.query_params.get('process_type')
        client = request.query_params.get('client')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        qs = Case.objects.all()
        # restrict to user-visible cases for non-admin/partner/staff users
        user = request.user
        try:
            role_names = [r.name for r in getattr(user, 'roles', []).all()]
        except Exception:
            role_names = []
        if not (getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False) or 'admin' in role_names or 'partner' in role_names or 'hr' in role_names):
            qs = qs.filter(Q(owner=user) | Q(responsibles__user=user, responsibles__left_at__isnull=True)).distinct()

        if status_q:
            qs = qs.filter(status=status_q)
        if process_type:
            qs = qs.filter(process_type__icontains=process_type)
        if client:
            qs = qs.filter(client_name__icontains=client)
        if start_date:
            qs = qs.filter(created_at__date__gte=start_date)
        if end_date:
            qs = qs.filter(created_at__date__lte=end_date)

        # summary (respecting scope)
        active_count = qs.filter(status='open').count()

        # upcoming events (next 30 days) - return next 10 events
        now = timezone.now()
        upcoming_qs = Event.objects.filter(start__gte=now).order_by('start')[:10]
        upcoming_events = []
        for e in upcoming_qs:
            upcoming_events.append({
                'id': e.id,
                'title': getattr(e, 'title', '') or getattr(e, 'name', ''),
                'start': e.start.isoformat() if e.start else None,
                'end': e.end.isoformat() if getattr(e, 'end', None) else None,
                'assignee': e.assignee.username if getattr(e, 'assignee', None) else None,
            })

        # workload by owner (within scoped cases)
        workload = qs.values('owner__id', 'owner__username').annotate(count=Count('id')).order_by('-count')

        fmt = request.query_params.get('format')
        if fmt == 'csv':
            # return CSV of filtered cases
            resp = HttpResponse(content_type='text/csv')
            resp['Content-Disposition'] = 'attachment; filename="cases_report.csv"'
            writer = csv.writer(resp)
            writer.writerow(['id', 'title', 'client_name', 'process_type', 'owner', 'status', 'created_at'])
            for c in qs:
                writer.writerow([c.id, c.title, c.client_name, c.process_type or '', c.owner.username if c.owner else '', c.status, c.created_at.isoformat()])
            return resp

        if fmt == 'xlsx':
            try:
                from openpyxl import Workbook
            except Exception:
                return Response({'detail': 'openpyxl not installed'}, status=status.HTTP_501_NOT_IMPLEMENTED)
            wb = Workbook()
            ws = wb.active
            ws.append(['id', 'title', 'client_name', 'process_type', 'owner', 'status', 'created_at'])
            for c in qs:
                ws.append([c.id, c.title, c.client_name, c.process_type or '', c.owner.username if c.owner else '', c.status, c.created_at.isoformat()])
            resp = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            resp['Content-Disposition'] = 'attachment; filename="cases_report.xlsx"'
            wb.save(resp)
            return resp

        # default JSON response
        cases = CaseSerializer(qs[:200], many=True, context={'request': request}).data
        return Response({'summary': {'active_cases': active_count}, 'workload': list(workload), 'upcoming_events': upcoming_events, 'cases': cases})


class ReportTemplateViewSet(viewsets.ModelViewSet):
    queryset = ReportTemplate.objects.all()
    serializer_class = ReportTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post', 'get'])
    def run(self, request, pk=None):
        """Run a saved report template. Accepts the same ?format=csv|xlsx query param and optional overrides in the request query params."""
        tpl = self.get_object()
        # merge template filters with any overrides passed in query params
        merged = dict(tpl.filters or {})
        for k, v in request.query_params.items():
            if k == 'format':
                continue
            merged[k] = v
        # reuse the report generation logic by building the qs and returning same responses
        # build qs
        qs = Case.objects.all()
        status_q = merged.get('status')
        process_type = merged.get('process_type')
        client = merged.get('client')
        start_date = merged.get('start_date')
        end_date = merged.get('end_date')
        if status_q:
            qs = qs.filter(status=status_q)
        if process_type:
            qs = qs.filter(process_type__icontains=process_type)
        if client:
            qs = qs.filter(client_name__icontains=client)
        if start_date:
            qs = qs.filter(created_at__date__gte=start_date)
        if end_date:
            qs = qs.filter(created_at__date__lte=end_date)

        # summary/workload/upcoming as before
        active_count = Case.objects.filter(status='open').count()
        now = timezone.now()
        upcoming_qs = Event.objects.filter(start__gte=now).order_by('start')[:10]
        upcoming_events = []
        for e in upcoming_qs:
            upcoming_events.append({
                'id': e.id,
                'title': getattr(e, 'title', '') or getattr(e, 'name', ''),
                'start': e.start.isoformat() if e.start else None,
                'end': e.end.isoformat() if getattr(e, 'end', None) else None,
                'assignee': e.assignee.username if getattr(e, 'assignee', None) else None,
            })
        workload = Case.objects.values('owner__id', 'owner__username').annotate(count=Count('id')).order_by('-count')

        fmt = request.query_params.get('format') or request.GET.get('format')
        if fmt == 'csv':
            resp = HttpResponse(content_type='text/csv')
            resp['Content-Disposition'] = f'attachment; filename="{tpl.name}.csv"'
            writer = csv.writer(resp)
            writer.writerow(['id', 'title', 'client_name', 'process_type', 'owner', 'status', 'created_at'])
            for c in qs:
                writer.writerow([c.id, c.title, c.client_name, c.process_type or '', c.owner.username if c.owner else '', c.status, c.created_at.isoformat()])
            tpl.last_run = timezone.now()
            tpl.save(update_fields=['last_run'])
            return resp

        if fmt == 'xlsx':
            try:
                from openpyxl import Workbook
            except Exception:
                return Response({'detail': 'openpyxl not installed'}, status=status.HTTP_501_NOT_IMPLEMENTED)
            wb = Workbook()
            ws = wb.active
            ws.append(['id', 'title', 'client_name', 'process_type', 'owner', 'status', 'created_at'])
            for c in qs:
                ws.append([c.id, c.title, c.client_name, c.process_type or '', c.owner.username if c.owner else '', c.status, c.created_at.isoformat()])
            resp = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            resp['Content-Disposition'] = f'attachment; filename="{tpl.name}.xlsx"'
            wb.save(resp)
            tpl.last_run = timezone.now()
            tpl.save(update_fields=['last_run'])
            return resp

        cases = CaseSerializer(qs[:200], many=True, context={'request': request}).data
        tpl.last_run = timezone.now()
        tpl.save(update_fields=['last_run'])
        return Response({'summary': {'active_cases': active_count}, 'workload': list(workload), 'upcoming_events': upcoming_events, 'cases': cases})


class DashboardView(APIView):
    """Provide dashboard stats and simple time series for charts."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        qs_all = Case.objects.all()
        user = request.user
        try:
            role_names = [r.name for r in getattr(user, 'roles', []).all()]
        except Exception:
            role_names = []
        if not (getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False) or 'admin' in role_names or 'partner' in role_names or 'hr' in role_names):
            qs = qs_all.filter(Q(owner=user) | Q(responsibles__user=user, responsibles__left_at__isnull=True)).distinct()
        else:
            qs = qs_all

        total_cases = qs.count()
        open_cases = qs.filter(status='open').count()
        closed_cases = qs.filter(status='closed').count()

        # time series: cases created per day for last 30 days (scoped)
        since = now - datetime.timedelta(days=29)
        qs_time = qs.filter(created_at__gte=since)
        daily = qs_time.annotate(day=TruncDate('created_at')).values('day').annotate(count=Count('id')).order_by('day')
        # build map of date -> count for last 30 days
        date_counts = {item['day'].isoformat(): item['count'] for item in daily}
        series = []
        for i in range(29, -1, -1):
            d = (now - datetime.timedelta(days=i)).date().isoformat()
            series.append({'date': d, 'count': date_counts.get(d, 0)})
        # breakdown by process_type (scoped)
        by_type = list(qs.values('process_type').annotate(count=Count('id')).order_by('-count'))

        # tasks due (next 7 days)
        upcoming_tasks = Task.objects.filter(due_date__gte=now.date(), due_date__lte=(now + datetime.timedelta(days=7)).date()).count()

        upcoming_events = Event.objects.filter(start__gte=now).count()

        return DRFResponse({
            'total_cases': total_cases,
            'open_cases': open_cases,
            'closed_cases': closed_cases,
            'cases_last_30': series,
            'cases_by_type': by_type,
            'upcoming_tasks_next_7': upcoming_tasks,
            'upcoming_events_next_30': upcoming_events,
        })
