#!/usr/bin/env python3
"""Halton BC: 4 quarterly CSVs (cp1252)."""
from pathlib import Path
import requests, csv

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "data" / "uk" / "local_authorities" / "spend" / "halton"
DEST.mkdir(parents=True, exist_ok=True)
UA = "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36"
TPL = "https://www3.halton.gov.uk/Documents/council%20and%20democracy/Finance/spenddata/2024-2025/Payments%20Over%20%C2%A3500%20{q}%20202425.csv"

for q in ("Q1", "Q2", "Q3", "Q4"):
    dest = DEST / f"spending_2024_25_{q.lower()}.csv"
    if dest.exists():
        print(f"  SKIP {dest.name}")
        continue
    r = requests.get(TPL.format(q=q), headers={"User-Agent": UA}, timeout=60)
    r.raise_for_status()
    # Re-encode cp1252 -> utf-8-sig
    text = r.content.decode("cp1252")
    dest.write_text(text, encoding="utf-8-sig")
    n = sum(1 for _ in open(dest, encoding="utf-8-sig")) - 1
    print(f"  {q}: {n:>5} rows  {dest.name}")
