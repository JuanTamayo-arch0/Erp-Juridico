from django.urls import path, include
from django.http import HttpResponse


def root(request):
    return HttpResponse('ERP Juridico backend')


urlpatterns = [
    path('', root),
    path('health/', include('backend.apps.health.urls')),
    path('api/auth/', include('backend.apps.auth.urls')),
]
