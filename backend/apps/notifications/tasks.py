from celery import shared_task


@shared_task
def send_notification(user_id: int, payload: dict):
    # Placeholder: perform notification send (email/in-app)
    return {'status': 'queued', 'user_id': user_id}
