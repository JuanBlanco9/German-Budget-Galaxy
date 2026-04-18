#!/usr/bin/env python3
"""
extract_ownership_from_accounts.py

Parses downloaded Companies House accounts PDFs and extracts statements about
group structure — ultimate parent, immediate parent, controlling party,
country of incorporation. UK Ltd companies are legally required to disclose
these in the notes to accounts.

Input:  data/recipients/uk/supplier_financials/*.pdf
Output: data/recipients/uk/supplier_accounts_ownership.jsonl
        one line per PDF, with extractions + citations (page, raw match, pdf_path)

Resume-safe: skips PDFs already in the output JSONL.

Usage:
  python scripts/extract_ownership_from_accounts.py
  python scripts/extract_ownership_from_accounts.py --limit 10
  python scripts/extract_ownership_from_accounts.py --redo
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import pdfplumber

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
UK_DIR = ROOT / "data" / "recipients" / "uk"
PDF_DIR = UK_DIR / "supplier_financials"
OUT = UK_DIR / "supplier_accounts_ownership.jsonl"

# Regex patterns — cover multiple phrasings UK Ltds use in notes section
ULTIMATE_PARENT_PATTERNS = [
    re.compile(
        r"ultimate\s+parent\s+(?:company|undertaking|entity)\s+"
        r"(?:of\s+the\s+(?:company|group)\s+)?"
        r"(?:and\s+controlling\s+party\s+)?"
        r"(?:is|was)\s+"
        r"([A-Z][\w&().,\-'\s]{3,120}?)"
        r"(?=[\.,;:]|\s+(?:incorporated|registered|a\s+company|whose|which|The\s+registered)|\s*\(|$)",
        re.IGNORECASE | re.DOTALL,
    ),
    re.compile(
        r"(?:the\s+)?ultimate\s+(?:parent|controlling\s+party|controlling\s+entity)\s+"
        r"(?:is|was)\s+"
        r"([A-Z][\w&().,\-'\s]{3,120}?)"
        r"(?=[\.,;:]|\s+(?:incorporated|registered|a\s+company|whose)|\s*\(|$)",
        re.IGNORECASE | re.DOTALL,
    ),
    re.compile(
        r"ultimate\s+parent\s+(?:and\s+controlling\s+party\s+)?"
        r"(?:undertaking|company|entity)[\s:]+"
        r"([A-Z][\w&().,\-'\s]{3,120}?)"
        r"(?=[\.,;:]|\s+(?:incorporated|registered)|$)",
        re.IGNORECASE | re.DOTALL,
    ),
]

IMMEDIATE_PARENT_PATTERNS = [
    re.compile(
        r"(?:immediate|direct)\s+parent\s+(?:company|undertaking)\s+"
        r"(?:is|was)\s+"
        r"([A-Z][\w&().,\-'\s]{3,120}?)"
        r"(?=[\.,;:]|\s+(?:incorporated|registered|a\s+company|whose)|\s*\(|$)",
        re.IGNORECASE | re.DOTALL,
    ),
    re.compile(
        r"(?:immediate|direct)\s+parent\s+(?:company|undertaking)[\s:]+"
        r"([A-Z][\w&().,\-'\s]{3,120}?)"
        r"(?=[\.,;:]|\s+(?:incorporated|registered)|$)",
        re.IGNORECASE | re.DOTALL,
    ),
]

# Country / jurisdiction mentioned near the parent
JURISDICTION_HINTS = re.compile(
    r"incorporated\s+(?:in|under\s+the\s+laws\s+of)\s+"
    r"([A-Z][\w\s,&\-]{3,60}?)"
    r"(?=[\.,;]|\s+(?:and|under)|$)",
    re.IGNORECASE,
)

# Common junk to strip from captured parent names
NAME_CLEAN_RE = re.compile(r"\s+", re.MULTILINE)
PARENT_NAME_STOPWORDS = re.compile(
    r"\s+(?:a\s+company|whose\s+registered|registered\s+(?:office|in)|which\s+is|that\s+is|and\s+the)\b",
    re.IGNORECASE,
)


def clean_name(s: str) -> str:
    s = NAME_CLEAN_RE.sub(" ", s).strip(" .,;:()\t")
    # cut at stopword if any leaked in
    s = PARENT_NAME_STOPWORDS.split(s, maxsplit=1)[0]
    return s.strip(" .,;:()\t")


def extract_snippets(
    text: str, page_num: int, patterns: list[re.Pattern], label: str
) -> list[dict]:
    found = []
    for pat in patterns:
        for m in pat.finditer(text):
            raw = clean_name(m.group(1))
            if len(raw) < 4 or len(raw) > 140:
                continue
            # skip obvious junk
            if raw.lower() in ("ltd", "limited", "plc", "the company"):
                continue
            # look for nearby jurisdiction mention
            end_ctx = min(len(text), m.end() + 300)
            jur_m = JURISDICTION_HINTS.search(text[m.end() : end_ctx])
            jurisdiction = clean_name(jur_m.group(1)) if jur_m else None
            # short context window
            start = max(0, m.start() - 80)
            end = min(len(text), m.end() + 200)
            context = NAME_CLEAN_RE.sub(" ", text[start:end]).strip()
            found.append({
                "type": label,
                "parent_name": raw,
                "jurisdiction": jurisdiction,
                "page": page_num,
                "raw_match": clean_name(m.group(0))[:220],
                "context": context[:300],
            })
    return found


def process_pdf(pdf_path: Path) -> dict:
    """Extract ownership statements from a PDF."""
    result = {
        "pdf_path": str(pdf_path.relative_to(ROOT)).replace("\\", "/"),
        "company_number": pdf_path.stem.split("_", 1)[0],
        "filing_date": pdf_path.stem.split("_", 1)[1] if "_" in pdf_path.stem else None,
        "pdf_bytes": pdf_path.stat().st_size,
        "extractions": [],
        "pages_scanned": 0,
        "error": None,
    }
    try:
        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)
            # Notes section is typically in the back half of the document.
            # Scan backwards from the end first; break early once we find an ultimate parent.
            # For small PDFs (<15 pages) scan all; for larger, scan last 60% first.
            if total_pages <= 15:
                page_order = list(range(total_pages))
            else:
                # back-weighted scan: last 60% first, then earlier pages
                cutoff = int(total_pages * 0.4)
                page_order = list(range(cutoff, total_pages)) + list(range(0, cutoff))

            found_ultimate = False
            for i in page_order:
                page = pdf.pages[i]
                text = page.extract_text() or ""
                if not text.strip():
                    continue
                result["pages_scanned"] += 1
                # run both pattern groups
                ult = extract_snippets(text, i + 1, ULTIMATE_PARENT_PATTERNS, "ultimate_parent")
                imm = extract_snippets(text, i + 1, IMMEDIATE_PARENT_PATTERNS, "immediate_parent")
                result["extractions"].extend(ult + imm)
                if ult:
                    found_ultimate = True
                # stop scanning further if we already have ≥2 ultimate_parent mentions
                # and at least one immediate_parent (good coverage)
                ult_count = sum(1 for e in result["extractions"] if e["type"] == "ultimate_parent")
                imm_count = sum(1 for e in result["extractions"] if e["type"] == "immediate_parent")
                if ult_count >= 2 and imm_count >= 1:
                    break
                # also stop if we've scanned too many pages
                if result["pages_scanned"] >= 30 and found_ultimate:
                    break
    except Exception as e:
        result["error"] = f"{type(e).__name__}: {e}"
    return result


def load_done(redo: bool) -> set[str]:
    if redo or not OUT.exists():
        return set()
    done = set()
    with open(OUT, encoding="utf-8") as fh:
        for line in fh:
            try:
                obj = json.loads(line)
                if obj.get("pdf_path") and not obj.get("error"):
                    done.add(obj["pdf_path"])
            except json.JSONDecodeError:
                continue
    return done


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--redo", action="store_true", help="Reprocess all (ignore existing output)")
    args = ap.parse_args()

    pdfs = sorted(PDF_DIR.glob("*.pdf"))
    if args.limit:
        pdfs = pdfs[: args.limit]

    done_paths = load_done(args.redo)
    todo = [p for p in pdfs if str(p.relative_to(ROOT)).replace("\\", "/") not in done_paths]

    print(f"PDFs total: {len(pdfs)}")
    print(f"Already processed: {len(done_paths)}")
    print(f"To process: {len(todo)}")
    print(f"Output: {OUT.relative_to(ROOT)}")

    if not todo:
        return

    mode = "w" if args.redo else "a"
    ok = err = with_ult = with_imm = 0
    t0 = time.time()

    with open(OUT, mode, encoding="utf-8") as fh:
        for i, pdf in enumerate(todo, start=1):
            r = process_pdf(pdf)
            r["processed_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")
            fh.flush()
            if r["error"]:
                err += 1
            else:
                ok += 1
                types = {e["type"] for e in r["extractions"]}
                if "ultimate_parent" in types:
                    with_ult += 1
                if "immediate_parent" in types:
                    with_imm += 1
            if i % 25 == 0 or i == len(todo):
                elapsed = time.time() - t0
                rate = i / elapsed if elapsed else 0
                eta = (len(todo) - i) / rate if rate else 0
                print(
                    f"[{i:>4}/{len(todo)}] {pdf.name} ok={ok} err={err} "
                    f"ult={with_ult} imm={with_imm} elapsed={elapsed:.0f}s eta={eta:.0f}s",
                    flush=True,
                )

    print(f"\nDone. ok={ok} err={err} with_ultimate_parent={with_ult} with_immediate_parent={with_imm}")


if __name__ == "__main__":
    main()
