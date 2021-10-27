import datetime
import random
from django.http import JsonResponse
from django.shortcuts import render
import spotipy
from django.utils.datastructures import MultiValueDictKeyError
from spotipy.oauth2 import SpotifyClientCredentials
import quickle
from jrecomments.models import Podcast, Comment

client_id = '9f4f9e03f82d4d469df810cdf54442e9'
secret_id = 'da50b3c94c1447fca5496e144ed8ab9a'

def index_views(request):
    ##update_podcast_library(True)
    data = { 'nickname': request.session.get('nickname'),
             'liked': request.session.get('liked'),
             'disliked': request.session.get('disliked')}
    return render(request, 'main.html', data)

def privacy_views(request):
    return render(request, 'privacy.html')
def terms_views(request):
    return render(request, 'terms.html')

def podcasts(request):
    output = {}
    podcasts = Podcast.objects.all()
    for podcast in podcasts:
        comments = podcast.comments
        if comments != None:
            comments = len(comments)
        else:
            comments = 0
        output[podcast.id] = [podcast.id, podcast.name, podcast.duration, podcast.date, comments]
    return JsonResponse({'podcasts': output })

def update_podcast_library(fetch_all=False):
    sp = spotipy.Spotify(auth_manager=SpotifyClientCredentials(client_id=client_id, client_secret=secret_id))
    offset = 0
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


def comments(request, id, amount, offset):
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
                    comments[comment_id] = (comment_to_list(comment))
    return JsonResponse({'comments_total': total_comments, 'comments': comments})

def comment_to_list(comment):
    return {'id':comment.id,
            'name': comment.name,
            'nameColor': comment.name_color,
            'donor': comment.donor,
            'comment':comment.comment,
            'podcast': comment.podcast,
            'user': comment.user,
            'datetime': comment.datetime,
            'likes': comment.likes,
            'dislikes': comment.dislikes}

def random_color():
    min_color = 80
    r = random.randrange(min_color, 255)
    g = random.randrange(min_color, 255)
    b = random.randrange(min_color, 255)
    return '(' + str(r) + ',' + str(g) + ',' + str(b) + ')'

def comment(request, id):
    response = 500
    comment_id = 0
    if request.method == 'POST' or True:
        podcast = Podcast.objects.filter(id=id).first()
        nickname = request.session.get('nickname')
        color = request.session.get('nameColor')
        if color == None:
            color = random_color()
            request.session['nameColor'] = color
        if podcast != None and nickname != None:
            comment_data = ''
            try:
                comment_data = request.POST['comment']
            except MultiValueDictKeyError:
                return JsonResponse({'response': response, 'commentId': comment_id})
            if comment_data != None and len(comment_data) > 2:
                comment = Comment()
                comment.comment = comment_data
                comment.podcast = id
                comment.user = 0
                comment.name = nickname
                comment.name_color = color
                comment.datetime = datetime.datetime.now()
                comment.save()
                comment_id = comment.id
                response = 200

                comment_data = podcast.comments
                comment_ids = []
                if comment_data != None:
                    comment_ids = quickle.loads(comment_data)
                comment_ids.append(comment_id)
                podcast.comments = quickle.dumps(comment_ids)
                podcast.save()
        elif nickname == None:
            response = 502
        elif podcast == None:
            response = 503

    return JsonResponse({'response': response, 'commentId': comment_id})

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


