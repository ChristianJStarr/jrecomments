from jrecomments.podcast import update_podcast_library
from jrecomments.views import calculate_comment_popularity, calculate_podcast_popularity, fix_comment_replies
from jrecomments.youtube import youtube_pull_comments


def daily_task():
    update_podcast_library(False)
    youtube_pull_comments(100)
    calculate_comment_popularity()
    calculate_podcast_popularity()
    fix_comment_replies()