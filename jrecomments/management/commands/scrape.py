from django.core.management import BaseCommand

from jrecomments.youtube import youtube_pull_comments


class Command(BaseCommand):
    youtube_pull_comments(50000)