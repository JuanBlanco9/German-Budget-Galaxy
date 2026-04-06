"""Fetch US budget data from USAspending.gov API for multiple fiscal years."""
import json
import os
import sys
import time
import urllib.request

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'us')
API = "https://api.usaspending.gov/api/v2"
YEARS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]


def fetch_json(url, retries=3):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'BudgetGalaxy/1.0'})
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode())
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(3)
            else:
                print(f"    FAILED: {e}")
                return None


def count_nodes(node):
    c = 1
    for ch in node.get('children', []):
        c += count_nodes(ch)
    return c


def max_depth(node, d=0):
    if not node.get('children'):
        return d
    return max(max_depth(ch, d + 1) for ch in node['children'])


# Get agency list (same across years)
print("Fetching agency list...")
agencies_data = fetch_json(f"{API}/references/toptier_agencies/")
all_agencies = agencies_data['results']
print(f"  {len(all_agencies)} agencies found\n")

for fy in YEARS:
    out_path = os.path.join(DATA_DIR, f"us_budget_tree_{fy}.json")

    # Skip if already exists
    if os.path.exists(out_path):
        size = os.path.getsize(out_path)
        if size > 5000:
            print(f"=== FY{fy}: SKIP (already exists, {size // 1024}KB) ===")
            continue

    print(f"=== FY{fy} ===")
    tree_children = []

    for i, ag in enumerate(sorted(all_agencies, key=lambda x: -(x.get('budget_authority_amount') or 0))):
        code = ag['toptier_code']
        name = ag['agency_name']
        abbr = ag.get('abbreviation', '')

        # Get this agency's budget for the specific year via federal_account
        data = fetch_json(f"{API}/agency/{code}/federal_account/?fiscal_year={fy}&limit=50&sort=obligated_amount&order=desc")
        if not data or 'results' not in data or len(data['results']) == 0:
            continue

        accounts = data['results']
        total_pages = (data['page_metadata']['total'] + 49) // 50

        # Fetch remaining pages (up to 5)
        for page in range(2, min(total_pages + 1, 6)):
            more = fetch_json(f"{API}/agency/{code}/federal_account/?fiscal_year={fy}&limit=50&page={page}&sort=obligated_amount&order=desc")
            if more and 'results' in more:
                accounts.extend(more['results'])
            time.sleep(0.15)

        children = []
        agency_total = 0
        for acct in accounts:
            acct_val = acct.get('obligated_amount') or 0
            if acct_val <= 0:
                continue
            agency_total += acct_val

            acct_node = {
                'id': acct['code'],
                'name': acct['name'],
                'value': round(acct_val),
            }

            if acct.get('children') and len(acct['children']) > 1:
                sub_children = []
                for sub in acct['children']:
                    sub_val = sub.get('obligated_amount') or 0
                    if sub_val > 0:
                        sub_children.append({
                            'id': sub['code'],
                            'name': sub['name'],
                            'value': round(sub_val),
                        })
                if sub_children:
                    sub_children.sort(key=lambda x: -x['value'])
                    acct_node['children'] = sub_children

            children.append(acct_node)

        if children:
            children.sort(key=lambda x: -x['value'])
            agency_node = {
                'id': code,
                'name': name,
                'value': round(agency_total),
            }
            if abbr:
                agency_node['abbreviation'] = abbr
            agency_node['children'] = children
            tree_children.append(agency_node)

        time.sleep(0.2)

    if not tree_children:
        print(f"  No data for FY{fy}, skipping")
        continue

    tree_children.sort(key=lambda x: -x['value'])
    total = sum(c['value'] for c in tree_children)
    tree = {
        'name': f'US Federal Budget FY{fy}',
        'value': total,
        'children': tree_children,
    }

    n = count_nodes(tree)
    d = max_depth(tree)
    print(f"  ${total / 1e12:.1f}T | {len(tree_children)} agencies | {n} nodes | {d} levels")

    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(tree, f)
    print(f"  -> {out_path} ({os.path.getsize(out_path) // 1024}KB)")
    print()
