from django.contrib.auth import authenticate, login, logout, get_user_model
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, render, redirect, render_to_response
from django.urls import reverse
from django.utils.decorators import method_decorator

from django.forms import ValidationError
from django.views.generic import TemplateView
from django.views.generic.base import View
from django.views.generic.edit import FormView, UpdateView, CreateView, DeleteView
from django.views.generic.list import ListView
from django.views.generic.detail import DetailView

from . import forms


@login_required
def logout_view(request):
    logout(request)
    return redirect(reverse('app:login'))

@login_required
def landing(request):
    return render(request, 'app/landing.html')


def login_view(request):
    # if this is a POST request we need to process the form data
    if request.method == 'POST':
        # create a form instance and populate it with data from the request:
        form = forms.LoginForm(request.POST)
        # check whether it's valid:
        if form.is_valid():
            # process the data in form.cleaned_data as required
            # ...
            # redirect to a new URL:
            username = form.cleaned_data['username']
            password = form.cleaned_data['password']
            user = authenticate(username=username, password=password)
            if user:
                if user.is_active:
                    login(request, user)
                    return redirect(reverse('app:landing'))
                else:
                    form.add_error(None, ValidationError(
                        "Your account is not active."
                    ))
            else:
                form.add_error(None, ValidationError(
                    "Invalid User Id of Password"
                ))

    # if a GET (or any other method) we'll create a blank form
    else:
        form = forms.LoginForm()

    return render(request, 'app/login.html', {'form': form})


class UserProfile(UpdateView):
    form_class = forms.UserProfileForm
    template_name = "app/user_profile.html"

    @method_decorator(login_required)
    def dispatch(self, *args, **kwargs):
        return super(UserProfile, self).dispatch(*args, **kwargs)

    def get_object(self, queryset=None):
        return get_user_model().objects.get(pk=self.request.user.pk)

