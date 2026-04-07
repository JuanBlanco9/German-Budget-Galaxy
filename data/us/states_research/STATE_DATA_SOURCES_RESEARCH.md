# US State-Level Government Spending Data - Research Results
## Budget Galaxy Project - April 2026

---

## WINNER: US Census Bureau - Annual Survey of State & Local Government Finances

### Source 1A: Census Summary Tables (BEST OPTION - ALREADY DOWNLOADED)

**What it is:** The canonical, official source for state-level government spending with functional breakdown for all 50 states + DC.

**Data format:** Excel (.xlsx), one file per year
- **2017-2022:** Single file per year (`YYslsstab1.xlsx`), all 50 states + DC + US Total in one sheet
- **2012-2016:** Split into two files per year (`YYslsstab1a.xlsx` = US through Mississippi, `YYslsstab1b.xlsx` = Missouri through Wyoming)
- **1992-2011:** Available in same directory structure but not yet downloaded

**Download URLs:**
- 2017-2022 (single file): `https://www2.census.gov/programs-surveys/gov-finances/tables/{YEAR}/{YY}slsstab1.xlsx`
- 2012-2016 (split files): `https://www2.census.gov/programs-surveys/gov-finances/tables/{YEAR}/summary-tables/{YY}slsstab1a.xlsx` and `{YY}slsstab1b.xlsx`
- Directory index: https://www2.census.gov/programs-surveys/gov-finances/tables/

**Years available:** 1992-2022 (summary tables). 2023 Individual Unit Files exist but summary table not yet published.

**States covered:** All 50 states + District of Columbia + US Total

**Data structure per state:**
- 2017-2022: 5 columns per state (S&L total amount, S&L CV, State-only amount, Local-only amount, Local CV)
- 2012 (Census year): 3 columns per state (S&L total, State-only, Local-only) - no CV needed
- 2013-2016: 5 columns per state (same as 2017+)

**Values:** Dollar amounts in THOUSANDS (multiply by 1000 for actual USD)

**Functional categories available (expenditure side):**
1. **Education** (total)
   - Higher education
   - Elementary & secondary education
   - Other education
2. **Libraries**
3. **Public welfare** (includes Medicaid)
4. **Hospitals**
5. **Health**
6. **Employment security administration**
7. **Veterans' services**
8. **Highways**
   - Capital outlay for highways
9. **Air transportation (airports)**
10. **Parking facilities**
11. **Sea and inland port facilities**
12. **Police protection**
13. **Fire protection**
14. **Correction** (prisons/jails)
15. **Protective inspection and regulation**
16. **Natural resources**
17. **Parks and recreation**
18. **Housing and community development**
19. **Sewerage**
20. **Solid waste management**
21. **Financial administration**
22. **Judicial and legal**
23. **General public buildings**
24. **Other governmental administration**
25. **Interest on general debt**
26. **Miscellaneous commercial activities**
27. **Other and unallocable**
28. **Utility expenditure** (water, electric, gas, transit)
29. **Liquor store expenditure**
30. **Insurance trust expenditure** (unemployment, retirement, workers' comp)

Also includes revenue by source (taxes by type, intergovernmental revenue, charges) and debt data.

**Limitations:**
- 2023 summary table not yet released (only Individual Unit Files available)
- Values are in thousands (need x1000 conversion)
- Row positions vary slightly between years (need dynamic parsing, not hardcoded row numbers)
- 2012-2016 split across two files
- Column structure varies (3 cols in Census years like 2012, 5 cols in survey years)

**Files already downloaded to:** `D:\germany-ngo-map\data\us\states_research\`
- 12slsstab1a.xlsx, 12slsstab1b.xlsx
- 13slsstab1a.xlsx, 13slsstab1b.xlsx
- 14slsstab1a.xlsx, 14slsstab1b.xlsx
- 15slsstab1a.xlsx, 15slsstab1b.xlsx
- 16slsstab1a.xlsx, 16slsstab1b.xlsx
- 17slsstab1.xlsx through 22slsstab1.xlsx

---

### Source 1B: Census API (BACKUP OPTION)

**Endpoint:** `https://api.census.gov/data/timeseries/govs`
**Documentation:** https://api.census.gov/data/timeseries/govs/examples.html

**Key groups:**
- `GS00LF01` - State and Local Government Finances by Level of Government (2017-2023)
- `GS00SG01` - State Government Finances (2012-2023)

**Example query (all states, 2022):**
```
https://api.census.gov/data/timeseries/govs?get=SVY_COMP,AGG_DESC,AMOUNT&for=state:*&time=2022
```

**Limitation:** Returns coded field values (e.g., AGG_DESC = "LF0160" not "Education"). Need to cross-reference with variable definitions. The Excel files are far easier to work with.

---

### Source 1C: Census Individual Unit Files (GRANULAR OPTION)

**What:** Fixed-width text files with data for every individual government unit (states, counties, cities, school districts, special districts).

**Format:** Fixed-width text (.txt), compressed in .zip
**Size:** 8.6 MB (2022), 3.6 MB (2023)
**URL pattern:** `https://www2.census.gov/programs-surveys/gov-finances/tables/{YEAR}/{YEAR}_Individual_Unit_File.zip`

**Available:** 2017-2023 (2023 is the latest!)

**Use case:** If we need county-level or city-level data, or need 2023 before the summary table is published. Would require parsing the fixed-width format using the included technical documentation.

---

## Source 2: Urban Institute / Tax Policy Center - State and Local Finance Data Explorer

**URL:** https://state-local-finance-data.taxpolicycenter.org/
**Status:** BLOCKED - returns HTTP 403 on all page requests

This tool is built on Census data and reportedly offers easier downloads, but the website consistently blocked automated access during this research. Would need manual browser access to evaluate.

---

## Source 3: NASBO - State Expenditure Report

**URL:** https://www.nasbo.org/reports-data/state-expenditure-report
**Status:** REQUIRES REGISTRATION/PURCHASE

Free access includes:
- Full report PDF (2025 edition covering FY2023-2025 estimated)
- Executive Summary PDF
- Individual chapter PDFs (Education, Higher Ed, Medicaid, Corrections, Transportation, etc.)

Paywalled:
- State-by-state downloadable data
- Historical data archives

**Categories:** Elementary & Secondary Education, Higher Education, Medicaid, Corrections, Transportation, All Other, Capital expenditures
**Coverage:** All 50 states + DC + 3 territories

**Verdict:** The PDF chapters may contain useful data in tables, but bulk machine-readable data requires paid access. Census data is superior and free.

---

## Source 4: USAspending.gov

**URL:** https://api.usaspending.gov/api/v2/
**Status:** WORKS but different data

**What it provides:** FEDERAL spending flowing TO each state (grants, contracts, etc.) - NOT state government's own spending.

**Useful endpoints:**
- `GET /api/v2/recipient/state/` - Total federal spending per state
- `POST /api/v2/search/spending_by_geography/` - Federal spending by state with filters

**Example response:** California received ~$139B in federal grants (FY2023)

**Verdict:** Useful as supplementary data (shows federal funding to states, which is part of state revenue) but does NOT replace Census data for state-own-source spending.

---

## Source 5: Bureau of Economic Analysis (BEA)

**API URL:** https://apps.bea.gov/api/data/
**Status:** API returned empty responses during testing

BEA provides Regional GDP and Personal Income data by state, but does NOT appear to have state government expenditure by function. Their "Regional Data" focuses on GDP, personal income, employment - not government spending breakdown.

**Verdict:** Not suitable for this use case.

---

## RECOMMENDED APPROACH

### For Budget Galaxy state-level visualization:

1. **Primary data source:** Census Bureau Summary Tables (already downloaded for 2012-2022)
   - 11 years of data, all 50 states + DC
   - ~30 functional spending categories
   - State-only, Local-only, and Combined totals available

2. **Parser needed:** Write a Node.js script to:
   - Parse the Excel files (using `xlsx` npm package, already available)
   - Handle the two formats (single file 2017+ vs split files 2012-2016)
   - Handle varying row positions (search by description text, not hardcoded row numbers)
   - Handle 3-col vs 5-col per state
   - Multiply values by 1000 (they're in thousands)
   - Output JSON in the Budget Galaxy tree format

3. **For 2023 data:** Parse the Individual Unit File (fixed-width text), or wait for the summary table to be published.

4. **For federal-to-state flow data (optional enhancement):** Use USAspending.gov API.

### Suggested tree structure for state data:
```json
{
  "name": "California State Budget 2022",
  "value": 447617328000,
  "children": [
    {
      "name": "Public Welfare",
      "value": 143239737000,
      "children": [...]
    },
    {
      "name": "Education",
      "value": 58795790000,
      "children": [
        {"name": "Higher Education", "value": 46634022000},
        {"name": "Elementary & Secondary", "value": 740000},
        {"name": "Other Education", "value": 12161028000}
      ]
    },
    ...
  ]
}
```

---

## FILE INVENTORY

### Downloaded Census Summary Tables:
| File | Year | States | Format |
|------|------|--------|--------|
| 12slsstab1a.xlsx + 12slsstab1b.xlsx | 2012 | 50+DC (split) | 3 cols/state |
| 13slsstab1a.xlsx + 13slsstab1b.xlsx | 2013 | 50+DC (split) | 5 cols/state |
| 14slsstab1a.xlsx + 14slsstab1b.xlsx | 2014 | 50+DC (split) | 5 cols/state |
| 15slsstab1a.xlsx + 15slsstab1b.xlsx | 2015 | 50+DC (split) | 5 cols/state |
| 16slsstab1a.xlsx + 16slsstab1b.xlsx | 2016 | 50+DC (split) | 5 cols/state |
| 17slsstab1.xlsx | 2017 | 50+DC | 5 cols/state |
| 18slsstab1.xlsx | 2018 | 50+DC | 5 cols/state |
| 19slsstab1.xlsx | 2019 | 50+DC | 5 cols/state |
| 20slsstab1.xlsx | 2020 | 50+DC | 5 cols/state |
| 21slsstab1.xlsx | 2021 | 50+DC | 5 cols/state |
| 22slsstab1.xlsx | 2022 | 50+DC | 5 cols/state |

### Also downloaded:
| File | Description |
|------|-------------|
| 2022_unit_file.zip | Individual Unit File (all government units) |
| 2023_unit_files.zip | 2023 Individual Unit File (latest data available) |
| 23statenlocaltqrr.xlsx | 2023 quality/response rate review |

All files stored in: `D:\germany-ngo-map\data\us\states_research\`
