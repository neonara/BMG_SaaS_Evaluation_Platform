from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_add_preferred_language'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='tenant_schema',
            field=models.CharField(blank=True, db_index=True, max_length=100),
        ),
    ]
