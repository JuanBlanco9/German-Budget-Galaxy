"""Parse historical UK OSCAR CSV files (2015-2019) into budget tree JSONs.

Data sources (HM Treasury OSCAR annual releases):
  2015-2018: https://www.gov.uk/government/publications/oscar-annual-release-november-2019
  2019:      https://www.gov.uk/government/publications/oscar-annual-release-november-2020

Each ZIP contains a pipe-delimited CSV with the same 91-column schema as the
OSCAR II XLSX files used by build_uk_trees_all.py, but with a different data
model:
  - Multiple VERSION_CODEs (PLANS, R0-R13) representing extraction revisions
  - R13 is the final/most accurate revision (all 12 months are actuals)
  - Monthly/quarterly breakdown instead of annual aggregate
  - Period 0 = annual plans/opening position (excluded)
  - Periods 1-12 = monthly in-year returns (actual spending)
  - Period 13 = final outturn adjustments for PESA (included)

We filter to VERSION_CODE='R13' and exclude Period 0 to get actual outturn.
"""
import csv
import io
import json
import os
import sys
import zipfile

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'uk')

# Map fiscal year start -> (zip filename, csv filename inside zip)
FILES = {
    2015: ('2019_OSCAR_Extract_2015_16.zip', '2019_OSCAR_Extract_2015_16.csv'),
    2016: ('2019_OSCAR_Extract_2016_17.zip', '2019_OSCAR_Extract_2016_17.csv'),
    2017: ('2019_OSCAR_Extract_2017_18.zip', '2019_OSCAR_Extract_2017_18.csv'),
    2018: ('2019_OSCAR_Extract_2018_19.zip', '2019_OSCAR_Extract_2018_19.csv'),
    2019: ('2020_OSCAR_Extract_2019_20.zip', '2020_OSCAR_Extract_2019_20.csv'),
}

# Column indices (same as OSCAR XLSX)
COL_DEPT = 6       # DEPARTMENT_GROUP_LONG_NAME
COL_ORG = 8        # ORGANISATION_LONG_NAME
COL_SUBFUNC = 48   # SUB_FUNCTION_LONG_NAME
COL_QUARTER = 2    # QUARTER_SHORT_NAME
COL_VERSION = 84   # VERSION_CODE
COL_AMOUNT = 89    # AMOUNT

# Use the final revision
FINAL_VERSION = 'R13'


def count_nodes(node):
    c = 1
    for ch in node.get('children', []):
        c += count_nodes(ch)
    return c


def max_depth(node, d=0):
    if not node.get('children'):
        return d
    return max(max_depth(ch, d + 1) for ch in node['children'])


def parse_amount(s):
    """Parse OSCAR CSV amount format: ' 000000007780000.' or '-000000000045000.'"""
    s = s.strip().strip('"').strip()
    if not s:
        return None
    try:
        return float(s.rstrip('.'))
    except (ValueError, TypeError):
        return None


for fy, (zip_name, csv_name) in FILES.items():
    out_path = os.path.join(DATA_DIR, f'uk_budget_tree_{fy}.json')

    # Skip if already exists and is big enough
    if os.path.exists(out_path) and os.path.getsize(out_path) > 100000:
        print(f"=== {fy}-{fy+1-2000}: SKIP (exists, {os.path.getsize(out_path)//1024}KB) ===")
        continue

    zip_path = os.path.join(DATA_DIR, zip_name)
    if not os.path.exists(zip_path):
        print(f"=== {fy}-{fy+1-2000}: MISSING {zip_name} ===")
        continue

    print(f"=== {fy}-{fy+1-2000}: Parsing {zip_name}... ===")

    departments = {}
    row_count = 0

    with zipfile.ZipFile(zip_path, 'r') as zf:
        with zf.open(csv_name) as f:
            text_f = io.TextIOWrapper(f, encoding='utf-8', errors='replace')
            reader = csv.reader(text_f, delimiter='|', quotechar='"')
            header = next(reader)

            for row in reader:
                if len(row) <= COL_AMOUNT:
                    continue

                version = row[COL_VERSION].strip()
                if version != FINAL_VERSION:
                    continue

                # Skip Period 0 rows (annual plans/opening position)
                # Keep Periods 1-12 (monthly actuals) and Period 13 (outturn adj)
                quarter = row[COL_QUARTER].strip()
                if 'Period 0' in quarter:
                    continue

                dept = row[COL_DEPT].strip()
                org = row[COL_ORG].strip()
                subfunc = row[COL_SUBFUNC].strip()

                if not dept:
                    continue

                amount = parse_amount(row[COL_AMOUNT])
                if amount is None:
                    continue

                amount = amount * 1000  # OSCAR amounts in thousands

                # Clean up department names
                dept = dept.replace(' (GROUP)', '').replace(' (group)', '').strip()

                if dept not in departments:
                    departments[dept] = {'value': 0, 'orgs': {}}
                departments[dept]['value'] += amount

                if org not in departments[dept]['orgs']:
                    departments[dept]['orgs'][org] = {'value': 0, 'progs': {}}
                departments[dept]['orgs'][org]['value'] += amount

                prog = subfunc or 'General'
                if prog not in departments[dept]['orgs'][org]['progs']:
                    departments[dept]['orgs'][org]['progs'][prog] = 0
                departments[dept]['orgs'][org]['progs'][prog] += amount

                row_count += 1

    print(f"  {row_count} rows parsed")

    # Build tree (same logic as build_uk_trees_all.py)
    children = []
    for dept_name, dept_data in departments.items():
        dept_node = {
            'id': dept_name[:3].lower().replace(' ', ''),
            'name': dept_name,
            'value': round(dept_data['value']),
            'children': []
        }
        for org_name, org_data in dept_data['orgs'].items():
            org_node = {
                'id': org_name[:6].lower().replace(' ', '_'),
                'name': org_name,
                'value': round(org_data['value']),
            }
            progs = {k: v for k, v in org_data['progs'].items() if v != 0}
            if len(progs) > 1:
                org_node['children'] = sorted(
                    [{'id': p[:8].lower().replace(' ', '_'), 'name': p, 'value': round(v)}
                     for p, v in progs.items()],
                    key=lambda x: -abs(x['value'])
                )
            dept_node['children'].append(org_node)

        dept_node['children'].sort(key=lambda x: -abs(x['value']))
        if len(dept_node['children']) == 1 and dept_node['children'][0]['name'] == dept_name:
            dept_node['children'] = dept_node['children'][0].get('children', [])
        children.append(dept_node)

    children.sort(key=lambda x: -abs(x['value']))
    children = [c for c in children if abs(c['value']) > 100000]

    total = sum(c['value'] for c in children)
    fy_label = f'{fy}-{str(fy+1)[2:]}'
    tree = {
        'name': f'UK Government Spending {fy_label}',
        'value': total,
        'children': children
    }

    n = count_nodes(tree)
    d = max_depth(tree)
    print(f"  GBP{total/1e9:.0f}B | {len(children)} depts | {n} nodes | {d} levels")

    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(tree, f)
    print(f"  -> {out_path} ({os.path.getsize(out_path)//1024}KB)\n")
