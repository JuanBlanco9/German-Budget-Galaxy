# Budget Galaxy — UK Tax Data Sources

_Generated: 2026-04-18_

This file documents every source used for the UK taxpayer calculator
(`frontend/tax/uk_calc.js`) and the UK revenue trees
(`data/uk/fiscal/uk_revenue_YYYY_YYYY.json`).

The goal is the same audit trail as the council-spend side: an independent
auditor should be able to verify that every figure here came from an
authentic HMRC or gov.uk publication and has not been modified since we
captured it.

## Three-layer audit trail (same as council-spend side)

**Layer 1 — Live landing pages** on gov.uk. Each section below includes a
"Live source" URL. These URLs may change slightly over time as gov.uk
reorganises publications.

**Layer 2 — Direct file URLs** where applicable. These hit the raw ODS/CSV
assets served by `assets.publishing.service.gov.uk` — they move when a new
version is published.

**Layer 3 — Raw files committed to git with SHA256 hashes** at the paths
listed below. To verify a file is byte-identical to what we captured,
compute its SHA256 and compare against the hash in the table.

## How to verify in 60 seconds

```bash
git clone https://github.com/JuanBlanco9/Budget-Galaxy.git
cd Budget-Galaxy
sha256sum data/uk/fiscal/hmrc_ns_table.ods
# → ac2d7cdbb92e49b8fa0c9c1bf4beaa9f2428c7b62a2a1cc6ada801cd9e9d86fb
```

If the hash matches the table below, the file is identical to what we
downloaded from HMRC on the date shown.

---

## HMRC tax receipts (annual, 2005-06 → 2024-25)

**Publisher**: HM Revenue & Customs (HMRC)
**Dataset**: HMRC tax receipts and National Insurance contributions for the UK — annual bulletin
**Coverage**: Every UK fiscal year from 2005-06 to 2024-25 (20 years)
**Unit**: GBP million
**Live source**: https://www.gov.uk/government/statistics/hmrc-tax-and-nics-receipts-for-the-uk
**Annual bulletin page**: https://www.gov.uk/government/statistics/hmrc-tax-and-nics-receipts-for-the-uk/hmrc-tax-receipts-and-national-insurance-contributions-for-the-uk-new-annual-bulletin
**Publication date** (this capture): 2026-03-20 (per gov.uk "Last updated" metadata)
**Downloaded**: 2026-04-18

### Raw file

| Path | SHA256 (first 16) | Bytes |
| ---- | ----------------- | ----- |
| `data/uk/fiscal/hmrc_ns_table.ods` | `ac2d7cdbb92e49b8` | 67,210 |

### Derived JSON trees (one per fiscal year)

| Path | SHA256 (first 16) | Notes |
| ---- | ----------------- | ----- |
| `data/uk/fiscal/uk_revenue_2024_2025.json` | `f2ada4959c05bb58` | Total £858,648m |
| `data/uk/fiscal/uk_revenue_2023_2024.json` | `cb3afcc555570a1f` | Total £828,584m |
| `data/uk/fiscal/uk_revenue_<each year>.json` | — | 18 more files, 2005-06 through 2022-23 |

Regeneration is deterministic:

```bash
python scripts/build_uk_revenue_trees.py
```

The script parses the `Receipts_Annually` sheet of `hmrc_ns_table.ods`
into a structured tree with five top-level categories:

1. **Taxes on income & earnings** (Income Tax, NIC, CGT, Apprenticeship Levy)
2. **Business & corporate taxes** (Corporation Tax, Bank Levy, EPL, etc.)
3. **Consumption & indirect taxes** (VAT, Fuel Duty, Alcohol, Tobacco, IPT, APD, etc.)
4. **Capital & wealth taxes** (IHT, SDLT, SDRT, ATED)
5. **Customs & other** (Customs Duties, Penalties)

Category totals and the grand total reconcile with HMRC's reported
`Total HMRC Receipts` to within £10m / year (rounding; see
`reconciliation_note` inside each JSON).

### Known caveats

- `Bank payroll tax` and `Misc` appear as `[X]` for most years. These are
  treated as 0 in the category roll-up but accounted for in the "difference
  vs reported total" check.
- The `Offshore (included within Corporation Tax)` column is an informational
  child node whose value is **already included** in the parent Corporation
  Tax figure — it is flagged with `note: 'Included in parent — not additive'`
  in the JSON and excluded from the Business category sum.
- The HMRC table consolidates Scottish Income Tax with rUK — there is no
  jurisdictional split in the revenue data. The split only matters on the
  calculator side (where Scottish residents use different bands).

---

## Income Tax and NI bands

**Publisher**: HMRC / HMT / Scottish Government
**Dataset**: Hardcoded from annual HMRC "Rates and thresholds for employers"
and the Scottish Government "Scottish Income Tax rates and bands" pages.
**Coverage**: Fiscal years 2017-18 through 2024-25.

**Live sources**:
- https://www.gov.uk/income-tax-rates (current rates)
- https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past (historical rates)
- https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2024-to-2025 (and analogous pages for prior years)
- https://www.gov.scot/publications/scottish-income-tax/ (Scottish bands)

### File

| Path | SHA256 (first 16) |
| ---- | ----------------- |
| `data/uk/fiscal/uk_tax_bands.json` | `98d1ecbd8ea9e29e` |

### Known caveats (documented inline in the JSON `note` fields)

- **2022-23 NIC rates**: the Health & Social Care Levy raised Class 1
  employee NIC to 13.25% from April 2022, then reverted to 12% from 6 Nov
  2022. The JSON records 13.25% (dominant 7-month period). For the
  full-year-averaged figure, blend by months.
- **2023-24 NIC rates**: Class 1 employee was 12% Apr-Dec 2023, then cut to
  10% from 6 Jan 2024. The JSON records 10% (the year-end rate, which matches
  HMRC's own published end-of-year tables).
- **2024-25 NIC rates**: Main rate cut from 10% to 8% at the start of the
  fiscal year; this is the full-year rate.
- **Additional Rate threshold**: cut from £150,000 to £125,140 from 6 April
  2023 (Autumn Statement 2022). Reflected in 2023-24 onward.
- **Scottish income tax bands**: updated annually in the Scottish Budget
  (late autumn / early winter each year). The Advanced 45% band was
  introduced in 2024-25.

---

## Tax calculator tests

16 reference values verified against HMRC arithmetic and cross-checked
against widely-used public calculators (`listentotaxman.com`,
`income-tax.co.uk`). Run with:

```bash
node frontend/tax/uk_calc.test.js
```

Values tested cover: £0, £12,570 (PA threshold), £20k, £35k, £50,270 (UEL
exactly), £75k, £100k (PA taper edge), £125,140 (PA fully lost), £150k
(additional rate), plus Scotland £35k and £60k (crosses the Higher 42%
band), plus two historical spot-checks (£30k in 2019-20 and £50k in
2017-18), plus three PA-taper edge cases.

---

## Upcoming sources (not yet captured — planned next)

These will be added to this manifest as each dataset lands:

1. **Council Tax band values per council per year**
   - MHCLG "Council tax levels set by local authorities in England"
   - Live: https://www.gov.uk/government/statistics/council-tax-levels-set-by-local-authorities-in-england-2024-to-2025
   - Target file: `data/uk/fiscal/uk_council_tax_bands_YYYY.csv`

2. **ONS household consumption by income decile** (for VAT estimate)
   - ONS "Effects of taxes and benefits on household income"
   - Target file: `data/uk/fiscal/ons_decile_consumption.csv`

3. **OBR Public Sector Net Borrowing**
   - OBR Economic and Fiscal Outlook CSV
   - Target file: `data/uk/fiscal/obr_psnb.csv`

Each will be added here with SHA256 and a regeneration command.

---

## If a hash does not match

Follow the same protocol as the council-spend manifest
(`data/uk/SOURCES.md`): open an issue on the Budget Galaxy repository with
the path, your computed SHA256, our published SHA256, and where you obtained
the file. A mismatch is not automatically a tampering incident — usually it
means HMRC published a new version and this manifest needs regeneration.
