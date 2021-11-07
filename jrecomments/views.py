import datetime
import random
from time import sleep

import django.middleware.csrf
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse, FileResponse, Http404
from django.shortcuts import render
import spotipy
from django.utils.datastructures import MultiValueDictKeyError
from django.views.decorators.cache import cache_page
from spotipy.oauth2 import SpotifyClientCredentials
import quickle

from jrecomments.comment import create_comment, check_bad_comments
from jrecomments.models import Podcast, Comment
from jrecomments.youtube import video_comments, youtube_pull_comments

client_id = '9f4f9e03f82d4d469df810cdf54442e9'
secret_id = 'da50b3c94c1447fca5496e144ed8ab9a'

long_expire_cache = 48 * 60 * 60 # 48 Hours
default_expire_cache = 2 * 60 * 60 # 2 Hours
auto_update_expire = 15
urgent_expire_cache = 60 # 1 Minute

simulated_delay = 0.25

def index_views(request):
    #youtube_pull_comments()
    #check_bad_comments()
    #update_podcast_library(True)
    #Comment.objects.all().delete()
    #popularityCheck()
    data = { 'total_comment_count': Comment.objects.all().count(),
             'nickname': request.session.get('nickname'),
             'liked': request.session.get('liked'),
             'disliked': request.session.get('disliked')}
    return render(request, 'main.html', data)

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
        login(request, user)
        return JsonResponse({'status': 'success', 'reason': ''})
    else:
        return JsonResponse({'status': 'failed', 'reason': 'There was an Error.'})

def logout_action(request):
    logout(request)
    return JsonResponse({'status': 'success', 'reason': ''})

def request_token(request):
    if request.user.is_authenticated:
        return JsonResponse({'status': 'success','newToken': django.middleware.csrf.get_token(request)})
    return JsonResponse({'status': 'failed', 'reason': 'User not logged in.'})

@cache_page(long_expire_cache)
def privacy_views(request):
    return render(request, 'privacy.html')

@cache_page(long_expire_cache)
def terms_views(request):
    return render(request, 'terms.html')

#@cache_page(default_expire_cache)
def podcasts(request):
    sleep(simulated_delay)
    output = {}
    podcasts = Podcast.objects.all()
    for podcast in podcasts:
        if podcast != None:
            output[podcast.id] = podcast_to_list(podcast)
    return JsonResponse({'podcasts': output })

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
                comment = Comment.objects.filter(id=comment_id, podcast=id).first()
                if comment != None:
                    likes += comment.likes
        podcast.score = likes
        podcast.popularity = likes + (total_comments / 2)
        podcast.save()
        return JsonResponse({'podcast': podcast_to_list(podcast, total_comments) })
    return Http404()


def podcast_to_list(podcast, total_comments=None):
    if total_comments == None and podcast.comments != None:
        comment_ids = quickle.loads(podcast.comments)
        total_comments = len(comment_ids)
    if total_comments == None:
        total_comments = 0

    return {'id':podcast.id,
            'name':podcast.name,
            'duration':podcast.duration,
            'date':podcast.date,
            'comments':total_comments,
            'score':podcast.score,
            'popularity':podcast.popularity,
            'spotify':podcast.spotify_id}

def update_podcast_library(fetch_all=False):
    sp = spotipy.Spotify(auth_manager=SpotifyClientCredentials(client_id=client_id, client_secret=secret_id))
    offset = 0
    print('Updating Podcast Library - Fetch All: ' + str(fetch_all))
    if not fetch_all:
        ## CHECK FOR UPDATE
        results = sp.show_episodes('4rOoJ6Egrf8K2IrywzwOMk', limit=10, offset=offset, market='US')
        results = results['items']
        for result in results:
            name = get_podcast_name(result['name'])
            id = get_podcast_id(result['name'])
            id = int(id)
            duration_ms = result['duration_ms']
            release_date = result['release_date']
            spotify_id = result['id']
            podcast = Podcast.objects.filter(id=id).first()
            if podcast == None:
                podcast = Podcast()
            elif podcast.name != name:
                if '(Part 1)' in name or '(Part 2)' in name:
                    name.replace('(Part 1)', '')
                    name.replace('(Part 2)', '')
                    if podcast.duration != None and podcast.duration != '':
                        hours = podcast.duration.split('h')[0]
                        mins = podcast.duration.split('h')[1].replace('m', '')
                        hours = try_int(hours)
                        mins = try_int(mins)
                        mins += hours * 60
                        mins *= 60
                        mins *= 1000
                        duration_ms += mins
            podcast.duration = get_podcast_duration(duration_ms)
            podcast.id = id
            podcast.name = name
            podcast.spotify_id = spotify_id
            podcast.date = release_date
            podcast.save()
    else:
        ## FETCH ALL
        while True:
            results = sp.show_episodes('4rOoJ6Egrf8K2IrywzwOMk', limit=50, offset=offset, market='US')
            offset += 50
            results = results['items']
            if len(results) == 0:
                break
            for result in results:
                name = get_podcast_name(result['name'])
                id = get_podcast_id(result['name'])
                id = int(id)
                duration_ms = result['duration_ms']
                release_date = result['release_date']
                spotify_id = result['id']
                podcast = Podcast.objects.filter(id=id).first()
                if podcast == None:
                    podcast = Podcast()
                elif podcast.name != name:
                    if '(Part 1)' in name or '(Part 2)' in name:
                        name.replace('(Part 1)', '')
                        name.replace('(Part 2)', '')
                        if podcast.duration != None and podcast.duration != '':
                            hours = podcast.duration.split('h')[0]
                            mins = podcast.duration.split('h')[1].replace('m', '')
                            hours = try_int(hours)
                            mins = try_int(mins)
                            mins += hours * 60
                            mins *= 60
                            mins *= 1000
                            duration_ms += mins
                podcast.duration = get_podcast_duration(duration_ms)
                podcast.id = id
                podcast.name = name
                podcast.date = release_date
                podcast.spotify_id = spotify_id
                podcast.save()

def get_podcast_id(data):
    id = data.split('-')[0]
    id = id.replace('#', '')
    id = id.replace(' ', '')
    try:
        id = int(id)
    except ValueError:
        id = 0
    return id

def get_podcast_name(data):
    name = data.split('-')
    if len(name) > 1:
        name = name[1]
        if name[0] == ' ' and len(name) > 0:
            name = name[1:]
        return name
    return 'No Name'

def get_podcast_duration(ms):
    ms = try_int(ms)
    m = (ms / (1000 * 60)) % 60
    h = (ms / (1000 * 60 * 60)) % 24
    return str(int(h)) + 'h' + str(int(m)) + 'm'

def try_int(value):
    try:
        return int(value)
    except ValueError:
        return 0

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
                    comment = Comment.objects.filter(id=comment_id, podcast=id).first()
                    if comment != None:
                        likes += comment.likes
            podcast.score = likes
            podcast.popularity = likes + (total_comments / 2)
            podcast.save()
    print('Popularity Check: Finished')

#@cache_page(urgent_expire_cache)
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
                comment = Comment.objects.filter(id=comment_id, podcast=id, parent_id=0).first()
                if comment != None:
                    comments[comment_id] = comment_to_list(comment)
    return JsonResponse({'comments_total': total_comments, 'comments': comments})

#@cache_page(urgent_expire_cache)
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


def comment_to_list(comment):
    return {'id':comment.id,
            'name': comment.name,
            'nameColor': comment.name_color,
            'donor': comment.donor,
            'comment':comment.comment,
            'podcast': comment.podcast,
            'master': comment.parent_id,
            'replyToId': comment.replyToId,
            'replyToName': comment.replyToName,
            'replyToColor': comment.replyToColor,
            'user': comment.user,
            'datetime': comment.datetime,
            'likes': comment.likes,
            'dislikes': comment.dislikes,
            'subCount': comment.sub_count}

def random_color():
    min_color = 80
    r = random.randrange(min_color, 255)
    g = random.randrange(min_color, 255)
    b = random.randrange(min_color, 255)
    return '(' + str(r) + ',' + str(g) + ',' + str(b) + ')'

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

def add_to_id_list(podcast_id, comment_id):
    podcast = Podcast.objects.filter(id=podcast_id).first()
    if podcast != None:

        return True
    return False

def set_nick(request, nickname):
    responseError = None
    if True: ## Nicname Validation
        request.session['nickname'] = nickname
        request.session['nameColor'] = random_color()
        status = 'success'
    else:
        #responseError = 'ErrorMsg'
        status = 'failed'
    return JsonResponse({'responseStatus': status, 'responseError': responseError})


def like_comment(request, id):
    success = 'failed'
    id = int(id)
    comment = Comment.objects.filter(id=id).first()
    if comment != None:
        comment.likes += 1;
        session_like(request, id)
        comment.save()
        success = 'success'
    return JsonResponse({'responseMsg': success})

def dislike_comment(request, id):
    success = 'failed'
    id = int(id)
    comment = Comment.objects.filter(id=id).first()
    if comment != None:
        comment.dislikes += 1
        session_dislike(request, id)
        comment.save()
        success = 'success'
    return JsonResponse({'responseMsg': success})


def session_like(request, id):
    liked = request.session.get('liked')
    disliked = request.session.get('disliked')
    if liked == None:
        request.session['liked'] = []
    request.session['liked'].append(id)

    if disliked == None:
        request.session['disliked'] = []
    else:
        new_disliked = []
        for comment_id in disliked:
            if comment_id != id:
                new_disliked.append(comment_id)
        request.session['disliked'] = new_disliked

def session_dislike(request, id):
    liked = request.session.get('liked')
    disliked = request.session.get('disliked')
    if disliked == None:
        request.session['disliked'] = []
    request.session['disliked'].append(id)

    if liked == None:
        request.session['liked'] = []
    else:
        new_liked = []
        for comment_id in liked:
            if comment_id != id:
                new_liked.append(comment_id)
        request.session['liked'] = new_liked


