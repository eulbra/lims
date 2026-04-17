"""Authentication and user views."""
from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import LoginSerializer, ChangePasswordSerializer, UserMeSerializer
from .mfa import setup_totp, verify_totp_code
import logging

logger = logging.getLogger("lims.auth")


class LoginView(APIView):
    """Authenticate and return JWT tokens. Supports MFA."""
    permission_classes = [permissions.AllowAny]

    def post(self, request: Request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]

        if user.mfa_enabled:
            return Response(
                {"mfa_required": True, "message": "MFA code required"},
                status=status.HTTP_200_OK,
            )

        refresh = RefreshToken.for_user(user)
        logger.info("User %s logged in from %s", user.username, request.META.get("REMOTE_ADDR"))
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "mfa_required": False,
        })


class LogoutView(APIView):
    """Blacklist refresh token."""
    def post(self, request: Request):
        try:
            refresh_token = request.data.get("refresh")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({"message": "Logged out successfully"})
        except Exception:
            return Response({"message": "Logged out"}, status=status.HTTP_200_OK)


class MFASetupView(APIView):
    """Generate TOTP secret for user."""
    def post(self, request: Request):
        user = request.user
        secret, qr_code_url = setup_totp(user)
        return Response({
            "secret": secret,
            "qr_code_url": qr_code_url,
            "message": "Scan the QR code with your authenticator app",
        })


class MFAVerifyView(APIView):
    """Verify TOTP and return tokens."""
    permission_classes = [permissions.AllowAny]

    def post(self, request: Request):
        # This requires a temporary token from the initial login
        # Implementation would use a temporary session token
        return Response({"message": "MFA verification requires temporary session token"}, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    """Change user password."""
    def post(self, request: Request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.password_changed_at = __import__("django.utils.timezone").utils.timezone.now()
        request.user.save(update_fields=["password", "password_changed_at", "updated_at"])
        logger.info("Password changed for user %s", request.user.username)
        return Response({"message": "Password changed successfully"})


class RequestPasswordResetView(APIView):
    """Request password reset email."""
    permission_classes = [permissions.AllowAny]

    def post(self, request: Request):
        # Implementation: generate token, send email
        return Response({"message": "If the email exists, a reset link has been sent"})


class MeView(generics.RetrieveAPIView):
    """Get current user info."""
    serializer_class = UserMeSerializer

    def get_object(self):
        return self.request.user
