"""Authentication URLs."""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    LoginView, LogoutView, MFASetupView, MFAVerifyView, ChangePasswordView,
    RequestPasswordResetView, MeView,
)

app_name = "auth"

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("mfa/setup/", MFASetupView.as_view(), name="mfa_setup"),
    path("mfa/verify/", MFAVerifyView.as_view(), name="mfa_verify"),
    path("change-password/", ChangePasswordView.as_view(), name="change_password"),
    path("request-password-reset/", RequestPasswordResetView.as_view(), name="request_password_reset"),
    path("me/", MeView.as_view(), name="me"),
]
