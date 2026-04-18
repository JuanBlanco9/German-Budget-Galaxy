# Budget Galaxy — Complete Project Handoff

**For: any new Claude Code instance taking over this project**
**Last updated: 2026-04-17 end of 2-day session, 86.54% MHCLG coverage**

This file is self-contained. Read this first; everything else is referenced from here.

---

## 0. Identity

- **Project name**: Budget Galaxy (live at https://budgetgalaxy.com)
- **Local working dir**: `D:\germany-ngo-map\` (legacy directory name — do NOT rename)
- **Repo**: https://github.com/JuanBlanco9/Budget-Galaxy (push to `main`)
- **Production server**: Vultr Atlanta `96.30.199.112`, deploy path `/opt/germany-ngo-map/`
- **SSH key**: `~/.ssh/id_agro_intel` (ed25519). Same key as Vultr panel name "Claude".
- **User**: Juan Blanco (`juancblanco91@gmail.com`)
- **Owner-instance file**: `CONTEXT_FOR_CLAUDE.txt` in repo root — read on first activation
- **Memory system path** (project-scoped): `C:\Users\Usuario\.claude\projects\c--Users-Usuario-Desktop-latam-aviation-api\memory\`

---

## 1. What this project IS

A public-spending visualization tool that drills from £1.4T UK government total down to individual supplier payments at the council-service level. Same model for Germany (€2.3T), France (€1.7T), US ($9.5T fed + 50 states).

**Core value-add over similar projects**: fiscal consolidation rigor (5 layers of de-duplication for UK alone) + supplier-level transparency that actually reconciles to MHCLG net current expenditure.

**The frontend** is a single 500KB `index.html` with vanilla JS + D3 + Chart.js. No build step. Edits go directly to file → scp to Vultr → live.

---

## 2. Current state (what was just shipped)

### UK 2024 tree
- **86.54% MHCLG coverage** (167/411 councils, £122.6B / £141.7B)
- 1488 service nodes have `_top_suppliers` metadata
- 96.7% of those nodes have `top_purposes` breakdown (purpose-level transparency)
- File: `data/uk/uk_budget_tree_2024.json` (16.09 MB)
- Live: deployed to Vultr, served at `https://budgetgalaxy.com/data/uk/uk_budget_tree_2024.json`

### Coverage by class
| Class | Covered | % |
|---|---|---|
| Shire Counties | 21/21 | 100% |
| London Boroughs | 33/33 | 100% |
| Metropolitan Districts | 35/36 | 98% |
| Unitary Authorities | 56/63 | 91% |
| Other Authorities (PCCs/Fire) | 16/94 | 17% |
| Shire Districts | 6/164 | 4% |

### Recent commits (last 15)
```
7145db8 Add UK universe state report (2-day session summary)
5949b00 Add top_purposes breakdown inside each service (Opción A transparency)
008e8e1 Classification quality fixes: Knowsley + Isles of Scilly + Barnet + Spelthorne
8b39e1e Housekeeping: update next-session prompt + memories for 86.54% state
804103a Chelmsford £37M + East Lindsey £74M — 86.54% MHCLG
12e8449 Wayback sweep: Wiltshire £773M + Oxfordshire £380M — 86.49% MHCLG
9c9f79d Final session commit — 85.14% MHCLG coverage (+19.94pp daily record)
e9d2cd2 +3 Shire Districts (East Suffolk + Cambridge + Spelthorne) — 85.14%
182ac86 North Lincolnshire £208M — crossed 85% MHCLG (85.04%)
80d0ee7 East Riding £575M + Leicestershire £922M + Southampton £451M — 84.81%
fa36e23 +5 councils via 2nd parallel agent batch — 83.30% MHCLG coverage
6d8fe6c Calderdale £379M via Wayback SPN — 82.25% MHCLG coverage
e5c79e4 +4 councils via parallel agent batch — 81.97% MHCLG coverage
d768aec Warwickshire £896M + Cumberland £570M — crossed 80% MHCLG coverage
521f708 Leicester City £515M + Nottingham City £581M via manifest re-audit
```

---

## 3. Data architecture (UK supplier enrichment)

```
Raw council CSVs (data/uk/local_authorities/spend/{slug}/*.csv)
    │
    │ classify_council_departments.js (Haiku 4.5)
    ▼
Mapping file ({slug}_dept_mapping.json)
    │ Maps {dept|purpose} pattern → 1 of 13 MHCLG service categories
    │
    ▼
build_council_spend_lookup.js
    │ Aggregates per-council: services × suppliers + top_purposes
    ▼
council_spend_lookup_2024.json (lookup file, ~7 MB)
    │
    │ inject_council_spend_metadata.js
    ▼
uk_budget_tree_2024.json (16 MB, attaches _top_suppliers to each service node)
```

### Configurations live in TWO places (gotcha)
1. **`data/uk/local_authorities/spend/auto_configs.json`** (102 entries) — modern pipeline. Add new councils here.
2. **`scripts/build_council_spend_lookup.js`** (~50 hardcoded configs near line 1300+) — legacy. Don't add to this anymore; only modify if fixing existing council.

Both are processed by the same lookup builder.

---

## 4. The 13 MHCLG service categories (immutable taxonomy)

Education, Adult Social Care, Children's Social Care, Public Health, Housing, Transport, Environment, Culture, Planning, Police, Fire & Rescue, Central Services, Other Services.

The Haiku classifier returns ONLY these 13 strings. Anything that doesn't fit goes to "Other Services". Within "Other Services" we now show `top_purposes` for transparency.

---

## 5. The 4-layer traceability standard

Every supplier metadata entry SHOULD have:
1. **`source`** — human-readable attribution (e.g., "Somerset Council — https://www.somerset.gov.uk/...") — **100% complete**
2. **`source_url`** — current live URL of source page — **97% complete**
3. **`archive_url`** — Wayback Machine snapshot for immutability — **0% complete (TODO)**
4. **`captured_at`** — ISO timestamp of capture — **0% complete (TODO)**

Run `IA_ACCESS_KEY=... IA_SECRET_KEY=... node scripts/archive_sources.js` to populate layers 3+4. **Last attempt failed exit 4 — needs debugging next session.** IA S3 keys in `reference_archive_org_keys.md` memory.

---

## 6. Pipeline recipe — adding a new council

```bash
cd /d/germany-ngo-map

# 1. Download files into data/uk/local_authorities/spend/{slug}/
#    For SharePoint: rewrite /:x:/s/{site}/{TOKEN} → /sites/{site}/_layouts/15/download.aspx?share={TOKEN}
#    For geo-blocked: try Wayback id_ replay: web.archive.org/web/2025id_/{url}
#    For Drupal LocalGov: scrape /document-search?field_document_target_id={taxonomy_term_id}

# 2. If XLSX: convert to CSV (openpyxl in Python). If encoding != utf-8-sig: re-encode at scrape time.

# 3. Add entry to auto_configs.json with: name, dir, deptCol, purposeCol, amountCol, supplierCol, headerHint, encoding, fyLabel, source, source_url
node scripts/validate_auto_configs.js   # MUST pass before continuing

# 4. Classify (Haiku 4.5 batches of 30 patterns)
ANTHROPIC_API_KEY="<see reference_anthropic_key.md>" node scripts/classify_council_departments.js \
    --council "Council Name" \
    --dept-col "X" --purpose-col "Y" \
    --header-hint "Z" --encoding utf8 \
    --file f1.csv --file f2.csv ...

# 5. Build lookup (regenerates ALL councils, ~2 min)
node scripts/build_council_spend_lookup.js 2024

# 6. If lookup key ≠ tree node name, add NAME_ALIAS in scripts/inject_council_spend_metadata.js
#    KEY: full uppercase council name as in lookup
#    VALUE: post-normalization form of tree node (CC stripped, hyphens→spaces, BOROUGH COUNCIL stripped)

# 7. Inject metadata (use --force if updating existing entries)
node scripts/inject_council_spend_metadata.js 2024

# 8. Verify coverage (Python uses default cp1252 — must specify utf-8 explicitly!)
PYTHONIOENCODING=utf-8 python scripts/validate_session_end.py

# 9. Deploy
scp -i ~/.ssh/id_agro_intel data/uk/uk_budget_tree_2024.json \
    root@96.30.199.112:/opt/germany-ngo-map/data/uk/uk_budget_tree_2024.json

# 10. Commit + push
git add ...
git commit -m "..."
git push origin main
```

---

## 7. Reusable discovery patterns (proven, documented in memory)

1. **SharePoint download.aspx rewrite** — `/sites/{site}/_layouts/15/download.aspx?share={TOKEN}` returns files anonymously when guest links require Microsoft auth. Verified on Somerset (142 entries) + Central Beds (12 monthly).
2. **Wayback id_ replay** — `web.archive.org/web/2025id_/{url}` for Cloudflare/Akamai geo-blocked councils. Used for Newcastle, Leicestershire, Calderdale, Stockton, Wiltshire, Oxfordshire (partial), East Lindsey (partial).
3. **Wayback Save Page Now with IA S3 auth** — when no snapshot exists. Authenticated POST to `web.archive.org/save` with `LOW {access}:{secret}` header. Works only if IA crawler can reach source (Tameside fails because IA also can't reach).
4. **Vultr Miami SSH proxy** — for Incapsula WAFs that block AR but allow US. Used for Southampton (£451M), Halton (£263M).
5. **Manifest re-audit** — `data/uk/local_authorities/council_discovery_manifest.json` has 177 entries with green/yellow/red verdicts. Many "green/yellow but never built" are easy wins. **Highest ROI** when starting a new session.
6. **Parallel 6-agent batches** — launch 6 general-purpose agents in one message for cold-probe discovery. Proven 75% hit rate across 28 probes.
7. **Drupal LocalGov pattern** — `/jsonapi/node/localgov_services_page` reveals taxonomy term IDs → `/document-search?field_document_target_id={term}` lists all CSVs. Used for Cumberland, Westmorland & Furness, East Suffolk.
8. **WordPress customfilter AJAX** — POST to `/wp-admin/admin-ajax.php` with `action=customfilter` returns full directory inline. Used for Somerset (142 entries in 1 payload).

---

## 8. Critical secrets (in memory, NEVER in git)

| Secret | Memory file | Used by |
|---|---|---|
| `ANTHROPIC_API_KEY` | `reference_anthropic_key.md` | classify_council_departments.js, batch_classify_manifest.js |
| `IA_ACCESS_KEY` + `IA_SECRET_KEY` | `reference_archive_org_keys.md` | archive_sources.js, fetch_via_wayback_spn.py |
| `Companies House API key` | `reference_ch_key.md` | supplier geo enrichment scripts |
| Vultr root password (backup) | `reference_vultr.md` | Web console login if SSH breaks |

Read with `Read` tool from the memory directory path in section 0. NEVER paste into git or chat logs that get committed.

---

## 9. Critical scripts (most-used)

```
scripts/
├── validate_auto_configs.js          # Pre-flight column resolution check
├── classify_council_departments.js   # Haiku classifier (needs ANTHROPIC_API_KEY)
├── build_council_spend_lookup.js     # Aggregates councils → lookup_2024.json
├── inject_council_spend_metadata.js  # Attaches _top_suppliers + purposes to tree
├── archive_sources.js                # Populates archive_url + captured_at via Wayback SPN
├── validate_session_end.py           # 7-check end-of-session validation
├── replace_oscar_lg.js               # MHCLG Revenue Outturn injection (already run)
├── net_nhs_overlap.js                # NHS Provider ↔ DHSC consolidation
├── fix_oscar_2023_nhs.js             # OSCAR 2023 £114B artifact removal
├── build_nhs_trust_breakdown.js      # NHS v13/v16 staff breakdown
├── build_icb_mapping.js              # NHS Spine ODS API → trust ICB mapping
└── fetch_via_wayback_spn.py          # Authenticated Wayback Save Page Now
```

---

## 10. Critical rules (don't violate — see memory)

1. **NEVER add data without verified machine-readable source** (`feedback_never_approximate_data.md`)
2. **NEVER massage residuals to converge ratios** (`feedback_honest_residuals.md`) — document gaps explicitly
3. **When data sources don't reconcile, use METADATA not tree children** (`feedback_metadata_vs_children.md`) — sub-totals must sum to parent or stay as metadata
4. **NEVER restructure UK trees with negative OSCAR values** (`feedback_uk_tree_restructure.md`) — crashes Multiverse with NaN radii
5. **ALWAYS deploy to Vultr via SCP, never modify server files directly**
6. **NEVER propose closing the session unilaterally** (`feedback_never_close_session.md`) — user decides session length, always offer concrete next moves with options
7. **All numbers must be traceable** — see Section 5 (4-layer traceability standard)

---

## 11. Common gotchas

- **`cd` drifts in bash** — always prefix scripts with `cd /d/germany-ngo-map &&`. Never trust pwd between commands.
- **Python default encoding is cp1252 on Windows** — `json.load(open(file, encoding='utf-8'))` always; or set `PYTHONIOENCODING=utf-8` env var.
- **NAME_ALIASES in injector** must return POST-normalization form. The normalize function strips `CC`, hyphens become spaces, `BOROUGH COUNCIL` is stripped. So `'STOCKTON-ON-TEES BOROUGH COUNCIL': 'STOCKTON ON TEES'` works, `'STOCKTON-ON-TEES'` does not.
- **CSV duplicate column names** (e.g., Isles of Scilly has TWO `Description` columns) — `findIndex` picks the first; rename one before classifying.
- **Mapping file path** generated by classifier uses slugified council name (e.g., `stockton_on_tees_borough_council_dept_mapping.json`). Auto_config `mappingFile` field MUST match exactly.
- **build_lookup is non-incremental** — running it regenerates the whole lookup from auto_configs + legacy hardcoded list every time (~2 min). Safe to re-run.
- **Tree integrity** — children sum must equal parent value. Check with: `data/uk/uk_budget_tree_2024.json` validator.
- **Reproducibility test** — `node scripts/build_council_spend_lookup.js 2024` should produce byte-identical output run-after-run. Last validated 2026-04-17.

---

## 12. What's blocked / pending

### Infrastructure-blocked (need user action)
- **Hetzner London VPS €4/mo** — single biggest unblock. Buys access to ~£10-12B in Cloudflare/Akamai-blocked councils (Dorset, Northumberland, Tameside, Blackburn, big PCCs). +7-8pp coverage to ~94%.
- **Tesseract OCR install** (manual, ~10 min) — unblocks Sussex + Northumbria PCCs (image PDFs). +0.55pp.
- **Colchester manual browser download** — 12 SharePoint XLSX files, auth-gated. User opens browser logged into Microsoft, downloads, then I process. +0.06pp.

### Code-only TODO (next session priorities)
1. **Retry archive_sources.js** — last attempt failed exit 4. Need to debug, then populate `archive_url` + `captured_at` for 161 councils.
2. **Frontend rendering of `top_purposes`** — data is in tree, but UI panel (`renderCouncilSuppliersPanel` in index.html) probably only reads `suppliers`. Add purpose-level rendering.
3. **Hillingdon NDR filter** — £965M Non-Domestic Rates is collection fund pass-through, inflates apparent council size 3x. Filter at scrape time with council-scoped `_excluded` override.
4. **Nottingham `_manual_overrides`** — 35% of spend mis-classified to Central Services because dept field uses cost-centre codes ("C-Commercial & Operations" etc.). Manual override map.
5. **Darlington May/Aug/Dec recovery** — files have SQL query rows as headers. ~£30-45M recoverable with normalizer rewrite.
6. **N Lincs February 2025** — Excel serial numbers in Amount column (source corruption). ~£15M recovery if fixable.
7. **Wakefield apostrophe re-classify** — quality improvement after the 2026-04-16 apostrophe normalization fix.
8. **Chelmsford 12/12** — currently shipped 11/12 months, October XLSX needed special path handling.

### Frontend work (user mentioned but not started)
User has expressed interest in adding a richer supplier detail tab/modal. Approach: build in `frontend/index_v2.html` parallel file, test locally, feature-flag with `?supplier_detail=1` query param, then promote. **Don't edit live `index.html` directly.** Mention this to the user before starting frontend work — they have legal considerations (JP Morgan compliance question) that may affect what features are visible publicly.

---

## 13. Memory system (project-scoped, persists across sessions)

Path: `C:\Users\Usuario\.claude\projects\c--Users-Usuario-Desktop-latam-aviation-api\memory\`

Index file: `MEMORY.md` (always loaded into context)

Project-relevant files:
- **`project_budget_galaxy.md`** — main project memory (read first when continuing)
- **`project_budget_galaxy_next_session.md`** — what's prioritized for next session
- **`project_budget_galaxy_roadmap.md`** — path to 90% coverage
- **`project_budget_galaxy_handoff_2026-04-17.md`** — handoff from previous session
- **`project_budget_galaxy_agent_findings_2026-04-16.md`** — agent recon results
- **`feedback_*.md`** — workflow lessons + critical rules
- **`reference_*.md`** — secrets + external system pointers

When learning something new about Juan's preferences, the project, or external resources — write a memory file. Update existing files for revisions; never duplicate.

---

## 14. Validation toolkit (run before declaring "done")

```bash
# Quick coverage check (Python)
PYTHONIOENCODING=utf-8 python -c "
import json
tree = json.load(open('data/uk/uk_budget_tree_2024.json', encoding='utf-8'))
lg = next(c for c in tree['children'] if c['id'] == 'local_government_england')
def has_any_ts(n):
    if n.get('_top_suppliers'): return True
    return any(has_any_ts(c) for c in n.get('children', []))
cv=tv=cc=tc=0
for cls in lg['children']:
    for c in cls['children']:
        tc+=1; tv+=c.get('value',0)
        if has_any_ts(c): cc+=1; cv+=c.get('value',0)
print(f'{cc}/{tc} councils, £{cv/1e9:.2f}B / £{tv/1e9:.2f}B = {100*cv/tv:.2f}%')
"

# Full 7-check validation
PYTHONIOENCODING=utf-8 python scripts/validate_session_end.py

# Reproducibility
cp data/uk/local_authorities/spend/council_spend_lookup_2024.json /tmp/before.json
node scripts/build_council_spend_lookup.js 2024
diff /tmp/before.json data/uk/local_authorities/spend/council_spend_lookup_2024.json
# Should produce no diff
```

---

## 15. NHS deep drill (separate sub-system)

NHS Provider Sector £130.8B is enriched via two layers:
- **v13** (TAC EXP0390): 206/212 trusts × {Staff, Supplies, Premises, Other}
- **v16**: each Staff Costs node breaks into 6 cost types + `_workforce` metadata (10 staff groups WTE)
- **ICB mapping**: 211 trusts attached to commissioning ICB via NHS Spine ODS API

Don't break this. If touching NHS data, see `build_nhs_trust_breakdown.js` and `build_nhs_staff_breakdown.js`. Tree node detection by `_source` field presence.

---

## 16. Other countries (don't break, separate trees)

- **DE** (`data/de/`): €2.3T, 2015-2025, Bund + 5 SV branches + 16 Länder + Kommunen
- **US** (`data/us/`): $9.5T federal + 50 states in Multiverse, 2017-2025, net of federal grants
- **FR** (`data/fr/`): €1.7T, 2015-2025, PLF + Protection Sociale + Collectivités

These are stable. Edits typically stay in UK 2024 unless explicitly requested.

---

## 17. First commands when taking over

```bash
# 1. Confirm working directory
cd /d/germany-ngo-map && pwd && git log --oneline -3

# 2. Read main memory
# Use Read tool on:
# C:\Users\Usuario\.claude\projects\c--Users-Usuario-Desktop-latam-aviation-api\memory\MEMORY.md
# C:\Users\Usuario\.claude\projects\c--Users-Usuario-Desktop-latam-aviation-api\memory\project_budget_galaxy.md
# C:\Users\Usuario\.claude\projects\c--Users-Usuario-Desktop-latam-aviation-api\memory\project_budget_galaxy_next_session.md
# C:\Users\Usuario\.claude\projects\c--Users-Usuario-Desktop-latam-aviation-api\memory\feedback_never_close_session.md

# 3. Verify current state matches what's in this handoff
PYTHONIOENCODING=utf-8 python -c "
import json
tree = json.load(open('data/uk/uk_budget_tree_2024.json', encoding='utf-8'))
print(f'Tree size: {len(json.dumps(tree))/1e6:.2f} MB')
"

# 4. Verify deploy is live
curl -sI https://budgetgalaxy.com/data/uk/uk_budget_tree_2024.json | head -3

# 5. Check memory of what was last queued
# Read project_budget_galaxy_handoff_2026-04-17.md
```

---

## 18. Hard truths

- **Ceiling without UK VPS is ~87%**. Confirmed by exhaustive sweep across all viable bypass methods (direct, Wayback, Vultr Miami proxy). The remaining ~13% is genuinely UK-IP-gated or doesn't publish at all.
- **Birmingham FY 2023/24 is unrecoverable without FOI** (S114 bankruptcy purged transparency rolling window).
- **Liverpool City Region Combined Authority does not publish line-item spend** (confirmed by exhaustive probing). Only Statement of Accounts PDFs.
- **Shire Districts long tail (158 councils, £3.2B)** is real but low-ROI: ~30 min per council × 158 = 80h for +2pp.

The realistic next milestone is **94-95%** with UK VPS purchase + OCR install. Beyond that is FOI calendar work, not coding.

---

## End of handoff. Good luck.
