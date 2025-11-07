from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EventViewSet, NotificationViewSet

router = DefaultRouter()
# Register specific sub-routes before the generic '' event routes so they aren't
# captured by the event-detail lookup ('' prefix would treat 'notifications' as a pk).
router.register('notifications', NotificationViewSet, basename='notification')
router.register('', EventViewSet, basename='event')

urlpatterns = [
    path('', include(router.urls)),
]
