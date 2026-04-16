#!/usr/bin/env python
"""Extract spend tables from PCC PDFs via camelot stream mode (for non-ruled tables)."""
import sys, os, csv, glob
import camelot
import warnings
warnings.filterwarnings('ignore')

def extract_pdf(pdf_path, out_path):
    tables = camelot.read_pdf(pdf_path, pages='all', flavor='stream', suppress_stdout=True)
    if not tables:
        return 0
    headers = None
    rows = []
    for t in tables:
        df = t.df
        for i in range(len(df)):
            r = df.iloc[i].tolist()
            if not headers and any('Supplier' in str(c) for c in r):
                headers = [str(c).strip() for c in r]
                continue
            if headers and any(c.strip() for c in [str(x) for x in r]):
                # Filter out repeated headers + title rows
                if any('Supplier Name' in str(c) for c in r): continue
                if any('Transactions Report' in str(c) for c in r): continue
                rows.append([str(c).strip() for c in r])
    if not headers or not rows:
        return 0
    with open(out_path, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(headers)
        for r in rows:
            w.writerow(r)
    return len(rows)

def main():
    in_dir = sys.argv[1]
    out_dir = sys.argv[2] if len(sys.argv) > 2 else in_dir
    pdfs = sorted(glob.glob(os.path.join(in_dir, '*.pdf')))
    for pdf in pdfs:
        out = os.path.join(out_dir, os.path.basename(pdf).replace('.pdf', '.csv'))
        try:
            n = extract_pdf(pdf, out)
            print(f"{os.path.basename(pdf)}: {n} rows")
        except Exception as e:
            print(f"{os.path.basename(pdf)}: FAIL {e}")

if __name__ == '__main__':
    main()
