import json

def application(environ, start_response):
    """Simple WSGI application."""
    path = environ.get('PATH_INFO', '')
    
    if path == '/api/health/':
        status = '200 OK'
        headers = [('Content-Type', 'application/json')]
        start_response(status, headers)
        return [json.dumps({'status': 'ok', 'message': 'WSGI test'}).encode()]
    
    status = '404 Not Found'
    headers = [('Content-Type', 'text/plain')]
    start_response(status, headers)
    return [b'Not Found']
