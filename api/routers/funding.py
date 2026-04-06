import csv
import io
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from api.schemas import FundingRecord, FundingSummary
from db.models import NgoFunding, get_session

router = APIRouter(prefix="/funding", tags=["funding"])


@router.get("", response_model=list[FundingRecord])
def list_funding(
    year: int | None = None,
    ministry: str | None = None,
    org_type: str | None = None,
    source: str | None = None,
    recipient_country: str | None = None,
    confidence: str | None = None,
    exclude_duplicates: bool = False,
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_session),
):
    q = db.query(NgoFunding)
    if year:
        q = q.filter(NgoFunding.year == year)
    if ministry:
        q = q.filter(NgoFunding.funder_ministry == ministry.upper())
    if org_type:
        q = q.filter(NgoFunding.org_type == org_type)
    if source:
        q = q.filter(NgoFunding.source == source.upper())
    if recipient_country:
        q = q.filter(NgoFunding.recipient_country == recipient_country.upper())
    if confidence:
        q = q.filter(NgoFunding.confidence_level == confidence)
    if exclude_duplicates:
        q = q.filter(NgoFunding.duplicate_candidate.is_(False))
    return q.order_by(NgoFunding.id).offset(offset).limit(limit).all()


@router.get("/summary", response_model=list[FundingSummary])
def funding_summary(
    group_by: str = Query(..., description="Group by: ministry, intermediary, org_type, source, year, recipient_country"),
    year: int | None = None,
    ministry: str | None = None,
    exclude_duplicates: bool = False,
    db: Session = Depends(get_session),
):
    column_map = {
        "ministry": NgoFunding.funder_ministry,
        "intermediary": NgoFunding.intermediary,
        "org_type": NgoFunding.org_type,
        "source": NgoFunding.source,
        "year": NgoFunding.year,
        "recipient_country": NgoFunding.recipient_country,
    }
    col = column_map.get(group_by)
    if col is None:
        raise HTTPException(400, f"Invalid group_by. Options: {list(column_map.keys())}")

    q = db.query(
        col.label("group"),
        func.sum(NgoFunding.amount_eur).label("total_eur"),
        func.count(NgoFunding.id).label("record_count"),
    )
    if year:
        q = q.filter(NgoFunding.year == year)
    if ministry:
        q = q.filter(NgoFunding.funder_ministry == ministry.upper())
    if exclude_duplicates:
        q = q.filter(NgoFunding.duplicate_candidate.is_(False))

    rows = q.group_by(col).order_by(func.sum(NgoFunding.amount_eur).desc().nullslast()).all()
    return [
        FundingSummary(
            group=str(r.group) if r.group else "unknown",
            total_eur=r.total_eur,
            record_count=r.record_count,
        )
        for r in rows
    ]


@router.get("/{record_id}", response_model=FundingRecord)
def get_funding(record_id: int, db: Session = Depends(get_session)):
    rec = db.query(NgoFunding).filter(NgoFunding.id == record_id).first()
    if not rec:
        raise HTTPException(404, "Record not found")
    return rec


@router.get("/by_org/{org_name}", response_model=list[FundingRecord])
def funding_by_org(
    org_name: str,
    limit: int = Query(100, le=1000),
    db: Session = Depends(get_session),
):
    # Search by normalized name (case-insensitive partial match)
    from parsers.normalize import normalize_org_name
    normalized = normalize_org_name(org_name)
    q = db.query(NgoFunding)
    if normalized:
        q = q.filter(NgoFunding.org_name_normalized.contains(normalized))
    else:
        q = q.filter(NgoFunding.org_name.ilike(f"%{org_name}%"))
    return q.order_by(NgoFunding.year.desc()).limit(limit).all()


@router.get("/export/{org_name}")
def export_org_csv(org_name: str, db: Session = Depends(get_session)):
    """Export all records for an organization as CSV."""
    from parsers.normalize import normalize_org_name
    norm = normalize_org_name(org_name)
    records = db.query(NgoFunding).filter(
        NgoFunding.org_name_normalized.contains(norm) if norm else NgoFunding.org_name.ilike(f"%{org_name}%")
    ).order_by(NgoFunding.year.desc()).all()

    if not records:
        raise HTTPException(404, "No records found for this organization")

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "org_name", "org_name_normalized", "org_type", "funder_ministry", "intermediary",
        "amount_eur", "amount_original", "currency_original", "year", "purpose",
        "sector_oecd", "recipient_country", "source", "source_url", "source_record_id",
        "confidence_level", "scraped_at",
    ])
    for r in records:
        writer.writerow([
            r.org_name, r.org_name_normalized, r.org_type, r.funder_ministry, r.intermediary,
            float(r.amount_eur) if r.amount_eur else "", float(r.amount_original) if r.amount_original else "",
            r.currency_original, r.year, (r.purpose or "")[:500],
            r.sector_oecd, r.recipient_country, r.source, r.source_url, r.source_record_id,
            r.confidence_level, str(r.scraped_at)[:19] if r.scraped_at else "",
        ])

    output.seek(0)
    safe_name = norm[:50] if norm else org_name[:50]
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={safe_name}_ngo_funding_data.csv"},
    )
