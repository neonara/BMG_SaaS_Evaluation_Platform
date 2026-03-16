"""
Gotenberg PDF service client.
Called from Celery tasks — never from Django views directly.
"""
from __future__ import annotations

import httpx
from django.conf import settings


class GotenbergClient:
    """
    Wraps the Gotenberg HTTP API for HTML→PDF conversion.
    Endpoint: POST /forms/chromium/convert/html
    """

    def __init__(self) -> None:
        self.base_url = settings.GOTENBERG_URL
        self.timeout = 60.0

    def html_to_pdf(self, html_content: str, filename: str = "report.pdf") -> bytes:
        """Convert HTML string to PDF bytes."""
        with httpx.Client(timeout=self.timeout) as client:
            response = client.post(
                f"{self.base_url}/forms/chromium/convert/html",
                files={
                    "files": (
                        "index.html",
                        html_content.encode("utf-8"),
                        "text/html",
                    )
                },
                data={
                    "paperWidth": "8.27",      # A4
                    "paperHeight": "11.69",
                    "marginTop": "0.5",
                    "marginBottom": "0.5",
                    "marginLeft": "0.5",
                    "marginRight": "0.5",
                    "printBackground": "true",
                    "landscape": "false",
                },
            )
            response.raise_for_status()
            return response.content

    def url_to_pdf(self, url: str) -> bytes:
        """Convert a URL to PDF bytes."""
        with httpx.Client(timeout=self.timeout) as client:
            response = client.post(
                f"{self.base_url}/forms/chromium/convert/url",
                data={"url": url, "printBackground": "true"},
            )
            response.raise_for_status()
            return response.content


gotenberg = GotenbergClient()
