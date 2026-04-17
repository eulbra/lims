"""MFA (TOTP) utilities."""
import pyotp
from django.conf import settings
from urllib.parse import quote


def setup_totp(user) -> tuple[str, str]:
    """Generate TOTP secret and QR code URL for a user."""
    secret = pyotp.random_base32()
    user.mfa_secret = secret
    user.save(update_fields=["mfa_secret"])

    otpauth_url = pyotp.totp.TOTP(secret).provisioning_uri(
        name=user.email,
        issuer_name="LIMS",
    )
    qr_code_url = f"https://api.qrserver.com/v1/create-qr-code/?data={quote(otpauth_url)}&size=200x200"
    return secret, qr_code_url


def verify_totp_code(user, code: str) -> bool:
    """Verify a TOTP code against user's secret."""
    if not user.mfa_secret:
        return False
    totp = pyotp.TOTP(user.mfa_secret)
    return totp.verify(code, valid_window=1)  # Allow 1 timestep drift


def generate_backup_codes(n: int = 10) -> list[str]:
    """Generate MFA backup codes."""
    import secrets
    return [secrets.token_urlsafe(8)[:10].upper() for _ in range(n)]
