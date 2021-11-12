# Generated by Django 3.1.6 on 2021-11-07 18:27

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jrecomments', '0010_podcast_spotify_id'),
    ]

    operations = [
        migrations.CreateModel(
            name='UserData',
            fields=[
                ('username', models.TextField(primary_key=True, serialize=False)),
                ('comments', models.BinaryField(default=None, null=True)),
                ('likes', models.BinaryField(default=None, null=True)),
            ],
        ),
    ]