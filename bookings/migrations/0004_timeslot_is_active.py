from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0003_booking_slot_foreignkey'),
    ]

    operations = [
        migrations.AddField(
            model_name='timeslot',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
    ]
