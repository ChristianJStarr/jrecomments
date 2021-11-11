from time import sleep
import django.middleware.csrf
from django.contrib.auth import login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse, Http404
from django.shortcuts import render
from django.utils.datastructures import MultiValueDictKeyError
from django.views.decorators.cache import cache_page
import quickle
from jrecomments.comment import create_comment, comment_to_list
from jrecomments.models import Podcast, Comment, UserData
from jrecomments.podcast import podcast_to_list, update_podcast_library
from jrecomments.userdata import add_like_to_userdata, remove_like_from_userdata, get_podcast_data_for_user

# CACHING TIMES
from jrecomments.youtube import video_comments, find_youtube_links, youtube_pull_comments, find_youtube_link_task, \
    get_youtube_links

long_expire_cache = 48 * 60 * 60 # 48 Hours
default_expire_cache = 2 * 60 * 60 # 2 Hours
auto_update_expire = 15
urgent_expire_cache = 60 # 1 Minute

# SIMULATED REQUEST DELAY
simulated_delay = 0.00


#########################################
####              PAGES              ####
#########################################

# INDEX
def index_views(request):

    ## EVERY DAY
    #find_youtube_links(30) ## Looks for (x) amount of new podcasts on youtube
    #youtube_pull_comments(100, 1000) ## Looks at (x) amount of new podcasts for (y) amount of comments each Cost:
    #sort_comment_ids()
    #find_youtube_link_task(1732)
    #print(str(get_youtube_links(1732)))
    #youtube_pull_comments()
    #check_bad_comments()
    #update_podcast_library(False)
    #Comment.objects.all().delete()
    #popularityCheck()

    #save_comments(1732, '51aDpx6ULz8', 250)
    #save_comments(1732, '2b9-tsND40g', 250)
    #save_comments(1731, 'QHQzoHolWvI', 250)
    #save_comments(1731, 'xq9h2FSNIYM', 250)


    data = { 'total_comment_count': Comment.objects.all().count(),
             'nickname': request.session.get('nickname'),
             'liked': request.session.get('liked'),
             'disliked': request.session.get('disliked')}
    return render(request, 'main.html', data)

# PRIVACY POLICY PAGE
@cache_page(long_expire_cache)
def privacy_views(request):
    return render(request, 'privacy.html')

# TERMS AND CONDITIONS PAGE
@cache_page(long_expire_cache)
def terms_views(request):
    return render(request, 'terms.html')

#########################################
####          REG PIPELINE           ####
#########################################

# GET ALL PODCAST DATA
@cache_page(default_expire_cache)
def podcasts(request):
    sleep(simulated_delay)
    output = {}
    podcasts = Podcast.objects.all()
    for podcast in podcasts:
        if podcast != None:
            output[podcast.id] = podcast_to_list(podcast)
    return JsonResponse({'podcasts': output })

# GET SPECIFIC PODCAST DATA
@cache_page(auto_update_expire)
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

# GET MASTER COMMENTS
@cache_page(urgent_expire_cache)
def comments_master(request, id, amount, offset):
    sleep(simulated_delay)
    comments = dict()
    total_comments = 0
    podcast = Podcast.objects.filter(id=id).first()
    if podcast != None and podcast.comments != None:
        comment_ids = quickle.loads(podcast.comments)
        total_comments = len(comment_ids)
        if comment_ids != None and total_comments > 0:
            comment_ids = comment_ids[int(offset):int(amount)]
            for comment_id in comment_ids:
                comment = Comment.objects.filter(id=comment_id, podcast_id=id, parent_id=0).first()
                if comment != None:
                    comments[comment_id] = comment_to_list(comment)
    return JsonResponse({'comments_total': total_comments, 'comments': comments})

# GET SUB COMMENTS OF MASTER
@cache_page(urgent_expire_cache)
def comments_sub(request, id, amount, offset):
    sleep(simulated_delay)
    comments = dict()
    total_comments = 0
    parent = Comment.objects.filter(id=id).first()
    if parent != None:
        total_comments = parent.sub_count
    data = Comment.objects.filter(parent_id=id)[int(offset):int(amount)]
    if data != None:
        for comment in data:
            comments[comment.id] = comment_to_list(comment)
    return JsonResponse({'comments_total': total_comments, 'comments': comments})

# GET SPECIFIC USER DATA
def podcast_user_data(request, id):
    if request.user.is_authenticated:
        user_data = get_podcast_data_for_user(request.user.get_username(), id)
        if user_data != None:
            return JsonResponse({'status': 'success', 'userData': user_data})
    return JsonResponse({'status': 'failed'})

#########################################
####        QUICK APP ACTIONS        ####
#########################################

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
    if request.user.is_authenticated:
        id = int(id)
        comment = Comment.objects.filter(id=id).first()
        if comment != None and add_like_to_userdata(request.user.get_username(), comment):
            comment.likes += 1;
            comment.save()
            return JsonResponse({'status': 'success'})
    return JsonResponse({'status': 'failed'})

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

#########################################
####          SERVER TASKS           ####
#########################################

# UPDATE POPULARITY ON PODCASTS
def popularityCheck():
    print('Popularity Check: Started')
    podcasts = Podcast.objects.all()
    for podcast in podcasts:
        likes = 0
        if podcast != None and podcast.comments != None:
            comment_ids = quickle.loads(podcast.comments)
            total_comments = len(comment_ids)
            if comment_ids != None and total_comments > 0:
                for comment_id in comment_ids:
                    comment = Comment.objects.filter(id=comment_id, podcast_id=podcast.id).first()
                    if comment != None:
                        likes += comment.likes
            podcast.score = likes
            podcast.popularity = likes + (total_comments / 2)
            podcast.save()
    print('Popularity Check: Finished')


def sort_comment_ids():
    podcasts = Podcast.objects.all()

    for podcast in podcasts:
        lib = {}
        if podcast != None and podcast.comments != None:
            comment_ids = quickle.loads(podcast.comments)
            total_comments = len(comment_ids)
            if comment_ids != None and total_comments > 0:
                for comment_id in comment_ids:
                    comment = Comment.objects.filter(id=comment_id, podcast_id=podcast.id, parent_id=0).first()
                    if comment != None:
                        popularity = comment.likes + (comment.sub_count / 2)
                        comment.popularity = popularity
                        lib[comment.id] = [popularity]
                        comment.save()
            lib = dict(sorted(lib.items(), key=lambda item: item[1]))
            temp = []
            keys = lib.keys()
            for key in keys:
                temp.append(key)
            podcast.comments = quickle.dumps(temp)
            podcast.save()

def try_int(value):
    try:
        return int(value)
    except ValueError:
        return 0

