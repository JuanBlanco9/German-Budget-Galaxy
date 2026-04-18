#!/usr/bin/env python3
"""Comprehensive end-of-session validation — 7 checks.

Exits 0 if all pass, non-zero if any critical check fails.
Warnings are logged but don't fail the script.
"""
import json
import sys
import os
import csv
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parents[1]
SPEND = ROOT / "data" / "uk" / "local_authorities" / "spend"
TREE_PATH = ROOT / "data" / "uk" / "uk_budget_tree_2024.json"
LOOKUP_PATH = SPEND / "council_spend_lookup_2024.json"
AUTO_CFG = SPEND / "auto_configs.json"

CRITICAL = []
WARNINGS = []


def critical(msg):
    CRITICAL.append(msg)
    print(f"  ✗ CRITICAL: {msg}")


def warn(msg):
    WARNINGS.append(msg)
    print(f"  ⚠ WARN: {msg}")


def ok(msg):
    print(f"  ✓ {msg}")


# ───────────────────────────────────────────────
# Load data
# ───────────────────────────────────────────────

print("Loading data...")
try:
    with open(TREE_PATH, encoding="utf-8") as fh:
        tree = json.load(fh)
    print(f"  Tree loaded: {TREE_PATH.stat().st_size:,} bytes")
except Exception as ex:
    print(f"  ✗ Tree load FAILED: {ex}")
    sys.exit(1)

try:
    with open(LOOKUP_PATH, encoding="utf-8") as fh:
        lookup = json.load(fh)
    print(f"  Lookup loaded: {len(lookup)} councils")
except Exception as ex:
    print(f"  ✗ Lookup load FAILED: {ex}")
    sys.exit(1)

try:
    with open(AUTO_CFG, encoding="utf-8") as fh:
        cfg = json.load(fh)
    print(f"  Auto_configs loaded: {len(cfg)} entries")
except Exception as ex:
    print(f"  ✗ Auto_configs load FAILED: {ex}")
    sys.exit(1)

lg = next((c for c in tree["children"] if c["id"] == "local_government_england"), None)
if not lg:
    print("  ✗ local_government_england not in tree")
    sys.exit(1)

# Build tree council index
tree_councils = {}  # name -> node
for cls in lg["children"]:
    for council in cls["children"]:
        tree_councils[council["name"]] = council


def walk(n):
    yield n
    for c in n.get("children", []):
        yield from walk(c)


def has_any_ts(n):
    if n.get("_top_suppliers"):
        return True
    return any(has_any_ts(c) for c in n.get("children", []))


# ───────────────────────────────────────────────
# CHECK 1: Tree + lookup integrity
# ───────────────────────────────────────────────
print("\n=== CHECK 1: Tree + lookup integrity ===")

# 1a. All councils in lookup have a tree node with _top_suppliers
def normalize_name(n):
    import re
    s = str(n).upper().replace("&", "AND")
    aliases = {
        'BCP COUNCIL': 'BOURNEMOUTH CHRISTCHURCH AND POOLE',
        'CITY OF YORK COUNCIL': 'YORK', 'COUNTY DURHAM COUNCIL': 'DURHAM',
        'COUNCIL OF THE ISLES OF SCILLY': 'ISLES OF SCILLY',
        'KINGSTON UPON HULL CITY COUNCIL': 'KINGSTON UPON HULL',
        'LEICESTER CITY COUNCIL': 'LEICESTER CITY',
        'NOTTINGHAM CITY COUNCIL': 'NOTTINGHAM CITY',
        'MEDWAY COUNCIL': 'MEDWAY TOWNS',
        'NEWCASTLE UPON TYNE CITY COUNCIL': 'NEWCASTLE',
        'PLYMOUTH CITY COUNCIL': 'PLYMOUTH',
        'BEDFORD BOROUGH COUNCIL': 'BEDFORD',
        'STOCKTON-ON-TEES BOROUGH COUNCIL': 'STOCKTON ON TEES',
        'DARLINGTON BOROUGH COUNCIL': 'DARLINGTON',
        'HALTON BOROUGH COUNCIL': 'HALTON',
        'REDCAR AND CLEVELAND BOROUGH COUNCIL': 'REDCAR AND CLEVELAND',
        'SOUTHAMPTON CITY COUNCIL': 'SOUTHAMPTON',
        'LEICESTERSHIRE COUNTY COUNCIL': 'LEICESTERSHIRE',
        'EAST RIDING OF YORKSHIRE COUNCIL': 'EAST RIDING OF YORKSHIRE',
        'NORTH LINCOLNSHIRE COUNCIL': 'NORTH LINCOLNSHIRE',
        'EAST SUFFOLK COUNCIL': 'EAST SUFFOLK',
        'CAMBRIDGE CITY COUNCIL': 'CAMBRIDGE',
        'SPELTHORNE BOROUGH COUNCIL': 'SPELTHORNE',
        'OXFORDSHIRE COUNTY COUNCIL': 'OXFORDSHIRE',
        'CHELMSFORD CITY COUNCIL': 'CHELMSFORD',
        'EAST LINDSEY DISTRICT COUNCIL': 'EAST LINDSEY',
    }
    if s.strip() in aliases:
        return aliases[s.strip()]
    for pattern in [r'\bMETROPOLITAN BOROUGH COUNCIL\b', r'\bMETROPOLITAN DISTRICT COUNCIL\b',
                    r'\bCOUNTY COUNCIL\b', r'\bCITY COUNCIL\b', r'\bBOROUGH COUNCIL\b',
                    r'\bDISTRICT COUNCIL\b', r'\bCOUNCIL\b', r'\bROYAL BOROUGH OF\b',
                    r'\bLONDON BOROUGH OF\b', r'\bCC\b', r'\bMBC\b']:
        s = re.sub(pattern, '', s)
    s = re.sub(r'[^A-Z0-9]+', ' ', s).strip()
    return s


tree_councils_norm = {normalize_name(n): v for n, v in tree_councils.items()}
orphans = []
unmatched = []
for lookup_key in lookup.keys():
    ln = normalize_name(lookup_key)
    if ln in tree_councils_norm:
        node = tree_councils_norm[ln]
        if not has_any_ts(node):
            unmatched.append(lookup_key)
    else:
        orphans.append(lookup_key)

if orphans:
    critical(f"{len(orphans)} lookup keys have NO tree node:")
    for o in orphans[:5]: print(f"     {o!r}")
else:
    ok(f"All {len(lookup)} lookup keys map to tree nodes")

if unmatched:
    critical(f"{len(unmatched)} lookup keys map to tree nodes but no _top_suppliers attached:")
    for u in unmatched[:5]: print(f"     {u!r}")
else:
    ok("All matched councils have _top_suppliers in tree")

# 1b. Tree sum integrity (children sum = parent.value for all non-leaf)
drift_count = 0
drift_sum = 0
for n in walk(tree):
    if n.get("children"):
        child_sum = sum(c.get("value", 0) for c in n["children"])
        diff = abs(child_sum - n.get("value", 0))
        if diff > 1:  # tolerate £1 rounding
            drift_count += 1
            drift_sum += diff
if drift_count:
    warn(f"{drift_count} nodes have child-sum != parent.value (total drift £{drift_sum/1e9:.3f}B)")
else:
    ok("Tree sums consistent (children sum = parent value)")

# 1c. JSON validity + size
print(f"  Tree file size: {TREE_PATH.stat().st_size:,} bytes")
print(f"  Lookup file size: {LOOKUP_PATH.stat().st_size:,} bytes")


# ───────────────────────────────────────────────
# CHECK 2: Classification sanity
# ───────────────────────────────────────────────
print("\n=== CHECK 2: Classification sanity ===")

high_other = []
single_cat = []
for name, entry in lookup.items():
    services = entry.get("services", {})
    if not services:
        warn(f"{name}: no services in lookup")
        continue
    totals = {s: d.get("service_total_in_spend_data", 0) for s, d in services.items()}
    total = sum(totals.values())
    if total == 0:
        warn(f"{name}: zero total spend")
        continue
    other_pct = 100 * totals.get("Other Services", 0) / total
    if other_pct > 50:
        high_other.append((name, other_pct, total / 1e6))
    # Check concentration — top category > 80% suggests classifier issue
    if totals:
        max_cat = max(totals, key=totals.get)
        max_pct = 100 * totals[max_cat] / total
        if max_pct > 80 and max_cat not in ("Adult Social Care",):
            single_cat.append((name, max_cat, max_pct, total / 1e6))

if high_other:
    warn(f"{len(high_other)} councils have >50% in 'Other Services' (classifier likely confused):")
    for name, pct, total in sorted(high_other, key=lambda x: -x[1])[:5]:
        print(f"     {pct:>5.1f}%  £{total:>6.1f}M  {name}")
else:
    ok("No councils with >50% Other Services")

if single_cat:
    warn(f"{len(single_cat)} councils dominated by single non-ASC category (>80%):")
    for name, cat, pct, total in sorted(single_cat, key=lambda x: -x[2])[:5]:
        print(f"     {pct:>5.1f}% {cat:<25}  £{total:>6.1f}M  {name}")
else:
    ok("No single-category-dominated councils (except Adult Social Care)")


# ───────────────────────────────────────────────
# CHECK 3: Amount sanity (classified vs MHCLG)
# ───────────────────────────────────────────────
print("\n=== CHECK 3: Amount sanity (classified £ vs MHCLG) ===")

under = []  # classified < 30% of MHCLG (missing months)
over = []   # classified > 150% (possible double-count)
for name, entry in lookup.items():
    ln = normalize_name(name)
    tree_node = tree_councils_norm.get(ln)
    if not tree_node:
        continue
    mhclg = tree_node.get("value", 0)
    if mhclg == 0:
        continue
    total = sum(d.get("service_total_in_spend_data", 0) for d in entry.get("services", {}).values())
    ratio = total / mhclg
    if ratio < 0.3:
        under.append((name, ratio, mhclg / 1e6, total / 1e6))
    if ratio > 1.5:
        over.append((name, ratio, mhclg / 1e6, total / 1e6))

if under:
    warn(f"{len(under)} councils with classified < 30% of MHCLG (possibly missing months):")
    for name, r, mhclg, cl in sorted(under, key=lambda x: x[1])[:10]:
        print(f"     ratio={r:.2f}  MHCLG=£{mhclg:>6.1f}M  classified=£{cl:>6.1f}M  {name}")
else:
    ok("No councils under 30% of MHCLG (no suspicious missing months)")

if over:
    warn(f"{len(over)} councils with classified > 150% of MHCLG (normal for capital+grants but review):")
    for name, r, mhclg, cl in sorted(over, key=lambda x: -x[1])[:10]:
        print(f"     ratio={r:.2f}  MHCLG=£{mhclg:>6.1f}M  classified=£{cl:>6.1f}M  {name}")
else:
    ok("No councils over 150% of MHCLG")


# ───────────────────────────────────────────────
# CHECK 4: Schema/config consistency
# ───────────────────────────────────────────────
print("\n=== CHECK 4: Schema/config consistency ===")

cfg_issues = 0
for c in cfg:
    name = c.get("name", "?")
    dir_path = Path(c.get("dir", ""))
    mapping = Path(c.get("mappingFile", ""))
    if not dir_path.exists():
        critical(f"{name}: dir missing: {dir_path}")
        cfg_issues += 1
        continue
    if not mapping.exists():
        critical(f"{name}: mappingFile missing: {mapping}")
        cfg_issues += 1
        continue
    # Verify at least one CSV exists in dir
    csvs = list(dir_path.glob("*.csv"))
    if not csvs:
        warn(f"{name}: no CSV files in dir")

if cfg_issues == 0:
    ok(f"All {len(cfg)} auto_configs have valid dir + mappingFile")


# ───────────────────────────────────────────────
# CHECK 5: Deploy status
# ───────────────────────────────────────────────
print("\n=== CHECK 5: Deploy status ===")

import subprocess
try:
    r = subprocess.run(
        ["curl", "-sI", "-A", "Mozilla/5.0", "--max-time", "10",
         "https://budgetgalaxy.com/data/uk/uk_budget_tree_2024.json"],
        capture_output=True, text=True, timeout=15
    )
    status_line = r.stdout.split("\n")[0] if r.stdout else ""
    if "200" in status_line:
        # Compare size
        r2 = subprocess.run(
            ["curl", "-sI", "-A", "Mozilla/5.0",
             "https://budgetgalaxy.com/data/uk/uk_budget_tree_2024.json"],
            capture_output=True, text=True, timeout=15
        )
        for line in r2.stdout.split("\n"):
            if line.lower().startswith("content-length:"):
                live_size = int(line.split(":")[1].strip())
                local_size = TREE_PATH.stat().st_size
                if live_size == local_size:
                    ok(f"Live tree matches local ({live_size:,} bytes)")
                else:
                    warn(f"Live tree {live_size:,} ≠ local {local_size:,} — needs deploy")
                break
    else:
        warn(f"budgetgalaxy.com live tree status: {status_line.strip()}")
except Exception as ex:
    warn(f"Deploy check failed: {ex}")


# ───────────────────────────────────────────────
# CHECK 6: NAME_ALIASES audit
# ───────────────────────────────────────────────
print("\n=== CHECK 6: NAME_ALIASES audit ===")

inject_path = ROOT / "scripts" / "inject_council_spend_metadata.js"
inject_js = inject_path.read_text(encoding="utf-8")
import re
aliases_found = re.findall(r"'([A-Z ]+[A-Z])'\s*:\s*'([A-Z ]+[A-Z])'", inject_js)
alias_issues = 0
lookup_keys_upper = {normalize_name(k): k for k in lookup.keys()}
for alias_key, alias_val in aliases_found:
    # alias_key should match some lookup key's uppercase
    if alias_key not in [k.upper() for k in lookup.keys()]:
        # Not a problem — alias is proactive for future lookups
        pass
    # alias_val should normalize to some tree council
    val_norm = normalize_name(alias_val)
    if val_norm not in tree_councils_norm:
        warn(f"NAME_ALIAS '{alias_key}' -> '{alias_val}' target not in tree (normalized: {val_norm!r})")
        alias_issues += 1

if alias_issues == 0:
    ok(f"All {len(aliases_found)} NAME_ALIASES target valid tree nodes")


# ───────────────────────────────────────────────
# CHECK 7: Reproducibility — lookup structure sanity
# ───────────────────────────────────────────────
print("\n=== CHECK 7: Lookup structure + reproducibility markers ===")

missing_fields = 0
for name, entry in lookup.items():
    required = ["services", "fy_label"]
    for f in required:
        if f not in entry:
            warn(f"{name}: missing field {f!r}")
            missing_fields += 1
            break
    for svc_name, svc in entry.get("services", {}).items():
        sreq = ["service_total_in_spend_data", "transaction_count", "unique_suppliers", "top_suppliers"]
        for f in sreq:
            if f not in svc:
                warn(f"{name}/{svc_name}: missing field {f!r}")
                missing_fields += 1
                break

if missing_fields == 0:
    ok(f"All {len(lookup)} lookup entries have required structure")


# ───────────────────────────────────────────────
# SUMMARY
# ───────────────────────────────────────────────
print(f"\n{'='*60}")
print(f"SUMMARY")
print(f"{'='*60}")
print(f"  Critical: {len(CRITICAL)}")
print(f"  Warnings: {len(WARNINGS)}")

# Coverage sanity (just report)
cv = tv = cc = tc = 0
for cls in lg["children"]:
    for c in cls["children"]:
        tc += 1
        tv += c.get("value", 0)
        if has_any_ts(c):
            cc += 1
            cv += c.get("value", 0)
print(f"  Coverage: {cc}/{tc} councils, £{cv/1e9:.2f}B / £{tv/1e9:.2f}B = {100*cv/tv:.2f}%")

sys.exit(1 if CRITICAL else 0)
