from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0002_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='booking',
            name='slot',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='bookings',
                to='bookings.timeslot',
            ),
        ),
    ]
