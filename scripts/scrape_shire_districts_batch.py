#!/usr/bin/env python3
"""
Batch scraper for 4 confirmed Shire Districts:
  - East Suffolk (12 monthly CSVs, Drupal, preamble rows)
  - Cambridge City (single annual CSV, latin1)
  - Spelthorne (12 monthly CSVs, Drupal, title row)
  - Chelmsford (11 CSV + 1 XLSX, Umbraco, schema drift)
"""
import csv, re, time, os
from pathlib import Path
from urllib.parse import unquote
import requests

ROOT = Path(__file__).resolve().parents[1]
SPEND = ROOT / "data" / "uk" / "local_authorities" / "spend"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
MONTHS = ["April","May","June","July","August","September","October","November","December","January","February","March"]


def fetch(url, enc="utf-8"):
    r = requests.get(url, headers={"User-Agent": UA}, timeout=120)
    r.raise_for_status()
    return r.content


def strip_preamble(src: Path, marker: str):
    """Remove rows before the header row containing `marker`."""
    raw = src.read_bytes()
    enc = "utf-8-sig" if raw.startswith(b"\xef\xbb\xbf") else "latin1"
    with open(src, encoding=enc, newline="") as fh:
        rows = list(csv.reader(fh))
    header_idx = 0
    for i, r in enumerate(rows[:10]):
        if any(marker.lower() in str(c).lower() for c in r):
            header_idx = i
            break
    rows = rows[header_idx:]
    if rows:
        rows[0] = [str(c).strip() for c in rows[0]]
    with open(src, "w", newline="", encoding="utf-8-sig") as fh:
        csv.writer(fh).writerows(rows)
    return len(rows) - 1


# ─── East Suffolk ───
print("=== East Suffolk ===")
dest_dir = SPEND / "east_suffolk"
dest_dir.mkdir(parents=True, exist_ok=True)
BASE_ES = "https://www.eastsuffolk.gov.uk/sites/default/files/2025-07"
for m in MONTHS:
    year = "2024" if m not in ("January", "February", "March") else "2025"
    url = f"{BASE_ES}/{m}%20{year}%20Transactions%20over%20%C2%A3250.csv"
    dest = dest_dir / f"spending_{year}_{MONTHS.index(m)+1:02d}_{m.lower()}.csv"
    if m in ("January","February","March"):
        dest = dest_dir / f"spending_2025_{['January','February','March'].index(m)+1:02d}_{m.lower()}.csv"
    if dest.exists() and dest.stat().st_size > 500:
        print(f"  SKIP {dest.name}")
        continue
    try:
        content = fetch(url)
        dest.write_bytes(content)
        n = strip_preamble(dest, "Service Area")
        print(f"  {n:>5} rows  {dest.name}")
    except Exception as ex:
        print(f"  FAIL {dest.name}: {ex}")
    time.sleep(0.4)

# ─── Cambridge City ───
print("\n=== Cambridge City ===")
dest_dir = SPEND / "cambridge_city"
dest_dir.mkdir(parents=True, exist_ok=True)
url = "https://www.cambridge.gov.uk/media/cmfbwrd5/payments-to-suppliers-2024-25.csv"
dest = dest_dir / "spending_fy2024_25.csv"
if not dest.exists() or dest.stat().st_size < 500:
    content = fetch(url)
    text = content.decode("latin1")
    dest.write_text(text, encoding="utf-8-sig")
    n = sum(1 for _ in open(dest, encoding="utf-8-sig")) - 1
    print(f"  {n} rows  {dest.name}")
else:
    print(f"  SKIP {dest.name}")

# ─── Spelthorne ───
print("\n=== Spelthorne ===")
dest_dir = SPEND / "spelthorne"
dest_dir.mkdir(parents=True, exist_ok=True)
# Scrape both index pages to find CSV URLs
for idx_url in [
    "https://www.spelthorne.gov.uk/page/1780/supplier-payments-over-ps500-2024",
    "https://www.spelthorne.gov.uk/page/560/supplier-payments-over-ps500-2025"
]:
    try:
        r = requests.get(idx_url, headers={"User-Agent": UA}, timeout=60)
        r.raise_for_status()
        csvs = re.findall(r'href="(/sites/default/files/[^"]+\.csv)"', r.text)
        for path in csvs:
            fname = unquote(path.rsplit("/", 1)[-1])
            # Extract month+year
            m = re.search(r"(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})", fname)
            if not m:
                continue
            mname, year = m.group(1), m.group(2)
            mm = f"{MONTHS.index(mname)+1:02d}" if mname in MONTHS else "00"
            # FY 24/25 filter
            in_fy = (year == "2024" and int(mm) >= 4) or (year == "2025" and int(mm) <= 3)
            if not in_fy:
                continue
            dest = dest_dir / f"spending_{year}_{mm}_{mname.lower()}.csv"
            if dest.exists() and dest.stat().st_size > 500:
                print(f"  SKIP {dest.name}")
                continue
            full_url = "https://www.spelthorne.gov.uk" + path
            try:
                content = fetch(full_url)
                dest.write_bytes(content)
                n = strip_preamble(dest, "Transaction Number")
                print(f"  {n:>5} rows  {dest.name}")
            except Exception as ex:
                print(f"  FAIL {dest.name}: {ex}")
            time.sleep(0.4)
    except Exception as ex:
        print(f"  FAIL index {idx_url}: {ex}")

# ─── Chelmsford ───
print("\n=== Chelmsford ===")
dest_dir = SPEND / "chelmsford"
dest_dir.mkdir(parents=True, exist_ok=True)
# Scrape landing
landing_url = "https://www.chelmsford.gov.uk/your-council/finance-budgets-and-transparency/expenditure-over-250/"
try:
    r = requests.get(landing_url, headers={"User-Agent": UA}, timeout=60)
    r.raise_for_status()
    html = r.text
    (dest_dir / "_landing.html").write_text(html, encoding="utf-8")
    files = re.findall(r'href="(/media/[^"]+\.(?:csv|xlsx))"', html, re.I)
    files = list(dict.fromkeys(files))
    print(f"  {len(files)} file links found")
    for path in files:
        fname = unquote(path.rsplit("/", 1)[-1])
        # Match expenditure-over-250-{month}-{year} or expenditure-over-gbp250-{month}-{year}
        m = re.search(r"(january|february|march|april|may|june|july|august|september|october|november|december)[- ](\d{4})", fname.lower())
        if not m:
            continue
        mname, year = m.group(1), m.group(2)
        mm = f"{['january','february','march','april','may','june','july','august','september','october','november','december'].index(mname)+1:02d}"
        in_fy = (year == "2024" and int(mm) >= 4) or (year == "2025" and int(mm) <= 3)
        if not in_fy:
            continue
        ext = fname.rsplit(".", 1)[-1].lower()
        dest = dest_dir / f"spending_{year}_{mm}_{mname}.csv"
        if dest.exists() and dest.stat().st_size > 500:
            print(f"  SKIP {dest.name}")
            continue
        full_url = "https://www.chelmsford.gov.uk" + path
        try:
            content = fetch(full_url)
            if ext == "xlsx":
                import openpyxl
                tmp = dest_dir / "_tmp.xlsx"
                tmp.write_bytes(content)
                wb = openpyxl.load_workbook(tmp, read_only=True, data_only=True)
                ws = wb.active
                with open(dest, "w", newline="", encoding="utf-8-sig") as fh:
                    w = csv.writer(fh)
                    for row in ws.iter_rows(values_only=True):
                        w.writerow(["" if v is None else v for v in row])
                wb.close()
                tmp.unlink()
            else:
                text = content.decode("latin1")
                dest.write_text(text, encoding="utf-8-sig")
            n = sum(1 for _ in open(dest, encoding="utf-8-sig")) - 1
            print(f"  {n:>5} rows  {dest.name}")
        except Exception as ex:
            print(f"  FAIL {dest.name}: {ex}")
        time.sleep(0.4)
except Exception as ex:
    print(f"  FAIL landing: {ex}")

print("\nDone.")
