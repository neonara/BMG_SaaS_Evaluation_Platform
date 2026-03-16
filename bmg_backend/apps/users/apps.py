from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.users"
    label = "users"
    verbose_name = "Users"

    def ready(self) -> None:
        """
        Connect all signals for this app.
        Called once by Django after all apps are loaded.
        Deferred import prevents circular imports at module level.
        """
        from apps.users.signals import connect
        connect()
