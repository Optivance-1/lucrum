"""
Instagram lead finder for Lucrum.

Scrapes Instagram for SaaS founder accounts by:
1. Searching public Instagram profiles linked from scraped websites
2. Extracting Instagram handles from bio links
3. Searching hashtag pages for relevant SaaS/indie hacker content

Environment variables (optional):
- INSTAGRAM_SESSION_ID - Instagram session cookie for better access (optional, allows more requests)

Outputs:
- instagram_leads.json - full JSON dump
- instagram_leads.csv - CSV summary

Usage:
    python backend/scripts/instagram_lead_finder.py

Can be run standalone or imported by lucrum_lead_scraper.py
"""

from __future__ import annotations

import csv
import dataclasses
import json
import os
import re
import sys
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

REQUEST_INTERVAL_SECONDS = float(os.getenv("INSTAGRAM_SCRAPER_INTERVAL_SECONDS", "3.0"))
HTTP_TIMEOUT_SECONDS = 20.0

# Hashtags relevant to SaaS founders and indie hackers
RELEVANT_HASHTAGS = [
    "indiehacker",
    "saasfounder",
    "solopreneur",
    "mrr",
    "buildinpublic",
    "startuptech",
    "microfounder",
    "bootstrap",
    "bootstrapped",
]


@dataclass
class InstagramLead:
    source: str = "instagram"
    username: Optional[str] = None
    instagram_handle: Optional[str] = None
    full_name: Optional[str] = None
    bio: Optional[str] = None
    website: Optional[str] = None
    email: Optional[str] = None
    follower_count: Optional[int] = None
    following_count: Optional[int] = None
    post_count: Optional[int] = None
    is_business_account: bool = False
    external_url: Optional[str] = None
    is_verified: bool = False
    score: int = 1
    priority: bool = False
    raw: Dict = field(default_factory=dict)

    def dedupe_key(self) -> str:
        if self.username:
            return self.username.strip().lower()
        if self.instagram_handle:
            return self.instagram_handle.strip().lower().replace("@", "")
        return json.dumps(self.raw, sort_keys=True)


def _sleep_between_requests() -> None:
    if REQUEST_INTERVAL_SECONDS > 0:
        time.sleep(REQUEST_INTERVAL_SECONDS)


def _http_get(
    url: str, headers: Optional[Dict[str, str]] = None
) -> str:
    """Fetch URL content with rate limiting."""
    default_headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive",
    }
    if headers:
        default_headers.update(headers)

    req = Request(url, headers=default_headers)
    try:
        with urlopen(req, timeout=HTTP_TIMEOUT_SECONDS) as resp:
            data = resp.read()
            # Handle gzip encoding
            if resp.headers.get("Content-Encoding") == "gzip":
                import gzip

                data = gzip.decompress(data)
            _sleep_between_requests()
            return data.decode("utf-8", errors="ignore")
    except (HTTPError, URLError, TimeoutError) as e:
        print(f"[instagram] Request failed for {url}: {e}", file=sys.stderr)
        return ""


def _extract_instagram_handle(text: str) -> Optional[str]:
    """Extract Instagram handle from text."""
    if not text:
        return None

    # Match @username or instagram.com/username patterns
    patterns = [
        r"@([a-zA-Z0-9._]{1,30})",  # @handle
        r"instagram\.com/([a-zA-Z0-9._]{1,30})",  # instagram.com/handle
        r"instagr\.am/([a-zA-Z0-9._]{1,30})",  # instagr.am/handle
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            handle = match.group(1)
            # Filter out common non-user paths
            if handle.lower() not in ["p", "reel", "stories", "explore", "tv"]:
                return f"@{handle}"

    return None


def _extract_email(text: str) -> Optional[str]:
    """Extract email address from text."""
    if not text:
        return None
    match = re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", text)
    return match.group(0) if match else None


def _extract_url(text: str) -> Optional[str]:
    """Extract first URL from text."""
    if not text:
        return None
    match = re.search(r'https?://[^\s)"<>]+', text)
    return match.group(0) if match else None


def _parse_follower_count(text: str) -> Optional[int]:
    """Parse follower count from Instagram page."""
    if not text:
        return None

    # Match patterns like "150K followers" or "1.2M followers"
    patterns = [
        r'"edge_followed_by":\s*\{\s*"count":\s*(\d+)',
        r'(\d+(?:\.\d+)?)\s*[KM]?\s*[Ff]ollowers',
        r'(\d+)\s*[Ff]ollowers',
    ]

    for i, pattern in enumerate(patterns):
        match = re.search(pattern, text)
        if match:
            value = match.group(1)
            if i == 0:  # JSON format, direct number
                return int(value)
            # Handle K/M suffixes
            if "K" in value.upper() or "k" in value:
                return int(float(value.replace(",", "").upper().replace("K", "")) * 1000)
            elif "M" in value.upper() or "m" in value:
                return int(float(value.replace(",", "").upper().replace("M", "")) * 1000000)
            else:
                return int(value.replace(",", ""))

    return None


def _contains_saas_keywords(text: str) -> int:
    """Count SaaS-related keywords in text."""
    if not text:
        return 0

    keywords = [
        "saas",
        "founder",
        "startup",
        "mrr",
        "revenue",
        "subscription",
        "bootstrapped",
        "indie",
        "building",
        "entrepreneur",
        "product",
        "app",
        "software",
    ]
    lowered = text.lower()
    return sum(1 for k in keywords if k in lowered)


def _score_lead(lead: InstagramLead) -> None:
    """Score lead based on relevance signals."""
    score = 1

    # Bio relevance
    bio_keywords = _contains_saas_keywords(lead.bio or "")
    score += min(bio_keywords, 4)  # Max 4 points for keyword relevance

    # Follower count (some credibility signal)
    if lead.follower_count:
        if lead.follower_count >= 10000:
            score += 2
        elif lead.follower_count >= 1000:
            score += 1

    # Business account
    if lead.is_business_account:
        score += 1

    # Has website/link in bio
    if lead.website or lead.external_url:
        score += 1

    # Verified account
    if lead.is_verified:
        score += 2

    # Cap score at 10
    lead.score = min(max(score, 1), 10)
    lead.priority = lead.score >= 5


def fetch_profile(username: str) -> Optional[InstagramLead]:
    """Fetch Instagram profile data for a username."""
    url = f"https://www.instagram.com/{username}/"

    # Try to get embedded data
    embed_url = f"https://www.instagram.com/{username}/embed/"

    html = _http_get(url)
    if not html:
        return None

    lead = InstagramLead(username=username, instagram_handle=f"@{username}")

    # Parse profile data from page source
    # Instagram embeds data in a <script> tag with type "application/ld+json" or in window._sharedData

    # Try to extract from meta tags first (works without login)
    full_name_match = re.search(
        r'<meta\s+property="og:title"\s+content="([^"]+)"', html
    )
    if full_name_match:
        # Usually "Name (@username) • Instagram photos and videos"
        name_part = full_name_match.group(1)
        if "(@" in name_part:
            lead.full_name = name_part.split("(")[0].strip()
        else:
            lead.full_name = name_part

    # Bio
    bio_match = re.search(
        r'<meta\s+property="og:description"\s+content="([^"]+)"', html
    )
    if bio_match:
        lead.bio = bio_match.group(1)

    # Follower count from page
    lead.follower_count = _parse_follower_count(html)

    # Check for business account indicator
    lead.is_business_account = (
        "business_profile" in html.lower() or "professional account" in html.lower()
    )

    # Verified badge
    lead.is_verified = '"verified"' in html or "Verified" in html

    # Look for external URL in bio
    lead.external_url = _extract_url(html.split('<meta property="og:description"')[0] if '<meta property="og:description"' in html else html)

    # Extract email from bio if present
    lead.email = _extract_email(lead.bio or "")

    _score_lead(lead)
    return lead


def search_hashtag_hashtagpage(tag: str, max_pages: int = 2) -> List[InstagramLead]:
    """
    Search Instagram hashtag page for public posts.
    Note: Without authentication, this has very limited functionality.
    """
    leads: List[InstagramLead] = []

    url = f"https://www.instagram.com/explore/tags/{tag}/"
    html = _http_get(url)

    if not html:
        return leads

    # Try to extract usernames from the page
    # Instagram's structure changes often, so we use flexible patterns
    username_patterns = [
        r'"username":"([a-zA-Z0-9._]{1,30})"',
        r'/([a-zA-Z0-9._]{1,30})"\s*data-testid="user-avatar"',
        r'instagram\.com/([a-zA-Z0-9._]{1,30})[^a-zA-Z0-9._]',
    ]

    usernames_found = set()
    for pattern in username_patterns:
        for match in re.finditer(pattern, html):
            username = match.group(1)
            # Filter out system paths
            if username.lower() not in [
                "explore",
                "reel",
                "p",
                "stories",
                "tv",
                "accounts",
                "admin",
            ]:
                usernames_found.add(username)

    # Fetch profile for each found username (limit to avoid rate limits)
    for username in list(usernames_found)[:10]:  # Limit to 10 profile fetches
        profile = fetch_profile(username)
        if profile:
            leads.append(profile)

    return leads


def extract_instagram_from_website(url: str) -> Optional[InstagramLead]:
    """
    Scrape a website to find Instagram links in footer/about/team sections.
    """
    html = _http_get(url)
    if not html:
        return None

    # Search for Instagram links in the page
    instagram_hrefs = re.findall(
        r'href=["\']https?://(?:www\.)?instagram\.com/([a-zA-Z0-9._]{1,30})["\']',
        html,
        re.IGNORECASE,
    )

    if not instagram_hrefs:
        return None

    # Take the first valid username
    for username in instagram_hrefs:
        if username.lower() not in ["p", "reel", "stories", "explore", "tv"]:
            # Fetch actual profile
            profile = fetch_profile(username)
            if profile:
                profile.website = url
                return profile

    return None


def fetch_indiehackers_instagram_links() -> List[InstagramLead]:
    """
    Scrape IndieHackers product pages for Instagram links.
    """
    leads: List[InstagramLead] = []
    base_url = "https://www.indiehackers.com"

    try:
        req = Request(
            f"{base_url}/products?sort=recent",
            headers={"User-Agent": "LucrumLeadBot/1.0"},
        )
        with urlopen(req, timeout=HTTP_TIMEOUT_SECONDS) as resp:
            html = resp.read().decode("utf-8", errors="ignore")
        _sleep_between_requests()
    except (HTTPError, URLError, TimeoutError):
        return leads

    # Find product slugs
    product_slugs = re.findall(r'/product/([a-zA-Z0-9_-]+)', html)
    unique_slugs = list(dict.fromkeys(product_slugs))[:5]  # Limit to 5

    for slug in unique_slugs:
        product_url = f"{base_url}/product/{slug}"
        lead = extract_instagram_from_website(product_url)
        if lead:
            lead.source = "instagram_from_indiehackers"
            leads.append(lead)

    return leads


def deduplicate_leads(leads: List[InstagramLead]) -> List[InstagramLead]:
    """Deduplicate leads by username."""
    by_key: Dict[str, InstagramLead] = {}
    for lead in leads:
        key = lead.dedupe_key()
        if key not in by_key or lead.score > by_key[key].score:
            by_key[key] = lead
    return list(by_key.values())


def export_leads_json(leads: List[InstagramLead], path: str) -> None:
    payload = [dataclasses.asdict(lead) for lead in leads]
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)


def export_leads_csv(leads: List[InstagramLead], path: str) -> None:
    fieldnames = [
        "source",
        "username",
        "instagram_handle",
        "full_name",
        "bio",
        "website",
        "email",
        "follower_count",
        "following_count",
        "post_count",
        "is_business_account",
        "external_url",
        "is_verified",
        "score",
        "priority",
    ]
    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for lead in leads:
            row = {k: getattr(lead, k) for k in fieldnames}
            writer.writerow(row)


def main() -> int:
    all_leads: List[InstagramLead] = []

    print("[instagram] Fetching IndieHackers Instagram links...", file=sys.stderr)
    all_leads.extend(fetch_indiehackers_instagram_links())

    print("[instagram] Searching hashtag pages...", file=sys.stderr)
    for tag in RELEVANT_HASHTAGS[:2]:  # Limit hashtags to avoid rate limits
        all_leads.extend(search_hashtag_hashtagpage(tag))
        time.sleep(REQUEST_INTERVAL_SECONDS * 2)  # Extra delay between hashtags

    print(f"[instagram] Collected {len(all_leads)} raw leads.", file=sys.stderr)
    deduped = deduplicate_leads(all_leads)
    deduped.sort(key=lambda l: (not l.priority, -l.score), reverse=False)
    print(f"[instagram] {len(deduped)} leads after deduplication.", file=sys.stderr)

    export_leads_json(deduped, "instagram_leads.json")
    export_leads_csv(deduped, "instagram_leads.csv")
    print("[instagram] Wrote instagram_leads.json and instagram_leads.csv", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
