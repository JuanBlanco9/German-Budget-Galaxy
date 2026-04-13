import json
import os
from pathlib import Path

from fastapi import FastAPI, Query, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse, Response
from fastapi.middleware.cors import CORSMiddleware

from api.hit_tracker import HitTrackerMiddleware, compute_stats

DATA_DIR = Path(__file__).parent.parent / "data"

app = FastAPI(
    title="Budget Galaxy",
    description="Multi-country budget visualization API",
    version="2.0.0",
)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.add_middleware(HitTrackerMiddleware)

STATIC_DIR = Path(__file__).parent.parent / "frontend"


@app.get("/app", response_class=FileResponse)
def serve_app():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/", response_class=FileResponse)
def serve_landing():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}


# ── German budget endpoints ──────────────────────────

@app.get("/budget/tree")
def budget_tree(year: int = Query(2025)):
    """German Bundeshaushalt hierarchy for a given year."""
    tree_path = DATA_DIR / f"bundeshaushalt_tree_{year}.json"
    if not tree_path.exists():
        return JSONResponse({"error": f"No German budget data for {year}"}, status_code=404)
    with open(tree_path, "r", encoding="utf-8") as f:
        return json.load(f)


@app.get("/budget/years")
def budget_years():
    """List available years for German budget."""
    years = sorted(
        int(p.stem.split("_")[-1])
        for p in DATA_DIR.glob("bundeshaushalt_tree_*.json")
        if p.stem.split("_")[-1].isdigit()
    )
    return years


@app.get("/budget/history")
def budget_history():
    path = DATA_DIR / "budget_history.json"
    if not path.exists():
        return JSONResponse({"error": "History not available"}, status_code=404)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


@app.get("/budget/history/kategorien")
def budget_history_kategorien():
    path = DATA_DIR / "budget_history_kategorien.json"
    if not path.exists():
        return JSONResponse({"error": "Not available"}, status_code=404)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


@app.get("/budget/history/kapitel")
def budget_history_kapitel():
    path = DATA_DIR / "budget_history_kapitel.json"
    if not path.exists():
        return JSONResponse({"error": "Not available"}, status_code=404)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# ── Multi-country endpoint ───────────────────────────

@app.get("/budget/country/{country_id}")
def budget_country(country_id: str, year: int = Query(None)):
    """Serve budget tree for US, FR, UK, etc. Optional ?year=YYYY."""
    country_id = country_id.lower()
    country_dir = DATA_DIR / country_id
    if not country_dir.exists():
        return JSONResponse({"error": f"No data for country '{country_id}'"}, status_code=404)

    if year:
        tree_path = country_dir / f"{country_id}_budget_tree_{year}.json"
        if not tree_path.exists():
            return JSONResponse({"error": f"No {country_id.upper()} data for {year}"}, status_code=404)
    else:
        trees = sorted(country_dir.glob(f"{country_id}_budget_tree_*.json"))
        if not trees:
            return JSONResponse({"error": f"No budget tree for '{country_id}'"}, status_code=404)
        tree_path = trees[-1]

    with open(tree_path, "r", encoding="utf-8") as f:
        return json.load(f)


@app.get("/budget/country/{country_id}/years")
def budget_country_years(country_id: str):
    """List available years for a country."""
    country_id = country_id.lower()
    country_dir = DATA_DIR / country_id
    if not country_dir.exists():
        return []
    years = sorted(
        int(p.stem.split("_")[-1])
        for p in country_dir.glob(f"{country_id}_budget_tree_*.json")
        if p.stem.split("_")[-1].isdigit()
    )
    return years


@app.get("/budget/country/{country_id}/history")
def budget_country_history(country_id: str):
    """Generate historical data from tree files for any country.
    Returns {id: {name, history: [{year, value}]}} for top-level children."""
    country_id = country_id.lower()
    country_dir = DATA_DIR / country_id
    if not country_dir.exists():
        return JSONResponse({"error": f"No data for country '{country_id}'"}, status_code=404)

    trees = sorted(country_dir.glob(f"{country_id}_budget_tree_*.json"))
    if not trees:
        return JSONResponse({"error": f"No trees for '{country_id}'"}, status_code=404)

    # Build history from tree files — group by name (more stable than id across years)
    result = {}
    for tree_path in trees:
        year_str = tree_path.stem.split("_")[-1]
        if not year_str.isdigit():
            continue
        year = int(year_str)

        with open(tree_path, "r", encoding="utf-8") as f:
            tree = json.load(f)

        for child in tree.get("children", []):
            name = child.get("name", "")
            value = child.get("value", 0)
            if not name:
                continue

            if name not in result:
                result[name] = {"name": name, "history": []}
            # Dedupe: only one entry per year per name
            existing_years = {h["year"] for h in result[name]["history"]}
            if year not in existing_years:
                result[name]["history"].append({"year": year, "value": value})

    # Sort each history by year
    for v in result.values():
        v["history"].sort(key=lambda h: h["year"])

    return result


# ── US States endpoints ─────────────────────────────

STATES_DIR = DATA_DIR / "us" / "states"


@app.get("/budget/us-states")
def budget_us_states(year: int = Query(None)):
    """US State & Local Government spending tree. Optional ?year=YYYY."""
    if not STATES_DIR.exists():
        return JSONResponse({"error": "No US states data"}, status_code=404)
    if year:
        tree_path = STATES_DIR / f"us_states_tree_{year}.json"
        if not tree_path.exists():
            return JSONResponse({"error": f"No US states data for {year}"}, status_code=404)
    else:
        trees = sorted(STATES_DIR.glob("us_states_tree_*.json"))
        if not trees:
            return JSONResponse({"error": "No US states data"}, status_code=404)
        tree_path = trees[-1]
    with open(tree_path, "r", encoding="utf-8") as f:
        return json.load(f)


@app.get("/budget/us-states/years")
def budget_us_states_years():
    """List available years for US states data."""
    if not STATES_DIR.exists():
        return []
    return sorted(
        int(p.stem.split("_")[-1])
        for p in STATES_DIR.glob("us_states_tree_*.json")
        if p.stem.split("_")[-1].isdigit()
    )


@app.get("/budget/us-states/history")
def budget_us_states_history():
    """Historical data for US states (top-level = states)."""
    if not STATES_DIR.exists():
        return JSONResponse({"error": "No US states data"}, status_code=404)
    trees = sorted(STATES_DIR.glob("us_states_tree_*.json"))
    if not trees:
        return JSONResponse({"error": "No US states data"}, status_code=404)
    result = {}
    for tree_path in trees:
        year_str = tree_path.stem.split("_")[-1]
        if not year_str.isdigit():
            continue
        year = int(year_str)
        with open(tree_path, "r", encoding="utf-8") as f:
            tree = json.load(f)
        for child in tree.get("children", []):
            name = child.get("name", "")
            value = child.get("value", 0)
            if not name:
                continue
            if name not in result:
                result[name] = {"name": name, "history": []}
            existing_years = {h["year"] for h in result[name]["history"]}
            if year not in existing_years:
                result[name]["history"].append({"year": year, "value": value})
    for v in result.values():
        v["history"].sort(key=lambda h: h["year"])
    return result


# ── Admin stats (hit tracking) ──────────────────────
#
# Auth: header X-Admin-Token compared against env var ADMIN_STATS_TOKEN.
# On failure (missing env, missing header, wrong header) we return 404
# with the same body FastAPI returns for unknown routes. We do NOT want
# this endpoint to reveal its own existence to scanners — 401/403 would.

_NOT_FOUND = JSONResponse({"detail": "Not Found"}, status_code=404)


@app.get("/admin/stats")
def admin_stats(request: Request, period: str = Query("week")):
    expected = os.environ.get("ADMIN_STATS_TOKEN", "")
    provided = request.headers.get("x-admin-token", "")
    if not expected or not provided or provided != expected:
        return _NOT_FOUND
    if period not in ("day", "week", "month"):
        period = "week"
    return compute_stats(period)


# ── SEO endpoints ───────────────────────────────────

@app.get("/robots.txt", response_class=PlainTextResponse)
def robots_txt():
    return """User-agent: *
Allow: /
Sitemap: https://budgetgalaxy.com/sitemap.xml
"""


@app.get("/sitemap.xml")
def sitemap_xml():
    urls = [
        ("https://budgetgalaxy.com/", "1.0"),
        ("https://budgetgalaxy.com/app?country=de", "0.9"),
        ("https://budgetgalaxy.com/app?country=us", "0.9"),
        ("https://budgetgalaxy.com/app?country=fr", "0.8"),
        ("https://budgetgalaxy.com/app?country=uk", "0.8"),
    ]
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    for loc, priority in urls:
        xml += f"  <url><loc>{loc}</loc><changefreq>monthly</changefreq><priority>{priority}</priority></url>\n"
    xml += "</urlset>\n"
    return Response(content=xml, media_type="application/xml")


# Serve data files (enrichments, etc.)
app.mount("/data", StaticFiles(directory=str(DATA_DIR)), name="data")

# Serve static frontend files (images, CSS, etc.)
app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=8088, reload=True)
