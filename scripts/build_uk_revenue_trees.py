#!/usr/bin/env python3
"""
Parse HMRC 'Tax receipts and NICs' ODS annual bulletin into structured
JSON trees per fiscal year.

Source:   HMRC NS_Table.ods (published on gov.uk)
Download: https://assets.publishing.service.gov.uk/media/69b429649d8b52961a62b414/NS_Table.ods
Landing:  https://www.gov.uk/government/statistics/hmrc-tax-and-nics-receipts-for-the-uk

Output: data/uk/fiscal/uk_revenue_YYYY-YY.json for each fiscal year 2005-06 onward.

Units: £ million (HMRC publishes in £m, we preserve).
Missing / not-applicable values in the source appear as '[X]' — treated as 0.
"""
import zipfile
import xml.etree.ElementTree as ET
import json
import hashlib
import sys
from pathlib import Path
from datetime import date

ROOT = Path(__file__).resolve().parent.parent
ODS = ROOT / 'data' / 'uk' / 'fiscal' / 'hmrc_ns_table.ods'
OUT_DIR = ROOT / 'data' / 'uk' / 'fiscal'

T = '{urn:oasis:names:tc:opendocument:xmlns:table:1.0}'
TX = '{urn:oasis:names:tc:opendocument:xmlns:text:1.0}'
O = '{urn:oasis:names:tc:opendocument:xmlns:office:1.0}'

SHEET = 'Receipts_Annually'


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def parse_ods(path: Path):
    with zipfile.ZipFile(path) as z:
        with z.open('content.xml') as f:
            tree = ET.parse(f)
    root = tree.getroot()

    def cells(row):
        out = []
        for c in row.findall(T + 'table-cell'):
            reps = int(c.get(T + 'number-columns-repeated', '1'))
            v = c.get(O + 'value')
            if v is None:
                txt = ''.join((p.text or '') for p in c.iter(TX + 'p')).strip()
                val = txt
            else:
                try:
                    val = float(v)
                except ValueError:
                    val = v
            for _ in range(reps):
                out.append(val)
        while out and (out[-1] == '' or out[-1] is None):
            out.pop()
        return out

    for t in root.findall('.//' + T + 'table'):
        if t.get(T + 'name') == SHEET:
            for r in t.findall(T + 'table-row'):
                reps = int(r.get(T + 'number-rows-repeated', '1'))
                row = cells(r)
                for _ in range(reps):
                    yield row
            return


def to_num(v):
    """[X] -> 0; numeric pass-through; everything else -> 0."""
    if isinstance(v, (int, float)):
        return float(v)
    return 0.0


def build_tree(year_label: str, row: list, header: list) -> dict:
    """Build the hierarchical revenue tree for one fiscal year."""
    col = {header[i]: row[i] if i < len(row) else '' for i in range(len(header))}
    n = lambda k: to_num(col.get(k, 0))  # noqa: E731

    # ---- Direct taxes on income / earnings ----
    income_tax = n('Income Tax')
    paye = n('Pay As You Earn Income Tax (included within Income Tax)')
    sa = n('Self-Assessment Income Tax (included within Income Tax)')
    # The "other" residual in IT = IT - PAYE - SA (e.g. deductions at source)
    it_other = round(income_tax - paye - sa, 1)

    nic = n('National Insurance Contributions')
    nic_emp = n("PAYE NIC1 (EMP'er)")
    nic_ee = n("PAYE NIC1 (EMP'ee)")
    nic_sa = n('SA NIC2&4')
    nic_other = round(nic - nic_emp - nic_ee - nic_sa, 1)

    direct_income = {
        'id': 'uk_rev_direct',
        'name': 'Taxes on income & earnings',
        'children': [
            {
                'id': 'uk_rev_income_tax',
                'name': 'Income Tax',
                'value_gbp_m': income_tax,
                'children': [
                    {'id': 'uk_rev_it_paye', 'name': 'PAYE (employees)', 'value_gbp_m': paye},
                    {'id': 'uk_rev_it_sa', 'name': 'Self-Assessment', 'value_gbp_m': sa},
                ] + ([{'id': 'uk_rev_it_other', 'name': 'Other (incl. deductions at source)',
                       'value_gbp_m': it_other}] if it_other > 0 else []),
            },
            {
                'id': 'uk_rev_nic',
                'name': 'National Insurance Contributions',
                'value_gbp_m': nic,
                'children': [
                    {'id': 'uk_rev_nic_employer', 'name': "Employer Class 1", 'value_gbp_m': nic_emp},
                    {'id': 'uk_rev_nic_employee', 'name': "Employee Class 1", 'value_gbp_m': nic_ee},
                    {'id': 'uk_rev_nic_sa', 'name': 'Self-Employed (Class 2 & 4)', 'value_gbp_m': nic_sa},
                ] + ([{'id': 'uk_rev_nic_other', 'name': 'Other NIC',
                       'value_gbp_m': nic_other}] if nic_other > 0 else []),
            },
            {'id': 'uk_rev_cgt', 'name': 'Capital Gains Tax', 'value_gbp_m': n('Capital Gains Tax')},
            {'id': 'uk_rev_apprent', 'name': 'Apprenticeship Levy',
             'value_gbp_m': n('Apprenticeship Levy')},
        ],
    }
    direct_income['value_gbp_m'] = round(sum(c['value_gbp_m'] for c in direct_income['children']), 1)

    # ---- Business / corporate taxes ----
    business = {
        'id': 'uk_rev_business',
        'name': 'Business & corporate taxes',
        'children': [
            {'id': 'uk_rev_corp_tax', 'name': 'Corporation Tax',
             'value_gbp_m': n('Corporation Tax'),
             'children': [
                 {'id': 'uk_rev_corp_offshore', 'name': 'Offshore (inc. above)',
                  'value_gbp_m': n('Offshore (included within Corporation Tax)'),
                  'note': 'Included in parent Corporation Tax — not additive'},
             ]},
            {'id': 'uk_rev_bank_levy', 'name': 'Bank Levy', 'value_gbp_m': n('Bank Levy')},
            {'id': 'uk_rev_bank_sur', 'name': 'Bank Surcharge', 'value_gbp_m': n('Bank Surcharge')},
            {'id': 'uk_rev_dpt', 'name': 'Diverted Profits Tax',
             'value_gbp_m': n('Diverted Profits Tax')},
            {'id': 'uk_rev_dst', 'name': 'Digital Services Tax',
             'value_gbp_m': n('Digital Services Tax')},
            {'id': 'uk_rev_rpdt', 'name': 'Residential Property Developer Tax',
             'value_gbp_m': n('Residential Property Developer Tax')},
            {'id': 'uk_rev_epl', 'name': 'Energy Profits Levy',
             'value_gbp_m': n('Energy Profits Levy')},
            {'id': 'uk_rev_egl', 'name': 'Electricity Generators Levy',
             'value_gbp_m': n('Electricity Generators Levy')},
            {'id': 'uk_rev_ecl', 'name': 'Economic Crime Levy',
             'value_gbp_m': n('Economic Crime Levy')},
            {'id': 'uk_rev_prt', 'name': 'Petroleum Revenue Tax',
             'value_gbp_m': n('Petroleum Revenue Tax')},
        ],
    }
    # Corporation Tax node sum excludes the "offshore (inc.)" inner because it's double-counting
    business['value_gbp_m'] = round(
        sum(c['value_gbp_m'] for c in business['children']), 1
    )

    # ---- Consumption taxes (indirect) ----
    spirits = n('Spirits Duties')
    beer = n('Beer Duties')
    wines = n('Wines Duties')
    cider = n('Cider Duties')
    alc_total = round(spirits + beer + wines + cider, 1)
    consumption = {
        'id': 'uk_rev_consumption',
        'name': 'Consumption & indirect taxes',
        'children': [
            {'id': 'uk_rev_vat', 'name': 'VAT', 'value_gbp_m': n('Value Added Tax')},
            {'id': 'uk_rev_fuel_duty', 'name': 'Fuel Duty (Hydrocarbon Oil)',
             'value_gbp_m': n('Hydrocarbon Oil (Fuel duties)')},
            {'id': 'uk_rev_alcohol', 'name': 'Alcohol Duties', 'value_gbp_m': alc_total,
             'children': [
                 {'id': 'uk_rev_spirits', 'name': 'Spirits', 'value_gbp_m': spirits},
                 {'id': 'uk_rev_beer', 'name': 'Beer', 'value_gbp_m': beer},
                 {'id': 'uk_rev_wines', 'name': 'Wines', 'value_gbp_m': wines},
                 {'id': 'uk_rev_cider', 'name': 'Cider', 'value_gbp_m': cider},
             ]},
            {'id': 'uk_rev_tobacco', 'name': 'Tobacco Duties', 'value_gbp_m': n('Tobacco Duties')},
            {'id': 'uk_rev_betting', 'name': 'Betting & Gaming', 'value_gbp_m': n('Betting & Gaming')},
            {'id': 'uk_rev_apd', 'name': 'Air Passenger Duty', 'value_gbp_m': n('Air Passenger Duty')},
            {'id': 'uk_rev_ipt', 'name': 'Insurance Premium Tax',
             'value_gbp_m': n('Insurance Premium Tax')},
            {'id': 'uk_rev_sdil', 'name': 'Soft Drinks Industry Levy',
             'value_gbp_m': n('Soft Drinks Industry Levy')},
            {'id': 'uk_rev_ppt', 'name': 'Plastic Packaging Tax',
             'value_gbp_m': n('Plastic Packaging Tax')},
            {'id': 'uk_rev_ccl', 'name': 'Climate Change Levy',
             'value_gbp_m': n('Climate Change Levy')},
            {'id': 'uk_rev_landfill', 'name': 'Landfill Tax', 'value_gbp_m': n('Landfill Tax')},
            {'id': 'uk_rev_aggregates', 'name': 'Aggregates Levy',
             'value_gbp_m': n('Aggregates Levy')},
        ],
    }
    consumption['value_gbp_m'] = round(sum(c['value_gbp_m'] for c in consumption['children']), 1)

    # ---- Capital / wealth transfer taxes ----
    capital = {
        'id': 'uk_rev_capital',
        'name': 'Capital & wealth taxes',
        'children': [
            {'id': 'uk_rev_iht', 'name': 'Inheritance Tax', 'value_gbp_m': n('Inheritance Tax')},
            {'id': 'uk_rev_sdlt', 'name': 'Stamp Duty Land Tax',
             'value_gbp_m': n('Stamp Duty Land Tax')},
            {'id': 'uk_rev_sds', 'name': 'Stamp Duty (Shares / SDRT)',
             'value_gbp_m': n('Stamp Duty Shares')},
            {'id': 'uk_rev_ated', 'name': 'Annual Tax on Enveloped Dwellings',
             'value_gbp_m': n('Annual Tax on Enveloped Dwellings')},
        ],
    }
    capital['value_gbp_m'] = round(sum(c['value_gbp_m'] for c in capital['children']), 1)

    # ---- Customs & misc ----
    other = {
        'id': 'uk_rev_other',
        'name': 'Customs & other',
        'children': [
            {'id': 'uk_rev_customs', 'name': 'Customs Duties', 'value_gbp_m': n('Customs Duties')},
            {'id': 'uk_rev_penalties', 'name': 'Penalties', 'value_gbp_m': n('Penalties')},
            {'id': 'uk_rev_swiss', 'name': 'Swiss Capital Tax',
             'value_gbp_m': n('Swiss Capital Tax')},
        ],
    }
    other['value_gbp_m'] = round(sum(c['value_gbp_m'] for c in other['children']), 1)

    total_children = [direct_income, business, consumption, capital, other]
    sum_children = round(sum(c['value_gbp_m'] for c in total_children), 1)
    reported_total = n('Total HMRC Receipts')

    return {
        'id': 'uk_revenue',
        'name': f'UK HMRC Tax Receipts — {year_label}',
        'country': 'uk',
        'year_label': year_label,
        'fiscal_year_start': int(year_label.split(' to ')[0]),
        'unit': 'GBP_million',
        'value_gbp_m': reported_total,
        'sum_of_children_gbp_m': sum_children,
        'reconciliation_note': (
            f'Sum of categories (£{sum_children:,.0f}m) vs reported total '
            f'(£{reported_total:,.0f}m). Difference £{reported_total - sum_children:,.1f}m reflects '
            f'"Misc" and rounding; Bank Payroll Tax ([X]) is unallocated historical item.'
        ),
        'source': {
            'publisher': 'HM Revenue & Customs',
            'dataset': 'HMRC tax receipts and NICs for the UK (annual bulletin)',
            'landing_url': 'https://www.gov.uk/government/statistics/hmrc-tax-and-nics-receipts-for-the-uk',
            'file_url': 'https://assets.publishing.service.gov.uk/media/69b429649d8b52961a62b414/NS_Table.ods',
            'file_sha256': sha256(ODS),
            'downloaded_at': date.today().isoformat(),
            'sheet': SHEET,
        },
        'children': total_children,
    }


def main():
    if not ODS.exists():
        print(f'ERROR: {ODS} not found. Download it first.', file=sys.stderr)
        sys.exit(1)

    rows = list(parse_ods(ODS))
    header = rows[5]
    data_rows = [r for r in rows[6:] if r and isinstance(r[0], str) and ' to ' in r[0]]

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    built = 0
    for row in data_rows:
        year_label = row[0]  # e.g. "2024 to 2025"
        tree = build_tree(year_label, row, header)
        short = year_label.replace(' to ', '_')  # "2024_2025"
        out_path = OUT_DIR / f'uk_revenue_{short}.json'
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(tree, f, indent=2, ensure_ascii=False)
        built += 1
        print(f'  wrote {out_path.name} — total £{tree["value_gbp_m"]:,.0f}m '
              f'(sum £{tree["sum_of_children_gbp_m"]:,.0f}m)')
    print(f'Done. {built} fiscal years written to {OUT_DIR}')


if __name__ == '__main__':
    main()
