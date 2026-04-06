"""
Build UK Local Authority spending trees from MHCLG Revenue Outturn data.

Source: Revenue Outturn Multi-Year Time Series CSV v3.1
URL: https://assets.publishing.service.gov.uk/media/6937fe05e447374889cd8f4b/Revenue_Outturn_time_series_data_v3.1.csv
Publisher: Ministry of Housing, Communities and Local Government (MHCLG)

Outputs:
  - data/uk/local_authorities/uk_la_tree_YYYY.json  (service-level summary per year)
  - data/uk/local_authorities/uk_la_detailed_YYYY.json  (service areas with top 20 LAs, latest year)

Values: GBP integers (source is in thousands, multiplied by 1000)
"""

import csv
import json
import os
import sys

# ---- Configuration ----

CSV_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'uk', 'local_authorities', 'revenue_outturn_timeseries.csv')
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'uk', 'local_authorities')

# Fiscal year mapping: year_ending code -> (label, output year suffix)
YEAR_MAP = {
    '201803': ('2017-18', 2018),
    '201903': ('2018-19', 2019),
    '202003': ('2019-20', 2020),
    '202103': ('2020-21', 2021),
    '202203': ('2021-22', 2022),
    '202303': ('2022-23', 2023),
    '202403': ('2023-24', 2024),
    '202503': ('2024-25', 2025),
}

# 13 service area columns -> (id_suffix, display_name)
SERVICE_AREAS = {
    'RS_edu_net_exp':   ('edu',   'Education Services'),
    'RS_trans_net_exp':  ('trans', 'Highways and Transport'),
    'RS_csc_net_exp':   ('csc',   "Children's Social Care"),
    'RS_asc_net_exp':   ('asc',   'Adult Social Care'),
    'RS_phs_net_exp':   ('phs',   'Public Health'),
    'RS_hous_net_exp':  ('hous',  'Housing Services'),
    'RS_cul_net_exp':   ('cul',   'Cultural and Related Services'),
    'RS_env_net_exp':   ('env',   'Environmental and Regulatory Services'),
    'RS_plan_net_exp':  ('plan',  'Planning and Development'),
    'RS_pol_net_exp':   ('pol',   'Police Services'),
    'RS_frs_net_exp':   ('frs',   'Fire and Rescue Services'),
    'RS_cen_net_exp':   ('cen',   'Central Services'),
    'RS_oth_net_exp':   ('oth',   'Other Services'),
}

TOTAL_COL = 'RS_totsx_net_exp'

SOURCE = 'MHCLG Revenue Outturn'
SOURCE_URL = 'https://assets.publishing.service.gov.uk/media/6937fe05e447374889cd8f4b/Revenue_Outturn_time_series_data_v3.1.csv'


def safe_float(val):
    """Convert CSV value to float, handling empty strings and non-numeric."""
    if val is None or val.strip() == '':
        return 0.0
    try:
        return float(val)
    except ValueError:
        return 0.0


def to_gbp(thousands_val):
    """Convert value in GBP thousands to GBP integer."""
    return int(round(thousands_val * 1000))


def read_csv():
    """Read the CSV and return headers + all rows as dicts (only relevant columns)."""
    csv_path = os.path.normpath(CSV_PATH)
    print(f"Reading CSV: {csv_path}")

    relevant_keys = ['year_ending', 'status', 'LA_name', 'LA_class', 'LA_subclass',
                     'ONS_code', TOTAL_COL] + list(SERVICE_AREAS.keys())

    rows = []
    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Only keep relevant columns to save memory
            slim = {k: row[k] for k in relevant_keys if k in row}
            rows.append(slim)

    print(f"  Read {len(rows)} rows")
    return rows


def build_summary_tree(rows, year_code):
    """Build a summary tree for one fiscal year using the England total row."""
    year_label, year_suffix = YEAR_MAP[year_code]

    # Find the England total row
    england_row = None
    for r in rows:
        if r['year_ending'] == year_code and r['status'] == 'total' and r['LA_name'] == 'England':
            england_row = r
            break

    if england_row is None:
        print(f"  WARNING: No England total row for {year_code}, skipping")
        return None

    # Build children from service areas
    children = []
    for col, (id_suffix, name) in SERVICE_AREAS.items():
        val_thousands = safe_float(england_row.get(col, '0'))
        val_gbp = to_gbp(val_thousands)
        # Only include services with positive net expenditure
        if val_gbp > 0:
            children.append({
                'id': f'uk_la_{id_suffix}',
                'name': name,
                'value': val_gbp,
            })

    # Sort children by value descending
    children.sort(key=lambda x: x['value'], reverse=True)

    total_val = to_gbp(safe_float(england_row.get(TOTAL_COL, '0')))

    tree = {
        'id': 'uk_la',
        'name': 'Local Authorities (England)',
        'value': total_val,
        'source': SOURCE,
        'sourceUrl': SOURCE_URL,
        'year': year_label,
        'children': children,
    }

    return tree, year_suffix


def build_detailed_tree(rows, year_code):
    """
    Build a detailed 3-level tree for one fiscal year:
      Level 1: Service areas
      Level 2: Top 20 individual LAs by spend within each service area

    This gives the visualization drill-down into which councils spend the most
    on each service.
    """
    year_label, year_suffix = YEAR_MAP[year_code]

    # Collect individual LA rows for this year
    la_rows = [r for r in rows
                if r['year_ending'] == year_code and r['status'] == 'submitted']

    # Find England total for the root value
    england_row = None
    for r in rows:
        if r['year_ending'] == year_code and r['status'] == 'total' and r['LA_name'] == 'England':
            england_row = r
            break

    if england_row is None:
        print(f"  WARNING: No England total row for {year_code}, skipping detailed tree")
        return None

    total_val = to_gbp(safe_float(england_row.get(TOTAL_COL, '0')))

    # Build children: one per service area, each with top 20 LAs
    service_children = []

    for col, (id_suffix, service_name) in SERVICE_AREAS.items():
        service_total_thousands = safe_float(england_row.get(col, '0'))
        service_total_gbp = to_gbp(service_total_thousands)

        if service_total_gbp <= 0:
            continue

        # Get all LAs sorted by spend in this service
        la_spend = []
        for r in la_rows:
            val_thousands = safe_float(r.get(col, '0'))
            val_gbp = to_gbp(val_thousands)
            if val_gbp > 0:
                la_spend.append({
                    'name': r['LA_name'],
                    'class': r['LA_class'],
                    'value': val_gbp,
                })

        la_spend.sort(key=lambda x: x['value'], reverse=True)

        # Take top 20 + aggregate the rest as "Other Local Authorities"
        top_n = 20
        top_las = la_spend[:top_n]
        rest_las = la_spend[top_n:]

        la_children = []
        for la in top_las:
            la_id = la['name'].lower().replace(' ', '_').replace("'", '').replace('&', 'and')
            la_id = ''.join(c for c in la_id if c.isalnum() or c == '_')
            la_children.append({
                'id': f'uk_la_{id_suffix}_{la_id}',
                'name': la['name'],
                'value': la['value'],
            })

        if rest_las:
            rest_total = sum(la['value'] for la in rest_las)
            if rest_total > 0:
                la_children.append({
                    'id': f'uk_la_{id_suffix}_other_las',
                    'name': f'Other Local Authorities ({len(rest_las)})',
                    'value': rest_total,
                })

        # Re-sort after adding "Other"
        la_children.sort(key=lambda x: x['value'], reverse=True)

        service_children.append({
            'id': f'uk_la_{id_suffix}',
            'name': service_name,
            'value': service_total_gbp,
            'children': la_children,
        })

    # Sort service areas by value descending
    service_children.sort(key=lambda x: x['value'], reverse=True)

    tree = {
        'id': 'uk_la',
        'name': 'Local Authorities (England) - Detailed',
        'value': total_val,
        'source': SOURCE,
        'sourceUrl': SOURCE_URL,
        'year': year_label,
        'children': service_children,
    }

    return tree, year_suffix


def build_by_class_tree(rows, year_code):
    """
    Build an alternative detailed tree grouped by LA class:
      Level 1: LA classes (London Boroughs, Met Districts, etc.)
      Level 2: Individual LAs within each class (top 20 + rest)

    Values are total service expenditure per LA.
    """
    year_label, year_suffix = YEAR_MAP[year_code]

    # Collect individual LA rows for this year
    la_rows = [r for r in rows
                if r['year_ending'] == year_code and r['status'] == 'submitted']

    # Find England total
    england_row = None
    for r in rows:
        if r['year_ending'] == year_code and r['status'] == 'total' and r['LA_name'] == 'England':
            england_row = r
            break

    if england_row is None:
        return None

    total_val = to_gbp(safe_float(england_row.get(TOTAL_COL, '0')))

    # Group LAs by class
    CLASS_NAMES = {
        'London': 'London Boroughs',
        'Met District': 'Metropolitan Districts',
        'Unitary Authority': 'Unitary Authorities',
        'Shire County': 'Shire Counties',
        'Shire District': 'Shire Districts',
        'Other': 'Other Authorities',
    }

    CLASS_IDS = {
        'London': 'london',
        'Met District': 'met',
        'Unitary Authority': 'unitary',
        'Shire County': 'shire_county',
        'Shire District': 'shire_district',
        'Other': 'other',
    }

    by_class = {}
    for r in la_rows:
        cls = r['LA_class']
        if cls == 'Eng':
            continue  # skip England-level
        if cls not in by_class:
            by_class[cls] = []
        val_gbp = to_gbp(safe_float(r.get(TOTAL_COL, '0')))
        if val_gbp > 0:
            by_class[cls].append({
                'name': r['LA_name'],
                'value': val_gbp,
            })

    # Also get class totals from total rows
    class_totals = {}
    for r in rows:
        if r['year_ending'] == year_code and r['status'] == 'total' and r['LA_class'] != 'Eng':
            cls = r['LA_class']
            val = to_gbp(safe_float(r.get(TOTAL_COL, '0')))
            if cls in class_totals:
                class_totals[cls] += val
            else:
                class_totals[cls] = val

    class_children = []
    for cls in sorted(by_class.keys()):
        las = by_class[cls]
        las.sort(key=lambda x: x['value'], reverse=True)

        cls_name = CLASS_NAMES.get(cls, cls)
        cls_id = CLASS_IDS.get(cls, cls.lower().replace(' ', '_'))
        cls_total = class_totals.get(cls, sum(la['value'] for la in las))

        # Top 20 + rest
        top_las = las[:20]
        rest_las = las[20:]

        la_children = []
        for la in top_las:
            la_id = la['name'].lower().replace(' ', '_').replace("'", '').replace('&', 'and')
            la_id = ''.join(c for c in la_id if c.isalnum() or c == '_')
            la_children.append({
                'id': f'uk_la_{cls_id}_{la_id}',
                'name': la['name'],
                'value': la['value'],
            })

        if rest_las:
            rest_total = sum(la['value'] for la in rest_las)
            if rest_total > 0:
                la_children.append({
                    'id': f'uk_la_{cls_id}_other',
                    'name': f'Other ({len(rest_las)} authorities)',
                    'value': rest_total,
                })

        la_children.sort(key=lambda x: x['value'], reverse=True)

        if cls_total > 0:
            class_children.append({
                'id': f'uk_la_{cls_id}',
                'name': cls_name,
                'value': cls_total,
                'children': la_children,
            })

    class_children.sort(key=lambda x: x['value'], reverse=True)

    tree = {
        'id': 'uk_la_by_class',
        'name': 'Local Authorities by Type (England)',
        'value': total_val,
        'source': SOURCE,
        'sourceUrl': SOURCE_URL,
        'year': year_label,
        'children': class_children,
    }

    return tree, year_suffix


def main():
    rows = read_csv()

    os.makedirs(OUT_DIR, exist_ok=True)

    # Build summary trees for all years
    print("\nBuilding summary trees...")
    for year_code in sorted(YEAR_MAP.keys()):
        result = build_summary_tree(rows, year_code)
        if result is None:
            continue
        tree, year_suffix = result
        out_path = os.path.join(OUT_DIR, f'uk_la_tree_{year_suffix}.json')
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(tree, f, indent=2, ensure_ascii=False)
        n_children = len(tree['children'])
        print(f"  {YEAR_MAP[year_code][0]}: {tree['value']:,} GBP total, {n_children} service areas -> {out_path}")

    # Build detailed tree for the most recent year (202503 = 2024-25)
    latest_year = '202503'
    print(f"\nBuilding detailed tree for {YEAR_MAP[latest_year][0]}...")

    result = build_detailed_tree(rows, latest_year)
    if result:
        tree, year_suffix = result
        out_path = os.path.join(OUT_DIR, f'uk_la_detailed_{year_suffix}.json')
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(tree, f, indent=2, ensure_ascii=False)
        n_services = len(tree['children'])
        n_las = sum(len(s.get('children', [])) for s in tree['children'])
        print(f"  Service-area detail: {n_services} services, {n_las} LA entries -> {out_path}")

    # Build by-class tree for the most recent year
    print(f"\nBuilding by-class tree for {YEAR_MAP[latest_year][0]}...")

    result = build_by_class_tree(rows, latest_year)
    if result:
        tree, year_suffix = result
        out_path = os.path.join(OUT_DIR, f'uk_la_by_class_{year_suffix}.json')
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(tree, f, indent=2, ensure_ascii=False)
        n_classes = len(tree['children'])
        n_las = sum(len(s.get('children', [])) for s in tree['children'])
        print(f"  By-class detail: {n_classes} classes, {n_las} LA entries -> {out_path}")

    print("\nDone!")


if __name__ == '__main__':
    main()
