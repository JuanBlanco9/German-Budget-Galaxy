#!/usr/bin/env python
"""
build_fr_ss_trees.py
====================
Parse DREES Comptes de la Protection Sociale (CPS) CSV and build budget tree
JSONs for the Budget Galaxy project.

Data source: DREES CPS 2024 (drees_cps_2024.csv)
    - Semicolon-separated, UTF-8-sig encoding
    - 15,655 rows covering 1959-2024
    - Columns: annee;ps_niveau;ps_code;ps_lib;risque;nom_regime;
               si_niveau;si_code;si_nom;val

Filters applied:
    - nom_regime = "Total tous regimes" (cross-regime aggregate)
    - This gives the total social protection spending across all institutional
      regimes (Securite Sociale, State, local governments, complementary, etc.)

Tree structure (per year):
    Protection Sociale (niveau=0, E11-0)
      |-- SANTE (niveau=1, E11-1)
      |     |-- MALADIE (niveau=2, E11-11)
      |     |     |-- niveau=3 sub-categories
      |     |           |-- niveau=4 detail items
      |     |-- INVALIDITE (niveau=2, E11-12)
      |     |-- AT-MP (niveau=2, E11-13)
      |-- VIEILLESSE-SURVIE (niveau=1, E11-2)
      |     |-- VIEILLESSE (niveau=2, E11-21)
      |     |-- SURVIE (niveau=2, E11-22)
      |-- FAMILLE (niveau=1, E11-3)
      |-- EMPLOI (niveau=1, E11-4)
      |-- LOGEMENT (niveau=1, E11-5)
      |-- PAUVRETE-EXCLUSION SOCIALE (niveau=1, E11-6)

The tree maps the DREES 6-risk structure faithfully. While the task references
the 5 institutional Securite Sociale branches (Maladie, Vieillesse, Famille,
AT-MP, Autonomie), the DREES data uses a broader functional classification
covering ALL social protection spending. The niveau=2 sub-branches under SANTE
separate Maladie, Invalidite, and AT-MP. Autonomie-related spending appears
under VIEILLESSE > Prestations liees a la dependance (E11-21.4).

Output: data/fr/securite_sociale/fr_ss_tree_YYYY.json (one per year)
        data/fr/securite_sociale/securite_sociale_enrichment.json

Values: CSV values are in millions EUR -> multiplied by 1,000,000 for the tree.
"""

import csv
import json
import os
import sys
from collections import defaultdict

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
CSV_PATH = os.path.join(PROJECT_DIR, "drees_cps_2024.csv")
OUTPUT_DIR = os.path.join(PROJECT_DIR, "data", "fr", "securite_sociale")

# Which years to export (empty = all available)
# We focus on 2000-2024 to keep the output manageable; change as needed.
YEAR_RANGE = range(2000, 2025)

# Filter: use the cross-regime aggregate
REGIME_FILTER = "Total tous"

# ---------------------------------------------------------------------------
# Branch display names (French + English gloss)
# ---------------------------------------------------------------------------
BRANCH_NAMES = {
    "SANTÉ": "Sante (Health)",
    "SANTE": "Sante (Health)",
    "VIEILLESSE-SURVIE": "Vieillesse-Survie (Pensions & Survivors)",
    "FAMILLE": "Famille (Family)",
    "EMPLOI": "Emploi (Employment)",
    "LOGEMENT": "Logement (Housing)",
    "PAUVRETÉ-EXCLUSION SOCIALE": "Pauvrete-Exclusion sociale (Poverty)",
    "PAUVRETE-EXCLUSION SOCIALE": "Pauvrete-Exclusion sociale (Poverty)",
}

# ID slugs for branches (risque -> id suffix)
BRANCH_IDS = {
    "SANTÉ": "sante",
    "SANTE": "sante",
    "VIEILLESSE-SURVIE": "vieillesse_survie",
    "FAMILLE": "famille",
    "EMPLOI": "emploi",
    "LOGEMENT": "logement",
    "PAUVRETÉ-EXCLUSION SOCIALE": "pauvrete",
    "PAUVRETE-EXCLUSION SOCIALE": "pauvrete",
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_id(ps_code):
    """Convert a ps_code like E11-21.4.13 into a slug like e11_21_4_13."""
    return ps_code.lower().replace("-", "_").replace(".", "_")


def millions_to_units(val_str):
    """Convert a string value in millions EUR to integer EUR."""
    try:
        return round(float(val_str) * 1_000_000)
    except (ValueError, TypeError):
        return 0


def clean_label(label):
    """Truncate long labels and clean up encoding artifacts."""
    # The CSV may have truncated labels; keep as-is but cap at 120 chars
    if len(label) > 120:
        return label[:117] + "..."
    return label


def build_tree_node(ps_code, ps_lib, value, children=None, node_id=None):
    """Build a single tree node dict."""
    node = {
        "id": node_id or f"fr_ss_{make_id(ps_code)}",
        "name": clean_label(ps_lib),
        "value": value,
    }
    if children:
        # Sort children by value descending
        node["children"] = sorted(children, key=lambda c: c["value"], reverse=True)
    return node


# ---------------------------------------------------------------------------
# Main logic
# ---------------------------------------------------------------------------

def load_csv():
    """Load and return all rows from the DREES CPS CSV."""
    rows = []
    with open(CSV_PATH, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f, delimiter=";")
        for row in reader:
            rows.append(row)
    print(f"Loaded {len(rows)} rows from {CSV_PATH}")
    return rows


def filter_rows(rows, year):
    """Filter rows for a specific year and the cross-regime aggregate."""
    return [
        r for r in rows
        if r["annee"] == str(year)
        and REGIME_FILTER in r["nom_regime"]
    ]


def build_tree_for_year(rows, year):
    """
    Build the full protection sociale tree for a given year.

    Strategy:
    1. Get the niveau=0 grand total
    2. Get niveau=1 branches (6 risk categories)
    3. For each branch, get niveau=2 sub-branches
    4. For each sub-branch, get niveau=3 categories
    5. For each category, get niveau=4 detail items

    At each level, build children bottom-up and verify sums.
    """
    filtered = filter_rows(rows, year)
    if not filtered:
        return None

    # Index rows by (ps_niveau, ps_code)
    by_niveau = defaultdict(list)
    for r in filtered:
        by_niveau[r["ps_niveau"]].append(r)

    # Get grand total (niveau=0)
    total_rows = by_niveau.get("0", [])
    if not total_rows:
        print(f"  WARNING: No niveau=0 total found for {year}")
        return None

    grand_total_row = total_rows[0]
    grand_total_value = millions_to_units(grand_total_row["val"])

    # Build niveau=4 items indexed by ps_code prefix (first 3 parts)
    n4_by_parent = defaultdict(list)
    for r in by_niveau.get("4", []):
        code = r["ps_code"]
        # Parent code: E11-11.1.01 -> parent is E11-11.1
        parts = code.rsplit(".", 1)
        parent_code = parts[0] if len(parts) > 1 else code
        n4_by_parent[parent_code].append(r)

    # Build niveau=3 items indexed by niveau=2 parent
    n3_by_parent = defaultdict(list)
    for r in by_niveau.get("3", []):
        code = r["ps_code"]
        # E11-11.1 -> parent is E11-11
        parts = code.rsplit(".", 1)
        parent_code = parts[0] if len(parts) > 1 else code
        n3_by_parent[parent_code].append(r)

    # Build niveau=2 items indexed by risque
    n2_by_risque = defaultdict(list)
    for r in by_niveau.get("2", []):
        n2_by_risque[r["risque"]].append(r)

    # Build niveau=1 items (the 6 main branches)
    n1_rows = by_niveau.get("1", [])

    # --- Assemble tree bottom-up ---

    def build_n4_children(parent_code):
        """Build niveau=4 leaf nodes under a niveau=3 parent."""
        children = []
        for r in n4_by_parent.get(parent_code, []):
            val = millions_to_units(r["val"])
            if val > 0:
                children.append(build_tree_node(r["ps_code"], r["ps_lib"], val))
        return children

    def build_n3_children(parent_code):
        """Build niveau=3 nodes (with their niveau=4 children) under a niveau=2 parent."""
        children = []
        for r in n3_by_parent.get(parent_code, []):
            val = millions_to_units(r["val"])
            if val <= 0:
                continue
            n4_children = build_n4_children(r["ps_code"])
            children.append(build_tree_node(r["ps_code"], r["ps_lib"], val, n4_children or None))
        return children

    def build_n2_children(risque):
        """Build niveau=2 nodes (with their n3/n4 children) under a niveau=1 branch."""
        children = []
        for r in n2_by_risque.get(risque, []):
            val = millions_to_units(r["val"])
            if val <= 0:
                continue
            n3_children = build_n3_children(r["ps_code"])
            children.append(build_tree_node(r["ps_code"], r["ps_lib"], val, n3_children or None))
        return children

    # Build the 6 main branches
    branch_nodes = []
    for r in n1_rows:
        risque = r["risque"]
        val = millions_to_units(r["val"])
        if val <= 0:
            continue

        # Get display name
        branch_name = r["ps_lib"]
        branch_id_suffix = BRANCH_IDS.get(risque, make_id(r["ps_code"]))
        node_id = f"fr_ss_{branch_id_suffix}"

        n2_children = build_n2_children(risque)
        branch_nodes.append(build_tree_node(
            r["ps_code"], branch_name, val, n2_children or None, node_id=node_id
        ))

    # Verify branch sum vs grand total
    branch_sum = sum(b["value"] for b in branch_nodes)
    diff_pct = abs(branch_sum - grand_total_value) / grand_total_value * 100 if grand_total_value else 0
    if diff_pct > 0.01:
        print(f"  NOTE: Branch sum ({branch_sum:,}) differs from total ({grand_total_value:,}) by {diff_pct:.3f}%")

    # Root node
    tree = {
        "id": "fr_ss",
        "name": f"Protection Sociale {year}",
        "value": grand_total_value,
        "year": year,
        "currency": "EUR",
        "source": "DREES - Comptes de la Protection Sociale (CPS)",
        "source_url": "https://data.drees.solidarites-sante.gouv.fr",
        "filter": f'nom_regime contains "{REGIME_FILTER}" (all regimes combined)',
        "note": "Values originally in millions EUR, converted to EUR units",
        "children": sorted(branch_nodes, key=lambda c: c["value"], reverse=True),
    }

    return tree


def verify_children_sums(node, path="root", issues=None):
    """Recursively verify that children sum to parent value."""
    if issues is None:
        issues = []

    if "children" not in node or not node["children"]:
        return issues

    children_sum = sum(c["value"] for c in node["children"])
    parent_val = node["value"]

    if parent_val > 0:
        diff_pct = abs(children_sum - parent_val) / parent_val * 100
        if diff_pct > 1.0:  # More than 1% difference
            issues.append({
                "path": path,
                "parent_value": parent_val,
                "children_sum": children_sum,
                "diff_pct": round(diff_pct, 2),
            })

    for child in node["children"]:
        child_path = f"{path} > {child.get('name', '?')[:40]}"
        verify_children_sums(child, child_path, issues)

    return issues


def build_enrichment():
    """
    Build an enrichment JSON with descriptions for the main nodes.
    This provides bilingual descriptions for use in the Budget Galaxy UI.
    """
    enrichment = {
        "_meta": {
            "source": "DREES Comptes de la Protection Sociale",
            "description": "Descriptions for French social protection budget tree nodes",
            "language": "en",
        },
        "fr_ss": {
            "name": "Protection Sociale",
            "name_en": "Social Protection",
            "description": "Total social protection spending in France, covering all regimes: "
                           "Securite Sociale, State interventions, local governments, "
                           "complementary schemes, and private insurance.",
        },
        "fr_ss_sante": {
            "name": "Sante",
            "name_en": "Health",
            "description": "Health-related social protection: illness benefits, hospital care, "
                           "outpatient care, complementary health coverage, disability benefits, "
                           "medico-social services, and occupational accidents/diseases.",
            "children": {
                "fr_ss_e11_11": {
                    "name": "Maladie",
                    "name_en": "Illness / Sickness",
                    "description": "Sickness insurance: daily allowances (indemnites journalieres), "
                                   "hospital and outpatient care reimbursements, complementary health "
                                   "coverage, and medico-social care for the elderly (EHPAD, SSIAD).",
                },
                "fr_ss_e11_12": {
                    "name": "Invalidite",
                    "name_en": "Disability",
                    "description": "Disability benefits: invalidity pensions and rentes, AAH (Allocation "
                                   "aux Adultes Handicapes), PCH (Prestation de Compensation du Handicap), "
                                   "residential care for disabled persons, and sheltered work (ESAT).",
                },
                "fr_ss_e11_13": {
                    "name": "Accidents du Travail et Maladies Professionnelles",
                    "name_en": "Occupational Accidents & Diseases (AT-MP)",
                    "description": "Work accident and occupational disease benefits: permanent disability "
                                   "rentes, FIVA asbestos compensation, early retirement for asbestos "
                                   "workers (ACAATA), and pesticide victim compensation.",
                },
            },
        },
        "fr_ss_vieillesse_survie": {
            "name": "Vieillesse-Survie",
            "name_en": "Old Age & Survivors",
            "description": "Pensions and survivor benefits: basic and complementary pensions, "
                           "minimum vieillesse (ASPA), dependency/autonomy benefits (APA, PCH for 60+), "
                           "and survivor pensions (pensions de reversion).",
            "children": {
                "fr_ss_e11_21": {
                    "name": "Vieillesse",
                    "name_en": "Old Age / Pensions",
                    "description": "Old-age pensions: basic pensions (regime general, civil servants, "
                                   "special regimes), complementary pensions (AGIRC-ARRCO), supplementary "
                                   "pensions, minimum vieillesse (ASPA), and dependency benefits (APA).",
                },
                "fr_ss_e11_22": {
                    "name": "Survie",
                    "name_en": "Survivors",
                    "description": "Survivor benefits: pensions de reversion (with and without means-testing), "
                                   "survivor pensions from complementary schemes, and related benefits.",
                },
            },
        },
        "fr_ss_famille": {
            "name": "Famille",
            "name_en": "Family",
            "description": "Family benefits administered primarily by CAF (Caisse d'Allocations Familiales): "
                           "allocations familiales, PAJE (birth/adoption benefits), childcare benefits, "
                           "education grants, maternity/paternity leave, and child welfare (ASE).",
        },
        "fr_ss_emploi": {
            "name": "Emploi",
            "name_en": "Employment",
            "description": "Employment-related social protection: unemployment insurance (ARE via UNEDIC), "
                           "professional training, job insertion programs, early retirement schemes, "
                           "and Pole Emploi placement services.",
        },
        "fr_ss_logement": {
            "name": "Logement",
            "name_en": "Housing",
            "description": "Housing allowances: APL (Aide Personnalisee au Logement), ALF (Allocation "
                           "de Logement Familiale), and ALS (Allocation de Logement Sociale).",
        },
        "fr_ss_pauvrete": {
            "name": "Pauvrete-Exclusion Sociale",
            "name_en": "Poverty & Social Exclusion",
            "description": "Anti-poverty benefits: RSA (Revenu de Solidarite Active), Prime d'activite, "
                           "emergency housing, energy vouchers (cheque-energie), higher education grants, "
                           "and other social minima.",
        },
    }

    return enrichment


def main():
    rows = load_csv()

    # Determine available years
    available_years = sorted(set(int(r["annee"]) for r in rows))
    target_years = [y for y in available_years if y in YEAR_RANGE]
    print(f"Available years: {available_years[0]}-{available_years[-1]} ({len(available_years)} years)")
    print(f"Building trees for: {target_years[0]}-{target_years[-1]} ({len(target_years)} years)")

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    success_count = 0
    all_issues = {}

    for year in target_years:
        tree = build_tree_for_year(rows, year)
        if tree is None:
            print(f"  {year}: SKIPPED (no data)")
            continue

        # Verify children sums
        issues = verify_children_sums(tree)
        if issues:
            all_issues[year] = issues

        # Count nodes
        def count_nodes(node):
            c = 1
            for child in node.get("children", []):
                c += count_nodes(child)
            return c

        node_count = count_nodes(tree)

        # Save
        out_path = os.path.join(OUTPUT_DIR, f"fr_ss_tree_{year}.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(tree, f, ensure_ascii=False, indent=2)

        total_b = tree["value"] / 1_000_000_000
        print(f"  {year}: {total_b:,.1f}B EUR, {node_count} nodes -> {out_path}")
        success_count += 1

    # Save enrichment
    enrichment = build_enrichment()
    enrichment_path = os.path.join(OUTPUT_DIR, "securite_sociale_enrichment.json")
    with open(enrichment_path, "w", encoding="utf-8") as f:
        json.dump(enrichment, f, ensure_ascii=False, indent=2)
    print(f"\nEnrichment saved to {enrichment_path}")

    # Report verification issues
    if all_issues:
        print(f"\n--- Verification: {len(all_issues)} years had children-sum discrepancies > 1% ---")
        for year, issues in sorted(all_issues.items()):
            for iss in issues[:3]:  # Show max 3 per year
                print(f"  {year}: {iss['path'][:60]} "
                      f"parent={iss['parent_value']:,} children_sum={iss['children_sum']:,} "
                      f"diff={iss['diff_pct']}%")
    else:
        print("\nVerification: All children sums match parent values within 1% tolerance.")

    print(f"\nDone. {success_count} trees generated in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
