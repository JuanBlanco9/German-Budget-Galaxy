# Discovery Lancashire CC

_Agent: agent-a5b993ae64dba2e9c_

Note "Service label" and "Service code" both show "11" — that looks suspicious (label = code = "11"). Looking at row 2: amount 22785 with no decimal. Compared to Jan 2024 file which has "4093.55" with decimals. So the dynamic exporter strips decimals or amounts are stored as integer pence — actually looking at row 8 "6438" for a school payment, it's likely pounds without decimals (the exporter is dropping the fractional part or amounts are rounded). I'll flag this as a complication. Time to write the report.

---

**Lancashire County Council — Spend Over £500, FY 2023/24**

**1. Base portal**
- Landing: https://www.lancashire.gov.uk/council/transparency/published-information/council-information/check-council-spending/payments-to-suppliers/
- Data app: https://transparency.lancashire.gov.uk/ (custom "Paladin/webtrans" ASP app)
- Threshold is £250 (incl. VAT), not £500 — **lower than your pipeline assumes**, so all >£500 rows are a subset.

**2. FY 2023/24 download URLs**
Dynamic CSV export = HTTP POST to `https://transparency.lancashire.gov.uk/index.asp?Period=MMYYYY&Version=N` with form body `strAction=exportCSV&strOutputFields=service_lable&strOutputFields=service_code&strOutputFields=organisational_unit&strOutputFields=expenditure_category&strOutputFields=expenditure_code&strOutputFields=payment_date&strOutputFields=transaction_number&strOutputFields=amount&strOutputFields=supplier_name`

| Period | Version | Method | Verified bytes |
|---|---|---|---|
| 042023–122023 (9 months) | 1 | POST exportCSV | 2.2–4.9 MB each |
| **012024** | 1 | **GET static**: `https://transparency.lancashire.gov.uk/files/transparency_012024_1.csv` | 12.0 MB |
| 022024 | 1 | POST exportCSV | 1.8 MB |
| **032024** | **2** | POST exportCSV (V1 returns 150-byte stub; **amended file uploaded 16-Jul-2025**) | 4.8 MB |

All return `Content-Type: text/csv`, `attachment; filename=export.csv`.

**3. Columns** (dynamic export, quoted CSV with trailing comma):
`Service label`, `Service code`, `Organisational unit`, `Expenditure category`, `Expenditure code`, `Date`, `Transaction number`, `Amount`, `Supplier name`

Mapping: supplier=`Supplier name`, amount=`Amount`, department=`Organisational unit`, category=`Expenditure category`. There is **no purpose/description field**.

**4. Sample row** (Apr 2023):
`11,11,"Agency Residential - Chorley","Private Contractors & Other Agencies - Other",14063,06/04/2023,3067334,22785,"BARRACARE LTD",`

**5. Complications (important)**
- **Threshold £250 not £500** — filter `Amount >= 500` in your pipeline.
- **Jan 2024 schema is different**: served as a static file with US-spelled headers (`Organizational Unit`), unquoted CSV, date format `4-Jan-24`, decimal amounts (`4093.55`), and **empty Transaction Number column**. Needs a separate parser branch.
- **Mar 2024 requires `Version=2`**; V1 silently returns a 150-byte stub. A red banner on the viewer notes the file was amended 16-Jul-2025.
- **Dynamic exporter drops decimals**: April 2023 amounts come through as integers (`22785`, `2400`) — likely truncated pence or rounded pounds. Cross-check totals against the council's published annual figure (~£7.3M cited in search results looks too low for £2.48B council; that figure was probably a single search hit, not annual). Worth verifying one month's sum against the viewer's on-screen total before trusting.
- "Service label" and "Service code" appear identical in many rows (both "11") — suspect a data-quality issue at source, not a parsing bug.
- **No supplier address, no invoice description, no VAT split** — only what's listed above.
- Portal sidebar dropdown only lists **last ~20 months** (currently Jul 2024 onward), so 2023/24 months are not browsable from the menu — but the URL pattern still works for older periods. Keep the URL builder; do not scrape menu.
- Trailing comma after last column means naive parsers may see a 10th empty field.
- ASP cookies (`SecureCookie`, `TS013...`) are issued but POST exports work without preserving session in my tests.
- Encoding: `iso-8859-1` declared in HTML; CSV bytes look ASCII-safe but UK supplier names with accents may break — decode as `cp1252` defensively.

**Alternative if the inconsistency bites**: Lancashire has no data.gov.uk feed for this; only fallback is to scrape the per-month HTML viewer (`/index.asp?Period=...&Version=...&intCurRow=1&NoRec=N`) page-by-page using the `NoRec` value visible in the sort links — slower but uniform schema across all 12 months.

Files saved during research: `C:/Users/Usuario/AppData/Local/Temp/lancs_apr23.csv`, `lancs_jan24_static.csv`, `lancs_mar24v2.csv` (sample CSVs for schema verification, can be deleted).