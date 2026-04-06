import json
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from api.routers import funding, gaps, map_data, fraud
from db.models import init_db

DATA_DIR = Path(__file__).parent.parent / "data"

app = FastAPI(
    title="Germany NGO Funding Map",
    description="API for exploring German public funding flows to NGOs",
    version="0.1.0",
)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

app.include_router(funding.router)
app.include_router(gaps.router)
app.include_router(map_data.router)
app.include_router(fraud.router)

STATIC_DIR = Path(__file__).parent.parent / "frontend"


@app.get("/app", response_class=FileResponse)
def serve_app():
    return FileResponse(STATIC_DIR / "index.html")


@app.on_event("startup")
def startup():
    init_db()


@app.get("/health")
def health():
    from sqlalchemy import text
    from db.models import SessionLocal
    db = SessionLocal()
    try:
        total = db.execute(text("SELECT COUNT(*) FROM ngo_funding")).scalar()
        sources = db.execute(text("SELECT COUNT(DISTINCT source) FROM ngo_funding")).scalar()
        return {
            "status": "ok",
            "total_records": total,
            "sources": sources,
            "db_version": "1.0",
            "last_updated": "2026-03-30",
        }
    finally:
        db.close()


@app.get("/budget/tree")
def budget_tree():
    """Complete Bundeshaushalt hierarchy: Einzelplan > Kapitel > Titel"""
    tree_path = DATA_DIR / "bundeshaushalt_tree_2024.json"
    if not tree_path.exists():
        return {"error": "Budget tree not available"}
    with open(tree_path, "r", encoding="utf-8") as f:
        return json.load(f)


@app.get("/changelog")
def changelog():
    return {
        "version": "1.0",
        "entries": [
            {
                "date": "2026-03-30",
                "version": "1.0",
                "type": "initial_release",
                "description": "Initial dataset release: 528,926 records from 14 sources",
            },
            {
                "date": "2026-03-30",
                "version": "1.0.1",
                "type": "correction",
                "description": "India total corrected from 6.9B (USD) to 6.1B (EUR). Cross-referenced orgs updated from 15 to 31.",
            },
        ],
    }


@app.get("/", response_class=FileResponse)
def serve_landing():
    return FileResponse(STATIC_DIR / "index.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)
