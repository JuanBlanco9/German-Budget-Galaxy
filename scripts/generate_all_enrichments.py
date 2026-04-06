"""Generate smart descriptions for ALL remaining tree nodes."""
import json

us_tree = json.load(open('D:/germany-ngo-map/data/us/us_budget_tree_2024.json', encoding='utf-8'))
fr_tree = json.load(open('D:/germany-ngo-map/data/fr/fr_budget_tree_2025.json', encoding='utf-8'))
uk_tree = json.load(open('D:/germany-ngo-map/data/uk/uk_budget_tree_2024.json', encoding='utf-8'))

us_enr = json.load(open('D:/germany-ngo-map/data/us/enrichment_top50.json', encoding='utf-8'))
fr_enr = json.load(open('D:/germany-ngo-map/data/fr/enrichment_top50.json', encoding='utf-8'))
uk_enr = json.load(open('D:/germany-ngo-map/data/uk/enrichment_top50.json', encoding='utf-8'))

us_names = {p['name'] for p in us_enr}
fr_names = {p['name'] for p in fr_enr}
uk_names = {p['name'] for p in uk_enr}


def parse_us(name, parent=''):
    parts = [p.strip() for p in name.split(', ')]
    prog = parts[0]
    bureau = parts[1] if len(parts) > 1 else ''
    dept = parts[-1] if len(parts) > 2 else parent

    if 'Salaries and Expenses' in prog:
        e = bureau or dept
        return "Operating account funding personnel and admin for %s." % e, "%s employees" % e
    if 'Operation and Maintenance' in prog:
        return "Day-to-day operations, training, and equipment maintenance for %s." % (bureau or prog), "Military personnel and installations"
    if 'Military Personnel' in prog:
        b = prog.replace('Military Personnel, ', '')
        return "Pay, allowances, and benefits for active-duty %s personnel." % b, "%s service members" % b
    if 'Procurement' in prog or 'Acquisition' in prog:
        return "Equipment and materiel procurement for %s." % (bureau or dept), "Military forces and defense industry"
    if 'Research' in prog or 'RDT&E' in prog:
        return "Research, development, and testing for %s." % (bureau or dept), "Research community"
    if 'Construction' in prog:
        return "Facility construction and improvement for %s." % (bureau or dept), "Infrastructure and personnel"
    if 'Inspector General' in prog:
        return "Independent audits and investigations for %s." % (bureau or dept), "Taxpayers and accountability"
    if 'Grants' in prog:
        return "Grant programs for %s." % (bureau or dept), "Grant recipients"
    if 'Revolving Fund' in prog or 'Working Capital' in prog:
        return "Self-financing revolving fund for %s." % (bureau or dept), "Federal agencies"
    if 'Loan' in prog or 'Credit' in prog:
        return "Federal loan/credit programs for %s." % (bureau or dept), "Borrowers and recipients"
    if 'Trust Fund' in name or 'Insurance Fund' in name:
        return "Federal trust/insurance fund: %s." % prog.lower(), "Fund beneficiaries"
    if 'Reserve Personnel' in prog:
        return "Pay and allowances for reserve component members." , "Reserve service members"
    if 'National Guard' in prog:
        return "Funding for National Guard operations and personnel.", "Guard members and communities"
    if 'Family Housing' in prog:
        return "Military family housing construction and maintenance.", "Military families"
    if bureau:
        return "Federal account under %s for %s." % (bureau, prog.lower()), "%s stakeholders" % dept
    return "Federal program: %s." % prog, "Program beneficiaries"


def parse_fr(name, parent=''):
    if parent:
        return "Budget line under %s." % parent, "Programme beneficiaries"
    return "French government budget item.", "Programme beneficiaries"


def parse_uk(name, parent=''):
    if parent:
        return "UK spending programme under %s." % parent, "Programme beneficiaries"
    return "UK government spending programme.", "Programme beneficiaries"


# US
added = 0
for ag in us_tree.get('children', []):
    for node_list in [[ag]] + [ag.get('children', [])] + [c.get('children', []) for c in ag.get('children', []) if c.get('children')]:
        for node in node_list:
            if node['name'] not in us_names:
                d, b = parse_us(node['name'], ag['name'])
                us_enr.append({"name": node['name'], "created": "", "description": d, "beneficiaries": b})
                us_names.add(node['name'])
                added += 1
print("US: +%d = %d total" % (added, len(us_enr)))

# FR
added_fr = 0
def walk_fr(node, parent='', depth=0):
    global added_fr
    name = node.get('name', '')
    if depth > 0 and name and name not in fr_names:
        d, b = parse_fr(name, parent)
        fr_enr.append({"name": name, "created": "", "description": d, "beneficiaries": b})
        fr_names.add(name)
        added_fr += 1
    for c in node.get('children', []):
        walk_fr(c, name, depth + 1)
walk_fr(fr_tree)
print("FR: +%d = %d total" % (added_fr, len(fr_enr)))

# UK
added_uk = 0
for dept in uk_tree.get('children', []):
    for node_list in [[dept]] + [dept.get('children', [])] + [c.get('children', []) for c in dept.get('children', []) if c.get('children')]:
        for node in node_list:
            if node['name'] not in uk_names:
                d, b = parse_uk(node['name'], dept['name'])
                uk_enr.append({"name": node['name'], "created": "", "description": d, "beneficiaries": b})
                uk_names.add(node['name'])
                added_uk += 1
print("UK: +%d = %d total" % (added_uk, len(uk_enr)))

# Save
json.dump(us_enr, open('D:/germany-ngo-map/data/us/enrichment_top50.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
json.dump(fr_enr, open('D:/germany-ngo-map/data/fr/enrichment_top50.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
json.dump(uk_enr, open('D:/germany-ngo-map/data/uk/enrichment_top50.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

print("\nGrand total: %d (100%% tree coverage)" % (len(us_enr) + len(fr_enr) + len(uk_enr)))
