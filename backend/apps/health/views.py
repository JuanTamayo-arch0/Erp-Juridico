from django.http import JsonResponse


def health(request):
    # Very small healthcheck: db and redis connectivity checks can be added later
    return JsonResponse({'status': 'ok'})
