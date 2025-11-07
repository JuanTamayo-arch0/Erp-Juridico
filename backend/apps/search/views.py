from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.db.models import Q
from backend.apps.cases.models import Case
from backend.apps.documents.models import Document
from backend.apps.cases.serializers import CaseSerializer
from backend.apps.documents.serializers import DocumentSerializer
from backend.apps.cases.utils import cases_accessible_by
from backend.apps.cases.models import CaseResponsible
from backend.apps.clients.models import Client
from backend.apps.clients.serializers import ClientSerializer


class SearchView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        if not q:
            return Response({'cases': [], 'documents': [], 'clients': []})
        # Active-accessible cases
        base_cases = cases_accessible_by(request.user, Case.objects.all())
        # Cases where user already left (historical view)
        left_map = {cr.case_id: cr.left_at for cr in CaseResponsible.objects.filter(user=request.user, left_at__isnull=False)}

        # Cases result: include active-accessible and also left cases matching q
        cases_qs_active = base_cases.filter(Q(title__icontains=q) | Q(description__icontains=q))
        cases_qs_left = Case.objects.filter(id__in=list(left_map.keys())).filter(Q(title__icontains=q) | Q(description__icontains=q))
        cases_qs = (cases_qs_active | cases_qs_left).distinct()[:50]

        # Documents result:
        # - active-accessible cases: include normally
        # - left cases: include only documents with created_at <= left_at
        docs_qs = Document.objects.filter(Q(title__icontains=q))
        active_ids = list(base_cases.values_list('id', flat=True))
        # active docs
        docs_active = docs_qs.filter(Q(case_id__in=active_ids) | Q(case__isnull=True, uploaded_by=request.user))
        # left docs
        left_ids = list(left_map.keys())
        docs_left = Document.objects.none()
        if left_ids:
            # apply cutoff per case id
            from django.db.models import Case as DJCase, When, DateTimeField
            # Build a big OR with per-case cutoff
            cond = Q()
            for cid, cutoff in left_map.items():
                cond |= (Q(case_id=cid) & Q(created_at__lte=cutoff))
            docs_left = docs_qs.filter(cond)

        docs_qs = (docs_active | docs_left).distinct()[:50]

        # Clients result: match by name or NIT (simple icontains)
        clients_qs = Client.objects.filter(
            Q(name__icontains=q) | Q(nit__icontains=q)
        )[:50]

        return Response({
            'cases': CaseSerializer(cases_qs, many=True, context={'request': request}).data,
            'documents': DocumentSerializer(docs_qs, many=True, context={'request': request}).data,
            'clients': ClientSerializer(clients_qs, many=True, context={'request': request}).data,
        })
