from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from api.schemas import CoverageGapOut, SourceInfo
from db.models import CoverageGap, NgoFunding, ScraperRun, get_session

router = APIRouter(tags=["gaps & sources"])


@router.get("/gaps", response_model=list[CoverageGapOut])
def list_gaps(db: Session = Depends(get_session)):
    return db.query(CoverageGap).order_by(CoverageGap.coverage_pct.asc().nullslast()).all()


@router.get("/sources", response_model=list[SourceInfo])
def list_sources(db: Session = Depends(get_session)):
    rows = (
        db.query(
            NgoFunding.source,
            func.count(NgoFunding.id).label("record_count"),
            func.max(NgoFunding.scraped_at).label("latest_scrape"),
        )
        .group_by(NgoFunding.source)
        .order_by(func.count(NgoFunding.id).desc())
        .all()
    )
    return [
        SourceInfo(source=r.source, record_count=r.record_count, latest_scrape=r.latest_scrape)
        for r in rows
    ]
