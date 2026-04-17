"""Add Newcastle, Westmorland & Furness to auto_configs.json."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CFG = ROOT / "data" / "uk" / "local_authorities" / "spend" / "auto_configs.json"
cfg = json.loads(CFG.read_text(encoding="utf-8"))

new_entries = [
    {
        "name": "Newcastle upon Tyne City Council",
        "code": None,
        "dir": str(ROOT / "data" / "uk" / "local_authorities" / "spend" / "newcastle_upon_tyne"),
        "deptCol": "Directorate",
        "purposeCol": "Group Description",
        "amountCol": "Total (excludes VAT)",
        "supplierCol": "Supplier Name",
        "sep": ",",
        "encoding": "utf8",
        "headerHint": "Supplier Name",
        "mappingFile": str(ROOT / "data" / "uk" / "local_authorities" / "spend" / "newcastle_upon_tyne_dept_mapping.json"),
        "fyLabel": "2024/25",
        "source": "Newcastle upon Tyne City Council \u2014 https://www.newcastle.gov.uk/local-government/access-information-and-data/open-data/payments-over-ps250-data-sets",
        "source_url": "https://www.newcastle.gov.uk/local-government/access-information-and-data/open-data/payments-over-ps250-data-sets",
        "_manifest_blocker": "yellow",
        "_manifest_complications": [
            "Site L3-blocked from AR IPs - direct download not possible. Files fetched via Wayback Machine if_ replay (web.archive.org/web/2025if_/...).",
            "URL pattern: /sites/default/files/local-government/Open Data/{Month} {YYYY}.csv (URL-encoded space).",
            "Title row + blank row before header (header on row 3) - prepare_newcastle_files.py skips them.",
            "Schema drift: Apr-Sep 2024 = 10 cols; Oct 2024-Mar 2025 = 12 cols (added Capital Code, Capital Code Name). Amount anchored by header name 'Total (excludes VAT)'.",
            "Source encoding cp1252 - re-encoded to utf-8-sig at prepare time.",
            "Total approx GBP 666M FY 2024/25 ex-VAT across 81k transactions."
        ]
    },
    {
        "name": "Westmorland and Furness Council",
        "code": None,
        "dir": str(ROOT / "data" / "uk" / "local_authorities" / "spend" / "westmorland_furness"),
        "deptCol": "Directorate Description",
        "purposeCol": "Expenditure Description",
        "amountCol": "Line Amount",
        "supplierCol": "Supplier Name",
        "sep": ",",
        "encoding": "utf8",
        "headerHint": "Supplier Name",
        "mappingFile": str(ROOT / "data" / "uk" / "local_authorities" / "spend" / "westmorland_furness_dept_mapping.json"),
        "fyLabel": "2024/25",
        "source": "Westmorland and Furness Council \u2014 https://www.westmorlandandfurness.gov.uk/your-council/finance/payments-suppliers/payments-over-ps250/spending-over-ps250-2024-2025",
        "source_url": "https://www.westmorlandandfurness.gov.uk/your-council/finance/payments-suppliers/payments-over-ps250/spending-over-ps250-2024-2025",
        "_manifest_blocker": "green",
        "_manifest_complications": [
            "Discovery: localgov_services_page renders all 36 unitary CSV links inline at the FY 24/25 landing.",
            "Same 11-col schema as Cumberland (sister Cumbria reorg council); 3 categories (trade/private/support) all present.",
            "Title row 1 to skip - prepare time normalizes to single header.",
            "Filenames inconsistent (May 'WFv1', Sep 'Upload Version 2', Oct/Nov natural-language) - scrape page rather than hardcode pattern.",
            "Skip SLDC legacy district files (different schema, separate entity).",
            "Total approx GBP 750M raw FY 2024/25 across 178k transactions; expected ~GBP 400-500M after revenue/capital reconciliation."
        ]
    }
]

added = 0
for new_entry in new_entries:
    if any(c.get("name") == new_entry["name"] for c in cfg):
        print(f"Already exists: {new_entry['name']}")
        continue
    cfg.append(new_entry)
    added += 1
    print(f"Added: {new_entry['name']}")
CFG.write_text(json.dumps(cfg, indent=2), encoding="utf-8")
print(f"\nTotal councils: {len(cfg)} (+{added})")
