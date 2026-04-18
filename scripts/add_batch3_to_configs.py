"""Add Bedford, Stockton, Darlington, Halton, Redcar to auto_configs.json."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CFG = ROOT / "data" / "uk" / "local_authorities" / "spend" / "auto_configs.json"
cfg = json.loads(CFG.read_text(encoding="utf-8"))

new_entries = [
    {
        "name": "Bedford Borough Council",
        "code": None,
        "dir": str(ROOT / "data" / "uk" / "local_authorities" / "spend" / "bedford_borough_council"),
        "deptCol": "Directorate(T)", "purposeCol": "Expense Type(T)", "amountCol": "Amount", "supplierCol": "Supplier(T)",
        "sep": ",", "encoding": "utf8", "headerHint": "Supplier(T)",
        "mappingFile": str(ROOT / "data" / "uk" / "local_authorities" / "spend" / "bedford_borough_council_dept_mapping.json"),
        "fyLabel": "2024/25",
        "source": "Bedford Borough Council \u2014 https://www.bedford.gov.uk/your-council/about-council/council-budgets-and-spending/supplier-payments/payments-over-ps250",
        "source_url": "https://www.bedford.gov.uk/your-council/about-council/council-budgets-and-spending/supplier-payments/payments-over-ps250",
        "_manifest_blocker": "green",
        "_manifest_complications": [
            "URL pattern: /files/{filename}.xlsx/download?inline. Filenames inconsistent (ps250 vs 250 vs copy- prefix) - scrape landing.",
            "Threshold: GBP 250 (not 500). Total approx GBP 418M FY 2024/25 across 70k transactions."
        ]
    },
    {
        "name": "Stockton-on-Tees Borough Council",
        "code": None,
        "dir": str(ROOT / "data" / "uk" / "local_authorities" / "spend" / "stockton_on_tees"),
        "deptCol": "Directorate / Service where expenditure Incurred",
        "purposeCol": "Expenditure Proclass Category Level 1",
        "amountCol": "Net Amount", "supplierCol": "Supplier Name",
        "sep": ",", "encoding": "utf8", "headerHint": "Supplier Name",
        "mappingFile": str(ROOT / "data" / "uk" / "local_authorities" / "spend" / "stockton_on_tees_borough_council_dept_mapping.json"),
        "fyLabel": "2024/25",
        "source": "Stockton-on-Tees Borough Council \u2014 https://www.stockton.gov.uk/payments-to-suppliers",
        "source_url": "https://www.stockton.gov.uk/payments-to-suppliers",
        "_manifest_blocker": "yellow",
        "_manifest_complications": [
            "Cloudflare WAF blocks landing+CSV from non-UK IPs (AR + Vultr Miami both 403).",
            "Files fetched via Wayback id_ replay (web.archive.org/web/2025id_/{url}).",
            "12 monthly URLs hardcoded from Wayback snapshot of landing page; March 2025 from agent recon.",
            "25-col schema with Proclass categories. Encoding cp1252 -> re-encoded utf-8-sig at fetch.",
            "FY 24/25: 11/12 months (March 2025 missing in Wayback snapshot)."
        ]
    },
    {
        "name": "Darlington Borough Council",
        "code": None,
        "dir": str(ROOT / "data" / "uk" / "local_authorities" / "spend" / "darlington_borough_council"),
        "deptCol": "Directorate", "purposeCol": "Account",
        "amountCol": "Invoice Line Value (net of VAT)", "supplierCol": "Supplier",
        "sep": ",", "encoding": "utf8", "headerHint": "Invoice Line Value (net of VAT)",
        "mappingFile": str(ROOT / "data" / "uk" / "local_authorities" / "spend" / "darlington_borough_council_dept_mapping.json"),
        "fyLabel": "2024/25",
        "source": "Darlington Borough Council \u2014 https://www.darlington.gov.uk/the-council/council-information/financial-information/spending-data/",
        "source_url": "https://www.darlington.gov.uk/the-council/council-information/financial-information/spending-data/",
        "_manifest_blocker": "yellow",
        "_manifest_complications": [
            "URL pattern: /media/{8-char-hash}/transactions-over-500-{month}-{year}.csv. Hashes Umbraco-style - scrape index page.",
            "Files have decorative rows + SQL query lines BEFORE the header (typo 'Directotate' on row 6).",
            "Schema drift Mar 2025+ adds 'Payment Date' column. Encoding drift mid-FY (iso-8859-1 -> utf-8-sig).",
            "FY 24/25: 11/12 (October missing). Total approx GBP 148M across 21k transactions."
        ]
    },
    {
        "name": "Halton Borough Council",
        "code": None,
        "dir": str(ROOT / "data" / "uk" / "local_authorities" / "spend" / "halton"),
        "deptCol": "Department", "purposeCol": "Purpose of Expenditure",
        "amountCol": "Net Amount", "supplierCol": "Beneficiary",
        "sep": ",", "encoding": "utf8", "headerHint": "Beneficiary",
        "mappingFile": str(ROOT / "data" / "uk" / "local_authorities" / "spend" / "halton_borough_council_dept_mapping.json"),
        "fyLabel": "2024/25",
        "source": "Halton Borough Council \u2014 https://www3.halton.gov.uk/Documents/council%20and%20democracy/Finance/spenddata/2024-2025/",
        "source_url": "https://www3.halton.gov.uk/Pages/councilanddemocracy/Spend.aspx",
        "_manifest_blocker": "yellow",
        "_manifest_complications": [
            "Connection-reset from AR egress; fetched via Vultr Miami (works).",
            "URL pattern: /Documents/council%20and%20democracy/Finance/spenddata/{FY}/Payments%20Over%20%C2%A3500%20Q{N}%20{FY}.csv (URL-encoded GBP and FY).",
            "4 quarterly CSVs (90k rows total), cp1252 source - re-encoded utf-8-sig.",
            "Q2 has extra 'Division' column (schema drift).",
            "Total approx GBP 263M FY 2024/25."
        ]
    },
    {
        "name": "Redcar and Cleveland Borough Council",
        "code": None,
        "dir": str(ROOT / "data" / "uk" / "local_authorities" / "spend" / "redcar_cleveland"),
        "deptCol": "Directorate", "purposeCol": "Expenditure Category",
        "amountCol": "Posted amount", "supplierCol": "Supplier",
        "sep": ",", "encoding": "utf8", "headerHint": "Posted amount",
        "mappingFile": str(ROOT / "data" / "uk" / "local_authorities" / "spend" / "redcar_and_cleveland_borough_council_dept_mapping.json"),
        "fyLabel": "2024/25",
        "source": "Redcar and Cleveland Borough Council \u2014 https://www.redcar-cleveland.gov.uk/about-the-council/budget-and-accounts/invoices-over-500/financial-year-2024-2025",
        "source_url": "https://www.redcar-cleveland.gov.uk/about-the-council/budget-and-accounts/invoices-over-500/financial-year-2024-2025",
        "_manifest_blocker": "green",
        "_manifest_complications": [
            "URL pattern: /sites/default/files/{publish YYYY-MM}/Over%20%C2%A3500%20Spend%20{Month}%20{YYYY}.xlsx (publish folder irregular).",
            "Two cols share 'Cost Centre' header (code + name) - second col renamed 'Cost Centre Name' at conversion.",
            "12 monthly XLSX (~28k rows total). Ignores Credit Notes mirror files."
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
