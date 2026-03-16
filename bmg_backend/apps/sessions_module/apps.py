from django.apps import AppConfig


class SessionsModuleConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.sessions_module"
    label = "sessions_module"
    verbose_name = "Sessions"

    def ready(self) -> None:
        """
        Connect all signals for this app.
        Called once by Django after all apps are loaded.
        Deferred import prevents circular imports at module level.
        """
        from apps.sessions_module.signals import connect
        connect()
