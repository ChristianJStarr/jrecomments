# Generated by Django 3.1.6 on 2021-11-06 23:53

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jrecomments', '0009_auto_20211105_0254'),
    ]

    operations = [
        migrations.AddField(
            model_name='podcast',
            name='spotify_id',
            field=models.TextField(default=''),
        ),
    ]