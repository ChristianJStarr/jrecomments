import spotipy
import quickle
from spotipy import SpotifyClientCredentials
from jrecomments.models import Podcast, Comment
import environ


# Initialise environment variables
env = environ.Env()
environ.Env.read_env()


yt_channel_id = '4rOoJ6Egrf8K2IrywzwOMk'
client_id = env('YT_ID')
secret_id = env('YT_SECRET')


# UPDATE PODCAST LIBRARY FROM SPOTIFY WEB API
def update_podcast_library(fetch_all=False):
    sp = spotipy.Spotify(auth_manager=SpotifyClientCredentials(client_id=client_id, client_secret=secret_id))
    offset = 0
    podcasts = []
    print('Updating Podcast Library - Fetch All: ' + str(fetch_all))
    if not fetch_all:
        ## CHECK FOR UPDATE
        results = sp.show_episodes(yt_channel_id, limit=10, offset=offset, market='US')
        results = results['items']
        for result in results:
            podcast = create_podcast_from_results(result)
            if podcast:
                podcasts.append(podcast)



    else:
        ## FETCH ALL
        while True:
            results = sp.show_episodes(yt_channel_id, limit=50, offset=offset, market='US')
            offset += 50
            results = results['items']
            if len(results) == 0:
                break
            for result in results:
                podcast = create_podcast_from_results(result)
                if podcast:
                    podcasts.append(podcast)
def create_podcast_from_results(result_data):
    name = result_data['name']
    id = try_int(get_podcast_id(name))
    name = get_podcast_name(name)

    duration_ms = result_data['duration_ms']
    release_date = result_data['release_date']
    spotify_id = result_data['id']

    name = name.replace('(Part 1)', '')
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
    return podcast

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

# CONVERT PODCAST OBJ TO LIST []
def podcast_to_list(podcast, total_comments=None):
    if total_comments == None and podcast.comments != None:
        comment_ids = quickle.loads(podcast.comments)
        total_comments = len(comment_ids)
    if total_comments == None:
        total_comments = 0
    has_links = ''

    return {'id':podcast.id,
            'name': podcast.name,
            'duration':podcast.duration,
            'date':podcast.date,
            'comments':total_comments,
            'score':podcast.score,
            'popularity':podcast.popularity,
            'spotify':podcast.spotify_id}

# FUNCTIONS
def parent_fix():
    podcasts = Podcast.objects.all()
    for podcast in podcasts:
        comments = Comment.objects.filter(podcast_id=podcast.id, parent_id=0)
        for comment in comments:
            sub_comments = Comment.objects.filter(podcast_id=podcast.id, parent_id=comment.id)
            subs = []
            for sub_comment in sub_comments:
                sub_comment.reply_id = comment.id
                sub_comment.save()
                subs.append(sub_comment.id)
            comment.sub_count = len(sub_comments)
            comment.sub_comments = quickle.dumps(subs)
            comment.save()
            print('Likes: ' + str(comment.likes))
def get_podcast(podcast_id):
    return Podcast.objects.filter(id=podcast_id).first()
def try_int(value):
    try:
        return int(value)
    except ValueError:
        return 0

