# Generated by Django 3.1.6 on 2021-11-05 06:54

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jrecomments', '0008_auto_20211105_0129'),
    ]

    operations = [
        migrations.AlterField(
            model_name='comment',
            name='user',
            field=models.UUIDField(default=None, null=True),
        ),
    ]
