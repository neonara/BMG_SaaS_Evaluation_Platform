from django.urls import include, path

def get_post_init_urls():
    from rest_framework_simplejwt.views import TokenRefreshView
    from apps.users.urls import auth_token, auth
    from config.api_router import urlpatterns as api_urls
    
    return [
        path("api/auth/token/", include(auth_token)),
        path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
        path("api/auth/", include(auth)),
        path("api/v1/", include(api_urls)),
    ]
