# scraper.py
from bs4 import BeautifulSoup
import requests
from urllib.parse import urlparse
import re

def scrape_url(url: str):
    """
    Scrape title, headings, paragraphs, and domain from a URL.
    Returns a dict.
    """
    try:
        res = requests.get(url, timeout=5)
        res.raise_for_status()
        soup = BeautifulSoup(res.text, "html.parser")

        title = soup.title.string.strip() if soup.title else "No title"
        headings = [h.get_text(strip=True) for h in soup.find_all(re.compile("^h[1-6]$"))]
        paragraphs = [p.get_text(strip=True) for p in soup.find_all("p")]
        domain = urlparse(url).netloc

        return {
            "title": title,
            "headings": headings,
            "paragraphs": paragraphs[:10],
            "source_domain": domain,
            "news_url": url
        }

    except Exception as e:
        return {
            "title": "",
            "headings": [],
            "paragraphs": [],
            "source_domain": urlparse(url).netloc,
            "news_url": url
        }
