# UK Supplier Enrichment — Roadmap

> **Status:** living document — updated across Claude Code sessions as items
> ship or re-prioritize. Last updated: Apr 2026.

## Purpose

Capture the committed-but-deferred enrichment work so it isn't forgotten between
sessions. Every item here is something the team has decided is worth doing,
just not right now.

---

## 🟢 In progress

### Extend CH enrichment 500 → 2,388
- Batch 1 (500→1000): running in background (task `bnj6mhavk`)
- Batch 2 (1000→1500): pending
- Batch 3 (1500→1932 = all CH-eligible): pending
- Add 456 non-CH-eligible to profiles dir (councils, NHS, NDPBs, internationals) as "lightweight profiles" with spend only
- Governance + UBO + Wikidata passes over new enrichments
- Rebuild profiles

**Owner hint:** whichever session sees the batch-complete notifications next.

---

## 🟡 Committed, next iterations

### 0. Data Quality Dashboard  ← user-committed Apr 2026
**Why:** transforms the 86.54%/400-profiles/13.46%-gap reality into a product
feature that compounds trust. The layer that makes Budget Galaxy's open-data
philosophy legible to journalists, researchers, and policy people who decide
whether to cite it. Full spec in `docs/data_quality_dashboard/SPEC.md`.

**Deliverables:**
- `scripts/build_quality_dashboard.py` — reads all existing outputs + registries
- `data/_quality/dashboard.json` — auto-generated
- `data/_quality/known_issues.json` — hand-curated caveats registry
- `data/_quality/gaps.json` — hand-curated gaps registry with blocker_class
- HTML templates under `/quality/*` (10 pages, MVP = overview only)

**Initial registry content to seed:**
- Gaps: Cloudflare-blocked (£12B), Shire Districts low-ROI (£3.2B), Birmingham S114, Liverpool <£500, defence redactions
- Issues: Hillingdon NDR pass-through, Other Services >30% classifier concerns, Darlington/N Lincs missing months, Wales procurement DfT-separate

**Esfuerzo:** 2 sessions for MVP. Can extend iteratively afterward.

**Unlock:** becomes the grounding context for the Claude chat feature (roadmap item 11), so it can say "we don't cover that council" instead of hallucinating.

---

### 1. IXBRL financial extracts  ← user-committed Apr 2026
**Why:** PDF download gives user a link but no structured numbers. The supplier
detail page can't show Revenue / Operating Profit / Employees today. Critical
for "government dependency ratio" (gov_spend / company_revenue) which is the
single highest-value metric for journalistic / policy use.

**Approach:**
1. Download CH Accounts Data Product monthly dumps from
   http://download.companieshouse.gov.uk/en_accountsdata.html
   (~5-15 GB/month, IXBRL-format structured filings)
2. Parse IXBRL with `lxml` or `arelle` — extract tags:
   - `uk-core:Revenue`, `ifrs-full:Revenue`
   - `uk-core:ProfitLoss`
   - `uk-core:EmployeesTotal` / `uk-bus:AverageNumberEmployeesDuringPeriod`
   - `uk-core:TotalAssets`
   - `uk-core:Equity`
3. Match by company_number to existing profiles
4. New script: `scripts/extract_financials_ixbrl.py`
5. Inject into `profile.financial_health` section as `key_figures`

**Expected coverage:** ~40-60% of suppliers (those who file IXBRL). The rest
keeps metadata-only financials as today.

**Esfuerzo:** 2-3 sessions.

**Deliverables:**
- `data/recipients/uk/ixbrl_archive/` (raw dumps, gitignored)
- `data/recipients/uk/supplier_financials_parsed.jsonl`
- Update `build_supplier_profiles.py` to merge into profiles
- Add `financial_health.key_figures` section schema

---

### 2. Contracts Finder / procurement context  ← user-flagged Apr 2026
**Why:** We show WHAT was paid, not HOW the supplier was selected. The
"cómo llegaron a ser proveedores" question requires tender/award data.

**Approach:**
1. Bulk download Contracts Finder data (gov.uk Contracts Finder API + FTS)
2. Entity-resolve supplier names to our CH numbers (reuse normalization from
   `build_uk_supplier_ranking.py`)
3. New fields in profile:
   - `procurement.contracts[]` — timeline with buyer, value, award date, CPV code
   - `procurement.procedure_breakdown` — % open / restricted / single-tender
   - `procurement.framework_dependency` — % via CCS frameworks
   - `procurement.bidders_stats` — avg bidders when disclosed
   - `procurement.overrun_ratio` — contract value at award vs actual paid spend

**Esfuerzo:** 2-3 sessions.

---

### 3. Extend to other countries
**Why:** Budget Galaxy covers DE/FR/US too. UK has CH; each country has its
own registry. Pipeline is UK-specific today.

**Approach:**
- France: INSEE / SIRENE for entity identity, Infogreffe for filings
- Germany: Unternehmensregister (paid) + Bundesanzeiger (accounts) + LEI
- US: SEC EDGAR for public, SAM.gov for contracts

Each country needs own classifier + enrichment + UBO walk. Share core schema.

**Esfuerzo:** each country = 5-8 sessions. Best started after UK is stable.

---

## 🟠 Quality improvements (post-batch)

### 4. Manual override file for UBO edge cases
**Why:** 10 suppliers have NULL PSC names (VolkerStevin, VolkerFitzpatrick)
or otherwise-unresolvable chains. Manual research into their annual reports
would fix them.

**Approach:**
- Create `data/recipients/uk/manual_ubo_overrides.json`
- For each case: `{"company_number": "...", "ubo_override": {...},
  "source": {"type": "annual_report", "url": "...", "verified_by": "..."}}`
- `build_supplier_profiles.py` reads and applies overrides, marks with
  `source.manual_curation: true` badge in UI

**Esfuerzo:** 1 session, mostly research time (~30-60 min).

---

### 5. Manual review tool for suspicious matches
**Why:** Match confidence validator flags ~22 suspicious/low. Human should
spot-check top 20 before public release.

**Approach:**
- Standalone HTML loop that shows one supplier at a time with:
  - Supplier name + spend
  - Matched CH company + profile card
  - Accept / Reject / Fix manually buttons
- Writes decisions to `match_review_decisions.json`
- Apply decisions in `build_supplier_profiles.py` → override with `manual_verified: true`

**Esfuerzo:** 1 session for tool + 30 min review time.

---

### 6. Apply cleanup inventory
**Why:** 11.3 MB of backup files from iterative development. Run the
inventory'd cleanup commands once team confirms.

**Approach:**
- Review `data/recipients/uk/_cleanup_inventory.json`
- Add `--execute` flag to `inventory_cleanup_candidates.py`
- Delete only items marked `safe_to_delete: true` and older than 7 days

**Esfuerzo:** 15 minutes.

---

## 🔵 Nice-to-haves

### 7. OCR on scanned PDFs for ultimate parent extraction
**Why:** 349 PDFs are image-only. OCR could yield "Ultimate parent undertaking"
disclosures that CH API doesn't expose.

**Approach:**
- Install Tesseract binary
- OCR last 15-20 pages of each PDF (notes section only) → ~7000 pages
- Regex extract ultimate parent name + jurisdiction
- Merge into UBO chain as alternative source

**Esfuerzo:** 1 session setup + 4-6 hrs compute overnight.

**Value now:** Lower — Wikidata already resolved 69% of foreign_unresolved. OCR
would add marginal coverage to tail cases.

---

### 8. Wire SIC labels expansion into build pipeline
**Why:** `data/reference/sic_2007_labels.json` exists (250+ codes) but the
active `build_supplier_profiles.py` still uses embedded 40-code map.

**Approach:**
- Change `SIC_LABELS` constant in build_supplier_profiles.py to load from
  JSON file
- Rebuild profiles

**Esfuerzo:** 15 minutes. Waiting for team alignment per "not inject yet" rule.

---

### 9. Wire reverse-lookup indexes into frontend
**Why:** `data/suppliers/_reverse_indexes/` exists but frontend doesn't use
them yet. Unlocks filter-by-country / filter-by-UBO / filter-by-SIC UX.

**Approach:**
- Frontend work: add filter chips in supplier list view
- Each chip fetches corresponding reverse index file
- Cross-navigation: "All suppliers owned by [X]" link on supplier detail

**Esfuerzo:** depends on frontend design. Coordinate with UI iteration.

---

### 10. Wire methodology doc
**Why:** `docs/uk_supplier_enrichment/METHODOLOGY.md` exists but not linked from
`frontend/methodology.html`.

**Approach:**
- Decide: include as separate page at `/methodology/uk-suppliers.html`,
  or inline section in existing methodology.html
- Convert markdown to HTML matching Budget Galaxy styling
- Cross-link from supplier detail footers ("Learn how this data was built →")

**Esfuerzo:** 1-2 hours.

---

## 📋 Dependency graph

```
Extend to 2388 → (current batch)
   ├── Manual UBO overrides (4)       → [cleanup run]
   ├── Manual review tool (5)         → [cleanup run]
   └── SIC labels wire (8)            → [integration]
                │
                ├── IXBRL financials (1)      ← user-committed
                ├── Contracts Finder (2)      ← user-flagged
                │       │
                │       └── Reverse-lookup wire (9)
                │       └── Methodology wire (10)
                │
                └── Other countries (3)   ← long-term
```

---

## Completed

- [x] Pipeline v1.0 (top 500 CH-eligible) — Apr 2026
- [x] Wikidata foreign chain resolution — Apr 2026
- [x] partial_unresolved split (listed_dispersed vs data_gap) — Apr 2026
- [x] Match confidence scoring — Apr 2026
- [x] Supplier profile integrator (v1.1) — Apr 2026
- [x] HTML preview page (standalone) — Apr 2026
- [x] Methodology draft — Apr 2026 (not wired)
- [x] Reverse-lookup indexes (11 types) — Apr 2026 (not wired)
- [x] SIC 2007 labels expansion — Apr 2026 (not wired)
- [x] Cleanup inventory — Apr 2026 (not applied)
