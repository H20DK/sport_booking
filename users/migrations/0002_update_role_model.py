from django.db import migrations, models


def forwards(apps, schema_editor):
    User = apps.get_model('users', 'User')
    User.objects.filter(role='client').update(role='user')
    User.objects.filter(role='owner').update(role='renter')
    User.objects.filter(role='admin').update(role='administration')


def backwards(apps, schema_editor):
    User = apps.get_model('users', 'User')
    User.objects.filter(role='user').update(role='client')
    User.objects.filter(role='renter').update(role='owner')
    User.objects.filter(role='administration').update(role='admin')


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[
                    ('user', 'Пользователь'),
                    ('renter', 'Арендатор'),
                    ('administration', 'Администрация'),
                    ('system_admin', 'Системный администратор'),
                ],
                default='user',
                max_length=20,
            ),
        ),
        migrations.RunPython(forwards, backwards),
    ]
