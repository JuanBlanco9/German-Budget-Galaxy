"""Map and dashboard data endpoints — pre-aggregated for frontend performance."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, distinct, case, literal, text
from sqlalchemy.orm import Session

from db.models import NgoFunding, get_session

router = APIRouter(prefix="/map", tags=["map"])


@router.get("/countries")
def country_flows(
    year: int | None = None,
    ministry: str | None = None,
    db: Session = Depends(get_session),
):
    """Funding aggregated by recipient country for the world map."""
    # Use COALESCE: prefer amount_eur, fall back to amount_original
    amount_expr = func.coalesce(
        func.sum(NgoFunding.amount_eur),
        func.sum(NgoFunding.amount_original),
    )
    q = db.query(
        NgoFunding.recipient_country.label("country"),
        amount_expr.label("total_amount"),
        func.count(NgoFunding.id).label("records"),
        func.count(distinct(NgoFunding.org_name_normalized)).label("orgs"),
        func.count(distinct(NgoFunding.source)).label("sources"),
        func.max(NgoFunding.recipient_region).label("region"),
    ).filter(
        NgoFunding.recipient_country.isnot(None),
        NgoFunding.recipient_country != "",
        NgoFunding.duplicate_candidate == False,
    )
    if year:
        q = q.filter(NgoFunding.year == year)
    if ministry:
        q = q.filter(NgoFunding.funder_ministry == ministry.upper())
    rows = q.group_by(NgoFunding.recipient_country).order_by(amount_expr.desc().nullslast()).all()
    return [
        {"country": r.country, "amount": float(r.total_amount or 0), "records": r.records,
         "orgs": r.orgs, "sources": r.sources, "region": r.region}
        for r in rows
    ]


@router.get("/regions")
def region_flows(db: Session = Depends(get_session)):
    """Funding aggregated by continent/region for regional map bubbles."""
    amount_expr = func.coalesce(func.sum(NgoFunding.amount_eur), func.sum(NgoFunding.amount_original))
    rows = db.query(
        NgoFunding.recipient_region.label("region"),
        amount_expr.label("total"),
        func.count(NgoFunding.id).label("records"),
    ).filter(
        NgoFunding.recipient_region.isnot(None),
    ).group_by(NgoFunding.recipient_region).order_by(func.count(NgoFunding.id).desc()).all()
    return [
        {"region": r.region, "amount": float(r.total or 0), "records": r.records}
        for r in rows
    ]


@router.get("/ministries")
def ministry_breakdown(
    year: int | None = None,
    db: Session = Depends(get_session),
):
    """Funding by ministry for the dashboard."""
    q = db.query(
        NgoFunding.funder_ministry.label("ministry"),
        func.coalesce(func.sum(NgoFunding.amount_eur), func.sum(NgoFunding.amount_original)).label("total"),
        func.count(NgoFunding.id).label("records"),
        func.count(distinct(NgoFunding.org_name_normalized)).label("orgs"),
    ).filter(
        NgoFunding.duplicate_candidate == False,
        NgoFunding.source != "BUNDESHAUSHALT",  # exclude budget lines for org-level view
    )
    if year:
        q = q.filter(NgoFunding.year == year)
    rows = q.group_by(NgoFunding.funder_ministry).order_by(func.count(NgoFunding.id).desc()).all()
    return [
        {"ministry": r.ministry, "amount": float(r.total or 0), "records": r.records, "orgs": r.orgs}
        for r in rows
    ]


@router.get("/top_orgs")
def top_organizations(
    limit: int = Query(50, le=200),
    year: int | None = None,
    ministry: str | None = None,
    db: Session = Depends(get_session),
):
    """Top funded organizations (excludes generic OECD channel names)."""
    amount_expr = func.coalesce(func.sum(NgoFunding.amount_eur), func.sum(NgoFunding.amount_original))
    GENERIC_EXCLUDE = [
        "ngo (%", "ngo &%", "ngos &%", "donor country%", "developing countr%",
        "zuwendungen%", "unknown%", "multilateral%",
    ]
    q = db.query(
        NgoFunding.org_name_normalized.label("org_id"),
        func.max(NgoFunding.org_name).label("org_name"),
        amount_expr.label("total"),
        func.count(NgoFunding.id).label("records"),
        func.count(distinct(NgoFunding.source)).label("sources"),
        func.count(distinct(NgoFunding.funder_ministry)).label("ministries"),
        func.max(NgoFunding.org_type).label("org_type"),
    ).filter(
        NgoFunding.duplicate_candidate == False,
        NgoFunding.source != "BUNDESHAUSHALT",
        NgoFunding.org_name_normalized.isnot(None),
        *[~NgoFunding.org_name_normalized.like(g) for g in GENERIC_EXCLUDE],
        # Exclude DIP records with nonsensical parsed amounts (> 1B EUR from a PDF table = parsing error)
        ~((NgoFunding.source == "DIP_PDF") & (NgoFunding.amount_eur > 1_000_000_000)),
    )
    if year:
        q = q.filter(NgoFunding.year == year)
    if ministry:
        q = q.filter(NgoFunding.funder_ministry == ministry.upper())
    rows = q.group_by(NgoFunding.org_name_normalized).order_by(amount_expr.desc().nullslast()).limit(limit).all()
    return [
        {
            "org_id": r.org_id, "org_name": r.org_name, "amount": float(r.total or 0),
            "records": r.records, "sources": r.sources, "ministries": r.ministries,
            "org_type": r.org_type,
        }
        for r in rows
    ]


@router.get("/yearly")
def yearly_trend(
    ministry: str | None = None,
    db: Session = Depends(get_session),
):
    """Yearly funding trend."""
    amount_expr = func.coalesce(func.sum(NgoFunding.amount_eur), func.sum(NgoFunding.amount_original))
    q = db.query(
        NgoFunding.year.label("year"),
        amount_expr.label("total"),
        func.count(NgoFunding.id).label("records"),
        func.count(distinct(NgoFunding.org_name_normalized)).label("orgs"),
    ).filter(
        NgoFunding.year >= 2000,
        NgoFunding.year <= 2026,
        NgoFunding.duplicate_candidate == False,
        NgoFunding.source != "BUNDESHAUSHALT",
    )
    if ministry:
        q = q.filter(NgoFunding.funder_ministry == ministry.upper())
    rows = q.group_by(NgoFunding.year).order_by(NgoFunding.year).all()
    return [
        {"year": r.year, "amount": float(r.total or 0), "records": r.records, "orgs": r.orgs}
        for r in rows
    ]


@router.get("/country/{country_code}")
def country_detail(
    country_code: str,
    year: int | None = None,
    db: Session = Depends(get_session),
):
    """Detailed breakdown for a single country: named orgs, OECD aggregate, sectors, trend."""
    cc = country_code.upper()

    amount_expr = func.coalesce(func.sum(NgoFunding.amount_eur), func.sum(NgoFunding.amount_original))

    GENERIC = ["ngo (", "ngo &", "ngos &", "donor country", "developing country", "unknown",
               "zuwendungen", "federal ministry", "bundesministerium"]

    # Strategy: get ALL orgs for this country across all sources, filter generics
    named_q = db.query(
        NgoFunding.org_name_normalized,
        func.max(NgoFunding.org_name).label("name"),
        amount_expr.label("amount"),
        func.count(NgoFunding.id).label("records"),
        func.max(NgoFunding.org_type).label("org_type"),
        func.string_agg(distinct(NgoFunding.source), ", ").label("sources"),
        func.max(NgoFunding.purpose).label("purpose"),
    ).filter(
        NgoFunding.recipient_country == cc,
        NgoFunding.duplicate_candidate == False,
        NgoFunding.org_name_normalized.isnot(None),
    )
    if year:
        named_q = named_q.filter(NgoFunding.year == year)
    all_orgs = named_q.group_by(NgoFunding.org_name_normalized).order_by(amount_expr.desc().nullslast()).limit(50).all()

    orgs_clean = [
        o for o in all_orgs
        if o.org_name_normalized and not any(g in o.org_name_normalized for g in GENERIC)
    ]

    # If few named orgs, also search IATI by purpose text mentioning the country
    if len(orgs_clean) < 5:
        country_name = cc  # we'll search by ISO code in purpose
        # Get country name from pycountry
        try:
            import pycountry
            hit = pycountry.countries.get(alpha_3=cc)
            if hit:
                country_name = hit.name
        except Exception:
            pass

        purpose_q = db.query(
            NgoFunding.org_name_normalized,
            func.max(NgoFunding.org_name).label("name"),
            amount_expr.label("amount"),
            func.count(NgoFunding.id).label("records"),
            func.max(NgoFunding.org_type).label("org_type"),
            func.string_agg(distinct(NgoFunding.source), ", ").label("sources"),
            func.max(NgoFunding.purpose).label("purpose"),
        ).filter(
            NgoFunding.source.in_(["IATI", "FRAGDENSTAAT", "DIP_PDF"]),
            NgoFunding.duplicate_candidate == False,
            NgoFunding.org_name_normalized.isnot(None),
            NgoFunding.purpose.ilike(f"%{country_name}%"),
        )
        if year:
            purpose_q = purpose_q.filter(NgoFunding.year == year)
        purpose_orgs = purpose_q.group_by(NgoFunding.org_name_normalized).order_by(
            amount_expr.desc().nullslast()
        ).limit(30).all()

        existing_norms = {o.org_name_normalized for o in orgs_clean}
        for o in purpose_orgs:
            if o.org_name_normalized not in existing_norms and not any(g in o.org_name_normalized for g in GENERIC):
                orgs_clean.append(o)
                existing_norms.add(o.org_name_normalized)

    # OECD aggregate totals (for context)
    oecd_total = db.query(
        func.sum(NgoFunding.amount_original).label("amount"),
        func.count(NgoFunding.id).label("records"),
    ).filter(
        NgoFunding.recipient_country == cc,
        NgoFunding.source == "OECD_CRS",
        NgoFunding.duplicate_candidate == False,
    )
    if year:
        oecd_total = oecd_total.filter(NgoFunding.year == year)
    oecd_row = oecd_total.first()

    orgs = orgs_clean

    # Sectors
    sectors = db.query(
        NgoFunding.sector_oecd,
        func.max(NgoFunding.purpose).label("label"),
        amount_expr.label("amount"),
        func.count(NgoFunding.id).label("records"),
    ).filter(
        NgoFunding.recipient_country == cc,
        NgoFunding.duplicate_candidate == False,
        NgoFunding.sector_oecd.isnot(None),
    )
    if year:
        sectors = sectors.filter(NgoFunding.year == year)
    sectors = sectors.group_by(NgoFunding.sector_oecd).order_by(amount_expr.desc().nullslast()).limit(15).all()

    # Yearly trend for this country
    yearly = db.query(
        NgoFunding.year,
        amount_expr.label("amount"),
        func.count(NgoFunding.id).label("records"),
    ).filter(
        NgoFunding.recipient_country == cc,
        NgoFunding.duplicate_candidate == False,
        NgoFunding.year > 0,
    ).group_by(NgoFunding.year).order_by(NgoFunding.year).all()

    # Totals (all sources)
    total_records = db.query(func.count(NgoFunding.id)).filter(
        NgoFunding.recipient_country == cc, NgoFunding.duplicate_candidate == False,
    ).scalar()
    total_amount = db.query(amount_expr).filter(
        NgoFunding.recipient_country == cc, NgoFunding.duplicate_candidate == False,
    ).scalar()

    # Transparency gauge: OECD total vs named org total
    named_amount = db.query(
        func.coalesce(func.sum(NgoFunding.amount_eur), literal(0))
    ).filter(
        NgoFunding.recipient_country == cc,
        NgoFunding.duplicate_candidate == False,
        NgoFunding.source.in_(["IATI", "FRAGDENSTAAT", "DIP_PDF", "DIP_STIFTUNGEN", "DIP_CDU_ANFRAGE",
                                "DEMOKRATIE_LEBEN", "DEMOKRATIE_LEBEN_FP2", "NGO_MONITOR",
                                "BERLIN_ZDB_API", "BREMEN_ZEBRA"]),
    )
    if year:
        named_amount = named_amount.filter(NgoFunding.year == year)
    named_total = float(named_amount.scalar() or 0)

    oecd_eur = float(oecd_row.amount or 0) if oecd_row else 0
    total_reported = max(oecd_eur, float(total_amount or 0), named_total)
    identified_pct = min(100.0, round(named_total / total_reported * 100, 1)) if total_reported > 0 else 0

    return {
        "country": cc,
        "total_records": total_records or 0,
        "total_amount": float(total_amount or 0),
        "transparency": {
            "total_reported": total_reported,
            "named_identified": named_total,
            "identified_pct": identified_pct,
            "unidentified_pct": round(100 - identified_pct, 1),
        },
        "oecd_aggregate": {
            "amount_usd": float(oecd_row.amount or 0) if oecd_row else 0,
            "records": oecd_row.records if oecd_row else 0,
        },
        "organizations": [
            {"org_id": o.org_name_normalized, "name": o.name, "amount": float(o.amount or 0),
             "records": o.records, "org_type": o.org_type, "sources": o.sources,
             "purpose": (o.purpose or "")[:120]}
            for o in orgs
        ],
        "sectors": [
            {"code": s.sector_oecd, "label": (s.label or "")[:80], "amount": float(s.amount or 0), "records": s.records}
            for s in sectors
        ],
        "yearly": [
            {"year": y.year, "amount": float(y.amount or 0), "records": y.records}
            for y in yearly
        ],
    }


@router.get("/bundeslaender")
def bundeslaender(db: Session = Depends(get_session)):
    """Domestic Germany data by Bundesland for the sub-map."""
    amount_expr = func.coalesce(func.sum(NgoFunding.amount_eur), literal(0))
    rows = db.query(
        NgoFunding.bundesland.label("land"),
        func.count(NgoFunding.id).label("records"),
        func.count(distinct(NgoFunding.org_name_normalized)).label("orgs"),
        amount_expr.label("total_eur"),
    ).filter(
        NgoFunding.bundesland.isnot(None),
    ).group_by(NgoFunding.bundesland).order_by(func.count(NgoFunding.id).desc()).all()
    return [
        {"land": r.land, "records": r.records, "orgs": r.orgs, "total_eur": float(r.total_eur or 0)}
        for r in rows
    ]


@router.get("/bundesland/{land}")
def bundesland_detail(land: str, db: Session = Depends(get_session)):
    """Detail for a single Bundesland: top orgs, sources, programs."""
    amount_expr = func.coalesce(func.sum(NgoFunding.amount_eur), literal(0))

    orgs = db.query(
        NgoFunding.org_name_normalized,
        func.max(NgoFunding.org_name).label("name"),
        amount_expr.label("amount"),
        func.count(NgoFunding.id).label("records"),
        func.string_agg(distinct(NgoFunding.source), ", ").label("sources"),
        func.max(NgoFunding.purpose).label("purpose"),
    ).filter(
        NgoFunding.bundesland == land,
        NgoFunding.org_name_normalized.isnot(None),
    ).group_by(NgoFunding.org_name_normalized).order_by(
        amount_expr.desc().nullslast()
    ).limit(40).all()

    by_source = db.query(
        NgoFunding.source,
        func.count(NgoFunding.id).label("records"),
        amount_expr.label("amount"),
    ).filter(NgoFunding.bundesland == land).group_by(NgoFunding.source).all()

    total = db.query(
        func.count(NgoFunding.id),
        func.count(distinct(NgoFunding.org_name_normalized)),
        amount_expr,
    ).filter(NgoFunding.bundesland == land).first()

    return {
        "land": land,
        "total_records": total[0] if total else 0,
        "total_orgs": total[1] if total else 0,
        "total_eur": float(total[2] or 0) if total else 0,
        "organizations": [
            {"org_id": o.org_name_normalized, "name": o.name, "amount": float(o.amount or 0),
             "records": o.records, "sources": o.sources, "purpose": (o.purpose or "")[:120]}
            for o in orgs
        ],
        "by_source": [
            {"source": s.source, "records": s.records, "amount": float(s.amount or 0)}
            for s in by_source
        ],
    }


@router.get("/sources_summary")
def sources_summary(db: Session = Depends(get_session)):
    """Summary stats per data source."""
    rows = db.query(
        NgoFunding.source,
        func.count(NgoFunding.id).label("records"),
        func.count(distinct(NgoFunding.org_name_normalized)).label("orgs"),
        func.max(NgoFunding.scraped_at).label("last_scrape"),
    ).group_by(NgoFunding.source).order_by(func.count(NgoFunding.id).desc()).all()
    return [
        {"source": r.source, "records": r.records, "orgs": r.orgs, "last_scrape": str(r.last_scrape)}
        for r in rows
    ]


@router.get("/demokratie_leben")
def demokratie_leben(db: Session = Depends(get_session)):
    """Demokratie leben! program beneficiaries for Germany domestic map."""
    rows = db.query(NgoFunding).filter(
        NgoFunding.source == "DEMOKRATIE_LEBEN",
    ).order_by(NgoFunding.org_name).all()

    results = []
    for r in rows:
        raw = r.raw_json or {}
        results.append({
            "org_name": r.org_name,
            "type": raw.get("type", ""),
            "theme": raw.get("theme", raw.get("project", "")),
            "location": raw.get("location", raw.get("land", "")),
            "land": raw.get("land", ""),
            "period": raw.get("period", ""),
            "purpose": r.purpose,
        })
    return results


@router.get("/search")
def search_orgs(
    q: str = Query(..., min_length=2),
    limit: int = Query(20, le=100),
    db: Session = Depends(get_session),
):
    """Search organizations by name."""
    from parsers.normalize import normalize_org_name
    norm = normalize_org_name(q)
    amount_expr = func.coalesce(func.sum(NgoFunding.amount_eur), func.sum(NgoFunding.amount_original))

    rows = db.query(
        NgoFunding.org_name_normalized,
        func.max(NgoFunding.org_name).label("org_name"),
        amount_expr.label("total"),
        func.count(NgoFunding.id).label("records"),
        func.string_agg(distinct(NgoFunding.source), ", ").label("sources"),
        func.string_agg(distinct(NgoFunding.funder_ministry), ", ").label("ministries"),
    ).filter(
        NgoFunding.org_name_normalized.contains(norm) if norm else NgoFunding.org_name.ilike(f"%{q}%"),
    ).group_by(NgoFunding.org_name_normalized).order_by(amount_expr.desc().nullslast()).limit(limit).all()

    return [
        {
            "org_id": r.org_name_normalized,
            "org_name": r.org_name, "amount": float(r.total or 0),
            "records": r.records, "sources": r.sources, "ministries": r.ministries,
        }
        for r in rows
    ]


@router.get("/org/{org_id:path}")
def org_detail(org_id: str, db: Session = Depends(get_session)):
    """Full detail for a single organization: all records, sources, countries, projects."""
    from parsers.normalize import normalize_org_name
    norm = normalize_org_name(org_id) or org_id

    records = db.query(NgoFunding).filter(
        NgoFunding.org_name_normalized == norm,
    ).order_by(NgoFunding.amount_eur.desc().nullslast()).all()

    if not records:
        # Try partial match
        records = db.query(NgoFunding).filter(
            NgoFunding.org_name_normalized.contains(norm),
        ).order_by(NgoFunding.amount_eur.desc().nullslast()).limit(100).all()

    if not records:
        return {"org_name": org_id, "records": [], "summary": {}}

    # Summary
    total_eur = sum(float(r.amount_eur or 0) for r in records)
    total_orig = sum(float(r.amount_original or 0) for r in records)
    sources = list(set(r.source for r in records))
    ministries = list(set(r.funder_ministry for r in records if r.funder_ministry))
    countries = list(set(r.recipient_country for r in records if r.recipient_country))
    years = sorted(set(r.year for r in records if r.year and r.year > 2000))
    org_name = records[0].org_name

    # Group records by source for display
    by_source = {}
    for r in records:
        src = r.source
        if src not in by_source:
            by_source[src] = []
        by_source[src].append({
            "id": r.id,
            "year": r.year,
            "amount_eur": float(r.amount_eur) if r.amount_eur else None,
            "amount_original": float(r.amount_original) if r.amount_original else None,
            "currency": r.currency_original,
            "ministry": r.funder_ministry,
            "intermediary": r.intermediary,
            "purpose": r.purpose,
            "sector": r.sector_oecd,
            "country": r.recipient_country,
            "source_url": r.source_url,
            "source_record_id": r.source_record_id,
            "confidence": r.confidence_level,
        })

    # Extract address from raw_json (Berlin ZDB has 'anschrift', IATI has contact info)
    address = None
    for r in records:
        if r.raw_json and isinstance(r.raw_json, dict):
            addr = r.raw_json.get("anschrift") or r.raw_json.get("address")
            if addr and len(str(addr).strip()) > 5:
                address = str(addr).strip()
                break
    # Also check contact info from IATI
    if not address:
        for r in records:
            if r.raw_json and isinstance(r.raw_json, dict):
                addr = (r.raw_json.get("contact_info_mailing_address_narrative_text")
                        or r.raw_json.get("contact-info.mailing-address.narrative"))
                if addr:
                    if isinstance(addr, list):
                        addr = addr[0] if addr else ""
                    if len(str(addr).strip()) > 5:
                        address = str(addr).strip()
                        break

    # Financial data (dependency ratio)
    financials = None
    fin_row = db.execute(text(
        "SELECT * FROM org_financials WHERE org_name_normalized = :n"
    ), {"n": norm}).fetchone()
    if not fin_row:
        # Try partial match
        fin_row = db.execute(text(
            "SELECT * FROM org_financials WHERE :n LIKE '%' || org_name_normalized || '%' OR org_name_normalized LIKE '%' || :n || '%' LIMIT 1"
        ), {"n": norm}).fetchone()
    if fin_row:
        financials = {
            "total_revenue": float(fin_row.total_revenue_eur) if fin_row.total_revenue_eur else None,
            "federal_funding": float(fin_row.federal_funding_eur) if fin_row.federal_funding_eur else None,
            "dependency_pct": float(fin_row.state_dependency_pct) if fin_row.state_dependency_pct is not None else None,
            "year": fin_row.revenue_year,
            "source": fin_row.data_source,
            "category": fin_row.category,
        }

    # Anfragen (parliamentary questions mentioning this org)
    anfragen = []
    anfrage_records = [r for r in records if r.source in ("DIP_ANFRAGEN_V2", "DIP_PDF", "DIP_STIFTUNGEN", "DIP_CDU_ANFRAGE")]
    seen_docs = set()
    for r in anfrage_records:
        doc_nr = r.source_record_id or ""
        if doc_nr in seen_docs:
            continue
        seen_docs.add(doc_nr)
        anfragen.append({
            "doc_nr": doc_nr,
            "title": (r.purpose or "")[:200],
            "url": r.source_url,
            "source": r.source,
            "amount": float(r.amount_eur) if r.amount_eur else None,
        })

    return {
        "org_name": org_name,
        "org_name_normalized": norm,
        "address": address,
        "financials": financials,
        "anfragen": anfragen[:20],
        "summary": {
            "total_eur": total_eur,
            "total_original": total_orig,
            "record_count": len(records),
            "sources": sources,
            "ministries": ministries,
            "countries": countries,
            "years": years,
            "org_type": records[0].org_type,
        },
        "by_source": by_source,
    }


@router.get("/dashboard_orgs")
def dashboard_orgs(
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    year: int | None = None,
    ministry: str | None = None,
    country: str | None = None,
    sector: str | None = None,
    org_type: str | None = None,
    confidence: str | None = None,
    search: str | None = None,
    min_amount: float | None = None,
    sort_by: str = Query("amount_eur", description="Sort column"),
    sort_dir: str = Query("desc", description="asc or desc"),
    db: Session = Depends(get_session),
):
    """Filtered organization list with sorting for NGO Explorer."""
    ALLOWED_SORT = {"org_name", "org_type", "funder_ministry", "amount_eur", "year", "source", "confidence_level"}
    if sort_by not in ALLOWED_SORT:
        sort_by = "amount_eur"
    if sort_dir not in ("asc", "desc"):
        sort_dir = "desc"

    q = db.query(NgoFunding).filter(
        NgoFunding.duplicate_candidate == False,
        NgoFunding.confidence_level != "noise",
        NgoFunding.org_name_normalized.isnot(None),
    )
    if year:
        q = q.filter(NgoFunding.year == year)
    if ministry:
        q = q.filter(NgoFunding.funder_ministry == ministry.upper())
    if country:
        q = q.filter(NgoFunding.recipient_country == country.upper())
    if sector:
        q = q.filter(NgoFunding.sector_oecd == sector)
    if org_type:
        q = q.filter(NgoFunding.org_type == org_type)
    if confidence:
        q = q.filter(NgoFunding.confidence_level == confidence)
    if search:
        from parsers.normalize import normalize_org_name
        norm = normalize_org_name(search)
        if norm:
            q = q.filter(NgoFunding.org_name_normalized.contains(norm))
        else:
            q = q.filter(NgoFunding.org_name.ilike(f"%{search}%"))
    if min_amount:
        q = q.filter(NgoFunding.amount_eur >= min_amount)

    # Sort
    sort_col = getattr(NgoFunding, sort_by, NgoFunding.amount_eur)
    if sort_dir == "desc":
        q = q.order_by(sort_col.desc().nullslast())
    else:
        q = q.order_by(sort_col.asc().nullsfirst())

    total = q.count()
    rows = q.offset(offset).limit(limit).all()

    return {
        "total": total,
        "sort_by": sort_by,
        "sort_dir": sort_dir,
        "results": [
            {
                "id": r.id,
                "org_name": r.org_name,
                "org_name_normalized": r.org_name_normalized,
                "org_type": r.org_type,
                "funder_ministry": r.funder_ministry,
                "amount_eur": float(r.amount_eur) if r.amount_eur else None,
                "year": r.year,
                "source": r.source,
                "confidence_level": r.confidence_level,
                "recipient_country": r.recipient_country,
                "purpose": (r.purpose or "")[:150],
                "source_url": r.source_url,
            }
            for r in rows
        ],
    }


@router.get("/dashboard_orgs/export")
def export_filtered_csv(
    year: int | None = None,
    ministry: str | None = None,
    country: str | None = None,
    sector: str | None = None,
    org_type: str | None = None,
    confidence: str | None = None,
    search: str | None = None,
    min_amount: float | None = None,
    sort_by: str = "amount_eur",
    sort_dir: str = "desc",
    db: Session = Depends(get_session),
):
    """Export filtered results as CSV (no pagination)."""
    import csv
    import io
    from datetime import datetime
    from fastapi.responses import StreamingResponse

    ALLOWED_SORT = {"org_name", "org_type", "funder_ministry", "amount_eur", "year", "source", "confidence_level"}
    if sort_by not in ALLOWED_SORT:
        sort_by = "amount_eur"

    q = db.query(NgoFunding).filter(
        NgoFunding.duplicate_candidate == False,
        NgoFunding.confidence_level != "noise",
        NgoFunding.org_name_normalized.isnot(None),
    )
    if year:
        q = q.filter(NgoFunding.year == year)
    if ministry:
        q = q.filter(NgoFunding.funder_ministry == ministry.upper())
    if country:
        q = q.filter(NgoFunding.recipient_country == country.upper())
    if sector:
        q = q.filter(NgoFunding.sector_oecd == sector)
    if org_type:
        q = q.filter(NgoFunding.org_type == org_type)
    if confidence:
        q = q.filter(NgoFunding.confidence_level == confidence)
    if search:
        from parsers.normalize import normalize_org_name
        norm = normalize_org_name(search)
        if norm:
            q = q.filter(NgoFunding.org_name_normalized.contains(norm))
        else:
            q = q.filter(NgoFunding.org_name.ilike(f"%{search}%"))
    if min_amount:
        q = q.filter(NgoFunding.amount_eur >= min_amount)

    sort_col = getattr(NgoFunding, sort_by, NgoFunding.amount_eur)
    q = q.order_by(sort_col.desc().nullslast() if sort_dir == "desc" else sort_col.asc().nullsfirst())

    rows = q.limit(10000).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["org_name", "org_type", "funder_ministry", "amount_eur", "year",
                      "source", "confidence_level", "recipient_country", "purpose", "source_url"])
    for r in rows:
        writer.writerow([
            r.org_name, r.org_type, r.funder_ministry,
            float(r.amount_eur) if r.amount_eur else "",
            r.year, r.source, r.confidence_level, r.recipient_country,
            (r.purpose or "")[:300], r.source_url,
        ])
    output.seek(0)
    ts = datetime.now().strftime("%Y%m%d_%H%M")
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=ngo_funding_export_{ts}.csv"},
    )


@router.get("/filter_options")
def filter_options(db: Session = Depends(get_session)):
    """Available filter values for dashboard dropdowns."""
    ministries = [r[0] for r in db.query(distinct(NgoFunding.funder_ministry)).filter(
        NgoFunding.funder_ministry.isnot(None)
    ).order_by(NgoFunding.funder_ministry).all()]

    countries = [r[0] for r in db.query(distinct(NgoFunding.recipient_country)).filter(
        NgoFunding.recipient_country.isnot(None),
        NgoFunding.recipient_country != "",
    ).order_by(NgoFunding.recipient_country).all()]

    sectors = db.query(
        NgoFunding.sector_oecd,
        func.max(NgoFunding.purpose).label("label"),
        func.count(NgoFunding.id).label("cnt"),
    ).filter(
        NgoFunding.sector_oecd.isnot(None),
    ).group_by(NgoFunding.sector_oecd).order_by(func.count(NgoFunding.id).desc()).limit(30).all()

    years = [r[0] for r in db.query(distinct(NgoFunding.year)).filter(
        NgoFunding.year >= 2000, NgoFunding.year <= 2026,
    ).order_by(NgoFunding.year.desc()).all()]

    bundeslaender = [r[0] for r in db.query(distinct(NgoFunding.bundesland)).filter(
        NgoFunding.bundesland.isnot(None),
    ).order_by(NgoFunding.bundesland).all()]

    return {
        "ministries": ministries,
        "countries": countries,
        "sectors": [{"code": s.sector_oecd, "label": (s.label or "")[:60], "count": s.cnt} for s in sectors],
        "years": years,
        "bundeslaender": bundeslaender,
    }
