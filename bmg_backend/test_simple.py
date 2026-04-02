from django.http import JsonResponse

def simple_health(request):
    return JsonResponse({'status': 'ok', 'message': 'Simple health check'})
