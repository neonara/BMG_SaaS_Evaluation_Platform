"""
Selenium anti-cheat service client.
Used by the anti-cheat system to verify browser session integrity.
Called from Celery tasks — never from views directly.
Only accessible by Super Admin BMG.
"""
from __future__ import annotations

from django.conf import settings
from selenium import webdriver
from selenium.webdriver.remote.webdriver import WebDriver


def get_remote_driver(implicit_wait: int = 10) -> WebDriver:
    """
    Returns a RemoteWebDriver connected to the Selenium Grid container.
    The caller is responsible for calling driver.quit() when done.
    """
    options = webdriver.ChromeOptions()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    driver = webdriver.Remote(
        command_executor=settings.SELENIUM_URL,
        options=options,
    )
    driver.implicitly_wait(implicit_wait)
    return driver
