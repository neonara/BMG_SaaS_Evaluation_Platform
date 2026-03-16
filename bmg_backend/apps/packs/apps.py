from django.apps import AppConfig


class PacksConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.packs"
    label = "packs"
    verbose_name = "Packs"

    def ready(self) -> None:
        """
        Connect all signals for this app.
        Called once by Django after all apps are loaded.
        Deferred import prevents circular imports at module level.
        """
        from apps.packs.signals import connect
        connect()
