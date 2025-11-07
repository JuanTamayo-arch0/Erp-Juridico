from celery import shared_task
from django.utils import timezone
from .models import Event
from .models import Notification
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import get_user_model


@shared_task(bind=True)
def schedule_event_reminder(self, event_id: int):
    """Task that runs at remind_at and performs reminder actions.

    For MVP this will mark the Event as reminded and (optionally) log.
    In a full implementation this would send notifications (emails, in-app).
    """
    try:
        ev = Event.objects.get(id=event_id)
    except Event.DoesNotExist:
        return 'missing'

    # Mark reminded and persist
    ev.reminded = True
    ev.save(update_fields=['reminded'])

    # Create an in-app notification for the event owner
    message = f"Reminder: {ev.title} scheduled at {ev.start.isoformat()}"
    if ev.created_by_id:
        try:
            notif = Notification.objects.create(user_id=ev.created_by_id, event=ev, message=message)
        except Exception:
            notif = None

        # Send an email sketch to the user (if email configured)
        try:
            User = get_user_model()
            user = User.objects.get(id=ev.created_by_id)
            if user.email:
                send_notification_email.delay(user.id, ev.id, message)
        except Exception:
            # swallow errors - this is best-effort for MVP
            pass

    print(f"[events] Reminder fired for event {ev.id} at {timezone.now().isoformat()}")
    return 'ok'


@shared_task
def send_notification_email(user_id: int, event_id: int, message: str):
    """Send a simple notification email. Uses Django send_mail and falls back to logging via print.

    This is an MVP 'sketch' email sender. Configure EMAIL_BACKEND in settings to actually send.
    """
    try:
        User = get_user_model()
        user = User.objects.get(id=user_id)
        subject = f"Reminder: event #{event_id}"
        recipient = [user.email]
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@example.com')
        send_mail(subject, message, from_email, recipient, fail_silently=False)
        print(f"[events] Sent email to {user.email} for event {event_id}")
        return True
    except Exception as e:
        print(f"[events] Failed to send email: {e}")
        return False
