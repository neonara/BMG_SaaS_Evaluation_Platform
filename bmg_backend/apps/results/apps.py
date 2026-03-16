from django.apps import AppConfig


class ResultsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.results"
    label = "results"
    verbose_name = "Results"

    def ready(self) -> None:
        """
        Connect all signals for this app.
        Called once by Django after all apps are loaded.
        Deferred import prevents circular imports at module level.
        """
        from apps.results.signals import connect
        connect()
