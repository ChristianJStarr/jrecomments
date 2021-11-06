from django.db import models



class Podcast(models.Model):
    id = models.IntegerField(primary_key=True, default=0)
    name = models.TextField(default='No Name')
    comments = models.BinaryField(default=None, null=True)
    date = models.DateField(null=True)
    duration = models.TextField(default='0h0m', null=True)
    score = models.IntegerField(default=0)
    popularity = models.IntegerField(default=0)


class Comment(models.Model):
    podcast = models.IntegerField(default=0)
    user = models.UUIDField(null=True, default=None)
    name = models.TextField(default='Unknown Name')
    name_color = models.TextField(default='(0,0,0)')
    datetime = models.DateTimeField()
    donor = models.TextField(default='')

    likes = models.IntegerField(default=0)
    dislikes = models.IntegerField(default=0)
    popularity = models.IntegerField(default=0)
    comment = models.TextField()
    sub_comments = models.BinaryField(default=None, null=True)
    sub_count = models.IntegerField(default=0)
    parent_id = models.IntegerField(default=0)

    replyToId = models.IntegerField(default=0)
    replyToName = models.TextField(default='Unknown Name')
    replyToColor = models.TextField(default='(0,0,0)')


