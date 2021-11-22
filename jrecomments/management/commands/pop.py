from django.core.management import BaseCommand

from jrecomments.views import calculate_comment_popularity, calculate_podcast_popularity
from jrecomments.youtube import youtube_pull_comments


class Command(BaseCommand):
    calculate_podcast_popularity()