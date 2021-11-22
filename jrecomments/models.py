from django.db import models
import quickle
from django.utils import timezone


class Podcast(models.Model):
    id = models.IntegerField(primary_key=True, default=0)
    name = models.CharField(max_length=80)
    comments = models.IntegerField(default=0)
    date = models.DateField(null=True)
    duration = models.TextField(default='0h0m', null=True)
    score = models.IntegerField(default=0)
    popularity = models.IntegerField(default=0)
    spotify_id = models.TextField(default='')
    youtube_links = models.BinaryField(default=None, null=True)
    last_yt_scrape = models.DateTimeField(default=timezone.now)

    def to_quick_list(self):
        return {'id': self.id,
                'name': self.name,
                'duration': self.duration,
                'date': self.date,
                'comments': self.comments,
                'score': self.score,
                'popularity': self.popularity,
                'spotify': self.spotify_id}


class Comment(models.Model):
    podcast_id = models.IntegerField(default=0)
    models.CharField(max_length=80)
    date_time = models.DateTimeField()
    likes = models.IntegerField(default=0)
    popularity = models.IntegerField(default=0)
    comment = models.TextField()
    sub_comments = models.BinaryField(default=None, null=True)
    sub_count = models.IntegerField(default=0)
    parent_id = models.IntegerField(default=0)
    reply_id = models.IntegerField(default=0)
    reply_username = models.TextField(default='')


    ## SCRAPE HELPERS
    is_offsite_comment = models.BooleanField(default=False)
    yt_comment_id = models.TextField(default='')
    yt_channel_id = models.TextField(default='')
    yt_video_id = models.TextField(default='')
    yt_parent_id = models.TextField(default='')


    def to_list(self):
        return {'id': self.id,
                'username': self.username,
                'comment': self.comment,
                'podcast': self.podcast_id,
                'master': self.parent_id,
                'replyToId': self.reply_id,
                'replyToName': self.reply_username,
                'datetime': self.date_time,
                'likes': self.likes,
                'subCount': self.sub_count}


class UserData(models.Model):
    models.CharField(primary_key=True, max_length=80)
    comments = models.BinaryField(default=None, null=True)
    likes = models.BinaryField(default=None, null=True)