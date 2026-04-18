"""Add Calderdale Council to auto_configs.json."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CFG = ROOT / "data" / "uk" / "local_authorities" / "spend" / "auto_configs.json"
cfg = json.loads(CFG.read_text(encoding="utf-8"))
if any(c.get("name") == "Calderdale Metropolitan Borough Council" for c in cfg):
    print("Already exists.")
    raise SystemExit(0)
cfg.append({
    "name": "Calderdale Metropolitan Borough Council",
    "code": None,
    "dir": str(ROOT / "data" / "uk" / "local_authorities" / "spend" / "calderdale"),
    "deptCol": "Expense Area",
    "purposeCol": "Purpose of Spend (Summary)",
    "amountCol": "Net Amount",
    "supplierCol": "Supplier(Beneficiary) Name",
    "sep": ",",
    "encoding": "utf8",
    "headerHint": "Supplier(Beneficiary) Name",
    "mappingFile": str(ROOT / "data" / "uk" / "local_authorities" / "spend" / "calderdale_metropolitan_borough_council_dept_mapping.json"),
    "fyLabel": "2024/25",
    "source": "Calderdale Metropolitan Borough Council \u2014 https://www.calderdale.gov.uk/council/finances/income-spending/",
    "source_url": "https://www.calderdale.gov.uk/council/finances/income-spending/",
    "_manifest_blocker": "yellow",
    "_manifest_complications": [
        "Site geo-blocks non-UK IPs (Barracuda WAF GEO_IP_BLOCK). Files fetched via Wayback Save Page Now (web.archive.org/save) using authenticated IA S3 keys.",
        "URL pattern: /council/finances/income-spending/{YYYY}/{MonthName}.csv (TitleCase month, year is fiscal-year start 2024 for Apr-Dec, 2025 for Jan-Mar).",
        "Header column name: 'Supplier(Beneficiary) Name' (no space before paren) - manifest had typo with space.",
        "Leading whitespace in supplier names - classifier handles.",
        "Total approx GBP 377M FY 2024/25 across 73k transactions."
    ]
})
CFG.write_text(json.dumps(cfg, indent=2), encoding="utf-8")
print(f"Added Calderdale. Total councils: {len(cfg)}")
