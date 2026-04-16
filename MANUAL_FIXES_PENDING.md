# Manual Fixes Pending — Discovery Batch of 30 Councils

_Generated during session 2026-04-15 after discovery pool expansion,
updated after the 17-council rebuild landed._

Below are councils from the discovery manifest that need hand-holding
before they can ship through the standard pipeline. Each is 15-30 min
of targeted work. Do them after the main batch rebuild lands and the
tree is verified clean.

## Priority order for next session

**Tier 1 — high impact, low effort (do first)**:
1. Thurrock Council £2526M (10x inflated) — probably Amount column picks
   up gross+VAT+net stacked, or duplicate rows. 15 min inspection + fix.
2. Hammersmith & Fulham Q4 — "Centre" vs "Center" spelling. 5 min fix,
   recovers a full quarter of H&F coverage (~£120M uplift).
3. GMCA "TfGM" alias — the `supplierAliases` framework already merges
   "TfGM Interbank" + "TFGM" → "Transport for Greater Manchester" but
   misses the mixed-case "TfGM" variant (£51M floating). Add one more
   alias key. 2 min.

**Tier 2 — medium impact, medium effort**:
4. West + North Northamptonshire — column drift mid-year. Jan-Mar 2024
   files use a different header than Apr-Dec 2023. Inspect, add second
   config or per-file preprocessor. ~30 min.
5. 8 wrong-dataset councils (Wigan/Sefton/Salford/Trafford/Telford/
   RBWM/Blackpool + 1 more) — the scraper grabbed contracts registers
   and purchase-card files instead of supplier-spend. Re-download with
   corrected URLs. ~1-2h batch.
6. Reading Borough Council £65M (14% coverage, MHCLG ~£480M) — check
   if Amount column is in pence, or if the wrong column was matched.
   15 min.

**Tier 3 — low impact, high effort (last)**:
7. Westmorland & Furness 4-stream preprocessor (Trade Suppliers /
   Private Homes / SLDC / Support Related / Eden+Barrow legacy).
   45-60 min of one-off code, same pattern as `preprocess_wyca.js`.
8. PCC name-matching systematic cleanup — Hampshire PCC, Thames Valley
   PCC, etc. still not tracking cleanly through the pipeline. Low
   financial impact (PCCs are small entities), no urgency.
9. Derby City Council — manifest has `no_schema` (one of
   supplier_col/amount_col is null). Re-parse the Derby discovery
   report with a tighter prompt or manually fill the missing fields.
   15 min.

**Tier 3b — audit trail hardening (low urgency but high confidence gain)**:
10. Post-upload SHA256 verify in `upload_to_archive_org.js`. After
    each successful PUT, download the file back from archive.org and
    compare SHA256 against the local hash. Currently we trust HTTP
    200 as success, which doesn't catch network corruption during
    upload. ~20 lines inside the existing upload loop, adds ~2s per
    file. Fail loudly if mismatch (don't populate archive_files).
    Why Tier 3: archive.org re-encoding is rare and network corruption
    rarer still. But closes a real gap in the audit trail and the
    incremental cost is trivial.

11. Lookup manifest inside archive.org item. Upload
    `council_spend_lookup_2024.json` as a regular file inside
    `budget-galaxy-uk-councils-2024`, filename `manifest.json` or
    `council_spend_lookup_2024.json`. This gives auditors the
    cross-layer mapping (source_url → SHA256 → archive.org filename)
    even if GitHub is lost. Single PUT, 5 min. Add a step at the
    end of `upload_to_archive_org.js` that re-uploads the (updated)
    lookup after all files are in, so the manifest inside the item
    always reflects the final state of archive_files.

## Schema / classifier fixes

### Wigan Metropolitan Borough Council
- **Issue**: Discovery report claimed columns `Expense Area(T)` / `Expense Code(T)`
  but the actually downloaded CSVs (`March-2024-Creditor-Payments-CSV.csv`,
  `March-2024-Payment-card-CSV.csv`, etc.) have simple schema
  `Beneficiary, Date, Merchant Category, Amount (Net of VAT)`.
- **Root cause**: discovery agent sampled a different file type (likely a
  historical supplier payments format with transparency-code suffix `(T)`),
  but the current live publication is a simpler card/creditor export.
- **Fix**:
  1. Verify by listing `data/uk/local_authorities/spend/wigan_metropolitan_borough_council/`
     — if the 5 files are payment-card style (small rows, date-indexed),
     we may not have a usable supplier-level dataset at all.
  2. If usable, re-run classifier with corrected columns:
     `--dept-col "Merchant Category" --purpose-col "Merchant Category"` (both same
     because there is no dept field in this format).
  3. Accept that the Wigan metadata panel will show categories, not service areas.

### Councils with `no_dept_col` in the manifest
- **Issue**: Sonnet parser returned `null` for `schema.dept_col`, so the batch
  classifier skipped them. Count in last run: 2.
- **Action**:
  1. Identify which two. `node -e "const m = require('./data/uk/local_authorities/spend/council_discovery_manifest.json');
     for (const e of m) if (e.schema && !e.schema.dept_col) console.log(e.name, e.report_source);"`
  2. Re-open the original discovery report and hand-code the dept column
     name into the manifest (or re-run parser with a stricter instruction).

### Councils with 0 patterns after classifier (column mismatch)
- **Detection**: `node scripts/validate_dept_mappings.js` after classifier completes.
- **Action per council**:
  1. Read the dept column name from the actual CSV header (`head -1 {first_file}`).
  2. Patch the manifest entry's `schema.dept_col` in-place OR override via a
     one-off classifier invocation.
  3. Re-run classifier for that council only.

## Preprocessors needed (one-off, per council)

### Westmorland and Furness Council
- **Issue**: 52 CSVs kept after filter, but they're 4 parallel datasets from a
  super-council formed April 2023 via LG reorg:
  - Trade Suppliers (WMF) × 12 — mainline spend-over-£500
  - Private Homes (WMF) × 12 — individual care placements
  - Support Related Payments × 12 — individual payments
  - SLDC Payments × 12 — legacy South Lakeland subset (Aug 2023 onwards)
  - Eden DC × 3 + Barrow × 5 — pre-merger legacy (Apr-Jul 2023)
- **Fix**: Write `scripts/preprocess_wmf.js` (same pattern as `preprocess_wyca.js`):
  parse each stream with its own schema, emit a unified CSV at
  `spend/westmorland_and_furness_council/wmf_fy2324_unified.csv`, point the
  build config at that single file.

## Coverage gaps (likely unfixable in this iteration)

### Peterborough City Council
- **Issue**: Filter archived all 20 downloaded files — every file was
  April 2019 through December 2020.
- **Cause**: Scraper pulled from Peterborough's landing page which
  still lists historical 2019-2020 files prominently; FY 23/24 files
  either don't exist upstream or live at a URL the scraper didn't
  discover.
- **Next step**: Manual browser check of
  https://www.peterborough.gov.uk/council/council-and-democracy/performance-information/council-spending
  (or similar) to confirm whether FY 23/24 is published at all. If not,
  Peterborough goes on the "no transparency" list alongside Birmingham.

### St Helens Metropolitan Borough Council
- **Issue**: 0 kept + 13 archived + 7 unknown in filter. The 7 unknown
  are probably FY 23/24 files with unusual filenames. Inspect:
  `ls data/uk/local_authorities/spend/st_helens_metropolitan_borough_council/`
- **Fix**: If the 7 are actually FY 23/24 with a novel date format,
  extend `filter_fy2324_files.js` `extractYearMonth` to handle it.
  Otherwise, accept as unclassifiable.

### Walsall Metropolitan Borough Council
- 0 kept / 2 archived / 0 unknown — both files were pre-FY. Same as Peterborough:
  no FY 23/24 available. Manual check needed.

### North Somerset Council
- 0 kept / 1 archived / 4 unknown. Inspect the 4 unknown files.

## Downloader follow-ups

### Councils skipped with `no_urls` (52 total in first dry-run)
- These have a base_url in the manifest but no explicit download_urls.
  The scraper retrieved URLs for 59 of them; some remained empty
  because the landing page requires JS/Cloudflare (already tagged
  `needs_playwright: true` or `blocker_severity: red`).
- **Fix**: run a second scraper pass after any site changes, or
  escalate individual councils to Playwright-based fetchers (same
  pattern used for Hampshire/Surrey earlier).

### Knowsley Metropolitan Borough Council
- Downloader got 403 on 10 pre-FY historical files — expected and harmless.
  The 12 FY 23/24 files downloaded cleanly. No action needed.

## Post-rebuild anomalies (session 2026-04-15 pass 2)

### West + North Northamptonshire — column drift mid-year, not in lookup
- Manifest column: `Expense Area (CCC & NCC only)` (valid per generator,
  per Apr 2023 sample file). But Jan/Feb/Mar 2024 files (and possibly all
  N Northants files) use a DIFFERENT column name — no match → no valid
  rows → `processCouncilWithMapping` returns null → entry missing from
  lookup.
- Fix: inspect actual headers in `wnorthants_2024_01.csv` and
  `nnorthants_*.csv`, extract the real column name, and add either:
  (a) an alt-column fallback in build_council_spend_lookup.js, or
  (b) a per-file pre-flattener that renames columns to a canonical form.
  Easier option (b).

### Thurrock Council — £2526M (10x inflated)
- MHCLG Thurrock is ~£250-300M; lookup shows £2526M.
- Root cause likely: the manifest's amount column captured a running
  total or gross-with-VAT field that sums across transactions. Inspect
  the CSV and find the correct "Net Amount" column; update manifest
  schema; re-run classifier + generator + build for Thurrock only.

### Reading Borough Council — £65M (low)
- Reading MHCLG ~£480M; lookup shows £65M = 14% coverage.
- Either the amount column is the WRONG field (a category-specific
  subset) or many rows are being skipped. Inspect a sample row; check
  amount distribution in the raw CSV.

### Derby City Council — excluded from auto_configs
- Classifier produced 31 patterns for Derby, but the generator skipped
  it with `no_schema` because one of the required fields (supplier_col
  or amount_col) was null in the manifest.
- Fix: open manifest entry for Derby, inspect what's null; probably
  need to re-parse the Derby discovery report with a more specific
  prompt, or manually fill the missing fields.

### Hammersmith & Fulham Q4 skipped — schema drift
- The rebuild processed Q1+Q2 cleanly (273.8M total) but Q4 Jan-Mar 2024
  failed with `"Cost Center/Capital Project Description" column not found`.
- Likely Q4 uses British "Cost Centre" (with 'e') vs "Cost Center" in
  earlier quarters. Inspect `q4_jan_mar_2024.csv` header and either
  extend the config with an alt column name OR normalise the column
  at load time (both Center/Centre, both Capital/Captial typos, etc).
- Expected uplift when fixed: ~£120M + = full H&F 3-quarter coverage
  of ~£393M (vs current £273M = 70% of potential).

## Wrong-dataset downloads (8 councils) — re-scrape / re-download needed

These councils have CSV files on disk but their headers don't match the
discovery-report schema. Root cause: the `scrape_manifest_urls.js` pass
picked up the WRONG dataset from the landing page (e.g. a contracts
register, a purchase-card file, a tenders list) instead of the
spend-over-£500 file. The FY filter then classified these files as
valid (because the dates in filenames match 2023/24) but the column
resolver now correctly flags them as unresolved.

For each, manually identify the correct FY 23/24 supplier-spend URL and
re-download. Then re-run the classifier via
`node scripts/batch_classify_manifest.js` (the new mapping will be picked
up because `mapping_exists` check still skips existing files).

| Council | Current (wrong) headers | Needed |
|---|---|---|
| Wigan MBC | `Beneficiary, Date, Merchant Category, Amount (Net of VAT)` | Full supplier-spend with dept column (look for `Service Area` or `Expense Area`) |
| Sefton MBC | empty header / BOM issue | Re-inspect. Likely a broken download or BOM at start of file |
| Salford City | `Directorate Name, Process Used, Purchasing Body, Contract Reference...` | This is a CONTRACTS REGISTER, not a spend file. Salford spend-over-£500 lives at a different URL |
| Trafford MBC | `UID, Council, Contract Status, Name, Classification, Route to Market...` | Same as Salford — contracts register. The zip we extracted from `supplier-spend-archive.zip` has the right schema; the issue is the SECOND batch download also grabbed a wrong file under the same slug |
| Telford & Wrekin | `Internal Reference, Statement Period – End Date, Transaction Date, Transaction Type, Billing Amount, Supplier` | Purchase card data, not supplier spend. Look for separate `supplier-payments-over-500-*` dataset |
| Royal Borough Windsor & Maidenhead | `Transaction Date, Cost Centre, Cost Centre (T), Merchant Name, Gross Amount, Account, Account (T), MCC` | Same — purchase card data. Need the supplier spend file (MCC column is a purchase card marker) |
| Blackpool Council | `Body Name, Supplier Code, Supplier Name, Transaction Ref/No, Their Ref, Date Paid, Gross Value (Detail), VAT Amount` | No dept column at all. Blackpool likely publishes by-supplier summary, not by-department. May need FOI for dept-level breakdown, or accept parent-level metadata only (DHSC pattern) |

Trafford specifically: the first batch successfully used the
`supplier-spend-archive.zip` extraction and had 12 FY 23/24 files
with the right schema. The second batch's contracts register files
overwrote or sit alongside. Audit the directory and preserve only
the zip-extracted spend files.

## ⚠ PRIORITY FIX — "Over-matched" false positives in lookup-exclusion

**This is the first post-completion task to address after the batch rebuild.**

The `normaliseCouncilName` function in `download_from_manifest.js`,
`batch_classify_manifest.js`, and `generate_build_configs_from_manifest.js`
uses bidirectional substring matching. Lookup currently contains only
**10 councils** from the discovery pool (Birmingham, Gloucestershire, Kent
Police, Leeds, Liverpool, Manchester, Nottingham, Sheffield, York, Greater
Manchester Police) — but the batch classifier reported **45 skipped as
`in_lookup`**. The gap of ~35 is almost certainly false-positive
over-matching.

### Known false-positive pairs

- **Hampshire County Council** (in lookup) vs **Hampshire & Isle of Wight PCC** (NOT in lookup)
- **West Yorkshire Combined Authority** (to be added by the current
  rebuild) vs **West Yorkshire Mayor/Police & Crime Commissioner** (NOT in lookup)
- **Greater Manchester Combined Authority** vs **Greater Manchester Police** (the
  latter IS in the lookup via wave 1 MHCLG injection — this one is
  actually correct to skip, but verify)
- **Surrey County Council** (wave 1) vs any Surrey-adjacent PCC
- **Lancashire County Council** (wave 1) vs **Lancashire PCC**

### Detection

After the classifier completes, run `validate_dept_mappings.js`. The
false-positive councils will NOT appear in healthy/empty/suspicious —
they're simply absent from the output because the classifier never
ran on them. Cross-reference the manifest against the validate output
to find the gap:
```
node -e "const m=require('./data/uk/local_authorities/spend/council_discovery_manifest.json');
const fs=require('fs');
const mappings=new Set(fs.readdirSync('data/uk/local_authorities/spend')
  .filter(f=>f.endsWith('_dept_mapping.json'))
  .map(f=>f.replace('_dept_mapping.json','')));
for(const e of m){
  if(!e.name||e.tier==='devolved'||e.blocker_severity==='red')continue;
  const slug=e.name.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
  if(!mappings.has(slug))console.log(slug,'— no mapping');
}"
```
That gives the list of councils that should have been classified but weren't.

### Fix

Tighten `normaliseCouncilName` with these rules:
1. If one side contains `police|pcc|crime.commissioner|constable` and
   the other does NOT, do not substring match. PCCs are separate
   entities from their namesake counties.
2. If one side contains `combined authority|mayor` and the other does
   NOT, do not substring match. Combined Authorities are separate
   entities from any council with an overlapping name token.
3. Require the normalized match to be at least 6 characters long
   (avoid "kent" matching everything with "kent" in the name).

After the fix, re-run `batch_classify_manifest.js` — it will pick up
whatever's missing (idempotent via `mapping_exists` check) and add
the missing councils to the pipeline.

### Estimated recovery

Of the 35 suspected false positives, probably 10-15 have files
downloaded and a valid schema. Those are recoverable by re-running
the classifier after the name matcher fix. The rest are probably
legitimately skipped (councils where the wave-1 match is correct)
or blocked on other preconditions.

---

_Not urgent. Address after the main batch ships and the tree is stable._
