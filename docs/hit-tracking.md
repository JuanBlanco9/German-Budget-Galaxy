# Hit Tracking

Lightweight, self-contained, privacy-first hit tracking for Budget Galaxy.
Stdlib only — no external services, no database, no new dependencies.

## Privacy stance (asymmetric by design)

We track bots and humans **differently** on purpose.

- **Humans** (`ua_class` = `desktop` | `mobile` | `other`) are stored as
  a class only. We never record the full User-Agent string, the IP address,
  cookies, query parameters, or any other identifier. A human visit is
  indistinguishable from any other visit in the same class.

- **Bots** (`ua_class` = `bot`) are stored with a **canonical bot name**
  extracted from the User-Agent (e.g. `GPTBot`, `ClaudeBot`,
  `Google-Extended`). We do NOT store the full UA string even for bots —
  just the canonical name. Bots that do not match the known-bot list are
  bucketed as `other-bot`.

**Why the asymmetry?** Bots are corporate infrastructure that voluntarily
identifies itself in the User-Agent header. Humans have a privacy interest
that corporate crawlers do not. This split lets us answer questions like
"is one specific crawler dominating our bandwidth?" without ever storing
anything identifying about a real visitor.

**Structural guarantee.** The `bot_name` field is ONLY present on log lines
where `ua_class == "bot"`. For humans the key is **absent entirely** from
the JSON — not `null`, not empty string, just omitted. This makes it
structurally impossible to fingerprint humans via this field, even by
accident, even if a future refactor introduces a bug.

## What is tracked

One JSON line per request, appended to `/opt/germany-ngo-map/logs/hits.jsonl`
on the server. Each line has these fields:

```json
{
  "ts": "2026-04-13T14:30:00Z",
  "path": "/budget/country/uk",
  "method": "GET",
  "status": 200,
  "ms": 45,
  "bytes": 4523,
  "ref": "budgetgalaxy.com",
  "ua_class": "desktop"
}
```

For a bot, there is one additional field:

```json
{
  "ts": "2026-04-13T14:30:01Z",
  "path": "/budget/country/uk",
  "method": "GET",
  "status": 200,
  "ms": 42,
  "bytes": 2221950,
  "ref": null,
  "ua_class": "bot",
  "bot_name": "GPTBot"
}
```

- `ts` — ISO 8601 UTC timestamp of request start
- `path` — path only, query string stripped
- `method` — HTTP method
- `status` — HTTP status code returned
- `ms` — response time in milliseconds (request start to response dispatch)
- `bytes` — response body size from `Content-Length` header; `0` if unknown
- `ref` — referer hostname only, or `null` if no referer, or `"self"` if the
  request came from our own host (internal navigation)
- `ua_class` — `desktop` | `mobile` | `bot` | `other`
- `bot_name` — (only when `ua_class == "bot"`) canonical bot name or
  `"other-bot"` if the UA matched the bot classifier but is not in the
  known-bot table

## What is NOT tracked (and never will be)

- IP addresses (no geolocation, no session reconstruction, no rate
  limiting at the middleware level — nginx handles that separately)
- Full User-Agent strings for humans (class only)
- Query strings (contain search terms, filter state, potentially PII)
- Cookies
- Request or response bodies
- Any form of persistent identifier

This is a privacy stance, not an oversight. Do not add any of the above
without an explicit decision documented in this file.

## Rotation

Handled inside the middleware itself, not by cron. On each write, if the
first line of `hits.jsonl` has a timestamp more than 7 days old, the file
is renamed to `hits-YYYY-Www.jsonl` and a fresh `hits.jsonl` is started.
At most 8 rotated files are kept; older ones are deleted automatically.

This is deliberately minimal. If volume grows past ~1M lines per week,
revisit the aggregation approach.

## KNOWN_BOTS ordering rule (important)

The `KNOWN_BOTS` list in `api/hit_tracker.py` uses **ordered substring
matching**. The first pattern that appears as a substring of the
User-Agent wins. **Order matters.**

Some bot names are substrings of others. The canonical example:

- `Googlebot` is a substring of User-Agents like
  `Mozilla/5.0 (compatible; Google-Extended; bot@google.com)` — if
  `Googlebot` were checked first, Google-Extended traffic would be
  mis-classified as Googlebot.
- Therefore `Google-Extended` is listed **before** `Googlebot` in
  `KNOWN_BOTS`.

When adding a new bot pattern, check whether it could conflict with any
existing entry. If in doubt, place more specific patterns earlier in the
list. Do **not** replace the ordered list with a dict, set, or regex
alternation — the ordering is load-bearing.

## Query stats — `/admin/stats`

Authenticated GET endpoint returning aggregated stats as JSON.

### Auth

Header-based: clients must send `X-Admin-Token: <token>` where the token
matches the `ADMIN_STATS_TOKEN` environment variable set when uvicorn was
launched. If the env var is unset, the header is missing, or the header
doesn't match, the endpoint returns **404** (not 401, not 403) with
FastAPI's default 404 body. We deliberately hide the endpoint's
existence from scanners.

### Query params

- `?period=day` — last 24 hours
- `?period=week` — last 7 days (default)
- `?period=month` — last 30 days

### Examples

```bash
TOKEN="<retrieve from password manager or regenerate>"

# Default: last 7 days
curl -H "X-Admin-Token: $TOKEN" https://budgetgalaxy.com/admin/stats | jq

# Last 24 hours
curl -H "X-Admin-Token: $TOKEN" "https://budgetgalaxy.com/admin/stats?period=day" | jq

# Last 30 days
curl -H "X-Admin-Token: $TOKEN" "https://budgetgalaxy.com/admin/stats?period=month" | jq

# Top bots only
curl -H "X-Admin-Token: $TOKEN" https://budgetgalaxy.com/admin/stats | jq '.top_bots'

# Heaviest endpoints (bandwidth hogs)
curl -H "X-Admin-Token: $TOKEN" https://budgetgalaxy.com/admin/stats | jq '.heavy_paths'
```

### Response shape

```json
{
  "period": "week",
  "total_hits": 12345,
  "unique_paths": 87,
  "total_bytes": 523400000,
  "top_paths": [ { "path": "/", "hits": 4200, "bytes": 18200000 } ],
  "hits_by_day": [ { "date": "2026-04-07", "hits": 1820 } ],
  "hits_by_ua_class": {
    "desktop": 8200, "mobile": 1500, "bot": 2400, "other": 245
  },
  "top_bots": [ { "name": "GPTBot", "hits": 1200, "bytes": 42000000 } ],
  "top_referers": [ { "host": "news.ycombinator.com", "hits": 340 } ],
  "response_time_p50_ms": 42,
  "response_time_p95_ms": 180,
  "heavy_paths": [
    { "path": "/budget/country/uk", "avg_bytes": 4720000, "hits": 312 }
  ]
}
```

### Reading `top_bots`

`top_bots` aggregates exclusively over log lines where `ua_class == "bot"`
— all non-bot traffic is already represented in `hits_by_ua_class` and
is excluded from this section. The `name` field is either a canonical
bot name from `KNOWN_BOTS` or the literal string `"other-bot"` for
crawlers that matched the bot classifier but are not in the known list
(e.g. `curl`, `wget`, `python-requests`, unknown crawlers).

If `other-bot` is dominating `top_bots`, consider auditing a raw log
sample to identify new crawlers and add them to `KNOWN_BOTS`.

## The token

**Where it's set** — inline in the uvicorn start command (see
`HANDOFF_CLAUDE_OPUS.txt` section 8). There is no `.env` file, no
systemd unit, no secrets management service. This is deliberately
minimal.

**What happens if the env var is missing** — the endpoint silently
returns 404 for all requests, including ones with a valid-looking
token. This is the same behaviour as wrong-token requests, because we
don't want the presence of the endpoint to be detectable.

**How to regenerate if lost** — generate a new token on the server
(never locally, to keep it out of shell history on the dev machine):

```bash
ssh -i ~/.ssh/id_agro_intel root@96.30.199.112 "openssl rand -hex 32"
```

Then restart uvicorn with the new token in the start command. The
old token becomes invalid immediately.

**Storage** — the token must be stored in the operator's password
manager, not in any file in this repo, not in shell history, not in
any log file. If you find it in a file that is tracked by git, that's
a bug — rotate immediately.

## Debugging

Tail the log in real time:

```bash
ssh -i ~/.ssh/id_agro_intel root@96.30.199.112 \
  "tail -f /opt/germany-ngo-map/logs/hits.jsonl"
```

Pretty-print a sample:

```bash
ssh -i ~/.ssh/id_agro_intel root@96.30.199.112 \
  "tail -20 /opt/germany-ngo-map/logs/hits.jsonl" | jq
```

Check which bots have been seen recently:

```bash
ssh -i ~/.ssh/id_agro_intel root@96.30.199.112 \
  "grep -o '\"bot_name\":\"[^\"]*\"' /opt/germany-ngo-map/logs/hits.jsonl | sort | uniq -c | sort -rn"
```

## Performance notes

- **Latency** — writes are synchronous. A JSON line append to local SSD
  takes under 2ms. We deliberately do NOT use `asyncio.create_task` for
  the log write — the complexity cost of background task lifecycle
  management is not justified by any measurable latency improvement.
  This decision is documented in a code comment in `api/hit_tracker.py`
  so nobody "improves" it later without reading.

- **Disk** — ~150 bytes per entry. At 10K hits/day that's 1.5 MB/day or
  11 MB/week. With 8 rotated files kept, total disk footprint is
  ~90 MB. Negligible on the 55 GB VM.

- **Memory** — middleware allocates a small dict per request.
  `/admin/stats` reads the full period window into memory for
  aggregation; fine for files up to ~1M lines. Revisit if we cross
  that threshold.

## Scope note

This is deliberately minimal phase-1 tracking. We built it specifically
to answer one decision in ~2 weeks: **which bots to allow, rate-limit,
or block in `robots.txt` and nginx**. Once we have 2 weeks of `top_bots`
data, we'll make that call with evidence instead of guesses.

If the tracker grows beyond that use case — dashboards, real-time
alerts, session tracking, per-country breakdowns — it's probably time
to replace it with a hosted solution (Umami Cloud, Plausible, Fathom)
rather than keep extending this file. We chose stdlib-only specifically
to resist feature creep.
