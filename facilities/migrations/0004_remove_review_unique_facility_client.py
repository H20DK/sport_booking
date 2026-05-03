from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('facilities', '0003_review_title_review_visit_date_and_more'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='review',
            unique_together=set(),
        ),
    ]
