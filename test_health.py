import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')
django.setup()

from django.test import Client
from django.urls import resolve

# Test URL resolution
print("Testing URL resolution...")
try:
    match = resolve('/api/health/')
    print(f"✓ URL resolves to: {match.func}")
except Exception as e:
    print(f"✗ URL resolution failed: {e}")

# Test the view
print("\nTesting view...")
client = Client()
try:
    response = client.get('/api/health/')
    print(f"Status: {response.status_code}")
    print(f"Content: {response.content}")
except Exception as e:
    print(f"Error: {e}")
