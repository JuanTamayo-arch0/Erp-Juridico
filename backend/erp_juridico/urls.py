from django.urls import path, include
from django.http import HttpResponse
from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static


def root(request):
    return HttpResponse('ERP Juridico backend')


urlpatterns = [
    path('', root),
    path('admin/', admin.site.urls),
    path('health/', include('backend.apps.health.urls')),
    path('api/auth/', include('backend.apps.auth.urls')),
    path('api/cases/', include('backend.apps.cases.urls')),
    path('api/clients/', include('backend.apps.clients.urls')),
    path('api/documents/', include('backend.apps.documents.urls')),
    path('api/events/', include('backend.apps.events.urls')),
    path('api/search/', include('backend.apps.search.urls')),
    path('api/users/', include('backend.apps.users.urls')),
    path('api/tasks/', include('backend.apps.tasks.urls')),
    path('api/reports/', include('backend.apps.reports.urls')),
]

# Serve media files during development (DEBUG). In production, serve via a real webserver.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
