from django.contrib import admin
from .models import Event, Notification


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'case', 'start', 'remind_at', 'reminded')
    list_filter = ('reminded',)
    search_fields = ('title',)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'event', 'read', 'created_at')
    list_filter = ('read',)
    search_fields = ('message',)
