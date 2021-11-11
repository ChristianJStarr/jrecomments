from django.db import models



class Podcast(models.Model):
    id = models.IntegerField(primary_key=True, default=0)
    name = models.TextField(default='No Name')
    comments = models.BinaryField(default=None, null=True)
    date = models.DateField(null=True)
    duration = models.TextField(default='0h0m', null=True)
    score = models.IntegerField(default=0)
    popularity = models.IntegerField(default=0)
    spotify_id = models.TextField(default='')
    youtube_links = models.BinaryField(default=None, null=True)


class Comment(models.Model):
    podcast_id = models.IntegerField(default=0)
    username = models.TextField(default='Unknown Name')
    date_time = models.DateTimeField()
    likes = models.IntegerField(default=0)
    popularity = models.IntegerField(default=0)
    comment = models.TextField()
    sub_comments = models.BinaryField(default=None, null=True)
    sub_count = models.IntegerField(default=0)
    parent_id = models.IntegerField(default=0)
    reply_id = models.IntegerField(default=0)
    reply_username = models.TextField(default='Unknown Name')


class UserData(models.Model):
    username = models.TextField(primary_key=True)
    comments = models.BinaryField(default=None, null=True)
    likes = models.BinaryField(default=None, null=True)