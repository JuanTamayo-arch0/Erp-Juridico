import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_juridico.settings')

app = Celery('erp_juridico')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
