import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('DJANGO_SECRET', 'dev-secret')
DEBUG = os.environ.get('DJANGO_DEBUG', '1') == '1'

ALLOWED_HOSTS = ['*']

# Timezone settings — explicit for consistency between Django and Celery
TIME_ZONE = os.environ.get('DJANGO_TIME_ZONE', 'UTC')
USE_TZ = True

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt',
    'backend.apps.users',
    'backend.apps.auth',
    'backend.apps.audit',
    'backend.apps.health',
    'backend.apps.storage',
    'backend.apps.events',
    'backend.apps.cases',
    'backend.apps.clients',
    'backend.apps.documents',
    'backend.apps.tasks',
    'backend.apps.reports',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
]

ROOT_URLCONF = 'erp_juridico.urls'

TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [],
    'APP_DIRS': True,
    'OPTIONS': {
        'context_processors': [
            'django.template.context_processors.debug',
            'django.template.context_processors.request',
            'django.contrib.auth.context_processors.auth',
            'django.contrib.messages.context_processors.messages',
        ]
    },
}]

WSGI_APPLICATION = 'erp_juridico.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('POSTGRES_DB', 'erp'),
        'USER': os.environ.get('POSTGRES_USER', 'erp'),
        'PASSWORD': os.environ.get('POSTGRES_PASSWORD', 'erp'),
        'HOST': os.environ.get('POSTGRES_HOST', 'localhost'),
        'PORT': os.environ.get('POSTGRES_PORT', '5432'),
    }
}

AUTH_USER_MODEL = 'users.User'

STATIC_URL = '/static/'

# Media (user-uploaded) files
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0')

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
}
# Enable simple page number pagination for APIs
REST_FRAMEWORK.setdefault('DEFAULT_PAGINATION_CLASS', 'rest_framework.pagination.PageNumberPagination')
REST_FRAMEWORK.setdefault('PAGE_SIZE', 10)

from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
}

# Development CORS settings: allow frontend dev server to call the API.
# In production, replace with a restrictive list of origins.
CORS_ALLOW_ALL_ORIGINS = True
