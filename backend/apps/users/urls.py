from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, RoleViewSet

router = DefaultRouter()
router.register('roles', RoleViewSet, basename='role')
router.register('users', UserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
]

from .views import PermissionList

urlpatterns += [
    path('permissions/', PermissionList.as_view(), name='permissions-list'),
]
