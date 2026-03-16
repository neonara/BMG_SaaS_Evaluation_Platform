from django.apps import AppConfig


class AttemptsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.attempts"
    label = "attempts"
    verbose_name = "Test Attempts"

    def ready(self) -> None:
        """
        Connect all signals for this app.
        Called once by Django after all apps are loaded.
        Deferred import prevents circular imports at module level.
        """
        from apps.attempts.signals import connect
        connect()
