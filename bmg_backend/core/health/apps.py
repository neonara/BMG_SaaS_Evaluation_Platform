from django.apps import AppConfig

class CoreHealthConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core.health'
    label = 'core_health'  # Unique label to avoid conflict
    verbose_name = 'Core Health Check'
