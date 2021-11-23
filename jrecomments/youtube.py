import random
from itertools import islice
from time import sleep, time

from django.db import transaction
from googleapiclient.discovery import build
import urllib.request
import json
import quickle
from googleapiclient.errors import HttpError

from jrecomments.comment import bulk_create_comments
from jrecomments.models import Comment, Podcast


#api_key = 'AIzaSyCiQ7ITLaTYEWp7S6-TgGfLxKANU-AIYfI'

api_key = 'AIzaSyAu8N6583jvHYPAGJMVnvG9mC7ce-jPqxA'
chanel_id = 'UCzQUP1qoWDoEbmsQxvdjxgQ'

com_cache = {}


# <editor-fold desc="Pull Youtube Comments">
def youtube_pull_comments(max_comments=10000):
    podcasts = Podcast.objects.all()
    podcasts = list(podcasts)
    random.shuffle(podcasts)
    for podcast in podcasts:
        start_time = time()

        comments_count = Comment.objects.filter(podcast_id=podcast.id).count()
        if comments_count > 5000:
            continue

        Comment.objects.filter(podcast_id=podcast.id).delete()
        total_comments = 0
        max_calls = max_comments / 100
        youtube_links = get_youtube_links(podcast.id)
        if youtube_links != None:
            link_length = len(youtube_links)
            if link_length > 0:
                max_calls /= link_length
                for youtube_link in youtube_links:
                    if youtube_link_valid(podcast, youtube_link):
                        comments = get_all_top_level_comments(podcast.id, youtube_link, max_calls)
                        for comment in comments:
                            comment.save()
                            total_comments += 1
                        sub_comments = []
                        for comment in comments:
                            if comment.sub_count > 5:
                                sub_comments = get_all_sub_comments(podcast.id, comment, 2)
                                for sub in sub_comments:
                                    sub.save()
                                    total_comments += 1
        if total_comments > 0:
            print('Scraper - YT : Finished #' + str(podcast.id) + ' in ' + str(int(time() - start_time)) + 's ' + str(total_comments) + 'c')




def get_all_top_level_comments(podcast_id, video_id, max_calls):
    comments = []
    count = 0
    calls = 1
    youtube = build('youtube', 'v3', developerKey=api_key)
    video_response = youtube.commentThreads().list(
        part='snippet,replies',
        videoId=video_id,
        maxResults=100,
        order='relevance'
    ).execute()
    while video_response:
        for item in video_response['items']:
            comment = response_data_to_comment(podcast_id, item)
            comments.append(comment)
            count += 1
            if(calls >= max_calls):
                break

        if 'nextPageToken' in video_response and calls < max_calls :
            calls += 1
            video_response = youtube.commentThreads().list(
                part='snippet,replies',
                videoId=video_id,
                maxResults=100,
                order='relevance',
                pageToken=video_response['nextPageToken']
            ).execute()
        else:
            break

    return comments
def get_all_sub_comments(podcast_id, comment, max_calls):
    comments = []
    count = 0
    calls = 1
    youtube = build('youtube', 'v3', developerKey=api_key)
    video_response = youtube.comments().list(
        part='id, snippet',
        parentId=comment.yt_comment_id,
        maxResults=100
    ).execute()
    while video_response:
        for item in video_response['items']:
            commentd = response_data_to_sub_comment(podcast_id, comment.id, comment.yt_video_id, item)
            comments.append(commentd)
            count += 1
            if (calls >= max_calls):
                break

        if 'nextPageToken' in video_response and calls < max_calls:
            calls += 1
            video_response = youtube.comments().list(
                part='id, snippet',
                parentId=comment.yt_comment_id,
                maxResults=100,
                pageToken=video_response['nextPageToken']
            ).execute()
        else:
            break

    return comments
def response_data_to_comment(podcast_id, data):
    snippet = data['snippet']['topLevelComment']['snippet']
    comment = Comment()
    comment.podcast_id = podcast_id
    comment.username = snippet['authorDisplayName']
    comment.date_time = snippet['publishedAt']
    comment.likes = snippet['likeCount']
    comment.sub_count = data['snippet']['totalReplyCount']
    comment.popularity = snippet['likeCount'] + (data['snippet']['totalReplyCount'] * 2)
    comment.comment = snippet['textDisplay']
    comment.is_offsite_comment = True
    comment.yt_comment_id = data['id']
    comment.yt_channel_id = snippet['authorChannelId']['value']
    comment.yt_video_id = snippet['videoId']
    return comment
def response_data_to_sub_comment(podcast_id, parent_id, video_id, data):
    comment = Comment()
    comment.podcast_id = podcast_id
    comment.username = data['snippet']['authorDisplayName']
    comment.date_time = data['snippet']['publishedAt']
    comment.likes = data['snippet']['likeCount']
    comment.popularity = data['snippet']['likeCount']
    comment.comment = data['snippet']['textDisplay']
    comment.parent_id = parent_id
    comment.is_offsite_comment = True
    comment.yt_comment_id = data['id']
    comment.yt_channel_id = data['snippet']['authorChannelId']['value']
    comment.yt_video_id = video_id
    comment.yt_parent_id = data['snippet']['parentId']
    return comment
# </editor-fold>

def youtube_link_valid(podcast, youtube_link):
    youtube = build('youtube', 'v3', developerKey=api_key)
    video_response = youtube.videos().list(
        part='snippet',
        id=youtube_link,
        maxResults=5
    ).execute()
    for item in video_response['items']:
        if item['id'] == youtube_link:
            title = item['snippet']['title']
            description = item['snippet']['description']
            search = '#' + str(podcast.id) + ' '
            if search in title or search in description:
                return True
            else:
                print('invalid link saved.')
                return False
    print('invalid link saved.')
    return False




def get_youtube_links(podcast_id):
    podcast = Podcast.objects.filter(id=podcast_id).first()
    if podcast != None:
        youtube_links = podcast.youtube_links
        if youtube_links != None:
            return quickle.loads(youtube_links)
    return None

def find_youtube_links(amount=0, max_quota=1000, max_links=5):
    max_calls = max_quota / 100
    count = 0
    call_count = 0
    podcasts = Podcast.objects.order_by('-id')
    if amount == 0:
        amount = len(podcasts)
    for podcast in podcasts:
        called = find_youtube_link_task(podcast, max_links)
        if called:
            call_count += 1
        count += 1
        if count >= amount or call_count >= max_calls:
            break

def find_youtube_link_task(podcast, max_count=5):
    if podcast != None:
        if podcast.youtube_links != None:
            youtube_links = quickle.loads(podcast.youtube_links)
            if youtube_links:
                if len(youtube_links) != 0:
                    print('FindLieeenks : #' + str(podcast.id) + ' has links. ' + str(len(youtube_links)))
                    return


        links = []
        count = 0
        search = '#' + str(podcast.id) + ' '
        ## FIND SOME LINKS DUDE
        try:
            api_key = 'AIzaSyCiQ7ITLaTYEWp7S6-TgGfLxKANU-AIYfI'
            youtube = build('youtube', 'v3', developerKey=api_key)
            video_response = youtube.search().list(
                part='snippet',
                channelId=chanel_id,
                maxResults=50,
                type='video',
                q=search,
                order='relevance'
            ).execute()
        except HttpError:
            api_key = 'AIzaSyAu8N6583jvHYPAGJMVnvG9mC7ce-jPqxA'
            youtube = build('youtube', 'v3', developerKey=api_key)
            video_response = youtube.search().list(
                part='snippet',
                channelId=chanel_id,
                maxResults=50,
                type='video',
                q=search,
                order='relevance'
            ).execute()

        while video_response:
            for item in video_response['items']:
                description = item['snippet']['description']
                title = item['snippet']['title']
                yt_id = item['id']['videoId']
                if search in description or search in title:
                    links.append(yt_id)
                count += 1
                if (count >= max_count):
                    break
            break
        print('FindLinks : #' + str(podcast.id) + ' found links. Amount: ' + str(len(links)))
        podcast.youtube_links = quickle.dumps(links)
        podcast.save()
        return True


def get_podcast_id(video_name):
    if '#' in video_name:
        video_name = video_name.split('#')[1]
        video_name = video_name[:4]
        video_name = video_name.replace(' ', '')
        return try_int(video_name)
    return 0

def get_all_video_in_channel(channel_id):
    base_search_url = 'https://www.googleapis.com/youtube/v3/search?'
    first_url = base_search_url + 'key={}&channelId={}&part=snippet,id&order=date&maxResults=25'.format(api_key,channel_id)
    video_ids = []
    url = first_url
    count = 0
    while True:
        count += 1
        if count == 1:
            sleep(2)
            count = 0
        inp = urllib.request.urlopen(url,timeout=30)
        resp = json.load(inp)
        for i in resp['items']:
            if i['id']['kind'] == "youtube#video":
                video_ids.append([i['id']['videoId'], i['snippet']['title']])
        try:
            next_page_token = resp['nextPageToken']
            url = first_url + '&pageToken={}'.format(next_page_token)
        except:
            break
    return video_ids

def try_int(value):
    try:
        return int(value)
    except ValueError:
        return 0
