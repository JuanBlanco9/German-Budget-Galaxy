# Procurement Enrichment — Kickoff Brief

> **Purpose:** self-contained plan to start tomorrow. Includes all data sources,
> APIs, schemas, entity resolution strategy, risks, and first commands to run.
> Nothing to discover mid-flight.

---

## What we're adding

For each supplier we already enriched (identity, governance, UBO), attach a
**procurement section** answering: *how did this supplier become a government
supplier, and under what procurement conditions?*

Concretely:
- Total contracts awarded (count + value)
- Awarded value vs paid spend → overrun signals
- Procurement method breakdown (% open / restricted / sole-source / framework)
- Framework dependency (% via Crown Commercial frameworks)
- CPV category mix (what they actually sell to govt)
- Number of bidders avg
- Buyer concentration (which depts)
- Timeline of contract awards

This turns each supplier profile from "recipient of £X" into "won N contracts
worth £Y, of which Z% were competitively tendered, concentrated in depts A/B/C".

---

## Primary data sources

### 1. Contracts Finder (core source)

| | |
|---|---|
| **URL** | https://www.contractsfinder.service.gov.uk |
| **API docs** | https://www.contractsfinder.service.gov.uk/apidocumentation |
| **Bulk data** | https://www.contractsfinder.service.gov.uk/Published/OcdsData/All.zip |
| **Format** | OCDS (Open Contracting Data Standard) JSON |
| **Coverage** | Central govt >£12k, wider public sector >£25k |
| **Date range** | 2015-present |
| **Licence** | Open Government Licence v3.0 |
| **Estimated size** | ~500k notices total, ~1-2 GB unzipped |
| **Update cadence** | Daily (individual notices), monthly (bulk) |

**Notice types:**
- `tender` — published opportunity
- `award` — winner announced
- `contract` — contract signed
- `implementation` — execution updates
- `awardCancellation`, `tenderCancellation`

For our purposes we care primarily about `award` + `contract` records.

### 2. Find a Tender Service (FTS) — post-Brexit high-value

| | |
|---|---|
| **URL** | https://www.find-tender.service.gov.uk |
| **API docs** | https://www.find-tender.service.gov.uk/apidocumentation |
| **Bulk** | (eForms XML available via API) |
| **Threshold** | ~£122k central govt / ~£213k utilities (indexed thresholds) |
| **Date range** | Jan 2021+ (replaced UK entries in TED post-Brexit) |
| **Format** | eForms XML (newer) + OCDS JSON |
| **Licence** | OGL v3.0 |

FTS is **in addition to** Contracts Finder, not a replacement. Some high-value
notices appear in both.

### 3. TED (Tenders Electronic Daily) — pre-Brexit UK

| | |
|---|---|
| **URL** | https://ted.europa.eu |
| **Bulk download** | https://ted.europa.eu/en/release-calendar |
| **UK data range** | Pre-Jan 2021 (Brexit transition cutoff) |
| **Format** | TED XML (F01-F25 standard forms), CSV exports |
| **Licence** | EU open data |

Needed for historical 2015-2020 UK high-value contracts.

### 4. Crown Commercial Service (CCS) frameworks

| | |
|---|---|
| **URL** | https://www.crowncommercial.gov.uk/agreements |
| **Format** | HTML + downloadable XLSX per framework |
| **Content** | Framework name (RM-series) + approved suppliers + categories |
| **Key frameworks** | G-Cloud (RM1557.12/13), Digital Outcomes (RM1043.8), Technology Services (RM3804), etc. |

Needed to cross-reference: "this contract was awarded via RM1557.12 G-Cloud 12"
→ makes the framework dependency metric possible.

### 5. Secondary / complementary

- **data.gov.uk** — mirrors some Contracts Finder data with alternative exports
- **spend over £25k** — invoice-level public spending (already used in our L5 data)
- **Parliament TheyWorkForYou / WhatDoTheyKnow** — FOI-surfaced contracts (manual)

---

## OCDS schema — what we'll parse

OCDS is a well-maintained open standard. Full spec: https://standard.open-contracting.org/latest/en/

**Key fields we extract per record:**

```json
{
  "ocid": "ocds-contract-12345",
  "id": "contract_notice_id",
  "date": "2024-03-15T10:00:00Z",
  "tag": ["award", "contract"],
  "initiationType": "tender",
  "parties": [
    {
      "id": "GB-COH-04402220",              // ← buyer/supplier CH number
      "name": "Network Rail Limited",
      "roles": ["supplier"],
      "identifier": {"scheme": "GB-COH", "id": "04402220"},
      "address": {"streetAddress": "..."}
    }
  ],
  "buyer": {
    "id": "...",
    "name": "Department for Transport"
  },
  "planning": {
    "budget": {"amount": {"amount": 1000000, "currency": "GBP"}}
  },
  "tender": {
    "id": "tender-id",
    "title": "Rail infrastructure maintenance",
    "procurementMethod": "open",           // open, selective, limited, direct
    "procurementMethodDetails": "...",
    "numberOfTenderers": 5,                // often missing!
    "value": {"amount": 450000000, "currency": "GBP"},
    "items": [
      {"classification": {"scheme": "CPV", "id": "45234100"}}
    ],
    "contractPeriod": {"startDate": "2024-06-01", "endDate": "2031-05-31"}
  },
  "awards": [
    {
      "id": "award-id",
      "date": "2024-03-10",
      "suppliers": [{"id": "GB-COH-...", "name": "Supplier Ltd"}],
      "value": {"amount": 450000000, "currency": "GBP"},
      "contractPeriod": {...}
    }
  ],
  "contracts": [
    {
      "id": "contract-id",
      "awardID": "award-id",
      "title": "...",
      "value": {"amount": 450000000, "currency": "GBP"},
      "dateSigned": "2024-04-01",
      "documents": [{"url": "...", "documentType": "contractSigned"}]
    }
  ]
}
```

**`procurementMethod` values** (OCDS controlled vocabulary):
- `open` — anyone can bid
- `selective` — pre-qualified / restricted
- `limited` — direct award / single-tender-action ⚠️ low competition
- `direct` — sole-source
- `frameworkAgreement` — call-off from pre-existing framework

**CPV classification** — ~9,000 codes. Pre-built map available:
https://simap.ted.europa.eu/documents/10184/36234/cpv_2008_xls.zip

---

## Strategy / approach

### Data ingestion: bulk > API

Use the OCDS bulk download, not per-supplier API queries. Reasons:
- 1,500+ suppliers × variable contracts = huge API pressure
- Bulk is ~1-2 GB, parses in minutes
- Enables cross-cutting queries ("top sole-source buyers overall")
- No rate limits

### Entity resolution — three-pass match

OCDS supplier entries sometimes have `GB-COH` identifier (= CH number), but
many don't. Three-pass strategy:

1. **Pass 1: direct CH match**
   - If `parties[].identifier.scheme == "GB-COH"` → match by company number
   - Expected: ~40-60% of records matched cleanly

2. **Pass 2: fuzzy name match**
   - Reuse `norm()` from `build_uk_supplier_ranking.py`
   - Match normalized supplier name against our `supplier_ranking.json` variants
   - Scoring: exact > prefix > token overlap
   - Expected: ~30% more matched

3. **Pass 3: address + postcode**
   - For still-unmatched: compare supplier `address.postalCode` against our
     `profile.identity.registered_office.postal_code`
   - Last-resort match with low confidence flag

Output: `data/procurement/contracts_to_supplier_mapping.jsonl`
```json
{
  "ocid": "ocds-contract-12345",
  "raw_supplier_name": "NETWORK RAIL LTD",
  "raw_supplier_identifier": {"scheme": "GB-COH", "id": "04402220"},
  "resolved_ch_number": "04402220",
  "resolution_method": "direct_ch_id",
  "confidence": "high"
}
```

### Aggregation per supplier

Once matched, aggregate to `data/recipients/uk/supplier_procurement.jsonl`:

```json
{
  "company_number": "04402220",
  "company_name": "Network Rail Limited",
  "period": "2015-01-01 to 2024-12-31",
  "summary": {
    "n_contracts_awarded": 47,
    "n_contracts_completed": 41,
    "total_awarded_gbp": 12500000000,
    "total_paid_gbp_2024_from_l5": 8659000000,
    "awarded_vs_paid_ratio_2024": 0.69,
    "procurement_method_pct": {
      "open": 42.1,
      "selective": 15.3,
      "limited": 6.4,
      "direct": 2.1,
      "frameworkAgreement": 34.1
    },
    "sole_source_pct": 8.5,
    "framework_dependency_pct": 34.1,
    "avg_n_tenderers": 3.2,
    "median_n_tenderers": 3,
    "tenderer_data_coverage_pct": 47
  },
  "frameworks_used": [
    {"name": "RM1557.12 G-Cloud 12", "contracts": 5, "awarded_gbp": 23000000},
    {"name": "Crown Commercial RM3804", "contracts": 12, "awarded_gbp": 890000000}
  ],
  "cpv_breakdown": [
    {"code": "45234100", "label": "Railway construction work", "contracts": 28, "value": 8900000000},
    {"code": "72000000", "label": "IT services", "contracts": 4, "value": 34000000}
  ],
  "buyers": [
    {"dept_id": "department_for_transport", "name": "DfT", "contracts": 42, "value": 11800000000},
    {"dept_id": "hm_treasury", "name": "HMT", "contracts": 2, "value": 45000000}
  ],
  "contracts": [
    {
      "ocid": "ocds-...",
      "title": "Control Period 7 enhancements",
      "date_awarded": "2024-03-15",
      "buyer": "DfT",
      "value_gbp": 450000000,
      "procurement_method": "open",
      "n_tenderers": 5,
      "cpv": "45234100",
      "duration_months": 84,
      "source_url": "https://www.contractsfinder.service.gov.uk/Notice/..."
    }
    // ... timeline continues
  ],
  "flags": {
    "sole_source_heavy": false,
    "framework_captive": false,
    "overrun_ratio_high": false,
    "single_department_dependency": true,
    "consecutive_single_tender_contracts": false
  },
  "enriched_at": "2026-04-17T...",
  "sources": [
    {"type": "contracts_finder_ocds", "url": "...", "bulk_date": "2026-04-01"}
  ]
}
```

### Integration into existing profile

Modify `build_supplier_profiles.py` to load this JSONL and attach as
`profile.procurement` section. Already has slot for it — current profiles have
`ownership_chain` but no `procurement`.

Also add a **`procurement_flags`** summary to `_index.json`:
- `sole_source_heavy` (>30% of value sole-sourced)
- `framework_captive` (>70% via single framework)
- `overrun_ratio_high` (paid/awarded > 1.5×)
- `repeat_non_competitive` (≥3 consecutive direct awards from same buyer)

These enable UI filters like "show suppliers who won >70% via sole-source".

---

## Known risks / caveats

| Risk | Impact | Mitigation |
|---|---|---|
| Contract value ≠ paid spend | Can look like fraud/overrun when it's just framework scope | Show BOTH values + delta, explain in methodology |
| Below-threshold invisible | Missing <£25k contracts entirely | Document gap; our L5 spend captures these differently |
| Framework call-offs often not individual notices | Understates true competition pattern | Flag when `procurementMethod = frameworkAgreement` and don't count as non-competitive |
| MoD + Intelligence redactions | Systematic undercounting of defence | Expected; note in methodology. Defence suppliers often have more direct awards |
| Department publication quality varies | Uneven dataset | No mitigation — surface variance in UI |
| CPV codes aren't always set | ~15-20% of contracts have no CPV | Keep `null` labels gracefully |
| Entity resolution false positives | Wrong contract attributed to supplier | Use `confidence` field; flag low-confidence matches |
| FY-quarter vs calendar-year mismatch | Govt FY (Apr-Mar) vs our data (calendar 2024) | Use both periods; document clearly |
| Post-Brexit TED/FTS schema discontinuity | Different fields pre-2021 vs post | Two ingestion paths, unified output schema |

---

## Entity resolution expected hit rate

Based on sample inspection we should verify tomorrow, expected:

| Match pass | Expected hit rate | Cumulative coverage |
|---|---:|---:|
| Direct `GB-COH` identifier | 45% | 45% |
| Fuzzy name match (exact/prefix) | 25% | 70% |
| Fuzzy name match (token overlap) | 10% | 80% |
| Address + postcode | 5% | 85% |
| Unmatched | 15% | — |

Unmatched records likely belong to:
- Suppliers below rank 2,388 in our enriched set
- Non-UK suppliers without CH registration
- Joint ventures / consortia with shared entries

---

## Step-by-step plan

### Day 1 (4-6 hours)

**Step 1 — Reconnaissance (30 min)**
- [ ] Download Contracts Finder bulk zip
- [ ] Unzip + sample: `head -c 1000 one_file.json` to see OCDS format
- [ ] Count notices per year
- [ ] Count unique buyer IDs vs our dept list
- [ ] Count unique supplier identifiers (with / without `GB-COH`)

**Step 2 — Ingestion script** (`scripts/ingest_contracts_finder.py`) (2 hrs)
- [ ] Accept path to bulk OCDS dump
- [ ] Stream-parse JSONs (don't load all at once)
- [ ] Extract flat records: one row per `award`
- [ ] Write to `data/recipients/uk/contracts_raw.jsonl`
- [ ] Include all relevant fields (buyer, supplier, value, method, CPV, dates, etc.)
- [ ] Report stats at end

**Step 3 — Entity resolution** (`scripts/resolve_contracts_to_suppliers.py`) (2 hrs)
- [ ] Load `contracts_raw.jsonl` + `supplier_ranking_classified.json`
- [ ] Implement three-pass match (CH ID → fuzzy name → address)
- [ ] Write `data/recipients/uk/contracts_resolved.jsonl` with `resolved_ch_number` field + confidence
- [ ] Report hit-rate breakdown

**Step 4 — Aggregation** (`scripts/aggregate_procurement_by_supplier.py`) (1 hr)
- [ ] Group resolved contracts by CH number
- [ ] Compute all metrics + flags
- [ ] Write `data/recipients/uk/supplier_procurement.jsonl`

**Step 5 — Profile integration** (30 min)
- [ ] Modify `build_supplier_profiles.py` to load `supplier_procurement.jsonl`
- [ ] Add `profile.procurement` section
- [ ] Update `_index.json` with procurement flags
- [ ] Rebuild profiles

**Step 6 — Validation** (30 min)
- [ ] Spot-check top 10 suppliers: match Contracts Finder website manually
- [ ] Verify awarded vs paid comparison makes sense (known cases: Interserve, ISG)
- [ ] Review procurement_flags distribution

### Day 2 (if needed)

- Add FTS (Find a Tender) data for post-Brexit high-value coverage
- Add TED historical for pre-2021 high-value
- CCS framework supplier lists cross-reference
- Frontend preview update showing procurement card

---

## Scripts to create (file names to use)

| File | Purpose |
|---|---|
| `scripts/ingest_contracts_finder.py` | Bulk OCDS → flat JSONL |
| `scripts/ingest_fts.py` | FTS eForms → flat JSONL (later) |
| `scripts/ingest_ted_historical.py` | TED XML pre-2021 → flat JSONL (later) |
| `scripts/resolve_contracts_to_suppliers.py` | Entity resolution to our CH numbers |
| `scripts/aggregate_procurement_by_supplier.py` | Per-CH-number metrics |
| `scripts/load_cpv_codes.py` | Parse CPV classification labels (optional, one-shot) |
| `data/reference/cpv_2008_labels.json` | CPV code → label map |

Add to `build_supplier_profiles.py`:
```python
PROCUREMENT = UK_DIR / "supplier_procurement.jsonl"
# ... in main ...
procurement_by_num = {p["company_number"]: p for p in load_jsonl(PROCUREMENT)}
# ... per profile ...
profile["procurement"] = procurement_by_num.get(num)  # None if no contracts found
```

---

## First commands to run tomorrow

```bash
# 1. reconnaissance — understand the data
cd D:/germany-ngo-map/.claude/worktrees/mystifying-ardinghelli-f4e66f
mkdir -p data/recipients/uk/procurement_raw
cd data/recipients/uk/procurement_raw

# bulk download (~500 MB-1 GB zipped, ~2-5 GB unzipped)
curl -L -o contracts_finder_all.zip \
  "https://www.contractsfinder.service.gov.uk/Published/OcdsData/All.zip"

# inspect
unzip -l contracts_finder_all.zip | head -20
unzip -p contracts_finder_all.zip $(unzip -Z1 contracts_finder_all.zip | head -1) | head -200

# quick count
unzip -l contracts_finder_all.zip | wc -l

# 2. start the ingest script
cd ../../../..
python scripts/ingest_contracts_finder.py \
  --input data/recipients/uk/procurement_raw/contracts_finder_all.zip \
  --output data/recipients/uk/contracts_raw.jsonl \
  --years 2015-2024
```

---

## Reference links

**Open Contracting Data Standard (OCDS)**
- Spec: https://standard.open-contracting.org/latest/en/
- UK extensions: https://standard.open-contracting.org/profiles/eu/
- Example records: https://www.contractsfinder.service.gov.uk/Published/OcdsData.json

**UK procurement specifically**
- Contracts Finder API docs: https://www.contractsfinder.service.gov.uk/apidocumentation
- FTS API docs: https://www.find-tender.service.gov.uk/apidocumentation
- Crown Commercial Service: https://www.crowncommercial.gov.uk/
- Policy / procurement regulations: https://www.gov.uk/government/collections/procurement-policy-notes

**Research prior art**
- Open Contracting Partnership analysis: https://www.open-contracting.org/data/
- Transparency International UK procurement: https://www.transparency.org.uk/ukgovernmentprocurement
- Tussell's UK Gov Contracts Report (commercial but good methodology reference)

**CPV**
- 2008 CPV xls: https://simap.ted.europa.eu/documents/10184/36234/cpv_2008_xls.zip
- CPV browser: https://simap.ted.europa.eu/cpv

---

## What to ask the user before starting

(In case context is needed)
- Any specific red-flag patterns to hunt? (sole-source %, overruns, revolving-door directors?)
- Priority on historical range? (just FY 2024 or 2015-present?)
- Privacy considerations? CF has individual names in some records
- Should flagged contracts link back to source PDFs (redacted but available)?

---

## Success criteria for end of Day 1

- [ ] `supplier_procurement.jsonl` exists with ≥ 1,000 rows
- [ ] Top 50 suppliers have ≥ 5 contracts each attributed
- [ ] ≥ 80% of FY 2024 spend explained by matched contracts
- [ ] At least 3 red-flag patterns surface naturally (sole-source heavy, overruns, framework captivity)
- [ ] Spot-check manually verifies 10 top suppliers match Contracts Finder website

## Success criteria for Day 2

- [ ] FTS post-Brexit data integrated
- [ ] CCS framework labels applied
- [ ] Profile detail page (preview.html) shows procurement card
- [ ] Cross-cutting query: "top 20 suppliers by sole-source spend across all depts"
