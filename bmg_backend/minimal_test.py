from django.http import JsonResponse

def test_health(request):
    return JsonResponse({'status': 'ok', 'message': 'It works!'})
