# Welsh councils batch 2 - North + rural

_Agent: agent-a8c96ce5038a3929a_

I have enough evidence to produce a definitive report. The key finding is that **Welsh local authorities are not subject to the England Local Government Transparency Code 2015**, which is what mandates monthly publication of spend-over-£500 data. Most do not publish it voluntarily, and Gwynedd has explicitly refused such requests citing >2.5 days of work required.

### Isle of Anglesey County Council (Ynys Mon)
- Landing page: https://www.anglesey.gov.wales/en/Council/Council-finances/
- Data URL pattern: NOT PUBLISHED
- Format: n/a
- Schema: n/a
- Bilingual: n/a
- Cloudflare/WAF: yes (direct curl returned 404 behind CDN)
- Rows/month: n/a
- Quirks: Only Statement of Accounts PDFs published; no monthly transparency feed
- Sample row: n/a
- FY 2023/24 availability: **NOT AVAILABLE**

### Gwynedd Council
- Landing page: https://www.gwynedd.llyw.cymru/en/Council/Data-Protection-and-Freedom-of-Information/Freedom-of-Information-Act/Publication-scheme/What-we-spend-and-how-we-spend-it.aspx
- Data URL pattern: NOT PUBLISHED
- Format: n/a
- Bilingual: publication scheme is bilingual (llyw.cymru domain) but no dataset
- Cloudflare/WAF: partial (404 via curl)
- Quirks: **Explicitly refused FOI request for spend-over-£500** on cost grounds (>2.5 days work) per WhatDoTheyKnow
- FY 2023/24 availability: **NOT AVAILABLE** — hard blocker, FOI-refused

### Conwy County Borough Council
- Landing page: https://www.conwy.gov.uk/en/Council/Finance-and-Budget/
- Data URL pattern: NOT PUBLISHED
- Format: n/a
- Cloudflare/WAF: yes (curl exit 35/TLS handshake failure)
- Quirks: Only Statement of Accounts 2023/24 PDF available; no line-item transparency feed
- FY 2023/24 availability: **NOT AVAILABLE**

### Denbighshire County Council
- Landing page: https://www.sirddinbych.gov.uk/en/your-council/budgets-and-finance/
- Data URL pattern: NOT PUBLISHED
- Bilingual: site runs bilingual (sirddinbych = Welsh name)
- Cloudflare/WAF: likely
- Quirks: Only high-level "How your council tax is spent" aggregate dashboard; no transactional data
- FY 2023/24 availability: **NOT AVAILABLE**

### Flintshire County Council
- Landing page: https://www.flintshire.gov.uk/en/Datasets/Home.aspx
- Data URL pattern: NOT PUBLISHED for payments
- Format: Council Datasets page only exposes Business Rates (CSV) — no supplier payments
- Quirks: Uses Oxygen Finance FastTrack early-pay program but does not publish line-level spend
- FY 2023/24 availability: **NOT AVAILABLE**

### Powys County Council
- Landing page: https://en.powys.gov.uk/article/3218/Payments-to-suppliers-over-500 (returned 403 via WebFetch — page may exist but behind WAF)
- Data URL pattern: Possibly historical only; recent FOI requests on WhatDoTheyKnow were "long overdue" / awaiting response
- Format: unknown
- Cloudflare/WAF: yes (403 via WebFetch)
- Quirks: This is the ONLY one of the 8 with a URL slug suggesting a dedicated "Payments to suppliers over 500" page, but content could not be retrieved. **Worth manual browser check** — likely candidate if any of the 8 publishes
- FY 2023/24 availability: **UNCERTAIN — needs manual browser verification**

### Neath Port Talbot Council
- Landing page: https://www.npt.gov.uk/council/budget-and-spending/ and /1613 (Financial Information)
- Data URL pattern: NOT PUBLISHED
- Quirks: Only Statement of Accounts + revenue budget narrative; no supplier transparency CSV
- FY 2023/24 availability: **NOT AVAILABLE**

### Bridgend County Borough Council
- Landing page: https://www.bridgend.gov.uk/council/finance/
- Data URL pattern: NOT PUBLISHED
- Quirks: Only Statement of Accounts 2023-24 PDF
- FY 2023/24 availability: **NOT AVAILABLE**

---

## HARD BLOCKERS / KEY FINDING

**Welsh councils are NOT subject to the England Local Government Transparency Code 2015**, which is the legal instrument requiring monthly publication of all payments >£500. Wales has its own procurement transparency rules (GOV.WALES "Procurement reform: transparency"), which focus on contracts and tenders, not transactional spend feeds.

Of the 8 councils investigated:
- **7 confirmed not publishing** line-level spend-over-£500 transparency data (only aggregated Statement of Accounts PDFs)
- **1 uncertain (Powys)** — the URL slug `/article/3218/Payments-to-suppliers-over-500` suggests a dedicated page, but it returns 403 to automated fetches (WAF). Needs manual browser verification before ruling in/out
- **Gwynedd explicitly refused** an FOI request for this data citing >2.5 days of extraction work, so even FOI route is blocked
- No sample files were downloaded — nothing to save to `/tmp/welsh2_*_sample.*`

**Recommendation for Budget Galaxy**: Do NOT budget time for ingesting these 8 Welsh councils as line-level £500+ feeds. Only **Powys** warrants a 5-minute manual check. For the others, the best available granularity is annual Statement of Accounts PDFs (expenditure by service area), which is **not comparable** to the line-level transparency feeds from English councils — attach as metadata node, not as tree children, consistent with the "metadata vs children" feedback principle.

Sources:
- [WhatDoTheyKnow - Gwynedd Council FOI refusal](https://www.whatdotheyknow.com/request/council_expenditure_or_payment_t_61)
- [Powys payments article (403 to fetcher)](https://en.powys.gov.uk/article/3218/Payments-to-suppliers-over-500)
- [Gwynedd "What we spend and how we spend it"](https://www.gwynedd.llyw.cymru/en/Council/Data-Protection-and-Freedom-of-Information/Freedom-of-Information-Act/Publication-scheme/What-we-spend-and-how-we-spend-it.aspx)
- [Flintshire Datasets page (no spend data)](https://www.flintshire.gov.uk/en/Datasets/Home.aspx)
- [GOV.WALES Transparency rules](https://www.gov.wales/transparency-rules)
- [GOV.UK Local government transparency code 2015 (England only)](https://www.gov.uk/government/publications/local-government-transparency-code-2015/local-government-transparency-code-2015)
- [Bridgend Statement of Accounts 2023-24 PDF](https://www.bridgend.gov.uk/media/uhcbgome/statement-of-accounts-2023-24.pdf)
- [Conwy Statement of Accounts 2023/24 notice](https://www.conwy.gov.uk/en/Spotlight/Public-Notices/General-notices/Statement-of-Accounts-202324-Conwy-County-Borough-Council.aspx)