"""Fetch US budget data from USAspending.gov API and build a multi-level tree."""
import json
import os
import time
import urllib.request

OUT_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'us', 'us_budget_tree_2024.json')
FY = 2024
API = "https://api.usaspending.gov/api/v2"


def fetch_json(url, retries=3):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'BudgetGalaxy/1.0'})
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode())
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(2)
            else:
                print(f"    FAILED after {retries} attempts: {e}")
                return None


# Step 1: Get all top-tier agencies
print("Fetching top-tier agencies...")
agencies_data = fetch_json(f"{API}/references/toptier_agencies/")
agencies = agencies_data['results']
print(f"  Found {len(agencies)} agencies")

# Step 2: For each major agency, fetch federal accounts (deeper than sub_components)
tree_children = []
sorted_agencies = sorted(agencies, key=lambda x: -(x.get('budget_authority_amount') or 0))

for i, ag in enumerate(sorted_agencies):
    code = ag['toptier_code']
    name = ag['agency_name']
    value = ag.get('budget_authority_amount') or 0
    abbr = ag.get('abbreviation', '')

    if value <= 0:
        continue

    agency_node = {
        'id': code,
        'name': name,
        'value': round(value),
    }
    if abbr:
        agency_node['abbreviation'] = abbr

    # For agencies > $1B, fetch federal accounts for depth
    if value > 1e9:
        print(f"  [{i+1}] {abbr or code}: ${value/1e9:.1f}B - fetching accounts...")

        data = fetch_json(f"{API}/agency/{code}/federal_account/?fiscal_year={FY}&limit=50&sort=obligated_amount&order=desc")
        if data and 'results' in data:
            accounts = data['results']
            total_pages = (data['page_metadata']['total'] + 49) // 50

            # Fetch remaining pages if needed (up to 5 pages = 250 accounts)
            for page in range(2, min(total_pages + 1, 6)):
                more = fetch_json(f"{API}/agency/{code}/federal_account/?fiscal_year={FY}&limit=50&page={page}&sort=obligated_amount&order=desc")
                if more and 'results' in more:
                    accounts.extend(more['results'])
                time.sleep(0.2)

            children = []
            for acct in accounts:
                acct_val = acct.get('obligated_amount') or 0
                if acct_val <= 0:
                    continue

                acct_node = {
                    'id': acct['code'],
                    'name': acct['name'],
                    'value': round(acct_val),
                }

                # Add sub-accounts as children if they exist and are different
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
                agency_node['children'] = children
                print(f"    -> {len(children)} accounts")

        time.sleep(0.3)
    else:
        if i < 50:  # Only log the first 50
            print(f"  [{i+1}] {abbr or code}: ${value/1e6:.0f}M (small, no sub-fetch)")

    tree_children.append(agency_node)

# Build root
total = sum(c['value'] for c in tree_children)
tree = {
    'name': f'US Federal Budget FY{FY}',
    'value': total,
    'children': tree_children,
}

# Count stats
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
print(f"\nTree: {n} nodes, {d} levels deep")
print(f"Total: ${total/1e12:.1f}T")
print(f"Agencies: {len(tree_children)}")

with open(OUT_PATH, 'w', encoding='utf-8') as f:
    json.dump(tree, f)

size = os.path.getsize(OUT_PATH)
print(f"Written to {OUT_PATH} ({size//1024}KB)")
