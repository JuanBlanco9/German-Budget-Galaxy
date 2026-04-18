#!/usr/bin/env python3
"""
Fetch council CSVs blocked from AR via Wayback Save Page Now.

Usage: python scripts/fetch_via_wayback_spn.py --council {tameside|calderdale}
"""
import argparse
import json
import os
import time
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
IA_AUTH = "LOW CkTdGGX1wMGNbkyu:UHbVhRY0msS1b7co"


def spn_save(orig_url: str, max_attempts: int = 3) -> str:
    """Submit SPN job, poll until done, return archived URL."""
    for attempt in range(max_attempts):
        try:
            r = requests.post(
                "https://web.archive.org/save",
                headers={"Authorization": IA_AUTH, "Accept": "application/json"},
                data={"url": orig_url, "capture_all": "on"},
                timeout=60,
            )
            if r.status_code == 429:
                print(f"   rate-limited, sleep 30s")
                time.sleep(30)
                continue
            data = r.json()
            job_id = data.get("job_id")
            if not job_id:
                print(f"   ERR no job_id: {data}")
                return None
            # Poll
            for poll_n in range(60):
                time.sleep(5)
                pr = requests.get(
                    f"https://web.archive.org/save/status/{job_id}",
                    headers={"Authorization": IA_AUTH},
                    timeout=30,
                )
                pd = pr.json()
                status = pd.get("status")
                if status == "success":
                    ts = pd.get("timestamp")
                    return f"https://web.archive.org/web/{ts}id_/{orig_url}"
                if status == "error":
                    msg = pd.get("message", "")
                    print(f"   SPN error: {msg}")
                    if "no archive available" in msg.lower():
                        return None
                    break
            print(f"   poll timeout job={job_id}")
        except Exception as ex:
            print(f"   attempt {attempt+1} exception: {ex}")
        time.sleep(5)
    return None


def fetch_archived(url: str, dest: Path) -> int:
    r = requests.get(url, headers={"User-Agent": UA}, timeout=120)
    r.raise_for_status()
    dest.write_bytes(r.content)
    return len(r.content)


COUNCILS = {
    "tameside": {
        "dir": "tameside",
        "files": [
            ("Q1_2024_25", "https://www.tameside.gov.uk/getmedia/9fa37758-0f8d-4ff5-8d41-670c940b9146/Q1-2024-25-Tameside-Transparency.csv"),
            ("Q2_2024_25", "https://www.tameside.gov.uk/getmedia/03162858-dca7-4df0-9b09-efeff0d211ef/Q2-2024-25-Tameside-Transparency-CSV.csv"),
            ("Q3_2024_25", "https://www.tameside.gov.uk/getmedia/cbecb20e-54ac-427b-a7dd-721f7f51a95a/Q3-2024-25-Tameside-Transparency.csv"),
            ("Q4_2024_25", "https://www.tameside.gov.uk/getmedia/955670e8-0e81-49de-bc1f-4813f6f3e09e/Q4-2024-25-Tameside-Transparency.csv"),
        ],
    },
    "calderdale": {
        "dir": "calderdale",
        "files": [
            (f"{year}_{month_name.lower()}", f"https://www.calderdale.gov.uk/council/finances/income-spending/{year}/{month_name}.csv")
            for year, month_name in [
                ("2024", "April"), ("2024", "May"), ("2024", "June"),
                ("2024", "July"), ("2024", "August"), ("2024", "September"),
                ("2024", "October"), ("2024", "November"), ("2024", "December"),
                ("2025", "January"), ("2025", "February"), ("2025", "March"),
            ]
        ],
    },
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--council", required=True, choices=list(COUNCILS.keys()))
    args = ap.parse_args()
    cfg = COUNCILS[args.council]
    dest_dir = ROOT / "data" / "uk" / "local_authorities" / "spend" / cfg["dir"]
    dest_dir.mkdir(parents=True, exist_ok=True)

    for slug, orig in cfg["files"]:
        dest = dest_dir / f"{slug}.csv"
        if dest.exists() and dest.stat().st_size > 1000:
            print(f"  SKIP {dest.name}")
            continue
        print(f"  SPN: {orig}")
        archived = spn_save(orig)
        if not archived:
            print(f"   FAIL no archived URL")
            continue
        print(f"   archived: {archived}")
        try:
            n = fetch_archived(archived, dest)
            print(f"   {n:,} B  {dest.name}")
        except Exception as ex:
            print(f"   fetch fail: {ex}")
        time.sleep(2)


if __name__ == "__main__":
    main()
