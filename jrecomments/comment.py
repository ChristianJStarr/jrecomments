import datetime
import random
import re
import uuid
import quickle
from jrecomments.models import Podcast, Comment
from jrecomments.userdata import add_comment_to_userdata


def create_comment(podcast_id, username, comment_text, parent_id=0, reply_to_id=0):

    parent_id = try_int(parent_id)
    reply_to_id = try_int(reply_to_id)
    comment_text = str(comment_text)
    comment_text = comment_text.replace('<div>', '')
    comment_text = comment_text.replace('</div>', '')
    comment_text = comment_text.replace('<br>', '')
    ## FILTER COMMENT
    comment_good = True
     #check length
    if comment_good and len(comment_text) < 2:
        comment_good = False
     #check bad char
    if comment_good:
        re1 = re.compile(r"[<>/{}[\]~`]");
        if re1.search(comment_text):
            print(comment_text)
            comment_good = False

    if not comment_good:
         return {'status': 'failed', 'reason': 'Comment Failed Filters.'}

    parent = None
    podcast = Podcast.objects.filter(id=podcast_id).first()
    if parent_id != 0:
        parent = Comment.objects.filter(id=parent_id).first()
        if parent == None:
            return {'status': 'failed', 'reason': 'ParentId Invalid.'}
    if podcast != None:
        comment = Comment()
        comment.username = username
        comment.comment = comment_text
        comment.parent_id = parent_id
        comment.date_time = datetime.datetime.utcnow()
        comment.podcast_id = podcast_id
        comment.popularity = 1 + random.randrange(0, 100)
        comment.likes += 1
        reply_to = None
        if parent_id != 0:
            parent.sub_count += 1
            parent.save()
            comment.replyToId = reply_to_id
            if reply_to_id != 0 and comment.replyToId != parent_id:
                reply_to = Comment.objects.filter(id=reply_to_id).first()
                if reply_to != None:
                    comment.replyToName = reply_to.name
                    reply_to.sub_count += 1
                    reply_to.save()
                else:
                    return {'status':'failed', 'reason': 'ReplyToId Invalid.'}
        comment.save()


        pod_data = podcast.comments
        comment_ids = []
        if pod_data != None:
            comment_ids = quickle.loads(pod_data)
        comment_ids.append(comment.id)
        podcast.comments = quickle.dumps(comment_ids)
        podcast.save()

        if reply_to != None:
            add_to_sub_comment_cache(reply_to, comment.id)
        elif parent != None:
            add_to_sub_comment_cache(parent, comment.id)

        add_comment_to_userdata(username, comment)

        return {'status': 'success', 'reason': 'None', 'commentId': comment.id}
    return {'status': 'failed', 'reason': 'Podcast not Found.'}

def add_to_sub_comment_cache(comment, comment_id):
    if comment != None and comment.sub_comments != None:
        comment_ids = quickle.loads(comment.sub_comments)
        contains = False
        for id in comment_ids:
            if id == comment_id:
                contains = True
                break
        if not contains:
            comment_ids.append(comment_id)
            comment.sub_count += 1
            comment.sub_comments = quickle.dumps(comment_ids)
            comment.save()

def remove_from_sub_comment_cache(comment, comment_id):
    if comment != None and comment.sub_comments != None:
        new_ids = []
        comment_ids = quickle.loads(comment.sub_comments)
        exists = False
        for id in comment_ids:
            if id != comment_id:
                new_ids.append(id)
            else:
                exists = True
        if exists:
            comment.sub_count -= 1
        comment.sub_comments = quickle.dumps(new_ids)
        comment.save()

def check_bad_comments():
    comments = Comment.objects.all()
    bad_comments = 0
    for comment in comments:
        comment_good = True
        # check length
        if comment_good and len(comment.comment) < 2:
            comment_good = False
        # check bad char
        if comment_good:
            re1 = re.compile(r"[<>/{}[\]~`]");
            if re1.search(comment.comment):
                comment_good = False

        if not comment_good and comment.sub_count > 0:
            comment.comment = 'comment removed'
            comment.save()
            bad_comments += 1
        elif not comment_good and comment.sub_count == 0:
            comment.delete()
    print('Removed ' + str(bad_comments) + ' Bad Comments.')

def try_int(value):
    try:
        return int(value)
    except ValueError:
        return 0

def comment_to_list(comment):
    return {'id':comment.id,
            'username': comment.username,
            'comment':comment.comment,
            'podcast': comment.podcast_id,
            'master': comment.parent_id,
            'replyToId': comment.reply_id,
            'replyToName': comment.reply_username,
            'datetime': comment.date_time,
            'likes': comment.likes,
            'subCount': comment.sub_count}