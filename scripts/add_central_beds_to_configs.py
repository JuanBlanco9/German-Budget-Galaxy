"""Add Central Bedfordshire Council to auto_configs.json."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CFG = ROOT / "data" / "uk" / "local_authorities" / "spend" / "auto_configs.json"

cfg = json.loads(CFG.read_text(encoding="utf-8"))
existing = [c for c in cfg if c.get("name") == "Central Bedfordshire Council"]
if existing:
    print("Already exists.")
    raise SystemExit(0)

new_entry = {
    "name": "Central Bedfordshire Council",
    "code": None,
    "dir": str(ROOT / "data" / "uk" / "local_authorities" / "spend" / "central_bedfordshire"),
    "deptCol": "Service Label",
    "purposeCol": "Expenditure Category",
    "amountCol": "Net Amount",
    "supplierCol": "Supplier name",
    "sep": ",",
    "encoding": "latin1",
    "headerHint": "Service division code",
    "mappingFile": str(ROOT / "data" / "uk" / "local_authorities" / "spend" / "central_bedfordshire_dept_mapping.json"),
    "fyLabel": "2024/25",
    "source": "Central Bedfordshire Council \u2014 https://www.centralbedfordshire.gov.uk/info/28/transparency/285/council_spending",
    "source_url": "https://www.centralbedfordshire.gov.uk/info/28/transparency/285/council_spending",
    "_manifest_blocker": "green",
    "_manifest_complications": [
        "Discovery: 4-page paginated council_spending listing (info/28/transparency/285/) lists monthly SharePoint links.",
        "SharePoint :x:/s/Communications/{token}?e=... rewritten to /sites/Communications/_layouts/15/download.aspx?share={token} - returns CSV anonymously.",
        "April 2024 file shipped with leading/trailing spaces in 'Net Amount' header AND two trailing empty columns; normalized at scrape time.",
        "Spending data only - separate P-Card files exist but excluded (different totals basis).",
        "Total approx GBP 707M across 240k transactions FY 2024/25."
    ]
}
cfg.append(new_entry)
CFG.write_text(json.dumps(cfg, indent=2), encoding="utf-8")
print(f"Added Central Bedfordshire Council. Total councils now: {len(cfg)}")
