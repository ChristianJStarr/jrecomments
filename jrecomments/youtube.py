from time import sleep
from googleapiclient.discovery import build
import urllib.request
import json
import quickle
from jrecomments.models import Comment, Podcast


api_key = 'AIzaSyCiQ7ITLaTYEWp7S6-TgGfLxKANU-AIYfI'
chanel_id = 'UCzQUP1qoWDoEbmsQxvdjxgQ'

com_cache = {}


def youtube_pull_comments(count, max_quota):
    current = Podcast.objects.all().last().id
    change = 0
    if count > 0:
        while True:
            current = current - change
            change += 1
            youtube_pull_new_comments(current, max_quota / count)
            if change == count:
                break

def youtube_pull_new_comments(podcast_id, max_quota_per):
    max_comments = max_quota_per * 100
    youtube_links = get_youtube_links(podcast_id)
    if youtube_links != None and len(youtube_links) > 0:
        max_comments = max_comments / len(youtube_links)
        print('Pulling Comments - QC: ' + str(max_quota_per * 100) + ' MC: ' + str(max_comments) + ' PD: ' + str(podcast_id))
        for youtube_link in youtube_links:
            comments = video_comments(youtube_link, max_comments)
            comment_ids = []
            print('comments obtained : length ' + str(len(comments)))
            for com in comments:
                sub_ids = []
                exists = Comment.objects.filter(username=com[0], comment=com[1]).first()
                if exists != None:
                    continue
                comment = Comment()
                comment.username = com[0]
                comment.comment = com[1]
                comment.podcast_id = podcast_id
                comment.date_time = com[2]
                comment.likes = com[3]
                comment.sub_count = com[4]
                comment.popularity = com[3] + (com[4] / 2)
                comment.save()
                for reply in com[5]:
                    sub = Comment()
                    sub.username = reply[0]
                    sub.comment = reply[1]
                    sub.podcast_id = podcast_id
                    sub.date_time = reply[2]
                    sub.likes = reply[3]
                    sub.popularity = reply[3]
                    comment.parent_id = comment.id
                    sub.save()
                    sub_ids.append(sub.id)
                comment.sub_comments = quickle.dumps(sub_ids)
                comment.save()
                comment_ids.append(comment.id)
            podcast = Podcast.objects.filter(id=podcast_id).first()
            if podcast != None:
                podcast.comments = quickle.dumps(comment_ids)
                podcast.save()



def get_youtube_links(podcast_id):
    podcast = Podcast.objects.filter(id=podcast_id).first()
    if podcast != None:
        youtube_links = podcast.youtube_links
        if youtube_links != None:
            return quickle.loads(youtube_links)

    return None

def find_youtube_links(count):
    current = Podcast.objects.all().last().id
    change = 0
    if count > 0:
        while True:
            current = current - change
            change += 1
            find_youtube_link_task(current)
            if change == count:
                break

def find_youtube_link_task(podcast_id, max_count=5):
    podcast = Podcast.objects.filter(id=podcast_id).first()
    if podcast != None:
        if podcast.youtube_links != None:
            youtube_links = quickle.loads(podcast.youtube_links)
            if youtube_links != None and len(youtube_links) > 0:
                return

        links = []
        count = 0
        search = '#' + str(podcast.id)
        ## FIND SOME LINKS DUDE
        youtube = build('youtube', 'v3',developerKey=api_key)
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
        podcast.youtube_links = quickle.dumps(links)
        podcast.save()

def video_comments(video_id, max_comments):
    replies = []
    output = []
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
            count += 1
            if(count >= max_comments):
                print('Hit Max : ' + str(count) + ' : ' + str(calls))
                break
            print('Comment Count: ' + str(count))
            replies = []
        if 'nextPageToken' in video_response and count < (max_comments + 1):
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

    f=open("cache.txt", "w")
    f.write(json.dumps(output))
    f.close()

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

def get_mp4_url_from_podcast_id(podcast_id):
    search_string = 'PowerfulJRE #' + str(podcast_id)
    get_all_video_in_channel( )