"""Parse UK OSCAR XLSX files into budget tree JSONs."""
import json
import os
import openpyxl

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'uk')

FILES = {
    2020: 'BUD_20-21.xlsx',
    2021: 'BUD_21-22.xlsx',
    2022: 'BUD_22-23.xlsx',
    2023: 'BUD_23-24.xlsx',
    2024: 'BUD_24-25.xlsx',
}

# Column indices
COL_DEPT = 6       # DEPARTMENT_GROUP_LONG_NAME
COL_ORG = 8        # ORGANISATION_LONG_NAME
COL_SUBFUNC = 48   # SUB_FUNCTION_LONG_NAME
COL_AMOUNT = 89    # AMOUNT


def count_nodes(node):
    c = 1
    for ch in node.get('children', []):
        c += count_nodes(ch)
    return c


def max_depth(node, d=0):
    if not node.get('children'):
        return d
    return max(max_depth(ch, d + 1) for ch in node['children'])


for fy, fname in FILES.items():
    out_path = os.path.join(DATA_DIR, f'uk_budget_tree_{fy}.json')

    # Skip if already exists and is big enough (except 2024 which we want to rebuild)
    if os.path.exists(out_path) and os.path.getsize(out_path) > 100000 and fy != 2024:
        print(f"=== {fy}-{fy+1}: SKIP (exists, {os.path.getsize(out_path)//1024}KB) ===")
        continue

    fpath = os.path.join(DATA_DIR, fname)
    if not os.path.exists(fpath):
        print(f"=== {fy}-{fy+1}: MISSING {fname} ===")
        continue

    print(f"=== {fy}-{fy+1}: Parsing {fname}... ===")

    wb = openpyxl.load_workbook(fpath, read_only=True, data_only=True)
    ws = wb[wb.sheetnames[0]]

    departments = {}
    row_count = 0

    for i, row in enumerate(ws.iter_rows(min_row=2, values_only=True)):
        if not row or len(row) <= COL_AMOUNT:
            continue
        dept = str(row[COL_DEPT] or '').strip()
        org = str(row[COL_ORG] or '').strip()
        subfunc = str(row[COL_SUBFUNC] or '').strip()
        amount = row[COL_AMOUNT]

        if not dept or amount is None:
            continue
        try:
            amount = float(amount) * 1000  # OSCAR amounts in thousands
        except (ValueError, TypeError):
            continue

        # Clean up department names (remove GROUP suffix)
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

    wb.close()
    print(f"  {row_count} rows parsed")

    # Build tree
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
