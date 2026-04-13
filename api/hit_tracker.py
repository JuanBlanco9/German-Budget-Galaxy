"""
Self-contained hit tracking middleware for Budget Galaxy.

Privacy-first design — asymmetric tracking:
  - Humans (desktop/mobile/other): stored as class only, never the full UA
  - Bots (ua_class=="bot"): stored with canonical bot name extracted from UA

We deliberately do NOT log: IP addresses, full User-Agent strings for humans,
query parameters, cookies, request bodies, response bodies. This is a privacy
stance, not an oversight.

Writes are SYNCHRONOUS. A JSON line append to local SSD takes under 2ms and
does not meaningfully affect latency. Async file writes add lifecycle
complexity (task management, exception handling, shutdown races) for no
measurable benefit in this case. DO NOT "improve" this by switching to
asyncio.create_task — read this comment first.
"""

import json
import os
import re
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.parse import urlparse

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# ── Paths ────────────────────────────────────────────
LOGS_DIR = Path(__file__).parent.parent / "logs"
LOG_PATH = LOGS_DIR / "hits.jsonl"
MAX_ROTATED_FILES = 8

# ── Exclusions ───────────────────────────────────────
EXCLUDED_PATHS = {"/health", "/healthz", "/admin/stats"}

# ── UA classification ────────────────────────────────
BOT_SUBSTRINGS = ("bot", "crawler", "spider", "curl", "wget", "python", "scraper", "headless")
MOBILE_SUBSTRINGS = ("mobile", "android", "iphone", "ipad")


def classify_ua(ua: str) -> str:
    if not ua:
        return "other"
    ua_lower = ua.lower()
    if any(s in ua_lower for s in BOT_SUBSTRINGS):
        return "bot"
    if any(s in ua_lower for s in MOBILE_SUBSTRINGS):
        return "mobile"
    return "desktop"


# ── Bot name extraction ──────────────────────────────
#
# CRITICAL: ordered list, not a dict. Substring matching iterates in order.
# Some bot names are substrings of others (e.g. "Googlebot" appears inside
# UAs that also announce "Google-Extended"). More specific patterns MUST
# be checked before more general ones. The first match wins.
#
# Do NOT "improve" this by switching to a dict, regex alternation, or set.
# The ordered list is intentional and necessary for correctness.
KNOWN_BOTS = [
    # LLM crawlers (training and retrieval)
    ("GPTBot",          "GPTBot"),
    ("ChatGPT-User",    "ChatGPT-User"),       # live retrieval, not training
    ("ClaudeBot",       "ClaudeBot"),          # training crawler
    ("Claude-Web",      "Claude-Web"),         # live retrieval
    ("anthropic-ai",    "anthropic-ai"),       # catch-all Anthropic
    ("PerplexityBot",   "PerplexityBot"),
    ("Bytespider",      "Bytespider"),         # ByteDance/TikTok
    ("CCBot",           "CCBot"),              # Common Crawl
    ("Amazonbot",       "Amazonbot"),
    ("Applebot",        "Applebot"),

    # Search engines — Google-Extended MUST come BEFORE Googlebot
    # because "Googlebot" may be a substring of many Google-Extended UAs.
    ("Google-Extended", "Google-Extended"),
    ("Googlebot",       "Googlebot"),
    ("bingbot",         "bingbot"),
    ("DuckDuckBot",     "DuckDuckBot"),
    ("YandexBot",       "YandexBot"),

    # Social media / link preview
    ("facebookexternalhit", "facebookexternalhit"),
    ("Twitterbot",      "Twitterbot"),

    # SEO tools
    ("SemrushBot",      "SemrushBot"),
    ("AhrefsBot",       "AhrefsBot"),
    ("MJ12bot",         "MJ12bot"),
]


def extract_bot_name(ua: str) -> str:
    """Return canonical bot name or 'other-bot'. Only call when classify_ua(ua)=='bot'."""
    if not ua:
        return "other-bot"
    ua_lower = ua.lower()
    for pattern, name in KNOWN_BOTS:
        if pattern.lower() in ua_lower:
            return name
    return "other-bot"


# ── Referer normalization ────────────────────────────
def normalize_referer(ref_header: str, request_host: str) -> str | None:
    if not ref_header:
        return None
    try:
        parsed = urlparse(ref_header)
        host = parsed.hostname
        if not host:
            return None
        if request_host and host.lower() == request_host.lower():
            return "self"
        return host
    except Exception:
        return None


# ── Rotation ─────────────────────────────────────────
def _iso_to_dt(ts: str) -> datetime | None:
    try:
        # Handle trailing Z
        if ts.endswith("Z"):
            ts = ts[:-1] + "+00:00"
        return datetime.fromisoformat(ts)
    except Exception:
        return None


def maybe_rotate(log_path: Path) -> None:
    """If the first line of log_path has ts > 7 days old, rotate."""
    try:
        if not log_path.exists() or log_path.stat().st_size == 0:
            return
        with open(log_path, "r", encoding="utf-8") as f:
            first = f.readline()
        if not first.strip():
            return
        try:
            entry = json.loads(first)
        except Exception:
            return
        first_ts = _iso_to_dt(entry.get("ts", ""))
        if first_ts is None:
            return
        now = datetime.now(timezone.utc)
        if (now - first_ts) < timedelta(days=7):
            return

        # Rotate: rename to hits-YYYY-WW.jsonl
        iso_year, iso_week, _ = first_ts.isocalendar()
        rotated_name = f"hits-{iso_year}-W{iso_week:02d}.jsonl"
        rotated_path = log_path.parent / rotated_name
        # If a rotated file with that name already exists, append a counter
        if rotated_path.exists():
            i = 2
            while (log_path.parent / f"hits-{iso_year}-W{iso_week:02d}-{i}.jsonl").exists():
                i += 1
            rotated_path = log_path.parent / f"hits-{iso_year}-W{iso_week:02d}-{i}.jsonl"
        log_path.rename(rotated_path)

        # Prune old rotated files (keep at most MAX_ROTATED_FILES)
        rotated = sorted(
            log_path.parent.glob("hits-*.jsonl"),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        for old in rotated[MAX_ROTATED_FILES:]:
            try:
                old.unlink()
            except Exception:
                pass
    except Exception:
        # Never let rotation break tracking
        pass


# ── Write entry ──────────────────────────────────────
def write_entry(entry: dict) -> None:
    """Append a single JSON line to the hits log. Errors are swallowed silently."""
    try:
        LOGS_DIR.mkdir(parents=True, exist_ok=True)
        maybe_rotate(LOG_PATH)
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, separators=(",", ":"), ensure_ascii=False))
            f.write("\n")
    except Exception:
        # Tracking must never break production
        pass


# ── Middleware ───────────────────────────────────────
class HitTrackerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = datetime.now(timezone.utc)
        response: Response = await call_next(request)
        elapsed_ms = int((datetime.now(timezone.utc) - start).total_seconds() * 1000)

        try:
            path = request.url.path
            if path in EXCLUDED_PATHS:
                return response

            ua = request.headers.get("user-agent", "") or ""
            ua_class = classify_ua(ua)

            ref_header = request.headers.get("referer", "") or ""
            request_host = request.url.hostname or ""
            ref = normalize_referer(ref_header, request_host)

            # Response byte size (Content-Length preferred; do not read body)
            cl = response.headers.get("content-length")
            try:
                size = int(cl) if cl is not None else 0
            except Exception:
                size = 0

            entry = {
                "ts": start.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "path": path,
                "method": request.method,
                "status": response.status_code,
                "ms": elapsed_ms,
                "bytes": size,
                "ref": ref,
                "ua_class": ua_class,
            }

            # CRITICAL invariant: bot_name ONLY when ua_class == "bot".
            # For humans, the key must be absent from the JSON — not null,
            # not empty string. Omit entirely. This makes it structurally
            # impossible to fingerprint humans via this field.
            if ua_class == "bot":
                entry["bot_name"] = extract_bot_name(ua)

            write_entry(entry)
        except Exception:
            # Never let tracking break the response
            pass

        return response


# ── Stats aggregation (used by /admin/stats endpoint) ────────────
def _read_logs_since(cutoff: datetime) -> list[dict]:
    """Read hits.jsonl + rotated files, returning entries with ts >= cutoff."""
    entries = []
    if not LOGS_DIR.exists():
        return entries

    candidates = [LOG_PATH] + sorted(
        LOGS_DIR.glob("hits-*.jsonl"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    for fp in candidates:
        if not fp.exists():
            continue
        try:
            with open(fp, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        e = json.loads(line)
                    except Exception:
                        continue
                    ts = _iso_to_dt(e.get("ts", ""))
                    if ts is None:
                        continue
                    if ts >= cutoff:
                        entries.append(e)
        except Exception:
            continue
    return entries


def compute_stats(period: str = "week") -> dict:
    """Compute aggregated stats for the given period ('day' | 'week' | 'month')."""
    now = datetime.now(timezone.utc)
    if period == "day":
        cutoff = now - timedelta(days=1)
    elif period == "month":
        cutoff = now - timedelta(days=30)
    else:
        cutoff = now - timedelta(days=7)
        period = "week"

    entries = _read_logs_since(cutoff)

    total_hits = len(entries)
    total_bytes = 0
    unique_paths = set()
    path_hits: dict[str, int] = {}
    path_bytes: dict[str, int] = {}
    by_day: dict[str, int] = {}
    by_ua_class = {"desktop": 0, "mobile": 0, "bot": 0, "other": 0}
    bot_hits: dict[str, int] = {}
    bot_bytes: dict[str, int] = {}
    ref_hits: dict[str, int] = {}
    ms_values: list[int] = []
    path_byte_sum: dict[str, int] = {}
    path_byte_count: dict[str, int] = {}

    for e in entries:
        path = e.get("path", "")
        size = int(e.get("bytes") or 0)
        ua_class = e.get("ua_class", "other")
        ms = int(e.get("ms") or 0)
        ref = e.get("ref")
        ts_str = e.get("ts", "")
        day = ts_str[:10] if ts_str else ""

        total_bytes += size
        unique_paths.add(path)
        path_hits[path] = path_hits.get(path, 0) + 1
        path_bytes[path] = path_bytes.get(path, 0) + size
        path_byte_sum[path] = path_byte_sum.get(path, 0) + size
        path_byte_count[path] = path_byte_count.get(path, 0) + 1
        if day:
            by_day[day] = by_day.get(day, 0) + 1
        if ua_class in by_ua_class:
            by_ua_class[ua_class] += 1
        else:
            by_ua_class["other"] += 1
        ms_values.append(ms)
        if ref:
            ref_hits[ref] = ref_hits.get(ref, 0) + 1
        if ua_class == "bot":
            bn = e.get("bot_name", "other-bot")
            bot_hits[bn] = bot_hits.get(bn, 0) + 1
            bot_bytes[bn] = bot_bytes.get(bn, 0) + size

    # Top paths (by hits)
    top_paths = sorted(
        [{"path": p, "hits": h, "bytes": path_bytes.get(p, 0)} for p, h in path_hits.items()],
        key=lambda x: x["hits"],
        reverse=True,
    )[:20]

    # Hits by day, sorted ascending
    hits_by_day = sorted(
        [{"date": d, "hits": h} for d, h in by_day.items()],
        key=lambda x: x["date"],
    )

    # Top bots
    top_bots = sorted(
        [{"name": n, "hits": h, "bytes": bot_bytes.get(n, 0)} for n, h in bot_hits.items()],
        key=lambda x: x["hits"],
        reverse=True,
    )[:10]

    # Top referers
    top_referers = sorted(
        [{"host": h, "hits": c} for h, c in ref_hits.items()],
        key=lambda x: x["hits"],
        reverse=True,
    )[:10]

    # Percentiles
    def _pct(values: list[int], p: float) -> int:
        if not values:
            return 0
        s = sorted(values)
        k = int(round((len(s) - 1) * p))
        return s[k]

    p50 = _pct(ms_values, 0.50)
    p95 = _pct(ms_values, 0.95)

    # Heavy paths (top 10 by avg bytes)
    heavy_paths = []
    for p in path_byte_sum:
        cnt = path_byte_count.get(p, 0)
        if cnt == 0:
            continue
        avg = path_byte_sum[p] // cnt
        heavy_paths.append({"path": p, "avg_bytes": avg, "hits": cnt})
    heavy_paths.sort(key=lambda x: x["avg_bytes"], reverse=True)
    heavy_paths = heavy_paths[:10]

    return {
        "period": period,
        "total_hits": total_hits,
        "unique_paths": len(unique_paths),
        "total_bytes": total_bytes,
        "top_paths": top_paths,
        "hits_by_day": hits_by_day,
        "hits_by_ua_class": by_ua_class,
        "top_bots": top_bots,
        "top_referers": top_referers,
        "response_time_p50_ms": p50,
        "response_time_p95_ms": p95,
        "heavy_paths": heavy_paths,
    }
