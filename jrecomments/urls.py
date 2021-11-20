from django.conf import settings
from django.conf.urls.static import static
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.urls import path
from django.views.decorators.cache import cache_page

from . import views

long_expire_cache = 24 * 60 * 60 # 48 Hours
default_expire_cache = 2 * 60 * 60 # 2 Hours
auto_update_expire = 15
urgent_expire_cache = 60 # 1 Minute

urlpatterns = [
    path('', cache_page(long_expire_cache)(views.index_views), name='index'),
    path('privacy/', cache_page(long_expire_cache)(views.privacy_views), name='privacy'),
    path('termsofservice/', cache_page(long_expire_cache)(views.terms_views), name='terms'),

    # APP DATA REQUESTS
    path('data/get-all/podcasts/', cache_page(long_expire_cache)(views.podcasts), name='podcasts'),
    path('data/get-specific/podcast/<int:id>/', cache_page(urgent_expire_cache)(views.podcast), name='podcast'),

    path('data/master/<int:id>/comments/<int:amount>/<int:offset>/', cache_page(urgent_expire_cache)(views.comments_master), name='comments'),
    path('data/master/<int:id>/comments/<int:amount>/<int:offset>/<username>/', cache_page(urgent_expire_cache)(views.comments_master), name='comments'),

    path('data/sub/<int:id>/comments/<int:amount>/<int:offset>/', cache_page(urgent_expire_cache)(views.comments_sub), name='comments'),
    path('data/sub/<int:id>/comments/<int:amount>/<int:offset>/<username>', cache_page(urgent_expire_cache)(views.comments_sub), name='comments'),

    path('data/get-specific/user-data/<int:id>/', cache_page(auto_update_expire)(views.podcast_user_data), name='user-data'),

    # APP ACTIONS
    path('action/comment/<int:id>/', views.comment, name='comment'),
    path('action/comment/<int:id>/<int:parent_id>/', views.comment, name='comment'),
    path('action/comment/<int:id>/<int:parent_id>/<int:reply_to_id>/', views.comment, name='comment'),
    path('action/like/<int:id>/', views.like_comment, name='like'),
    path('action/dislike/<int:id>/', views.dislike_comment, name='dislike'),
    path('action/login/', views.loginsignup, name='login'),
    path('action/logout/', views.logout_action, name='logout'),
    path('action/request-token/', views.request_token, name='request-token'),
]
urlpatterns += staticfiles_urlpatterns()
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
