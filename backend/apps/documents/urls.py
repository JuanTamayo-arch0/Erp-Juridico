from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DocumentViewSet, PresignUploadView
from .views import DocumentVersionViewSet

router = DefaultRouter()
router.register(r'versions', DocumentVersionViewSet, basename='documentversion')
router.register(r'', DocumentViewSet)

# place explicit presign route before the router include so it does not get
# captured by the router's detail regex (which would treat 'presign' as a pk)
urlpatterns = [
    path('presign/', PresignUploadView.as_view(), name='documents-presign'),
    path('', include(router.urls)),
]
