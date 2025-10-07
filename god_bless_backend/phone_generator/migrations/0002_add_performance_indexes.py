# Generated migration for performance optimization

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('phone_generator', '0001_initial'),
    ]

    operations = [
        # Add composite indexes for common query patterns
        migrations.AddIndex(
            model_name='phonenumber',
            index=models.Index(
                fields=['user', 'project', 'is_archived'],
                name='phone_user_proj_arch_idx'
            ),
        ),
        migrations.AddIndex(
            model_name='phonenumber',
            index=models.Index(
                fields=['valid_number', 'type', 'carrier'],
                name='phone_valid_type_carr_idx'
            ),
        ),
        migrations.AddIndex(
            model_name='phonenumber',
            index=models.Index(
                fields=['-created_at'],
                name='phone_created_desc_idx'
            ),
        ),
        migrations.AddIndex(
            model_name='phonegenerationtask',
            index=models.Index(
                fields=['user', '-created_at'],
                name='task_user_created_idx'
            ),
        ),
        migrations.AddIndex(
            model_name='phonegenerationtask',
            index=models.Index(
                fields=['status', '-created_at'],
                name='task_status_created_idx'
            ),
        ),
    ]
