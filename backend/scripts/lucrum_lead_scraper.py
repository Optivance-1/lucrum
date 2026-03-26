"""
Lucrum lead scraper.

Sources (all free tiers / public data):
- IndieHackers products (recent): product + founder info.
- Twitter/X API v2: tweets mentioning Stripe and MRR.
- Reddit API: posts in r/SaaS, r/indiehackers, r/entrepreneur mentioning Stripe + revenue signals.
- ProductHunt GraphQL API: recent SaaS / developer tools launches.

Environment variables (all optional; sources are skipped if not configured):
- TWITTER_BEARER_TOKEN      – Twitter/X API v2 bearer token.
- REDDIT_CLIENT_ID          – Reddit script app client id.
- REDDIT_CLIENT_SECRET      – Reddit script app secret.
- REDDIT_USER_AGENT         – User agent string for Reddit requests.
- PRODUCTHUNT_API_TOKEN     – ProductHunt API token (v2).

Outputs (in the working directory):
- leads.json – full JSON dump of all deduplicated leads.
- leads.csv  – CSV summary of all deduplicated leads.

Usage:
    python backend/scripts/lucrum_lead_scraper.py

You can schedule this as a weekly cron job or task scheduler entry that
invokes the command above in the Lucrum project directory.
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
from datetime import datetime, timedelta, timezone
from typing import Dict, Iterable, List, Optional, Set
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


REQUEST_INTERVAL_SECONDS = float(os.getenv("LUCRUM_LEAD_SCRAPER_INTERVAL_SECONDS", "2.0"))
HTTP_TIMEOUT_SECONDS = 20.0


@dataclass
class Lead:
    source: str
    product_name: Optional[str] = None
    founder_name: Optional[str] = None
    website: Optional[str] = None
    twitter_handle: Optional[str] = None
    mrr_text: Optional[str] = None
    username: Optional[str] = None
    follower_count: Optional[int] = None
    post_title: Optional[str] = None
    post_text: Optional[str] = None
    email: Optional[str] = None
    upvote_count: Optional[int] = None
    score: int = 0
    priority: bool = False
    raw: Dict = field(default_factory=dict)

    def dedupe_key(self) -> str:
        parts: List[str] = []
        if self.website:
            parts.append(self.website.strip().lower())
        if self.twitter_handle:
            parts.append(self.twitter_handle.strip().lower())
        if self.username:
            parts.append(self.username.strip().lower())
        if self.product_name:
            parts.append(self.product_name.strip().lower())
        return "|".join(parts) or json.dumps(self.raw, sort_keys=True)


def _sleep_between_requests() -> None:
    if REQUEST_INTERVAL_SECONDS > 0:
        time.sleep(REQUEST_INTERVAL_SECONDS)


def _http_get_json(url: str, headers: Optional[Dict[str, str]] = None, query: Optional[Dict[str, str]] = None) -> Dict:
    if query:
        url = f"{url}?{urlencode(query)}"
    req = Request(url, headers=headers or {})
    try:
        with urlopen(req, timeout=HTTP_TIMEOUT_SECONDS) as resp:
            data = resp.read()
        _sleep_between_requests()
        return json.loads(data.decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError):
        return {}


def _http_post_json(url: str, payload: Dict, headers: Optional[Dict[str, str]] = None) -> Dict:
    body = json.dumps(payload).encode("utf-8")
    hdrs = {"Content-Type": "application/json"}
    if headers:
        hdrs.update(headers)
    req = Request(url, data=body, headers=hdrs, method="POST")
    try:
        with urlopen(req, timeout=HTTP_TIMEOUT_SECONDS) as resp:
            data = resp.read()
        _sleep_between_requests()
        return json.loads(data.decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError):
        return {}


def _extract_first_url(text: str) -> Optional[str]:
    if not text:
        return None
    m = re.search(r"https?://[^\s)]+", text)
    return m.group(0) if m else None


def _extract_first_email(text: str) -> Optional[str]:
    if not text:
        return None
    m = re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", text)
    return m.group(0) if m else None


def _contains_mrr_number(text: str) -> Optional[str]:
    if not text:
        return None
    m = re.search(r"\$?\s?(\d{2,3}(?:[.,]\d{3})*(?:\s*(?:MRR|mrr|revenue))?)", text)
    return m.group(0) if m else None


def _count_stripe_references(text: str) -> int:
    if not text:
        return 0
    return len(re.findall(r"stripe", text.lower()))


def _mentions_growth(text: str) -> bool:
    if not text:
        return False
    lowered = text.lower()
    keywords = ["growth", "churn", "mrr", "revenue", "customers", "subscribers", "expansion", "retention"]
    return any(k in lowered for k in keywords)


def score_lead(lead: Lead) -> None:
    text_chunks: List[str] = []
    for field in (lead.post_text, lead.post_title, lead.mrr_text):
        if field:
            text_chunks.append(field)
    combined = " ".join(text_chunks)

    score = 1
    if _contains_mrr_number(combined):
        score += 4
    stripe_refs = _count_stripe_references(combined)
    if stripe_refs >= 2:
        score += 3
    elif stripe_refs == 1:
        score += 1
    if _mentions_growth(combined):
        score += 1
    if lead.follower_count and lead.follower_count >= 100:
        score += 1
        lead.priority = True

    score = max(1, min(score, 10))
    lead.score = score


def fetch_indiehackers_products(max_pages: int = 2) -> List[Lead]:
    # IndieHackers does not provide a stable public API.
    # We use a lightweight JSON endpoint used by their frontend if available,
    # and otherwise fall back to the first page HTML structure.
    leads: List[Lead] = []
    base_url = "https://www.indiehackers.com"

    for page in range(1, max_pages + 1):
        url = f"{base_url}/products?sort=recent&page={page}"
        try:
            req = Request(url, headers={"User-Agent": "LucrumLeadBot/1.0"})
            with urlopen(req, timeout=HTTP_TIMEOUT_SECONDS) as resp:
                html = resp.read().decode("utf-8", errors="ignore")
            _sleep_between_requests()
        except (HTTPError, URLError, TimeoutError):
            break

        # Very lightweight parsing: look for product cards and extract name + link.
        # This is intentionally simple and resilient to minor markup changes.
        for match in re.finditer(
            r'<a[^>]+href="/product/([^"]+)"[^>]*>(.*?)</a>',
            html,
            flags=re.IGNORECASE | re.DOTALL,
        ):
            slug = match.group(1)
            name = re.sub(r"<.*?>", "", match.group(2)).strip()
            if not name:
                continue
            website = f"{base_url}/product/{slug}"
            leads.append(
                Lead(
                    source="indiehackers",
                    product_name=name,
                    website=website,
                    raw={"slug": slug},
                )
            )

        # Heuristic: stop early if we didn't find any products on this page.
        if not leads:
            break

    for lead in leads:
        score_lead(lead)
    return leads


def fetch_twitter_leads() -> List[Lead]:
    token = os.getenv("TWITTER_BEARER_TOKEN", "").strip()
    if not token:
        return []

    queries = [
        '"stripe MRR"',
        '"building in public" stripe',
        '"just hit" MRR',
        '"monthly recurring revenue" stripe',
    ]
    url = "https://api.twitter.com/2/tweets/search/recent"
    headers = {"Authorization": f"Bearer {token}", "User-Agent": "LucrumLeadBot/1.0"}

    all_leads: List[Lead] = []
    end_time = datetime.now(timezone.utc)
    start_time = end_time - timedelta(days=7)

    for q in queries:
        params = {
            "query": q,
            "max_results": "25",
            "tweet.fields": "author_id,text,created_at",
            "expansions": "author_id",
            "user.fields": "username,public_metrics,description,url",
            "start_time": start_time.isoformat().replace("+00:00", "Z"),
            "end_time": end_time.isoformat().replace("+00:00", "Z"),
        }
        data = _http_get_json(url, headers=headers, query=params)
        if not data:
            continue

        users_by_id = {
            u.get("id"): u
            for u in data.get("includes", {}).get("users", [])
        }
        for tweet in data.get("data", []):
            author = users_by_id.get(tweet.get("author_id") or "")
            if not author:
                continue
            bio = author.get("description") or ""
            website = author.get("url") or _extract_first_url(bio)
            email = _extract_first_email(bio)
            mrr_text = _contains_mrr_number(tweet.get("text") or "")
            lead = Lead(
                source="twitter",
                username=author.get("username"),
                twitter_handle=f"@{author.get('username')}" if author.get("username") else None,
                website=website,
                email=email,
                post_text=tweet.get("text"),
                follower_count=(author.get("public_metrics") or {}).get("followers_count"),
                mrr_text=mrr_text,
                raw={"tweet_id": tweet.get("id")},
            )
            score_lead(lead)
            all_leads.append(lead)

    return all_leads


def fetch_reddit_leads() -> List[Lead]:
    client_id = os.getenv("REDDIT_CLIENT_ID", "").strip()
    client_secret = os.getenv("REDDIT_CLIENT_SECRET", "").strip()
    ua = os.getenv("REDDIT_USER_AGENT", "LucrumLeadBot/1.0 by u/example")

    # Anonymous requests against reddit.com JSON endpoints are possible, but
    # authenticated script apps are more stable. If no creds are configured,
    # fall back to anonymous JSON search.
    use_oauth = bool(client_id and client_secret)

    subreddits = ["SaaS", "indiehackers", "entrepreneur"]
    queries = [
        'stripe "MRR"',
        'stripe "revenue"',
        'stripe "churn"',
    ]

    leads: List[Lead] = []

    if use_oauth:
        # Client credentials flow
        auth = _http_post_json(
            "https://www.reddit.com/api/v1/access_token",
            {"grant_type": "client_credentials"},
            headers={
                "User-Agent": ua,
                "Authorization": "Basic "
                + (f"{client_id}:{client_secret}").encode("utf-8").hex(),
            },
        )
        token = auth.get("access_token")
        if not token:
            use_oauth = False
        else:
            base_headers = {"Authorization": f"Bearer {token}", "User-Agent": ua}
            base_url = "https://oauth.reddit.com"
    if not use_oauth:
        base_headers = {"User-Agent": ua}
        base_url = "https://www.reddit.com"

    for sub in subreddits:
        for q in queries:
            params = {
                "q": q,
                "restrict_sr": "1",
                "sort": "new",
                "t": "month",
                "limit": "25",
            }
            path = f"/r/{sub}/search.json"
            data = _http_get_json(base_url + path, headers=base_headers, query=params)
            if not data:
                continue
            for child in data.get("data", {}).get("children", []):
                post = child.get("data") or {}
                title = post.get("title") or ""
                body = post.get("selftext") or ""
                username = post.get("author")
                combined = f"{title}\n{body}"
                website = _extract_first_url(combined)
                mrr_text = _contains_mrr_number(combined)
                lead = Lead(
                    source="reddit",
                    username=username,
                    post_title=title,
                    post_text=combined,
                    website=website,
                    mrr_text=mrr_text,
                    raw={"permalink": post.get("permalink")},
                )
                score_lead(lead)
                leads.append(lead)

    return leads


def fetch_producthunt_leads() -> List[Lead]:
    token = os.getenv("PRODUCTHUNT_API_TOKEN", "").strip()
    if not token:
        return []

    # ProductHunt GraphQL v2 query: recent posts filtered by tags.
    url = "https://api.producthunt.com/v2/api/graphql"
    headers = {"Authorization": f"Bearer {token}"}
    query = """
    query RecentSaaS($after: String) {
      posts(order: RANKING, postedAfter: null, first: 20, after: $after) {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            id
            name
            tagline
            votesCount
            website
            makers {
              name
              twitterUsername
            }
            topics {
              name
            }
          }
        }
      }
    }
    """

    leads: List[Lead] = []
    after: Optional[str] = None
    pages = 0

    while pages < 3:
        payload = {"query": query, "variables": {"after": after}}
        data = _http_post_json(url, payload, headers=headers)
        posts = (data.get("data", {}) or {}).get("posts", {})
        edges = posts.get("edges") or []
        for edge in edges:
            node = edge.get("node") or {}
            topics = [t.get("name", "").lower() for t in node.get("topics") or []]
            if not any(t in {"saas", "developer tools", "developer tool"} for t in topics):
                continue
            makers = node.get("makers") or []
            maker = makers[0] if makers else {}
            lead = Lead(
                source="producthunt",
                product_name=node.get("name"),
                founder_name=maker.get("name"),
                twitter_handle=(
                    f"@{maker['twitterUsername']}"
                    if maker.get("twitterUsername")
                    else None
                ),
                website=node.get("website"),
                upvote_count=node.get("votesCount"),
                post_title=node.get("tagline"),
                raw={"id": node.get("id")},
            )
            score_lead(lead)
            leads.append(lead)

        page_info = posts.get("pageInfo") or {}
        if not page_info.get("hasNextPage"):
            break
        after = page_info.get("endCursor")
        if not after:
            break
        pages += 1

    return leads


def deduplicate_leads(leads: Iterable[Lead]) -> List[Lead]:
    by_key: Dict[str, Lead] = {}
    for lead in leads:
        key = lead.dedupe_key()
        existing = by_key.get(key)
        if not existing:
            by_key[key] = lead
            continue
        # Merge: keep highest score, union sources, max followers/upvotes.
        if lead.score > existing.score:
            existing.score = lead.score
        existing.priority = existing.priority or lead.priority
        if lead.source not in existing.raw.get("sources", [existing.source]):
            sources: Set[str] = set(existing.raw.get("sources", [existing.source]))
            sources.add(lead.source)
            existing.raw["sources"] = sorted(sources)
        existing.follower_count = max(
            existing.follower_count or 0,
            lead.follower_count or 0,
        ) or None
        existing.upvote_count = max(
            existing.upvote_count or 0,
            lead.upvote_count or 0,
        ) or None
    return list(by_key.values())


def export_leads_json(leads: List[Lead], path: str) -> None:
    payload = [dataclasses.asdict(lead) for lead in leads]
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)


def export_leads_csv(leads: List[Lead], path: str) -> None:
    fieldnames = [
        "source",
        "product_name",
        "founder_name",
        "website",
        "twitter_handle",
        "username",
        "email",
        "follower_count",
        "upvote_count",
        "score",
        "priority",
        "post_title",
        "post_text",
        "mrr_text",
    ]
    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for lead in leads:
            row = {k: getattr(lead, k) for k in fieldnames}
            writer.writerow(row)


def _fetch_instagram_leads() -> List[Lead]:
    """Fetch Instagram leads and convert to standard Lead format."""
    try:
        # Import here to avoid circular imports and allow script to run without Instagram module
        import importlib.util
        import os as _os

        # Find the instagram_lead_finder module
        script_dir = _os.path.dirname(_os.path.abspath(__file__))
        instagram_module_path = _os.path.join(script_dir, "instagram_lead_finder.py")

        if not _os.path.exists(instagram_module_path):
            print("[lucrum-leads] Instagram module not found, skipping...", file=sys.stderr)
            return []

        spec = importlib.util.spec_from_file_location("instagram_lead_finder", instagram_module_path)
        if not spec or not spec.loader:
            return []

        ig_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(ig_module)

        # Run Instagram scraper
        ig_leads = ig_module.fetch_indiehackers_instagram_links()
        for tag in ["saasfounder", "indiehacker"]:
            ig_leads.extend(ig_module.search_hashtag_hashtagpage(tag))

        # Convert InstagramLead to Lead
        converted: List[Lead] = []
        for ig in ig_leads:
            if ig is None:
                continue
            raw_dict = {}
            if hasattr(ig, '__dataclass_fields__'):
                raw_dict = dataclasses.asdict(ig)
            lead = Lead(
                source=getattr(ig, 'source', 'instagram'),
                product_name=getattr(ig, 'full_name', None),
                twitter_handle=getattr(ig, 'instagram_handle', None),  # Store Instagram handle in twitter_handle field
                website=getattr(ig, 'website', None) or getattr(ig, 'external_url', None),
                email=getattr(ig, 'email', None),
                mrr_text=None,
                username=getattr(ig, 'username', None),
                follower_count=getattr(ig, 'follower_count', None),
                score=getattr(ig, 'score', 1),
                priority=getattr(ig, 'priority', False),
                raw={"instagram": raw_dict}
            )
            converted.append(lead)

        return converted
    except Exception as e:
        print(f"[lucrum-leads] Instagram fetch failed: {e}", file=sys.stderr)
        return []


def main() -> int:
    all_leads: List[Lead] = []

    print("[lucrum-leads] Fetching IndieHackers products...", file=sys.stderr)
    all_leads.extend(fetch_indiehackers_products())

    print("[lucrum-leads] Fetching Twitter/X leads...", file=sys.stderr)
    all_leads.extend(fetch_twitter_leads())

    print("[lucrum-leads] Fetching Reddit leads...", file=sys.stderr)
    all_leads.extend(fetch_reddit_leads())

    print("[lucrum-leads] Fetching ProductHunt leads...", file=sys.stderr)
    all_leads.extend(fetch_producthunt_leads())

    print("[lucrum-leads] Fetching Instagram leads...", file=sys.stderr)
    all_leads.extend(_fetch_instagram_leads())

    print(f"[lucrum-leads] Collected {len(all_leads)} raw leads.", file=sys.stderr)
    deduped = deduplicate_leads(all_leads)
    deduped.sort(key=lambda l: (not l.priority, -l.score, (l.follower_count or 0)), reverse=False)
    print(f"[lucrum-leads] {len(deduped)} leads after deduplication.", file=sys.stderr)

    export_leads_json(deduped, "leads.json")
    export_leads_csv(deduped, "leads.csv")
    print("[lucrum-leads] Wrote leads.json and leads.csv", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

