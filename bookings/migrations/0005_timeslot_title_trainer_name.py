from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0004_timeslot_is_active'),
    ]

    operations = [
        migrations.AddField(
            model_name='timeslot',
            name='title',
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name='timeslot',
            name='trainer_name',
            field=models.CharField(blank=True, max_length=120),
        ),
    ]
