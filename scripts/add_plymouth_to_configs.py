"""Add Plymouth City Council to auto_configs.json."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CFG = ROOT / "data" / "uk" / "local_authorities" / "spend" / "auto_configs.json"
cfg = json.loads(CFG.read_text(encoding="utf-8"))
if any(c.get("name") == "Plymouth City Council" for c in cfg):
    print("Already exists.")
    raise SystemExit(0)
cfg.append({
    "name": "Plymouth City Council",
    "code": None,
    "dir": str(ROOT / "data" / "uk" / "local_authorities" / "spend" / "plymouth"),
    "deptCol": "Service label",
    "purposeCol": "Detailed Expenses type",
    "amountCol": "Amount",
    "supplierCol": "Supplier Name",
    "sep": ",",
    "encoding": "utf8",
    "headerHint": "Supplier Name",
    "mappingFile": str(ROOT / "data" / "uk" / "local_authorities" / "spend" / "plymouth_dept_mapping.json"),
    "fyLabel": "2024/25",
    "source": "Plymouth City Council \u2014 https://www.plymouth.gov.uk/publication-scheme",
    "source_url": "https://www.plymouth.gov.uk/publication-scheme",
    "_manifest_blocker": "green",
    "_manifest_complications": [
        "Discovery: files attached to /publication-scheme page (not a dedicated transparency landing).",
        "URL pattern: /sites/default/files/{YYYY-MM publish}/Payments-{Over|over}-500-{Month}-{YYYY}.{xls|xlsx|csv}",
        "Publish-month folder is the month AFTER the spend month (Apr 2024 -> 2024-05/).",
        "Mixed extensions: most months .xls (legacy), Jan 2025 .xlsx, Mar 2025 .csv. Converter prefers csv > xlsx > xls.",
        "Header includes literal '\\n' in 'Capital/\\nRevenue' column name - kept as-is.",
        "Total approx GBP 504M FY 2024/25 across 147k transactions."
    ]
})
CFG.write_text(json.dumps(cfg, indent=2), encoding="utf-8")
print(f"Added Plymouth. Total councils: {len(cfg)}")
