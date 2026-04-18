#!/usr/bin/env python3
"""
Parse MHCLG 'Council Tax levels set by local authorities in England' ODS tables
into a single JSON: per-council Band A–H values for a given fiscal year.

Source: https://www.gov.uk/government/statistics/council-tax-levels-set-by-local-authorities-in-england-{year}-to-{year+1}
Table 8 within that publication: "Area council tax for a dwelling occupied by 2 adults by band"

These figures are the ALL-IN band values (area = billing authority + county/GLA +
police + fire + parish precepts, summed). That matches what residents actually
pay on their bill.

Output: data/uk/fiscal/council_tax/uk_council_tax_{YYYY_YYYY}.json
"""
import zipfile
import xml.etree.ElementTree as ET
import json
import hashlib
import sys
from pathlib import Path
from datetime import date

ROOT = Path(__file__).resolve().parent.parent
CT_DIR = ROOT / 'data' / 'uk' / 'fiscal' / 'council_tax'

T = '{urn:oasis:names:tc:opendocument:xmlns:table:1.0}'
TX = '{urn:oasis:names:tc:opendocument:xmlns:text:1.0}'
O = '{urn:oasis:names:tc:opendocument:xmlns:office:1.0}'


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def parse_ods_sheet(path: Path, sheet_name: str):
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
        if t.get(T + 'name') == sheet_name:
            for r in t.findall(T + 'table-row'):
                reps = int(r.get(T + 'number-rows-repeated', '1'))
                row = cells(r)
                for _ in range(reps):
                    yield row
            return


def num(x):
    if isinstance(x, (int, float)):
        return round(float(x), 2)
    try:
        return round(float(str(x).replace(',', '')), 2)
    except (ValueError, TypeError):
        return None


def build_table8(ods_path: Path, fiscal_year_label: str) -> dict:
    """Parse one Table 8 ODS into the per-council band dict."""
    rows = list(parse_ods_sheet(ods_path, 'Table_8'))
    header_idx = next(
        i for i, r in enumerate(rows)
        if r and 'E Code' in str(r[0])
    )
    header = rows[header_idx]
    data_rows = rows[header_idx + 1:]

    # Find column indices
    def col(name):
        for i, h in enumerate(header):
            if str(h).strip() == name:
                return i
        return -1

    cE = col('E Code')
    cONS = col('ONS Code')
    cName = col('Authority')
    cRegion = col('Region')
    cClass = col('Class')
    cArea = col('Area')
    bands = {b: col(f'Band {b}') for b in 'ABCDEFGH'}

    councils = []
    seen_e_codes = set()
    for r in data_rows:
        if not r or not isinstance(r[0], str) or not r[0].startswith('E'):
            continue
        e_code = r[cE]
        if e_code in seen_e_codes:
            continue
        seen_e_codes.add(e_code)
        name = r[cName] if cName < len(r) else None
        if not name:
            continue

        row_bands = {}
        for bk, ci in bands.items():
            if ci >= 0 and ci < len(r):
                v = num(r[ci])
                if v is not None:
                    row_bands[f'band_{bk}'] = v

        if not row_bands:
            continue

        councils.append({
            'e_code': e_code,
            'ons_code': r[cONS] if cONS >= 0 and cONS < len(r) else None,
            'name': name,
            'region_code': r[cRegion] if cRegion >= 0 and cRegion < len(r) else None,
            'class_code': r[cClass] if cClass >= 0 and cClass < len(r) else None,
            'area_type': r[cArea] if cArea >= 0 and cArea < len(r) else None,
            **row_bands,
        })

    return {
        'country': 'uk',
        'subject': 'council_tax_bands',
        'fiscal_year_label': fiscal_year_label,
        'fiscal_year_start': int(fiscal_year_label.split('-')[0]),
        'unit': 'GBP_per_year',
        'note': ('Area council tax for a dwelling occupied by 2 adults. '
                 'Includes billing authority + county/GLA + police + fire + '
                 'parish precepts. These are the all-in band values matching '
                 'what residents pay on their bill.'),
        'source': {
            'publisher': 'Ministry of Housing, Communities and Local Government (MHCLG)',
            'dataset': (
                f'Council Tax levels set by local authorities in England '
                f'{fiscal_year_label.replace("-", " to ")} '
                f'— Table 8: Area council tax by band'
            ),
            'landing_url': (
                f'https://www.gov.uk/government/statistics/'
                f'council-tax-levels-set-by-local-authorities-in-england-'
                f'{fiscal_year_label.replace("-", "-to-")}'
            ),
            'file_path': str(ods_path.relative_to(ROOT)).replace('\\', '/'),
            'file_sha256': sha256(ods_path),
            'downloaded_at': date.today().isoformat(),
        },
        'council_count': len(councils),
        'councils': councils,
    }


def main():
    if not CT_DIR.exists():
        print(f'ERROR: {CT_DIR} not found.', file=sys.stderr)
        sys.exit(1)

    # Configured year → input ODS file
    years = {
        '2024-25': 'ct_table8_2024_25.ods',
    }

    built = 0
    for year_label, filename in years.items():
        ods = CT_DIR / filename
        if not ods.exists():
            print(f'  skip {year_label}: {filename} not present')
            continue
        out = build_table8(ods, year_label)
        out_path = CT_DIR / f'uk_council_tax_{year_label.replace("-", "_")}.json'
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(out, f, indent=2, ensure_ascii=False)
        built += 1
        print(f'  wrote {out_path.name} — {out["council_count"]} councils')

    print(f'Done. {built} year(s) written.')


if __name__ == '__main__':
    main()
