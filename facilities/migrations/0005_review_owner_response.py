from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('facilities', '0004_remove_review_unique_facility_client'),
    ]

    operations = [
        migrations.AddField(
            model_name='review',
            name='owner_response',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='review',
            name='owner_response_updated_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
