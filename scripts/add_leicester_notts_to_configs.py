"""Add Leicester City + Nottingham City to auto_configs.json."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CFG = ROOT / "data" / "uk" / "local_authorities" / "spend" / "auto_configs.json"
cfg = json.loads(CFG.read_text(encoding="utf-8"))

new_entries = [
    {
        "name": "Leicester City Council",
        "code": None,
        "dir": str(ROOT / "data" / "uk" / "local_authorities" / "spend" / "leicester_city_council"),
        "deptCol": "Department",
        "purposeCol": "Purpose of expenditure",
        "amountCol": "Amount",
        "supplierCol": "Beneficiary",
        "sep": ",",
        "encoding": "utf8",
        "headerHint": "Beneficiary",
        "mappingFile": str(ROOT / "data" / "uk" / "local_authorities" / "spend" / "leicester_city_council_dept_mapping.json"),
        "fyLabel": "2024/25",
        "source": "Leicester City Council \u2014 https://data.leicester.gov.uk/explore/dataset/expenditure-exceeding-ps500-2024/",
        "source_url": "https://data.leicester.gov.uk/explore/dataset/expenditure-exceeding-ps500-2024/",
        "_manifest_blocker": "green",
        "_manifest_complications": [
            "OpenDataSoft API: dataset name is expenditure-exceeding-ps500-{FY-START-YEAR} (note: 'ps' = pound sign URL-encoded; older 2023 dataset used 'gbp500').",
            "Export URL: /api/explore/v2.1/catalog/datasets/{dataset}/exports/csv?use_labels=true&delimiter=,",
            "FY 2024/25 = ps500-2024 dataset (modified 2025-05-13)."
        ]
    },
    {
        "name": "Nottingham City Council",
        "code": None,
        "dir": str(ROOT / "data" / "uk" / "local_authorities" / "spend" / "nottingham_city_council"),
        "deptCol": "Department",
        "purposeCol": "Expenditure Category",
        "amountCol": "Net Amount",
        "supplierCol": "Supplier Name",
        "sep": ",",
        "encoding": "utf8",
        "headerHint": "Supplier Name",
        "mappingFile": str(ROOT / "data" / "uk" / "local_authorities" / "spend" / "nottingham_city_council_dept_mapping.json"),
        "fyLabel": "2024/25",
        "source": "Nottingham City Council \u2014 https://www.nottinghamcity.gov.uk/your-council/about-the-council/access-to-information/nottingham-data-hub/",
        "source_url": "https://www.nottinghamcity.gov.uk/your-council/about-the-council/access-to-information/nottingham-data-hub/",
        "_manifest_blocker": "green",
        "_manifest_complications": [
            "Single FY-aggregated XLSX per year at /media/{slug}/payments-to-suppliers-{YYYY}-{YYYY}.xlsx.",
            "Slug is non-predictable - extract from data hub landing page if URLs change.",
            "Total approx GBP 567M across 39k transactions FY 2024/25."
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
