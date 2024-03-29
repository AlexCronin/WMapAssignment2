from django.conf.urls import include, url
from django.contrib.auth import views as auth_views
# from django.core.urlresolvers import reverse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie

from . import views, rest_views

app_name = 'app'

urlpatterns = [
    url(r'^tokenlogin/$', rest_views.token_login, name='token-login'),
    url(r'^userme/$', rest_views.UserMe_R.as_view(), name='user-me'),
    url(r'^users/$', rest_views.UsersList.as_view(), name='users'),
    url(r'^user/(?P<email>[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/$', rest_views.UserOther_R.as_view(), name='user-email'),
    url(r'^user/(?P<uid>\d+)/$', rest_views.UserOther_R.as_view(), name='user-username'),
    url(r'^updateposition/$', rest_views.UpdatePosition.as_view(), name='update-position'),
    url(r'^getpoi/$', rest_views.get_poi, name='show_locations'),
    #url(r'^fav/$', rest_views.FavView.as_view(), name='fav_poi'),
    url(r'^fav/$', csrf_exempt(rest_views.FavView.as_view()), name='fav_poi'),
    url(r'^register', csrf_exempt(rest_views.register), name="register"),
]
