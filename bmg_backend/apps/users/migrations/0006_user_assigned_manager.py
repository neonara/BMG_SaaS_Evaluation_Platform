from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0005_user_tenant_schema"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="assigned_manager",
            field=models.ForeignKey(
                blank=True,
                db_column="assigned_manager_id",
                limit_choices_to={"role": "manager"},
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="managed_candidates",
                to="users.user",
            ),
        ),
    ]
