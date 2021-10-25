from django.conf import settings
from django.conf.urls.static import static
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.urls import path

from . import views

urlpatterns = [
    path('', views.index_views),
    path('data/<id>/comments/<amount>/<offset>/', views.comments, name='comments'),
    path('action/comment/<id>/', views.comment, name='comment'),
    path('action/like/<id>/', views.like_comment, name='like'),
    path('action/dislike/<id>/', views.dislike_comment, name='dislike'),
    path('action/nickname/set/<nickname>/', views.set_nick, name='setnick'),
]

urlpatterns += staticfiles_urlpatterns()
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)