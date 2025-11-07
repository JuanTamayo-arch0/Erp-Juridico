from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('events', '0003_event_assignee'),
    ]

    operations = [
        migrations.AddField(
            model_name='event',
            name='type',
            field=models.CharField(
                choices=[('audiencia', 'Audiencia'), ('plazo', 'Plazo / Deadline'), ('tarea', 'Tarea'), ('otro', 'Otro')],
                default='otro',
                max_length=20,
            ),
        ),
    ]
