# Generated by Django 3.1.6 on 2021-10-24 05:33

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jrecomments', '0004_auto_20211024_0020'),
    ]

    operations = [
        migrations.AddField(
            model_name='comment',
            name='donor',
            field=models.TextField(default=''),
        ),
        migrations.AddField(
            model_name='comment',
            name='name_color',
            field=models.TextField(default='(0,0,0)'),
        ),
    ]
