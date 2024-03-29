from django.conf.urls import include, url
from django.contrib.auth import views as auth_views
# from django.core.urlresolvers import reverse

from . import views

app_name = 'app'

urlpatterns = [
    url(r'^login/$', views.login_view, name='login'),
    url(r'^logout/$', views.logout_view, name='logout'),
    url(r'^$', views.landing, name='landing'),
    url(r'^userprofile/$', views.UserProfile.as_view(), name='userprofile'),
]
