from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CasesReportView, ReportTemplateViewSet
from .views import DashboardView

router = DefaultRouter()
router.register(r'templates', ReportTemplateViewSet, basename='reporttemplate')

urlpatterns = [
    path('cases/', CasesReportView.as_view(), name='reports-cases'),
    path('dashboard/', DashboardView.as_view(), name='reports-dashboard'),
    path('', include(router.urls)),
]
