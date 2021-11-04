from django.conf import settings
from django.conf.urls.static import static
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.urls import path

from . import views

def trigger_error(request):
    division_by_zero = 1 / 0

urlpatterns = [
    path('', views.index_views, name='index'),
    path('privacy/', views.privacy_views, name='privacy'),
    path('termsofservice/', views.terms_views, name='terms'),
    path('sentry-debug/', trigger_error),

    # APP DATA REQUESTS
    path('data/get-all/podcasts/', views.podcasts, name='podcasts'),
    path('data/master/<id>/comments/<amount>/<offset>/', views.comments_master, name='comments'),
    path('data/sub/<id>/comments/<amount>/<offset>/', views.comments_sub, name='comments'),

    # APP ACTIONS
    path('action/comment/<id>/', views.comment, name='comment'),
    path('action/comment/<id>/<parent_id>/', views.comment, name='comment'),
    path('action/comment/<id>/<parent_id>/<reply_to_id>/', views.comment, name='comment'),
    path('action/like/<id>/', views.like_comment, name='like'),
    path('action/dislike/<id>/', views.dislike_comment, name='dislike'),
    path('action/nickname/set/<nickname>/', views.set_nick, name='setnick')
]
urlpatterns += staticfiles_urlpatterns()
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
