#!/usr/bin/env python
"""Extract spend tables from PCC PDFs via pdfplumber."""
import sys, os, csv, glob
import pdfplumber

def extract_pdf(pdf_path, out_path):
    rows = []
    headers = None
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            for t in tables:
                if not t: continue
                # Detect header row
                first = t[0]
                if first and first[0] and ('Supplier' in first[0] or 'Body' in first[0]):
                    if not headers:
                        headers = first
                    rows.extend(t[1:])
                else:
                    rows.extend(t)
    if not headers or not rows:
        return 0
    with open(out_path, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(headers)
        for r in rows:
            # Sanitize: strip £ and commas in amount-like fields
            cleaned = [(c or '').replace('\xa3', '£').strip() for c in r]
            w.writerow(cleaned)
    return len(rows)

def main():
    in_dir = sys.argv[1]
    out_dir = sys.argv[2] if len(sys.argv) > 2 else in_dir
    pdfs = sorted(glob.glob(os.path.join(in_dir, '*.pdf')))
    for pdf in pdfs:
        out = os.path.join(out_dir, os.path.basename(pdf).replace('.pdf', '.csv'))
        n = extract_pdf(pdf, out)
        print(f"{os.path.basename(pdf)}: {n} rows -> {os.path.basename(out)}")

if __name__ == '__main__':
    main()
