from django.core.management import BaseCommand

from jrecomments.podcast import update_podcast_library


class Command(BaseCommand):
    update_podcast_library(True)