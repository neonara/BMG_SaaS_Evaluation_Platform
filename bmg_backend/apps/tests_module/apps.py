from django.apps import AppConfig


class TestsModuleConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.tests_module"
    label = "tests_module"
    verbose_name = "Test Models"

    def ready(self) -> None:
        """
        Connect all signals for this app.
        Called once by Django after all apps are loaded.
        Deferred import prevents circular imports at module level.
        """
        from apps.tests_module.signals import connect
        connect()
