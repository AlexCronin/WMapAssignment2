# -*- coding: utf-8 -*-
# Generated by Django 1.11.5 on 2019-05-29 17:32
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0005_auto_20181205_1558'),
    ]

    operations = [
        migrations.AlterField(
            model_name='fav',
            name='contactNumber',
            field=models.CharField(blank=True, max_length=80, null=True),
        ),
        migrations.AlterField(
            model_name='fav',
            name='imageFileName',
            field=models.CharField(blank=True, max_length=80, null=True),
        ),
        migrations.AlterField(
            model_name='fav',
            name='lastUpdate',
            field=models.CharField(blank=True, max_length=80, null=True),
        ),
    ]
