import datetime
import random

from jrecomments.models import Podcast, Comment


def create_comment(podcast_id, name, comment_text, parent_id=0, reply_to_id=0):
    ## FILTER COMMENT
    if len(comment_text) < 2:
         return {'status': 'failed', 'reason': 'Invalid Comment Given.'}

    podcast = Podcast.objects.filter(id=podcast_id).first()
    if parent_id != 0:
        parent = Comment.objects.filter(id=parent_id).first()
        if parent == None:
            return {'status': 'failed', 'reason': 'ParentId Invalid.'}
    if podcast != None:
        comment = Comment()
        comment.name = name
        comment.comment = comment_text
        comment.parent_id = parent_id
        comment.datetime = datetime.datetime.now()
        comment.podcast = podcast_id
        comment.popularity = 1 + random.randrange(0, 100)
        comment.likes += 1
        if parent_id != 0:
            comment.replyToId = reply_to_id
            if reply_to_id != 0 and comment.replyToId != parent_id:
                reply_to = Comment.objects.filter(id=reply_to_id).first()
                if reply_to != None:
                    comment.replyToName = reply_to.name
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
        return {'status': 'success', 'reason': 'None'}
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