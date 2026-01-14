from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('proxy_server', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='proxyserver',
            name='last_health_check_latency_ms',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='proxyserver',
            name='last_health_check_status_code',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='proxyserver',
            name='last_health_check_error',
            field=models.TextField(blank=True, null=True),
        ),
    ]
