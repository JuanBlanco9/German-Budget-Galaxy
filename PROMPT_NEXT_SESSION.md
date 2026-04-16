# Budget Galaxy — Next Session Handoff

**Last session**: 2026-04-16, ended at commit `06a7036`
**State**: 110 councils in lookup, 986 service nodes with `_top_suppliers`, **65.2% MHCLG coverage** (£85.8B / £131.6B)
**Tree md5 live on server**: `553bc5d3e30d19d3fdcabccf7023870b`
**Deploy target**: `96.30.199.112:/opt/germany-ngo-map/data/uk/uk_budget_tree_2024.json`

---

## Do THIS session (ordered by ROI)

### Block 1 — Quality fixes (2-3h, no new councils, ~5-8pp service quality)

Three councils landed in the lookup with anomalous service breakdowns. Re-classifying with larger/more representative file samples will redistribute their spend out of "Other Services" into real service categories. Bigger wins than adding new councils at this stage.

1. **Worcestershire CC** — £873.1M tracked, only **2 services**, 46 classifier patterns.
   - Current file used by classifier: first CSV alphabetically = `Over500SpendReportJan2024.csv` (5,092 rows).
   - Problem: Jan 2024 alone doesn't cover all directorate categories the council uses across the year.
   - Fix: re-run `classify_council_departments.js` with ALL 12 monthly CSVs (not just first), producing ~400-600 patterns. Example invocation:
     ```
     export ANTHROPIC_API_KEY=... (see memory/reference_anthropic_key.md)
     rm data/uk/local_authorities/spend/worcestershire_county_council_dept_mapping.json
     node scripts/classify_council_departments.js --council worcestershire_county_council \
       --file data/uk/local_authorities/spend/worcestershire_county_council/*.csv \
       --dept-col "Directorate" --purpose-col "Nominal Description" --sep ","
     ```
   - Then rebuild + inject + deploy + commit.

2. **Cheshire West & Chester** — £430.3M tracked, only **6 services**, 6 classifier patterns.
   - Same issue as Worcestershire but more extreme (6 patterns is suspiciously low for a £430M council).
   - The dept column resolved to `"Organisational Structure Tier 1(T)"` not `"Organisational Structure Tier 1"` — the generator matched `substring`. Worth verifying in the CSV that `Tier 1(T)` isn't a Tier-1-code-as-text that only has 6 distinct values. If that's the column, switch to `Organisational Structure Tier 2` or combine tiers.
   - Files: 4 quarterly CSVs (converted from XLSX).

3. **Bolton MBC** — £16M tracked in lookup vs £613M MHCLG node = massive under-tracking.
   - Earlier fix (commit `7d830a2`) changed encoding utf8→latin1. That was necessary but apparently insufficient — most rows are still being dropped.
   - Next step: inspect one Bolton file manually. Count rows with valid Amount. Check if the file is a payment-card subset vs full supplier register. Likely need a different download source.
   - If the source is wrong (card-only), re-discover via Playwright on the landing page.

### Block 2 — Missing medium councils (3-4h, +4-5 councils × £100-400M each)

Stuck in manifest with resolvable column issues:

4. **Telford & Wrekin** — column `"Service Delivery Area(T)"` unresolved against header `Internal Reference | Statement Period End Date | Transaction Date | Transaction Type | Transaction Billing Amount | Supplier`. The CSVs have a completely different schema than the manifest expected. Agent discovery was wrong — re-inspect one CSV and hand-patch the manifest.

5. **Royal Borough of Windsor & Maidenhead** — column `"Directorate"` unresolved against `Transaction Date | Cost Centre | Cost Centre (T) | Merchant Name | Gross Amount | Account | Account (T) | MCC`. That's a payment-card schema, not supplier spend. Files are wrong — re-discover.

6. **Wokingham** — only 1 file in dir. Either download missing months or accept a single-month partial (bad idea — produces thin data).

7. **Peterborough** — manifest `blocker=yellow`. Inspect why.

8. **Rutland** — only 2 files. Same decision as Wokingham.

### Block 3 — Playwright batch for large red blockers (dedicated session)

These require Playwright persistent profile + Cloudflare bypass (same pattern as Surrey/MPS in commit `874c3f3`):

- **Derbyshire** £1.37B — biggest remaining prize
- **Suffolk** £1.12B
- **Oxfordshire** £960M
- **Wiltshire** £790M — auth-gated landing page, opaque media IDs
- **Dorset** £580M
- **Plymouth** (from Agent 5 suggestions, unverified)
- **Cumberland** (similar structure to Westmorland — likely needs 4-stream preprocessor)

Expected coverage bump: ~+3-5pp MHCLG, but takes a full session because each site has its own anti-bot scheme.

---

## Guardrails for this session

- **Never let lookup count drop below 110.** Before any commit, run:
  ```
  node -e "const l=require('./data/uk/local_authorities/spend/council_spend_lookup_2024.json'); console.log('lookup entries:', Object.keys(l).length);"
  ```
- **Never let MHCLG coverage drop below 65.2%.** Verify after inject with the walker snippet in `memory/project_budget_galaxy_next_session.md`.
- **Don't add new councils before finishing Block 1.** User explicitly flagged that quality fixes beat new councils at this stage.
- **Westmorland stays blocker=red.** 4 legacy councils (Eden + Barrow + South Lakeland + Carlisle) merged April 2023 with incompatible schemas. Only re-enable when the 4-stream preprocessor lands.
- **Bury headers were hand-normalized via sed in last session.** If re-downloading, re-run the normalization or the build breaks. See commit `bef4bf9` for exact sed commands.

---

## Recurring infra issue (ROI for next-next session)

Five councils in the last 2 sessions failed from the **same schema-drift pattern**:
- Bury: 10 months, 5 column-name variants (Dept/Dep/Department/Department of Operations/Dated)
- Reading: 10/13 files latin1, 3 utf-8
- Derby: blank column 8 header only in Apr/May
- H&F Q4: "Service Area" → "Cost Center" mid-year
- Westmorland: 4 legacy councils, 4 schemas in one dir

**Root cause**: generator and classifier assume the first CSV in the dir represents the schema. When files drift, build silently produces wrong totals or "no valid rows".

**Fix**: mid-pipeline schema-validator that reads each file's header and compares against the manifest. Highest-ROI infra investment. Saved in `memory/feedback_budget_galaxy_schema_drift.md`.

---

## Reference (do not repeat discovery)

- **API key**: `memory/reference_anthropic_key.md` (Haiku classifier)
- **SSH**: `~/.ssh/id_agro_intel`, server `96.30.199.112`
- **Companies House key**: `memory/reference_ch_key.md` (supplier geo enrichment)
- **Archive.org keys**: `memory/reference_archive_org_keys.md` (audit trail)
- **Last 3 commits**: `06a7036` `bef4bf9` `1e9c7eb`

## Deploy procedure (short form)

```
scp -i ~/.ssh/id_agro_intel data/uk/uk_budget_tree_2024.json \
  root@96.30.199.112:/opt/germany-ngo-map/data/uk/
md5sum data/uk/uk_budget_tree_2024.json
ssh -i ~/.ssh/id_agro_intel root@96.30.199.112 "md5sum /opt/germany-ngo-map/data/uk/uk_budget_tree_2024.json"
# both md5s must match — then verify on budgetgalaxy.com
```

Full deploy procedure including API restart in `HANDOFF_CLAUDE_OPUS.txt` section 8.
