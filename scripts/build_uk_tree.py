"""Parse OSCAR ODS XML into a multi-level UK budget tree JSON."""
import re
import json
import os

XML_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'uk', 'oscar_extracted', 'content.xml')
OUT_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'uk', 'uk_budget_tree_2024.json')

HEADERS = [
    'org_code', 'organisation', 'control_budget_code', 'control_budget_detail',
    'department', 'sub_segment_code', 'sub_segment', 'econ_cat_code',
    'econ_cat', 'econ_budget_code', 'pesa_code', 'version',
    'year', 'quarter', 'month', 'amount'
]
NUM_COLS = len(HEADERS)

print(f"Reading XML from {XML_PATH}...")
with open(XML_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the OSCAR dataset table
oscar_start = content.find('OSCAR_in_year_dataset')
# Find the actual table body start (after header row)
table_start = content.find('<table:table-row', oscar_start)

# Extract all rows from the OSCAR table
# Each row is <table:table-row>...</table:table-row>
oscar_section = content[table_start:]
# Stop at the next table
next_table = oscar_section.find('<table:named-expressions')
if next_table > 0:
    oscar_section = oscar_section[:next_table]

print("Parsing rows...")
rows = []
row_pattern = re.compile(r'<table:table-row[^>]*>(.*?)</table:table-row>', re.DOTALL)
cell_pattern = re.compile(r'<table:table-cell([^>]*)(?:>(.*?)</table:table-cell>|/>)', re.DOTALL)
text_pattern = re.compile(r'<text:p>([^<]*)</text:p>')
value_pattern = re.compile(r'office:value="([^"]*)"')
repeat_pattern = re.compile(r'table:number-columns-repeated="(\d+)"')

for row_match in row_pattern.finditer(oscar_section):
    row_content = row_match.group(1)
    cells = []
    for cell_match in cell_pattern.finditer(row_content):
        attrs = cell_match.group(1)
        cell_body = cell_match.group(2) or ''

        # Check for repeated empty cells
        rep_m = repeat_pattern.search(attrs)
        repeat = int(rep_m.group(1)) if rep_m else 1

        # Get value
        val_m = value_pattern.search(attrs)
        txt_m = text_pattern.search(cell_body)

        if val_m:
            val = val_m.group(1)
        elif txt_m:
            val = txt_m.group(1)
        else:
            val = ''

        # For repeated cells, only add up to what we need
        for _ in range(min(repeat, NUM_COLS - len(cells))):
            cells.append(val)

        if len(cells) >= NUM_COLS:
            break

    if len(cells) >= NUM_COLS and cells[0] and cells[0] != 'Organisation Code':
        try:
            amount = float(cells[15]) * 1000  # OSCAR amounts are in thousands
        except (ValueError, IndexError):
            amount = 0

        rows.append({
            'department': cells[4].strip() if cells[4] else cells[1].strip(),
            'organisation': cells[1].strip(),
            'sub_segment': cells[6].strip() if cells[6] else '',
            'sub_segment_code': cells[5].strip() if cells[5] else '',
            'econ_cat': cells[8].strip() if cells[8] else '',
            'amount': amount,
        })

print(f"Parsed {len(rows)} transaction rows")

# Aggregate: Department → Organisation → Sub-segment (Programme)
departments = {}

for r in rows:
    dept = r['department'] or 'Unknown'
    org = r['organisation'] or dept
    prog = r['sub_segment'] or 'General'

    if dept not in departments:
        departments[dept] = {'value': 0, 'orgs': {}}
    departments[dept]['value'] += r['amount']

    if org not in departments[dept]['orgs']:
        departments[dept]['orgs'][org] = {'value': 0, 'progs': {}}
    departments[dept]['orgs'][org]['value'] += r['amount']

    if prog not in departments[dept]['orgs'][org]['progs']:
        departments[dept]['orgs'][org]['progs'][prog] = 0
    departments[dept]['orgs'][org]['progs'][prog] += r['amount']

# Build JSON tree
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

        # Only add programme children if there are multiple
        progs = {k: v for k, v in org_data['progs'].items() if v != 0}
        if len(progs) > 1:
            org_node['children'] = []
            for prog_name, prog_val in sorted(progs.items(), key=lambda x: -abs(x[1])):
                org_node['children'].append({
                    'id': prog_name[:8].lower().replace(' ', '_'),
                    'name': prog_name,
                    'value': round(prog_val),
                })

        dept_node['children'].append(org_node)

    # Sort children by absolute value
    dept_node['children'].sort(key=lambda x: -abs(x['value']))

    # Skip departments with only one org that has the same name
    if len(dept_node['children']) == 1 and dept_node['children'][0]['name'] == dept_name:
        dept_node['children'] = dept_node['children'][0].get('children', [])

    children.append(dept_node)

# Sort by value descending
children.sort(key=lambda x: -abs(x['value']))

# Filter out zero/tiny departments
children = [c for c in children if abs(c['value']) > 100000]

total = sum(c['value'] for c in children)

tree = {
    'name': 'UK Government Spending 2024-25',
    'value': total,
    'children': children
}

# Count nodes
def count_nodes(node):
    c = 1
    for ch in node.get('children', []):
        c += count_nodes(ch)
    return c

def max_depth(node, d=0):
    if not node.get('children'):
        return d
    return max(max_depth(ch, d+1) for ch in node['children'])

n = count_nodes(tree)
d = max_depth(tree)
print(f"Tree: {n} nodes, {d} levels deep")
print(f"Total: £{total/1e9:.1f}B")
print(f"Departments: {len(children)}")

with open(OUT_PATH, 'w', encoding='utf-8') as f:
    json.dump(tree, f)

size = os.path.getsize(OUT_PATH)
print(f"Written to {OUT_PATH} ({size//1024}KB)")
