"""Add Warwickshire CC + Cumberland Council to auto_configs.json."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CFG = ROOT / "data" / "uk" / "local_authorities" / "spend" / "auto_configs.json"
cfg = json.loads(CFG.read_text(encoding="utf-8"))

new_entries = [
    {
        "name": "Warwickshire County Council",
        "code": None,
        "dir": str(ROOT / "data" / "uk" / "local_authorities" / "spend" / "warwickshire_county_council"),
        "deptCol": "Group",
        "purposeCol": "Description",
        "amountCol": "Amount",
        "supplierCol": "Supplier Name",
        "sep": ",",
        "encoding": "utf8",
        "headerHint": "SuppID",
        "mappingFile": str(ROOT / "data" / "uk" / "local_authorities" / "spend" / "warwickshire_county_council_dept_mapping.json"),
        "fyLabel": "2024/25",
        "source": "Warwickshire County Council \u2014 https://www.warwickshire.gov.uk/directory/42/warwickshire-open-data/category/290",
        "source_url": "https://www.warwickshire.gov.uk/directory/42/warwickshire-open-data/category/290",
        "_manifest_blocker": "yellow",
        "_manifest_complications": [
            "Discovery: directory/42/warwickshire-open-data/category/290 paginated landing lists per-month directory-record entries.",
            "File pattern: api.warwickshire.gov.uk/documents/WCCC-428063900-{ID} where prefix is constant; IDs sequential but non-monotonic between XLSX/PDF.",
            "XLSX has 3 blank/title rows BEFORE 'SuppID' header in newer months (Jul 2024+); converter detects header row dynamically.",
            "Sheet 'pound_500' (1 of 2; '_options' is metadata).",
            "Total approx GBP 882M across 146k transactions FY 2024/25."
        ]
    },
    {
        "name": "Cumberland Council",
        "code": None,
        "dir": str(ROOT / "data" / "uk" / "local_authorities" / "spend" / "cumberland_council"),
        "deptCol": "Directorate Description",
        "purposeCol": "Expenditure Description",
        "amountCol": "Line Amount",
        "supplierCol": "Supplier Name",
        "sep": ",",
        "encoding": "utf8",
        "headerHint": "Directorate Description",
        "mappingFile": str(ROOT / "data" / "uk" / "local_authorities" / "spend" / "cumberland_council_dept_mapping.json"),
        "fyLabel": "2024/25",
        "source": "Cumberland Council \u2014 https://www.cumberland.gov.uk/document-search?field_document_target_id=1329",
        "source_url": "https://www.cumberland.gov.uk/your-council/legal-and-financial-information/cumberland-council-spend-over-ps250",
        "_manifest_blocker": "yellow",
        "_manifest_complications": [
            "Discovery: Drupal Views search /document-search?field_document_target_id={1329 for FY 24/25}.",
            "36 monthly CSVs across 3 categories: trade_suppliers (12, cp1252), private_homes (12, utf8-sig), support_payments (12, utf8-sig).",
            "All files have a TITLE row 1 to skip - prepare_cumberland_files.py normalizes to single header.",
            "Trade Suppliers files are cp1252 - re-encoded to utf8-sig at prepare time for unified pipeline.",
            "Filter Company == 'CU' (current Cumberland unitary, not legacy Copeland/Allerdale).",
            "Total approx GBP 460M FY 2024/25; subset of records also published with '£250' threshold (lower than standard £500)."
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
