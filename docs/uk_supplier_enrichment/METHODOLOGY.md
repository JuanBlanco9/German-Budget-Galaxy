# UK Supplier Enrichment — Methodology

> **Status:** Draft for alignment across Claude Code sessions. Not wired into
> `frontend/methodology.html` yet. Incorporate when team agrees.

## What this document covers

The UK L5 spend dataset (15 departments, ~4,500 recipient entries for FY 2024)
gives us names and amounts but no identity, ownership, governance, or financial
health. This pipeline turns those names into a structured, citable per-supplier
profile, and documents every rule and its limitations.

## Scope

- **Input:** `data/recipients/uk/l5_*_2024.json` — 15 departmental spend files
- **Output:** `data/suppliers/{company_number}.json` — one profile per supplier
- **Coverage goal:** all 2,388 unique supplier names after dedup
- **Enrichment depth:** 4 layers (identity, governance, UBO chain, Wikidata)

## Pipeline overview

```
 ┌─────────────────────────┐
 │ Raw L5 per-department   │    15 files × ~4,500 rows
 │ (name + amount)         │
 └────────────┬────────────┘
              │ dedup + fuzzy match
 ┌────────────▼────────────┐
 │ supplier_ranking.json   │    2,388 unique names
 │ (aggregated by key)     │    with total_gbp + depts
 └────────────┬────────────┘
              │ regex classifier (13 categories)
 ┌────────────▼────────────┐
 │ classified ranking      │    1,932 CH-eligible
 │                         │    456 filtered (NHS/council/NDPB/...)
 └────────────┬────────────┘
              │ Companies House search + profile + filing-history
 ┌────────────▼────────────┐
 │ supplier_enrichment     │    identity + accounts + PDF
 │ .jsonl                  │    (match_quality scored)
 └────────────┬────────────┘
              │ CH officers + PSC APIs
 ┌────────────▼────────────┐
 │ supplier_governance     │    active/resigned officers
 │ .jsonl                  │    direct PSCs + statements
 └────────────┬────────────┘
              │ PSC chain walk (recursive)
 ┌────────────▼────────────┐
 │ supplier_ubo.jsonl      │    hops → terminal UBO
 │                         │    cited per hop
 └────────────┬────────────┘
              │ Wikidata query for unresolved chains
 ┌────────────▼────────────┐
 │ + wikidata annotations  │    foreign parent resolution
 └────────────┬────────────┘
              │ match confidence scoring
 ┌────────────▼────────────┐
 │ data/suppliers/         │    final per-supplier JSON
 │ {ch_number}.json        │    + _index.json + _manifest.json
 └─────────────────────────┘
```

## Data sources

All free, open-government APIs. Every enrichment claim carries a citation.

| Source | API endpoint | License | Used for |
|---|---|---|---|
| **Companies House** | `api.company-information.service.gov.uk` | Open Government v3 | search, profile, filing history, officers, PSC |
| **Companies House documents** | `document-api.company-information.service.gov.uk` | OGL v3 | annual accounts PDFs |
| **Wikidata** | `wikidata.org/w/api.php` | CC0 | foreign parent resolution, ownership chains |
| **UK L5 data** | existing in this repo | OGL v3 | raw departmental spend |

## Classification rules (13 categories)

Supplier names are categorized via ordered regex rules (first match wins). The
`ch_eligible` flag determines whether to call Companies House.

| Category | `ch_eligible` | Rationale |
|---|:---:|---|
| `nhs_icb` | ❌ | Integrated Care Boards — statutory commissioning bodies, not in CH. Already netted in project's fiscal consolidation |
| `nhs_trust` | ❌ | NHS provider trusts — separate NHS TAC dataset covers these |
| `nhs_other` | ❌ | NHS England, NHS BSA, NHS BT — public bodies |
| `council` | ❌ | Local authorities — intergovernmental transfers, not suppliers |
| `govt_dept` | ❌ | Central departments/agencies |
| `public_body_ndpb` | ❌ | Royal charter / executive agencies / NDPBs with no CH registration (BBC, Royal Society, Homes England, UK Space Agency, Environment Agency, Met Office, etc.). **Maintained blocklist** of 46 entries |
| `internal_code` | ❌ | Accounting artifacts: `OFFICE OF THE PAYMASTER GENERAL`, `JOINT VENTURE`, truncated strings, `(N1)/(N2)` tags |
| `international_body` | ❌ | UN, EU, World Bank, GAVI, ICRC, etc. — not UK companies |
| `public_body` | ✅ | Network Rail, National Highways, Student Loans Company (govt-owned but registered at CH) |
| `commercial` | ✅ | Default for names with Ltd/Plc/Limited suffix |
| `academic` | ✅ | Universities (some ARE at CH) |
| `charity` | ✅ | Charities limited by guarantee |
| `housing` | ✅ | Housing associations |
| `unclear` | ✅ | Ambiguous — try CH anyway |

See `scripts/classify_uk_suppliers.py` for exact regexes.

### Known over/under-classification

- **Welsh-language council names** ("Cyngor Gwynedd") — partial coverage via `CountyCouncil` pattern
- **Mis-tagged govt bodies in CH** — some PSCs (e.g. "Department For Culture Media And Sport") appear as corporate-entity filings instead of legal-person; fixed via post-hoc re-tag in `infer_ubo_suffix_jurisdictions.py`
- **Family-office PE vehicles** ("Davies Bidco", "Fenton Holdco") — correctly classified as `commercial` but produce opaque UBO chains

## Matching to Companies House

### Query construction

1. Supplier name is cleaned: trim whitespace, collapse multiple spaces, truncate at 140 chars
2. Submitted to `GET /search/companies?q={name}&items_per_page=5`
3. Top 5 candidates scored against query by normalized token overlap

### Match quality scoring

Normalization strips legal suffixes (Ltd, PLC, LLP, Inc, etc.) and punctuation,
lowercases, collapses whitespace. Then:

| Quality | Criterion | Action |
|---|---|---|
| `exact` | normalized strings equal | accept, download PDF |
| `prefix` | one starts with the other | accept, download PDF |
| `high_overlap` | ≥75% token overlap | accept as `needs_review`, skip PDF |
| `medium_overlap` | ≥45% token overlap | reject as error |
| `low` | <45% token overlap | reject as error |

This hard threshold was the single biggest quality improvement — earlier runs
with `medium_overlap` accepted produced false matches (e.g. "HOMES ENGLAND" →
"ALDERLEY HOMES ENGLAND LIMITED").

### Known match quality issues

- **Abbreviations in query** ("GLA", "DCMS") can match random companies with those tokens
- **"Holdings Limited" vs "Holdings"** parent companies may produce prefix match to wrong parent
- **PE bidco names** ("Davies Bidco") are deliberately generic → weak matches
- Full pass-level stats in the `match_confidence` section of each profile

## Match confidence scoring (added post-enrichment)

After matching, each supplier gets a 0-100 score combining multiple signals:

| Signal | Weight |
|---|---:|
| `exact` name match | +25 |
| `prefix` name match | +15 |
| `high_overlap` name match | +5 |
| weak name match | -15 |
| Company active | +10 |
| Company dissolved + spend >£10M | -25 |
| Company liquidation + spend >£10M | -30 |
| Company age <3y + spend >£10M | -20 |
| Established >10y | +5 |
| Govt PSC consistent (legal-person) | +20 |
| Foreign via Wikidata | +10 |
| Listed PLC dispersed ownership | +10 |
| Single British individual UBO, unknown family, spend >£50M | -15 |
| Known family/PE pattern | +5 |
| Foreign jurisdiction for UK contract | -10 |
| Accounts overdue | -10 |
| Board turnover high | -5 |
| Board stable | +3 |

Score labels: `high ≥75`, `medium 55-74`, `low 35-54`, `suspicious <35`.

## UBO chain walking

For each direct PSC at Companies House, the script walks up the ownership tree:

- **Individual PSC** → terminal as `individual` (UBO found)
- **Legal-person PSC** → terminal as `government` (e.g. Secretary of State)
- **Corporate PSC, UK jurisdiction** → recurse via `/company/{parent}/persons-with-significant-control`
- **Corporate PSC, foreign jurisdiction** → terminal as `foreign_unresolved` (try Wikidata next)
- **Corporate PSC, no registration number** → terminal with note
- **Cycle detected** or **max depth 10** → terminal

Multiple PSCs at any level create branches → one supplier can have 1-10+ chains.

### Wikidata fallback for foreign chains

For chains terminating in `foreign_unresolved`, the PSC name is queried against
Wikidata:

1. `wbsearchentities` API finds candidate Q-IDs
2. Each candidate's P31 (instance of) is checked for "business enterprise"
3. Description keyword fallback catches edge cases ("Royal BAM Group" description
   contains "Dutch construction company")
4. Parent chain walked via P749 (parent organisation) up to 5 hops

Hit rate: ~69% of foreign_unresolved were resolvable via Wikidata. Misses are
mostly: small PE bidcos, NULL PSC names, jurisdictions not represented.

### Partial-unresolved refinement

After the walk, chains that terminated at `unresolved_statement` or `no_psc_data`
are re-classified based on parent company type:

- Parent is `plc` → `listed_dispersed_legitimate` (diffuse shareholding is lawful)
- Parent is `dissolved/liquidation` → `parent_inactive`
- Statement = "no-individual-or-entity-with-significant-control" → `no_psc_declared_legitimate`
- Statement in pending list ("steps-to-find-psc-not-yet-completed") → `data_gap_pending`
- No statement + no PSC → `data_gap_other`

This distinguishes lawful diffuse ownership from actual disclosure gaps.

## Known limitations

### Coverage

- Only top 500 (now expanding to 2,388) by rank processed so far. Tail has more noise
- Foreign PE chains (Cayman, BVI, Delaware) often not walkable without external data
- Companies with only abbreviation names ("GMCA", "DCMS") may fail matching

### Data quality

- **98% of downloaded accounts PDFs are scanned/image-only** — usable as visual archive, not machine-readable
- CH PSC register is self-declared, not audited — filer errors exist
- 4 cases observed with NULL PSC names (filer didn't complete filing)
- Some corporate PSCs file with `country_registered` blank → classified as foreign_unresolved even when UK

### UBO inherent complexity

- **Listed PLCs legitimately have no single UBO** (diffuse shareholding) — these are correctly tagged `listed_dispersed`, not "unresolved"
- Trusts and nominees can legally hide real UBO
- Multi-hop chains into foreign private jurisdictions terminate without final resolution

### Match false positives

Even `exact` matches can be wrong when the supplier name is ambiguous:
- "Great Western Railway Limited" matched CH 01759457 → actually Mr Michael Thorp's unrelated small company, not the train operator (Great Western Railway is operated by First Greater Western Ltd, CH 05113733)

The match confidence validator catches the most severe cases (dissolved large-spend
matches, young-company large-spend) but nuanced errors remain. Manual spot-check
of top 20 confidence suspects is recommended before public release.

## Schema per supplier profile

```json
{
  "company_number": "02401034",
  "display_name": "Student Loans Company Ltd",
  "identity": { /* CH profile fields + SIC labels */ },
  "spend_profile": {
    "total_gbp_2024": 21303634477,
    "by_department": [ /* per-dept breakdown with segments */ ]
  },
  "financial_health": { /* last accounts date, type, PDF link, overdue flag */ },
  "governance": { /* active/resigned officers, turnover signal */ },
  "ownership_chain": {
    "resolution": "government|individual|listed_dispersed|foreign_via_wikidata|...",
    "chains": [ /* list of hop arrays, each hop with CH source URL */ ],
    "ubo_summary": { "ultimate_individuals", "ultimate_governments", "ultimate_foreign_countries" }
  },
  "match_confidence": { "score": 85, "label": "high", "reasons": [...] },
  "sources": [ /* all URLs cited for this profile */ ],
  "metadata": { /* timestamps + generator_version */ }
}
```

## Reproducibility

All steps are idempotent and cacheable. To regenerate from scratch:

```bash
export CH_API_KEY="..."  # developer.company-information.service.gov.uk
python scripts/build_uk_supplier_ranking.py
python scripts/classify_uk_suppliers.py
python scripts/enrich_uk_suppliers.py
python scripts/enrich_uk_suppliers_governance.py
python scripts/enrich_uk_suppliers_ubo.py
python scripts/enrich_uk_suppliers_wikidata.py
python scripts/merge_wikidata_to_ubo.py
python scripts/split_partial_unresolved.py
python scripts/validate_match_quality.py
python scripts/build_supplier_profiles.py
```

Intermediate JSONL files support resume-safe re-runs (skip already-processed
rows by company number).

## Caveats for consumers

**This dataset should not be used for:**

- **Formal due diligence** without independent verification. Trust scores
  (`match_confidence`) are heuristic; manual review required for `low`/`suspicious`
- **Automated sanctions screening** — no sanctions list joins; must use dedicated
  OFAC/HMT sources
- **Audit-grade ownership claims** — UBO chains reflect CH self-declarations,
  augmented by Wikidata which itself is community-edited

**It is appropriate for:**

- Journalistic investigation with follow-up verification
- Research on supply chain structure / concentration / geopolitics
- Transparency narratives with source links intact
- Informing government procurement audits / policy analysis

## Version

- Pipeline version: 1.1.0
- Methodology doc version: 0.1 (draft, Apr 2026)
- Data snapshot: UK L5 FY 2024
