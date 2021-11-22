import json
from time import sleep
import django.middleware.csrf
from django.contrib.auth import login, logout
from django.contrib.auth.models import User
from django.db.models import Q
from django.http import JsonResponse, Http404
from django.shortcuts import render
from django.utils.datastructures import MultiValueDictKeyError
import quickle
from jrecomments.comment import create_comment, get_comments, get_sub_comments
from jrecomments.models import Podcast, Comment, UserData
from jrecomments.podcast import podcast_to_list, update_podcast_library
from jrecomments.userdata import add_like_to_userdata, remove_like_from_userdata, get_podcast_data_for_user
from jrecomments.youtube import youtube_pull_comments

# SIMULATED REQUEST DELAY
simulated_delay = 0.00


# <editor-fold desc="PAGES">
# INDEX
def index_views(request):
    data = { 'total_comment_count': '864,952' }
    return render(request, 'main.html', data)

# PRIVACY POLICY PAGE
def privacy_views(request):
    return render(request, 'privacy.html')

# TERMS AND CONDITIONS PAGE
def terms_views(request):
    return render(request, 'terms.html')
# </editor-fold>

def save_db_json():
    output = {}
    podcasts = Podcast.objects.all()
    for podcast in podcasts:
        if podcast.youtube_links != None:
            output[podcast.id] = quickle.loads(podcast.youtube_links)

    f = open("youtube-links.txt", "a")
    f.write(json.dumps(output))
    f.close()

    print('saved links')


def load_db_json():
    output = {}
    podcasts = Podcast.objects.all()
    for podcast in podcasts:
        output[podcast.id] = podcast.youtube_links

    f = open("/home/jrecomments/jrecomments/youtube-links.txt", "r")
    data = json.loads(f.read())
    for index in data:
        podcast = Podcast.objects.filter(id=index).first()
        if podcast != None:
            podcast.youtube_links = quickle.dumps(data[index])
            print('saved linked #' + str(index) + '     -   ' + str(data[index]))
            podcast.save()


# <editor-fold desc="REG PIPELINE">
### GET ALL PODCAST DATA
def podcasts(request):
    sleep(simulated_delay)
    output = {}
    podcasts = Podcast.objects.all()
    for podcast in podcasts:
        if podcast != None:
            output[podcast.id] = podcast.to_quick_list()
    return JsonResponse({'podcasts': output })

### GET SPECIFIC PODCAST DATA
def podcast(request, id):
    sleep(simulated_delay)
    comments = 0
    likes = 0
    podcast = Podcast.objects.filter(id=id).first()
    if podcast != None and podcast.comments != None:
        comment_ids = quickle.loads(podcast.comments)
        total_comments = len(comment_ids)
        if comment_ids != None and total_comments > 0:
            for comment_id in comment_ids:
                comment = Comment.objects.filter(id=comment_id, podcast_id=id).first()
                if comment != None:
                    likes += comment.likes
        podcast.score = likes
        podcast.popularity = likes + (total_comments / 2)
        podcast.save()
        return JsonResponse({'podcast': podcast_to_list(podcast, total_comments) })
    return Http404()

### Request Comments of PodcastId
def comments_master(request, id, amount, offset, username=''):
    if simulated_delay > 0: sleep(simulated_delay)
    comments = get_comments(id, offset, amount, username)
    output = []
    for comment in comments:
        output.append(comment.to_list())
    return JsonResponse({'comments': output})

### Request Sub Comments of CommentId
def comments_sub(request, id, amount, offset, username=''):
    if simulated_delay > 0: sleep(simulated_delay)
    output = []
    total_comments = 0
    comments = get_sub_comments(id, offset, amount, username)
    for comment in comments:
        output = comment.to_list()
    return JsonResponse({'comments_total': total_comments, 'comments': output})

### GET SPECIFIC USER DATA
def podcast_user_data(request, id):
    if request.user.is_authenticated:
        user_data = get_podcast_data_for_user(request.user.get_username(), id)
        if user_data != None:
            return JsonResponse({'status': 'success', 'userData': user_data})
    return JsonResponse({'status': 'failed'})
# </editor-fold>

# <editor-fold desc="QUICK APP ACTIONS">
# MAKE A COMMENT
def comment(request, id, parent_id=0, reply_to_id=0):
    if request.method == 'POST':
        if not request.user.is_authenticated:
            return JsonResponse({'status': 'failed', 'reason': 'Must be logged in.'})
        name = request.user.get_username()
        try:
            comment_text = request.POST['comment']
        except MultiValueDictKeyError:
            return JsonResponse({'status': 'failed', 'reason': 'Invalid Comment Data.'})
        response = create_comment(id, name, comment_text, parent_id=parent_id, reply_to_id=reply_to_id)
        return JsonResponse(response)
    else:
        return JsonResponse({'status': 'failed', 'reason': 'POST Required.'})

# LIKE COMMENT
def like_comment(request, id):
    data = {'status': 'failed', 'reason':'authentication'}
    if request.user.is_authenticated:
        comment = Comment.objects.filter(id=id).first()
        if comment != None:
            if add_like_to_userdata(request.user.get_username(), comment):
                comment.likes += 1
                comment.save()
                data = {'status': 'success'}
            else:
                data = {'status': 'failed', 'reason': 'taskfailed'}
        else:
            data = {'status': 'failed', 'reason': 'notfoundcomment'}
    return JsonResponse(data)

# DISLIKE COMMENT
def dislike_comment(request, id):
    if request.user.is_authenticated:
        id = int(id)
        comment = Comment.objects.filter(id=id).first()
        if comment != None and remove_like_from_userdata(request.user.get_username(), comment):
            comment.likes -= 1;
            comment.save()
            return JsonResponse({'status': 'success'})
    return JsonResponse({'status': 'failed'})

# LOGIN / SIGNUP
def loginsignup(request):
    if request.method == 'POST':
        try:
            username = request.POST['username']
            password = request.POST['password']
        except MultiValueDictKeyError:
            return JsonResponse({'status': 'failed', 'reason': 'There was an Error.'})

        username = str(username)
        if len(username) < 5 and len(password) == 0:
            return JsonResponse({'status': 'failed', 'reason': 'Invalid username or password length.'})



        check = User.objects.filter(username=username).first()
        if check != None:
            if check.password == password:
                login(request, check)
                return JsonResponse({'status': 'success', 'reason': ''})
            return JsonResponse({'status': 'failed', 'reason': 'Username already exists or you entered the wrong password.'})
        user = User()
        user.username = username
        user.password = password
        user.save()
        userData = UserData()
        userData.username = username
        userData.comments = quickle.dumps({})
        userData.likes = quickle.dumps({})
        userData.save()
        login(request, user)
        return JsonResponse({'status': 'success', 'reason': ''})
    else:
        return JsonResponse({'status': 'failed', 'reason': 'There was an Error.'})

# LOGOUT
def logout_action(request):
    logout(request)
    return JsonResponse({'status': 'success', 'reason': ''})

# REQUEST NEW CSRF TOKEN
def request_token(request):
    return JsonResponse({'status': 'success','newToken': django.middleware.csrf.get_token(request)})
# </editor-fold>

# <editor-fold desc="SERVER TASKS">
def daily_task():
    update_podcast_library(False)
    youtube_pull_comments(100)
    calculate_comment_popularity()
    calculate_podcast_popularity()
    fix_comment_replies()

def calculate_comment_popularity():
    batch_size = 25000
    offset = 0
    comments = []
    total = Comment.objects.all().count()
    print(total)
    while True:
        comments = Comment.objects.all()[offset:offset + batch_size]
        offset += batch_size
        if len(comments) == 0:
            break
        for comment in comments:
            comment.popularity = comment.likes + (comment.sub_count * 2)
            print(comment.popularity)
        Comment.objects.bulk_update(comments, ['popularity'])
        print('Calculating Popularity: ' + str(int((offset / total) * 100)) + '%')
    return

def calculate_podcast_popularity():
    podcasts = Podcast.objects.all().order_by('-id')
    for podcast in podcasts:
        comments = Comment.objects.filter(podcast_id=podcast.id)
        likes = 0
        coms = 0
        for comment in comments:
            coms += 1 + comment.sub_count
            likes += comment.likes
        podcast.popularity = likes + (coms * 2)
        podcast.score = likes
        podcast.comments = coms
        print(str(podcast.popularity) + ' #' + str(podcast.id))
    Podcast.objects.bulk_update(podcasts, ['popularity', 'score', 'comments'])

def fix_comment_replies():
    replies = 0
    podcasts = Podcast.objects.all()
    for podcast in podcasts:
        comments = Comment.objects.filter(podcast_id=podcast.id).exclude(parent_id=0)
        usernames = []
        for comment in comments:
            usernames.append([comment.username, comment.id])

        for comment in comments:
            for username in usernames:
                if comment.comment.startswith('@' + username[0]):
                    comment.comment = comment.comment[len(username[0]) + 1:]
                    comment.reply_username = username[0]
                    comment.reply_id = username[1]
                    replies += 1
        if len(comments) > 0:
            Comment.objects.bulk_update(comments, ['comment', 'reply_username', 'reply_id'])
        print('Done For #' + str(podcast.id))

def wipe_podcast(podcast_id):
    podcast = Podcast.objects.filter(id=podcast_id).first()
    podcast.comments = 0
    podcast.score = 0
    podcast.popularity = 0
    podcast.save()
    Comment.objects.filter(podcast_id=podcast_id).delete()
# </editor-fold>



