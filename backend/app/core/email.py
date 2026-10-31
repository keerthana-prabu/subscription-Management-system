"""Email notification utilities for password reset and transactional alerts."""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Tuple
from app.core.config import settings

logger = logging.getLogger(__name__)


def send_password_reset_email(to_email: str, reset_token: str) -> Tuple[bool, str]:
    """Send a password reset email if SMTP is configured.
    
    Returns:
        Tuple[bool, str]: (success, status_description)
    """
    if not settings.SMTP_HOST:
        logger.info(
            f"SMTP host is not configured. Reset link for {to_email} was generated but not emailed."
        )
        return False, "smtp_not_configured"

    reset_url = f"{settings.RESET_PASSWORD_URL}?token={reset_token}"
    subject = "Reset Your Password - Brightloop Subscription Management"
    
    text_content = (
        f"Hello,\n\n"
        f"A password reset request was initiated for your Brightloop account.\n\n"
        f"Please click the link below or paste it into your browser to reset your password:\n"
        f"{reset_url}\n\n"
        f"This link is valid for {settings.RESET_PASSWORD_EXPIRE_MINUTES} minutes and can only be used once.\n\n"
        f"If you did not make this request, please safely disregard this email.\n\n"
        f"Best regards,\n"
        f"{settings.EMAILS_FROM_NAME}"
    )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
    msg["To"] = to_email
    msg.attach(MIMEText(text_content, "plain"))

    try:
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
        if settings.SMTP_TLS:
            server.starttls()
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.EMAILS_FROM_EMAIL, [to_email], msg.as_string())
        server.quit()
        logger.info(f"Password reset email sent to {to_email}")
        return True, "sent"
    except Exception as e:
        logger.error(f"Failed to send password reset email to {to_email}: {e}")
        return False, f"delivery_failed: {str(e)}"

