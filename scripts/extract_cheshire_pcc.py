#!/usr/bin/env python
"""Custom Cheshire PCC extractor — text-flow PDFs with date-anchored rows."""
import sys, os, csv, glob, re
import pdfplumber

ROW_RE = re.compile(r'^(.+?)\s(\d{2}/\d{2}/\d{4})\s*(.*?)\s+([\d,]+\.\d{2})\s*$')

def extract_pdf(pdf_path, out_path):
    rows = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ''
            for line in text.split('\n'):
                m = ROW_RE.match(line.strip())
                if not m: continue
                prefix, date, account, amount = m.groups()
                # Heuristic: split prefix between cost_centre and supplier at first ALL-CAPS word
                tokens = prefix.split()
                cc_end = 0
                for i, tok in enumerate(tokens):
                    if i > 0 and tok.isupper() and len(tok) > 1:
                        cc_end = i; break
                if cc_end == 0:
                    cc = ''
                    supplier = prefix
                else:
                    cc = ' '.join(tokens[:cc_end])
                    supplier = ' '.join(tokens[cc_end:])
                rows.append([cc, supplier, date, account.strip(), amount.replace(',','')])
    if not rows: return 0
    with open(out_path, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['Cost Centre','Supplier','Date','Account','Amount'])
        w.writerows(rows)
    return len(rows)

if __name__ == '__main__':
    in_dir = sys.argv[1]
    pdfs = sorted(glob.glob(os.path.join(in_dir, '*.pdf')))
    for pdf in pdfs:
        out = pdf.replace('.pdf','.csv')
        n = extract_pdf(pdf, out)
        print(f"{os.path.basename(pdf)}: {n} rows")
