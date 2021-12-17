#from jrecomments.models import UserData
import quickle


def get_podcast_data_for_user(username, podcast_id):
    userData = get_user_data(username)
    if userData != None:
        return {'likes': get_likes_data(userData, podcast_id), 'comments': get_comments_data(userData, podcast_id)}
    return None

def get_likes_data(data, podcast_id):
    if data != None and data.likes != None:
        likes = quickle.loads(data.likes)
        if likes != None and podcast_id in likes:
            return likes[podcast_id]
    return []

def get_comments_data(data, podcast_id):
    if data != None and data.comments != None:
        comments = quickle.loads(data.comments)
        if comments != None and podcast_id in comments:
            return comments[podcast_id]
    return []

def get_user_data(username):
    userData = UserData.objects.filter(username=username).first()
    if not userData:
        userData = UserData()
        userData.username = username
    return userData

def add_comment_to_userdata(username, comment):
    userData = get_user_data(username)
    if userData != None:
        comments = quickle.loads(userData.comments)
        if comments == None or comments == []:
            comments = {}
        if not comment.podcast_id in comments:
            comments[comment.podcast_id] = [comment.id]
        else:
            comments[comment.podcast_id].append(comment.id)
        userData.comments = quickle.dumps(comments)
        userData.save()

def remove_comment_from_userdata(username, comment):
    userData = get_user_data(username)
    if userData != None:
        comments = quickle.loads(userData.comments)
        if comments != None:
            comments = {}
        if comment.podcast_id in comments:
            if comment.id in comments[comment.podcast_id]:
                comments[comment.podcast_id].remove(comment.id)
                userData.comments = quickle.dumps(comments)
                userData.save()

def add_like_to_userdata(username, comment):
    userData = get_user_data(username)
    if userData != None:
        likes = {}
        if userData.likes:
            likes = quickle.loads(userData.likes)
            if likes == None:
                likes = {}

        if not comment.podcast_id in likes:
            likes[comment.podcast_id] = [comment.id]
            userData.likes = quickle.dumps(likes)
            userData.save()
            return True
        elif not comment.id in likes[comment.podcast_id]:
            likes[comment.podcast_id].append(comment.id)
            userData.likes = quickle.dumps(likes)
            userData.save()
            return True
    return False

def remove_like_from_userdata(username, comment):
    userData = get_user_data(username)
    if userData != None:
        likes = quickle.loads(userData.likes)
        if likes != None:
            likes = {}
        if comment.podcast_id in likes:
            if comment.id in likes[comment.podcast_id]:
                likes[comment.podcast_id].remove(comment.id)
                userData.likes = quickle.dumps(likes)
                userData.save()
                return True
    return False


