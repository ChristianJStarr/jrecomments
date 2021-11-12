from django.db import models
import quickle


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

    def to_quick_list(self):
        total_comments = 0
        if self.comments != None:
            total_comments = len(quickle.loads(self.comments))
        return {'id': self.id,
                'name': self.name,
                'duration': self.duration,
                'date': self.date,
                'comments': total_comments,
                'score': self.score,
                'popularity': self.popularity,
                'spotify': self.spotify_id}


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
    username = models.TextField(primary_key=True)
    comments = models.BinaryField(default=None, null=True)
    likes = models.BinaryField(default=None, null=True)