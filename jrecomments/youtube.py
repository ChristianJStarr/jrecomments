from time import sleep

from googleapiclient.discovery import build
import urllib.request
import json

api_key = 'AIzaSyCiQ7ITLaTYEWp7S6-TgGfLxKANU-AIYfI'
chanel_id = 'UCzQUP1qoWDoEbmsQxvdjxgQ'

com_cache = {}


def youtube_pull_comments():
    print('pulling comments')
    video_ids = get_all_video_in_channel(chanel_id)
    print('all videos received ' + str(len(video_ids)))

    temp_ids = []
    for video_id in video_ids:
        podcastId = get_podcast_id(video_id[1])
        if podcastId != 0:
            temp_ids.append(video_id)
    video_ids = temp_ids
    print(str(len(video_ids)) + ' videos are relevant.')

    for video_id in video_ids:
        podcastId = get_podcast_id(video_id[1])
        if podcastId != 0:
            comments = video_comments(video_id[0])
            print('getting comments for ' + str(podcastId))
            if podcastId in com_cache.keys():
                com_cache[podcastId] = com_cache[podcastId] + comments
            else:
                com_cache[podcastId] = comments
            break
    print(str(len(com_cache)) + ' : ' + com_cache[900])


def video_comments(video_id):
    replies = []
    output = []
    youtube = build('youtube', 'v3',
                    developerKey=api_key)
    video_response = youtube.commentThreads().list(
        part='snippet,replies',
        videoId=video_id
    ).execute()
    while video_response:
        for item in video_response['items']:
            name = item['snippet']['topLevelComment']['snippet']['authorDisplayName']
            comment = item['snippet']['topLevelComment']['snippet']['textDisplay']
            likes = item['snippet']['topLevelComment']['snippet']['likeCount']
            date = item['snippet']['topLevelComment']['snippet']['publishedAt']
            reply_count = item['snippet']['totalReplyCount']
            if reply_count > 0:
                for reply in item['replies']['comments']:
                    reply_text = reply['snippet']['textDisplay']
                    reply_name = reply['snippet']['authorDisplayName']
                    reply_likes = reply['snippet']['likeCount']
                    reply_date = reply['snippet']['publishedAt']
                    replies.append([reply_name, reply_text, reply_date, reply_likes])
            output.append([name, comment, date, likes, reply_count, replies])
            print(name)
            replies = []
        if 'nextPageToken' in video_response:
            video_response = youtube.commentThreads().list(
                part='snippet,replies',
                videoId=video_id
            ).execute()
        else:
            break
    return output


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