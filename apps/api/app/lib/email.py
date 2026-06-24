from __future__ import annotations

import logging
from email.message import EmailMessage

import aiosmtplib

from app.config import settings

logger = logging.getLogger("makyschool.email")


def smtp_configured() -> bool:
    return bool(settings.SMTP_HOST.strip())


async def send_email(
    *,
    to: str,
    subject: str,
    html_body: str,
    text_body: str | None = None,
) -> None:
    if not smtp_configured():
        logger.warning("SMTP not configured; skipping email to %s", to)
        return

    message = EmailMessage()
    message["From"] = settings.SMTP_FROM
    message["To"] = to
    message["Subject"] = subject
    message.set_content(text_body or html_body, subtype="plain")
    if html_body:
        message.add_alternative(html_body, subtype="html")

    await aiosmtplib.send(
        message,
        hostname=settings.SMTP_HOST,
        port=settings.SMTP_PORT,
        username=settings.SMTP_USER or None,
        password=settings.SMTP_PASS or None,
        start_tls=settings.SMTP_PORT == 587,
    )


async def send_password_reset_email(*, to: str, reset_url: str, name: str | None = None) -> None:
    greeting = name or "there"
    subject = "Reset your MakySchool password"
    text = (
        f"Hello {greeting},\n\n"
        f"Use this link to reset your password:\n{reset_url}\n\n"
        "If you did not request this, you can ignore this email."
    )
    html = f"""
    <p>Hello {greeting},</p>
    <p><a href="{reset_url}">Reset your password</a></p>
    <p>If you did not request this, you can ignore this email.</p>
    """
    await send_email(to=to, subject=subject, html_body=html, text_body=text)
