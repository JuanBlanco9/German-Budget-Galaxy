from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel


class FundingRecord(BaseModel):
    id: int
    org_name: str
    org_name_normalized: str | None = None
    org_country: str | None = None
    org_type: str | None = None
    funder_ministry: str | None = None
    intermediary: str | None = None
    amount_eur: Decimal | None = None
    amount_original: Decimal | None = None
    currency_original: str | None = None
    year: int
    purpose: str | None = None
    sector_oecd: str | None = None
    recipient_country: str | None = None
    source: str
    source_url: str | None = None
    source_record_id: str | None = None
    confidence_level: str | None = None
    duplicate_candidate: bool | None = None
    scraped_at: datetime | None = None

    model_config = {"from_attributes": True}


class FundingSummary(BaseModel):
    group: str
    total_eur: Decimal | None = None
    record_count: int


class CoverageGapOut(BaseModel):
    id: int
    layer: str | None = None
    estimated_total_eur: Decimal | None = None
    covered_eur: Decimal | None = None
    coverage_pct: Decimal | None = None
    gap_description: str | None = None
    last_updated: date | None = None

    model_config = {"from_attributes": True}


class SourceInfo(BaseModel):
    source: str
    record_count: int
    latest_scrape: datetime | None = None
