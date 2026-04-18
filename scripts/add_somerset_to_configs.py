"""Add Somerset Council to auto_configs.json (one-shot helper)."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CFG = ROOT / "data" / "uk" / "local_authorities" / "spend" / "auto_configs.json"

cfg = json.loads(CFG.read_text(encoding="utf-8"))
existing = [c for c in cfg if c.get("name") == "Somerset Council"]
if existing:
    print("Already exists.")
    raise SystemExit(0)

new_entry = {
    "name": "Somerset Council",
    "code": None,
    "dir": str(ROOT / "data" / "uk" / "local_authorities" / "spend" / "somerset_council"),
    "deptCol": "Cost Centre",
    "purposeCol": "Purpose of Spend",
    "amountCol": "Amount",
    "supplierCol": "Supplier Beneficiary",
    "sep": ",",
    "encoding": "utf8",
    "headerHint": "Supplier Beneficiary",
    "mappingFile": str(ROOT / "data" / "uk" / "local_authorities" / "spend" / "somerset_council_dept_mapping.json"),
    "fyLabel": "2024/25",
    "source": "Somerset Council \u2014 https://www.somerset.gov.uk/finance-performance-and-legal/council-expenditure-over-500/",
    "source_url": "https://www.somerset.gov.uk/finance-performance-and-legal/council-expenditure-over-500/",
    "_manifest_blocker": "green",
    "_manifest_complications": [
        "Discovery via WP customfilter AJAX endpoint (POST admin-ajax.php) - directory has 142 entries across pre-reorg councils.",
        "SharePoint guest links require URL rewrite to /sites/SCCPublic/_layouts/15/download.aspx?share={token} (anonymous).",
        "Mixed CSV/XLSX downloads - XLSX converted to CSV in scrape_somerset_council.py + prepare_somerset_files.py.",
        "Q4 2024-25 was latin1, re-encoded to utf-8-sig at prepare time.",
        "FY 2024/25: Q1+Q2+Q3 (utf-8-sig) + Q4 (re-encoded), totals approx GBP 1.04B across 217k transactions."
    ]
}
cfg.append(new_entry)
CFG.write_text(json.dumps(cfg, indent=2), encoding="utf-8")
print(f"Added Somerset Council. Total councils now: {len(cfg)}")
