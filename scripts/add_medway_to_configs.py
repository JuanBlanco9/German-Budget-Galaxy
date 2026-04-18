"""Add Medway Council to auto_configs.json."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CFG = ROOT / "data" / "uk" / "local_authorities" / "spend" / "auto_configs.json"
cfg = json.loads(CFG.read_text(encoding="utf-8"))
if any(c.get("name") == "Medway Council" for c in cfg):
    print("Already exists.")
    raise SystemExit(0)
cfg.append({
    "name": "Medway Council",
    "code": None,
    "dir": str(ROOT / "data" / "uk" / "local_authorities" / "spend" / "medway"),
    "deptCol": "Area of Spend",
    "purposeCol": "Expense Description",
    "amountCol": "Value",
    "supplierCol": "Supplier or Redacted Statement",
    "sep": ",",
    "encoding": "utf8",
    "headerHint": "Supplier or Redacted Statement",
    "mappingFile": str(ROOT / "data" / "uk" / "local_authorities" / "spend" / "medway_dept_mapping.json"),
    "fyLabel": "2024/25",
    "source": "Medway Council \u2014 https://www.medway.gov.uk/info/200216/finances/348/council_finances",
    "source_url": "https://www.medway.gov.uk/info/200216/finances/348/council_finances",
    "_manifest_blocker": "green",
    "_manifest_complications": [
        "Discovery: 12 monthly XLSX with non-monotonic IDs hard-coded in scrape_medway.py (gathered from sitemap.xml).",
        "URL pattern: /download/downloads/id/{ID}/spending_data_{month}_{YYYY}.xlsx (manifest pattern was correct, only IDs needed enumeration).",
        "Headers on row 1, no title row to skip.",
        "deptCol uses 'Area of Spend' (mid-granularity); 'Directorate/Balance Sheet Heading' is too coarse, 'Service Level' too fine.",
        "Total approx GBP 546M FY 2024/25 across 114k transactions."
    ]
})
CFG.write_text(json.dumps(cfg, indent=2), encoding="utf-8")
print(f"Added Medway. Total councils: {len(cfg)}")
