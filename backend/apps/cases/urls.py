from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CaseViewSet, CaseCommentViewSet

router = DefaultRouter()
router.register(r'comments', CaseCommentViewSet, basename='casecomment')
router.register(r'', CaseViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
