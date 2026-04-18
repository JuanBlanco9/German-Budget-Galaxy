#!/usr/bin/env python3
"""
Parse MHCLG Revenue Outturn timeseries CSV into per-council finance records.

For each council × year, extract:
  - Total central grants received (RG_grantintot_tot_grant)
  - Spending by service (RS_edu, RS_asc, RS_csc, ...) in one layer
  - NET current expenditure total (RS_netcurrtot_net_exp)

This is the data that lets the taxpayer flow tracer compute the EXACT share
of central-gov grants that goes to the user's specific council, instead of
a 1/N placeholder.

Output: data/uk/fiscal/uk_council_finance_YYYY_YYYY.json
"""
import csv
import hashlib
import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = (
    ROOT / 'data' / 'uk' / 'local_authorities' / 'revenue_outturn_timeseries.csv'
)
OUT_DIR = ROOT / 'data' / 'uk' / 'fiscal'

# CSV year_ending encodes fiscal year end as YYYYMM. 202403 = FY 2023-24.
YEARS = {
    '202403': '2023-24',
    '202503': '2024-25',
    '202303': '2022-23',
}

# Service columns (RS_ net expenditure). Each maps to a friendly label.
SERVICE_COLS = {
    'RS_edu_net_exp':   'Education',
    'RS_asc_net_exp':   'Adult Social Care',
    'RS_csc_net_exp':   "Children's Social Care",
    'RS_phs_net_exp':   'Public Health',
    'RS_trans_net_exp': 'Highways & Transport',
    'RS_env_net_exp':   'Environmental & Regulatory',
    'RS_hous_net_exp':  'Housing Services',
    'RS_cul_net_exp':   'Cultural & Related',
    'RS_plan_net_exp':  'Planning & Development',
    'RS_pol_net_exp':   'Police',
    'RS_frs_net_exp':   'Fire & Rescue',
    'RS_cen_net_exp':   'Central Services',
    'RS_oth_net_exp':   'Other Services',
}


def sha256(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for c in iter(lambda: f.read(1 << 20), b''):
            h.update(c)
    return h.hexdigest()


def num(v):
    if v is None or v == '':
        return 0.0
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def build(year_ending: str, year_label: str) -> dict:
    councils = []
    grants_sum = 0.0
    netexp_sum = 0.0

    with open(CSV_PATH, newline='', encoding='utf-8') as f:
        r = csv.DictReader(f)
        for row in r:
            if row['year_ending'] != year_ending:
                continue
            name = (row.get('LA_name') or '').strip()
            if not name:
                continue
            # Skip "All Authorities" / England / regional aggregates if present
            if name.lower() in ('all authorities', 'england', 'united kingdom'):
                continue

            # Total central-gov grants in to this council (in £ thousand per CSV)
            grants_in_k = num(row.get('RG_grantintot_tot_grant'))
            # Net current expenditure total (all services combined), £ thousand
            netexp_k = num(row.get('RS_netcurrtot_net_exp'))

            services = {}
            for col, label in SERVICE_COLS.items():
                v = num(row.get(col))
                if v != 0:
                    services[label] = round(v * 1000)  # convert k→£

            grants_in_gbp = round(grants_in_k * 1000)
            netexp_gbp = round(netexp_k * 1000)

            councils.append({
                'ons_code': row.get('ONS_code') or None,
                'lgf_code': row.get('LA_LGF_code') or None,
                'name': name,
                'class': row.get('LA_class') or None,
                'subclass': row.get('LA_subclass') or None,
                'status': row.get('status') or None,
                'central_grants_in_gbp': grants_in_gbp,
                'net_current_expenditure_gbp': netexp_gbp,
                'services_net_gbp': services,
            })
            grants_sum += grants_in_gbp
            netexp_sum += netexp_gbp

    out = {
        'country': 'uk',
        'subject': 'council_finance_revenue_outturn',
        'year_ending_csv_code': year_ending,
        'fiscal_year_label': year_label,
        'unit': 'GBP',
        'council_count': len(councils),
        'totals': {
            'central_grants_to_all_councils_gbp': round(grants_sum),
            'net_current_expenditure_all_councils_gbp': round(netexp_sum),
        },
        'source': {
            'publisher': 'Ministry of Housing, Communities and Local Government (MHCLG)',
            'dataset': (
                'Local authority revenue expenditure and financing England: '
                f'Revenue Outturn time-series — {year_label}'
            ),
            'landing_url': (
                'https://www.gov.uk/government/statistical-data-sets/'
                'live-tables-on-local-government-finance'
            ),
            'file_path': str(CSV_PATH.relative_to(ROOT)).replace('\\', '/'),
            'file_sha256': sha256(CSV_PATH),
            'downloaded_at': date.today().isoformat(),
        },
        'notes': [
            'RG_grantintot_tot_grant is the sum of every central-gov-to-council '
            'grant type (DSG, Public Health, Social Care Support, Revenue Support '
            'Grant, New Homes Bonus, IBCF, PFI, etc.). This is the figure to '
            'apportion across councils when tracing a user\'s central tax '
            'contribution to their specific council.',
            'RS_*_net_exp columns are net of fees, charges, and specific grants '
            'offsetting that service. This is the figure councils report as net '
            'expenditure by service.',
            'Original CSV values are in £ thousand; this output converts to £.',
        ],
        'councils': councils,
    }

    return out


def main():
    if not CSV_PATH.exists():
        raise SystemExit(f'{CSV_PATH} not found')

    for ye, label in YEARS.items():
        out = build(ye, label)
        if out['council_count'] == 0:
            print(f'  skip {label}: 0 councils matched')
            continue
        out_path = OUT_DIR / f'uk_council_finance_{label.replace("-", "_")}.json'
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(out, f, indent=2, ensure_ascii=False)
        print(
            f'  wrote {out_path.name} — '
            f'{out["council_count"]} councils, '
            f'grants total £{out["totals"]["central_grants_to_all_councils_gbp"]/1e9:.1f}B'
        )


if __name__ == '__main__':
    main()
