# Budget Galaxy — UK Council Spend Sources Manifest

_Generated: 2026-04-14T23:50:54.764Z_

This file lists every raw data source behind the supplier-level coverage on Budget Galaxy's UK Local Government tree, along with the audit trail that lets independent auditors verify that the figures shown on https://budgetgalaxy.com come from authentic government publications and were not modified after download.

## The three-layer audit trail

**Layer 1 — Live landing pages.** Each council has a `Live source` link to the publisher's official dataset page. These URLs may rot over time (government sites restructure, rolling windows purge old files).

**Layer 2 — Wayback Machine snapshots.** Each landing page has a `Wayback archive` link to an Internet Archive snapshot. Where the Save Page Now API accepted the request, the link points at a direct snapshot (`web/YYYYMMDDHHMMSS/...`). Where it returned rate-limit errors, the link falls back to Wayback's calendar view (`web/*/...`) which lets auditors browse any prior snapshots of that URL from earlier Internet Archive crawls.

**Layer 3 — Raw files committed to git with SHA256 hashes.** Every CSV/XLSX we downloaded is committed to the public repository at `data/uk/local_authorities/spend/{council}/`. The SHA256 hashes listed in each section below let auditors verify that a given file has not been modified since the commit in which it first appeared. Combined with the Wayback snapshot of the landing page, this provides third-party independent verification of authenticity at the time of capture.

**Known limitation.** Git proves integrity *after* commit, not authenticity *before* commit. For a fully sealed audit trail we would also need a Wayback snapshot of each individual raw file URL (so auditors can byte-compare our committed file against Wayback's copy), which is pending for a follow-up run using an authenticated Internet Archive S3 API key (the anonymous Save Page Now endpoint rate-limited us during the initial run). Cloudflare-protected sources (Hampshire, Surrey, MPS) will additionally be uploaded to an `archive.org` collection as `Budget Galaxy — UK Councils` for permanent public mirroring, since Wayback cannot fetch through Cloudflare's managed challenge.

## Councils with supplier-level metadata

### Birmingham

**Live source**: [https://cityobservatory.birmingham.gov.uk/explore/dataset/expenditure-over-ps500-2024-25/](https://cityobservatory.birmingham.gov.uk/explore/dataset/expenditure-over-ps500-2024-25/)  
**Wayback archive**: [https://web.archive.org/web/*/https://cityobservatory.birmingham.gov.uk/explore/…](https://web.archive.org/web/*/https://cityobservatory.birmingham.gov.uk/explore/dataset/expenditure-over-ps500-2024-25/)  
**Audit link captured**: 2026-04-14T23:36:55.917Z  
**Financial year**: 2024/25  
**Publisher description**: Birmingham City Council Spend Over £500 (City Observatory, FY 2024-25)  

**Raw files** (1):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `birmingham_spend_2024_25.csv` | 16.1MB | `88b7c9f64a4912ca…` |

**Total**: 1 files, 16.1MB

### Bradford

**Live source**: [https://datahub.bradford.gov.uk/ebase/datahub/dataset/get.do?datasetId=9](https://datahub.bradford.gov.uk/ebase/datahub/dataset/get.do?datasetId=9)  
**Wayback archive**: [https://web.archive.org/web/*/https://datahub.bradford.gov.uk/ebase/datahub/data…](https://web.archive.org/web/*/https://datahub.bradford.gov.uk/ebase/datahub/dataset/get.do?datasetId=9)  
**Audit link captured**: 2026-04-14T23:36:55.917Z  
**Financial year**: 2023/24  
**Publisher description**: Bradford Council Spend Over £500 (datahub.bradford.gov.uk)  

**Raw files** (4):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `bradford/q1_apr_jun_2023.csv` | 6.3MB | `3fd228731b0ae2bd…` |
| `bradford/q2_jul_sep_2023.csv` | 7.0MB | `4dd58e861a836f47…` |
| `bradford/q3_oct_dec_2023.csv` | 7.1MB | `a81518038be41ac9…` |
| `bradford/q4_jan_mar_2024.csv` | 5.9MB | `880bbe9d95672d91…` |

**Total**: 4 files, 26.3MB

### Bristol

**Live source**: [https://www.bristol.gov.uk/council-and-mayor/council-finance/spending-over-500](https://www.bristol.gov.uk/council-and-mayor/council-finance/spending-over-500)  
**Wayback archive**: [https://web.archive.org/web/*/https://www.bristol.gov.uk/council-and-mayor/counc…](https://web.archive.org/web/*/https://www.bristol.gov.uk/council-and-mayor/council-finance/spending-over-500)  
**Audit link captured**: 2026-04-14T23:36:55.917Z  
**Financial year**: 2023/24  
**Publisher description**: Bristol City Council Spend Over £500 (bristol.gov.uk)  

**Raw files** (12):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `bristol/bristol_2023_04.csv` | 991.8KB | `c7824abced685ff5…` |
| `bristol/bristol_2023_05.csv` | 1.0MB | `7b3780538017fa85…` |
| `bristol/bristol_2023_06.csv` | 1.2MB | `6e9968e15faba473…` |
| `bristol/bristol_2023_07.csv` | 1016.9KB | `fd2f6b4cc0a2ed20…` |
| `bristol/bristol_2023_08.csv` | 1.1MB | `68e9233be7072a25…` |
| `bristol/bristol_2023_09.csv` | 1.0MB | `3978c68f888374b7…` |
| `bristol/bristol_2023_10.csv` | 1019.1KB | `30b473e1ea5e284b…` |
| `bristol/bristol_2023_11.csv` | 1.1MB | `580de9b1ee47140a…` |
| `bristol/bristol_2023_12.csv` | 1.1MB | `e818a4ad05a9c7f5…` |
| `bristol/bristol_2024_01.csv` | 1.1MB | `654b2409e48c2a3b…` |
| `bristol/bristol_2024_02.csv` | 1.2MB | `ce85e66a037967d3…` |
| `bristol/bristol_2024_03.csv` | 1.3MB | `dc05f36f1cb28ec3…` |

**Total**: 12 files, 13.1MB

### Buckinghamshire

**Live source**: [https://www.buckinghamshire.gov.uk/your-council/access-to-information-and-data/open-data/payments-to-suppliers/](https://www.buckinghamshire.gov.uk/your-council/access-to-information-and-data/open-data/payments-to-suppliers/)  
**Wayback archive**: [https://web.archive.org/web/*/https://www.buckinghamshire.gov.uk/your-council/ac…](https://web.archive.org/web/*/https://www.buckinghamshire.gov.uk/your-council/access-to-information-and-data/open-data/payments-to-suppliers/)  
**Audit link captured**: 2026-04-14T23:36:55.917Z  
**Financial year**: 2023/24  
**Publisher description**: Buckinghamshire Council Spend Over £500 (buckinghamshire.gov.uk)  

**Raw files** (11):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `buckinghamshire/bucks_2023_04.csv` | 2.7MB | `cdae141e09020171…` |
| `buckinghamshire/bucks_2023_06.csv` | 2.4MB | `db82830e73fdbbd2…` |
| `buckinghamshire/bucks_2023_07.csv` | 2.1MB | `43c6efbdd0bc6f64…` |
| `buckinghamshire/bucks_2023_08.csv` | 3.3MB | `5e291830fa1e9bf7…` |
| `buckinghamshire/bucks_2023_09.csv` | 2.0MB | `13942b4a476d766e…` |
| `buckinghamshire/bucks_2023_10.csv` | 2.5MB | `0061d48468da7f98…` |
| `buckinghamshire/bucks_2023_11.csv` | 2.4MB | `88090ecb93e37082…` |
| `buckinghamshire/bucks_2023_12.csv` | 2.4MB | `f0eb6feb62b37d31…` |
| `buckinghamshire/bucks_2024_01.csv` | 2.3MB | `e8bf73e711796b53…` |
| `buckinghamshire/bucks_2024_02.csv` | 2.1MB | `1adb03830cd29877…` |
| `buckinghamshire/bucks_2024_03.csv` | 2.5MB | `3cd95e58eb5ca426…` |

**Total**: 11 files, 26.6MB

### Camden

**Live source**: [https://opendata.camden.gov.uk/Finance/Camden-Payments-to-Suppliers/nzbs-6v3d](https://opendata.camden.gov.uk/Finance/Camden-Payments-to-Suppliers/nzbs-6v3d)  
**Wayback archive**: [https://web.archive.org/web/*/https://opendata.camden.gov.uk/Finance/Camden-Paym…](https://web.archive.org/web/*/https://opendata.camden.gov.uk/Finance/Camden-Payments-to-Suppliers/nzbs-6v3d)  
**Audit link captured**: 2026-04-14T23:36:55.917Z  
**Financial year**: 2023/24  
**Publisher description**: Camden Council Open Data Portal (Socrata SODA API)  

**Raw files** (1):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `camden_spend_2023_24.csv` | 16.1MB | `fb5ffe1608d332de…` |

**Total**: 1 files, 16.1MB

### Cornwall

**Live source**: [https://www.cornwall.gov.uk/council-and-democracy/council-information-and-accounts/finance-information-for-cornwall-council/payments-to-suppliers/](https://www.cornwall.gov.uk/council-and-democracy/council-information-and-accounts/finance-information-for-cornwall-council/payments-to-suppliers/)  
**Wayback archive**: [https://web.archive.org/web/*/https://www.cornwall.gov.uk/council-and-democracy/…](https://web.archive.org/web/*/https://www.cornwall.gov.uk/council-and-democracy/council-information-and-accounts/finance-information-for-cornwall-council/payments-to-suppliers/)  
**Audit link captured**: 2026-04-14T23:36:55.917Z  
**Financial year**: 2023/24  
**Publisher description**: Cornwall Council Spend Over £500 (cornwall.gov.uk)  

**Raw files** (12):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `cornwall/cornwall_2023_04.csv` | 5.1MB | `d1c17ffe6174e74a…` |
| `cornwall/cornwall_2023_05.csv` | 6.4MB | `d89f2bf461fc2db4…` |
| `cornwall/cornwall_2023_06.csv` | 5.1MB | `f3c54c620da07185…` |
| `cornwall/cornwall_2023_07.csv` | 4.7MB | `0a687a7acc561c1f…` |
| `cornwall/cornwall_2023_08.csv` | 5.1MB | `ad2f732403414089…` |
| `cornwall/cornwall_2023_09.csv` | 4.4MB | `7dbd1296cbc62a8b…` |
| `cornwall/cornwall_2023_10.csv` | 6.1MB | `afc2e3662e89dd8e…` |
| `cornwall/cornwall_2023_11.csv` | 5.4MB | `f60d5855b89d9769…` |
| `cornwall/cornwall_2023_12.csv` | 4.8MB | `821d60585dd44915…` |
| `cornwall/cornwall_2024_01.csv` | 6.0MB | `526bdcf732048d60…` |
| `cornwall/cornwall_2024_02.csv` | 5.8MB | `1537ad90c99ef3f5…` |
| `cornwall/cornwall_2024_03.csv` | 6.7MB | `a84de44d963b7d50…` |

**Total**: 12 files, 65.8MB

### Coventry

**Live source**: [https://www.coventry.gov.uk/council-spending/expenditure-exceeding-500](https://www.coventry.gov.uk/council-spending/expenditure-exceeding-500)  
**Wayback archive**: [https://web.archive.org/web/*/https://www.coventry.gov.uk/council-spending/expen…](https://web.archive.org/web/*/https://www.coventry.gov.uk/council-spending/expenditure-exceeding-500)  
**Audit link captured**: 2026-04-14T23:36:55.917Z  
**Financial year**: 2023/24  
**Publisher description**: Coventry City Council Spend Over £500 (coventry.gov.uk)  

**Raw files** (12):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `coventry/apr_2023.csv` | 1.2MB | `655669c81e09429d…` |
| `coventry/aug_2023.csv` | 1.8MB | `2e9d399d03214515…` |
| `coventry/dec_2023.csv` | 1.7MB | `4b176a2790f233a6…` |
| `coventry/feb_2024.csv` | 2.0MB | `3584be08c8ec9d86…` |
| `coventry/jan_2024.csv` | 1.8MB | `103627be7a92c544…` |
| `coventry/jul_2023.csv` | 1.8MB | `bf07056d42fb1085…` |
| `coventry/jun_2023.csv` | 2.6MB | `d8938fac1063bbe3…` |
| `coventry/mar_2024.csv` | 1.8MB | `cf65711f381b3eba…` |
| `coventry/may_2023.csv` | 2.2MB | `bd48ade39fcf5c2f…` |
| `coventry/nov_2023.csv` | 1.9MB | `288ad09a8edaef2e…` |
| `coventry/oct_2023.csv` | 1.7MB | `b8e5d9b636d76c7b…` |
| `coventry/sep_2023.csv` | 1.7MB | `33871645bc98c53a…` |

**Total**: 12 files, 22.2MB

### Croydon

**Live source**: [https://www.croydon.gov.uk/council/transparency-and-performance/open-data/council-spending-over-ps500](https://www.croydon.gov.uk/council/transparency-and-performance/open-data/council-spending-over-ps500)  
**Wayback archive**: [https://web.archive.org/web/*/https://www.croydon.gov.uk/council/transparency-an…](https://web.archive.org/web/*/https://www.croydon.gov.uk/council/transparency-and-performance/open-data/council-spending-over-ps500)  
**Audit link captured**: 2026-04-14T23:36:55.917Z  
**Financial year**: 2023/24  
**Publisher description**: Croydon Council Payments Over £500 (croydon.gov.uk)  

**Raw files** (24):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `croydon/apr_2023.csv` | 4.9MB | `33031299bd9d3ac7…` |
| `croydon/apr_2023.xlsx` | 1.5MB | `3f454cf5da4c1f6a…` |
| `croydon/aug_2023.csv` | 3.7MB | `d1cfb57c4e7ecf13…` |
| `croydon/aug_2023.xlsx` | 1.8MB | `ce950736a3a0258e…` |
| `croydon/dec_2023.csv` | 8.1MB | `1fdb5a64e51b556c…` |
| `croydon/dec_2023.xlsx` | 3.0MB | `17b226d6fdc5ff24…` |
| `croydon/feb_2024.csv` | 8.3MB | `919a9f67109753bb…` |
| `croydon/feb_2024.xlsx` | 3.2MB | `ec8e6ad6d63fe441…` |
| `croydon/jan_2024.csv` | 8.5MB | `e5664d283f956b74…` |
| `croydon/jan_2024.xlsx` | 3.2MB | `71082aeeb2cda87a…` |
| `croydon/jul_2023.csv` | 3.6MB | `f548a707e3974d5a…` |
| `croydon/jul_2023.xlsx` | 1.2MB | `e164eae1b1560cbb…` |
| `croydon/jun_2023.csv` | 3.2MB | `0c334cd137cb2781…` |
| `croydon/jun_2023.xlsx` | 1.0MB | `410cc0ac50d32eff…` |
| `croydon/mar_2024.csv` | 8.0MB | `06a19572eac57077…` |
| `croydon/mar_2024.xlsx` | 2.3MB | `a5c4f3ae3bd04061…` |
| `croydon/may_2023.csv` | 6.2MB | `793ac70cdd0f19ae…` |
| `croydon/may_2023.xlsx` | 1.8MB | `8d97f6ae3de1e570…` |
| `croydon/nov_2023.csv` | 5.2MB | `7af546e8ee287317…` |
| `croydon/nov_2023.xlsx` | 2.2MB | `b9c4b2ec564ecb99…` |
| `croydon/oct_2023.csv` | 5.4MB | `f81003b58ad6d50d…` |
| `croydon/oct_2023.xlsx` | 2.3MB | `1019d6d9aa8000ab…` |
| `croydon/sep_2023.csv` | 3.1MB | `fd532aaed505a0d4…` |
| `croydon/sep_2023.xlsx` | 1.6MB | `134ec556c845954b…` |

**Total**: 24 files, 93.3MB

### Devon

**Live source**: [https://www.devon.gov.uk/factsandfigures/dataset/spending-over-500/](https://www.devon.gov.uk/factsandfigures/dataset/spending-over-500/)  
**Wayback archive**: [https://web.archive.org/web/20260414232423/https://www.devon.gov.uk/facts-and-fi…](https://web.archive.org/web/20260414232423/https://www.devon.gov.uk/facts-and-figures/spending-and-finance/spending-over-500/)  
**Audit link captured**: 2026-04-14T23:36:55.917Z  
**Financial year**: 2023/24  
**Publisher description**: Devon County Council Spending Over £500 (github.com/Devon-County-Council/spending)  

**Raw files** (12):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `devon/202304.csv` | 1.8MB | `21884b36b515d356…` |
| `devon/202305.csv` | 2.0MB | `5326657d34bbd389…` |
| `devon/202306.csv` | 2.0MB | `4a41c540b544cd7e…` |
| `devon/202307.csv` | 2.0MB | `ce1295bb1abf857d…` |
| `devon/202308.csv` | 1.6MB | `a23bab2af40c770f…` |
| `devon/202309.csv` | 2.0MB | `6dfcb50b10dc21bf…` |
| `devon/202310.csv` | 1.7MB | `853c34f4b63250da…` |
| `devon/202311.csv` | 2.1MB | `a76f810f8274d902…` |
| `devon/202312.csv` | 1.7MB | `7b9ecce91421184d…` |
| `devon/202401.csv` | 2.0MB | `638f512b01f8bb3b…` |
| `devon/202402.csv` | 2.0MB | `0d10e7e7ad696210…` |
| `devon/202403.csv` | 1.8MB | `fa112b4eedfcd26b…` |

**Total**: 12 files, 22.8MB

### Dudley

**Live source**: [https://www.dudley.gov.uk/council-community/about-the-council/information-performance/transparency/payments-over-500/](https://www.dudley.gov.uk/council-community/about-the-council/information-performance/transparency/payments-over-500/)  
**Wayback archive**: [https://web.archive.org/web/*/https://www.dudley.gov.uk/council-community/about-…](https://web.archive.org/web/*/https://www.dudley.gov.uk/council-community/about-the-council/information-performance/transparency/payments-over-500/)  
**Audit link captured**: 2026-04-14T23:36:55.917Z  
**Financial year**: 2023/24  
**Publisher description**: Dudley Council Spend Over £500 (dudley.gov.uk)  

**Raw files** (12):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `dudley/dudley_2023_04.csv` | 2.4MB | `f1f3eeb0e880ecaf…` |
| `dudley/dudley_2023_05.csv` | 2.2MB | `b7cac2ab1bb99e9d…` |
| `dudley/dudley_2023_06.csv` | 2.0MB | `e46d19ebac600c86…` |
| `dudley/dudley_2023_07.csv` | 2.0MB | `679fdb456c6cd939…` |
| `dudley/dudley_2023_08.csv` | 2.2MB | `3d2f019a222a49f3…` |
| `dudley/dudley_2023_09.csv` | 1.8MB | `73d58f4789059299…` |
| `dudley/dudley_2023_10.csv` | 1.9MB | `5417ff5dfce77db2…` |
| `dudley/dudley_2023_11.csv` | 2.0MB | `dbdc52fd527518da…` |
| `dudley/dudley_2023_12.csv` | 2.0MB | `ff54c49f839f7ec2…` |
| `dudley/dudley_2024_01.csv` | 2.0MB | `4d48e7b65a86f6e1…` |
| `dudley/dudley_2024_02.csv` | 1.8MB | `c160bbd5e8396cab…` |
| `dudley/dudley_2024_03.csv` | 2.0MB | `e50c74853b1601e3…` |

**Total**: 12 files, 24.2MB

### East Sussex

**Live source**: [https://www.eastsussex.gov.uk/your-council/about/transparency/finance/spending-over-500](https://www.eastsussex.gov.uk/your-council/about/transparency/finance/spending-over-500)  
**Wayback archive**: [https://web.archive.org/web/*/https://www.eastsussex.gov.uk/your-council/about/t…](https://web.archive.org/web/*/https://www.eastsussex.gov.uk/your-council/about/transparency/finance/spending-over-500)  
**Audit link captured**: 2026-04-14T23:36:55.917Z  
**Financial year**: 2023/24  
**Publisher description**: East Sussex CC Spend Over £500 (eastsussex.gov.uk)  

**Raw files** (8):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `east_sussex/eastsussex_q1.csv` | 947.7KB | `489e66bad8f0cc7a…` |
| `east_sussex/eastsussex_q2.csv` | 881.0KB | `4587b754021aa671…` |
| `east_sussex/eastsussex_q3.csv` | 986.2KB | `88d9a46e22064a85…` |
| `east_sussex/eastsussex_q4.csv` | 1.1MB | `dccecc35a01d41f5…` |
| `east_sussex/q1.xlsx` | 483.4KB | `afad2416e7ab4812…` |
| `east_sussex/q2.xlsx` | 459.0KB | `6504c560fc9e0ab8…` |
| `east_sussex/q3.xlsx` | 520.4KB | `dc9cf0a0f57c5f06…` |
| `east_sussex/q4.xlsx` | 588.6KB | `e10acc43b28d3e0a…` |

**Total**: 8 files, 5.9MB

### Essex

**Live source**: [https://data.essex.gov.uk/dataset/day-to-day-spending](https://data.essex.gov.uk/dataset/day-to-day-spending)  
**Wayback archive**: [https://web.archive.org/web/*/https://data.essex.gov.uk/dataset/day-to-day-spend…](https://web.archive.org/web/*/https://data.essex.gov.uk/dataset/day-to-day-spending)  
**Audit link captured**: 2026-04-14T23:36:55.917Z  
**Financial year**: 2023/24  
**Publisher description**: Essex County Council Day-to-Day Spending (essex.gov.uk)  

**Raw files** (8):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `essex/q1_apr_jun_2023.csv` | 12.8MB | `b37de2801eba8f86…` |
| `essex/q1_apr_jun_2023.xlsx` | 4.6MB | `70a717aa5af0493d…` |
| `essex/q2_jul_sep_2023.csv` | 13.4MB | `6cbdc32ec5a6640e…` |
| `essex/q2_jul_sep_2023.xls` | 15.6MB | `b259871beb6765a6…` |
| `essex/q3_oct_dec_2023.csv` | 13.2MB | `bba08fa5e5d754ba…` |
| `essex/q3_oct_dec_2023.xlsx` | 4.7MB | `f2f8565384ccded8…` |
| `essex/q4_jan_mar_2024.csv` | 13.9MB | `4b44c516295bd219…` |
| `essex/q4_jan_mar_2024.xls` | 15.5MB | `b87d3910358e7276…` |

**Total**: 8 files, 93.8MB

### Hampshire

**Live source**: [https://www.hants.gov.uk/aboutthecouncil/informationandstats/opendata/opendatasearch/supplierpayments](https://www.hants.gov.uk/aboutthecouncil/informationandstats/opendata/opendatasearch/supplierpayments)  
**Wayback archive**: [https://web.archive.org/web/*/https://www.hants.gov.uk/aboutthecouncil/informati…](https://web.archive.org/web/*/https://www.hants.gov.uk/aboutthecouncil/informationandstats/opendata/opendatasearch/supplierpayments)  
**Audit link captured**: 2026-04-14T23:32:21.049Z  
**Financial year**: 2023/24  
**Publisher description**: Hampshire County Council Payments to Suppliers (documents.hants.gov.uk, 12/12 months via Playwright)  

**Raw files** (24):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `hampshire/apr_2023.csv` | 2.8MB | `281e5a55de53fdf0…` |
| `hampshire/apr_2023.xlsx` | 1003.7KB | `601c3714f831e993…` |
| `hampshire/aug_2023.csv` | 3.0MB | `e98baedc6ca7b434…` |
| `hampshire/aug_2023.xlsx` | 1.0MB | `5b7facda3b398263…` |
| `hampshire/dec_2023.csv` | 4.9MB | `2c5af3d85b3f33bc…` |
| `hampshire/dec_2023.xlsx` | 1.4MB | `d4fbede4761005e6…` |
| `hampshire/feb_2024.csv` | 6.6MB | `003f26a967d35459…` |
| `hampshire/feb_2024.xlsx` | 1.8MB | `ba535c11f2336ecd…` |
| `hampshire/jan_2024.csv` | 6.1MB | `597e347604b29921…` |
| `hampshire/jan_2024.xlsx` | 1.7MB | `503ca2e74113941f…` |
| `hampshire/jul_2023.csv` | 3.1MB | `399a4129d2919148…` |
| `hampshire/jul_2023.xlsx` | 1.1MB | `d6385d2fd74f3b5d…` |
| `hampshire/jun_2023.csv` | 3.1MB | `77749e2a546a0c81…` |
| `hampshire/jun_2023.xlsx` | 1.1MB | `16960e03b33e7287…` |
| `hampshire/mar_2024.csv` | 7.0MB | `eeca27c71ce2d1f6…` |
| `hampshire/mar_2024.xlsx` | 2.0MB | `a274ac6442349872…` |
| `hampshire/may_2023.csv` | 3.5MB | `52905aea57bb8a79…` |
| `hampshire/may_2023.xlsx` | 1.2MB | `6f08f95c9e48eccc…` |
| `hampshire/nov_2023.csv` | 4.5MB | `28b20f587e0a5584…` |
| `hampshire/nov_2023.xlsx` | 1.3MB | `6e258c920f5c3f9a…` |
| `hampshire/oct_2023.csv` | 2.8MB | `0450fb4759e5c736…` |
| `hampshire/oct_2023.xlsx` | 1003.8KB | `eefa51c4dfd945e7…` |
| `hampshire/sep_2023.csv` | 2.8MB | `8622f07d419b8852…` |
| `hampshire/sep_2023.xlsx` | 978.1KB | `877fdb805fbdaed2…` |

**Total**: 24 files, 65.8MB

### Hertfordshire

**Live source**: [https://www.hertfordshire.gov.uk/about-the-council/freedom-of-information-and-council-data/data-and-statistics/payments-to-suppliers/payments-to-suppliers.aspx](https://www.hertfordshire.gov.uk/about-the-council/freedom-of-information-and-council-data/data-and-statistics/payments-to-suppliers/payments-to-suppliers.aspx)  
**Wayback archive**: [https://web.archive.org/web/*/https://www.hertfordshire.gov.uk/about-the-council…](https://web.archive.org/web/*/https://www.hertfordshire.gov.uk/about-the-council/freedom-of-information-and-council-data/data-and-statistics/payments-to-suppliers/payments-to-suppliers.aspx)  
**Audit link captured**: 2026-04-14T23:36:55.917Z  
**Financial year**: 2023/24  
**Publisher description**: Hertfordshire CC Supplier Payments Over £250 (hertfordshire.gov.uk)  

**Raw files** (4):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `hertfordshire/herts_q1.csv` | 12.2MB | `fae5863579663c36…` |
| `hertfordshire/herts_q2.csv` | 10.8MB | `0a7e73ef31c30b87…` |
| `hertfordshire/herts_q3.csv` | 13.0MB | `399465ba20cd6e85…` |
| `hertfordshire/herts_q4.csv` | 12.9MB | `d4cf35415203a48e…` |

**Total**: 4 files, 49.0MB

### Kent

**Live source**: [https://www.kent.gov.uk/about-the-council/information-and-data/open-data/invoices-paid-over-250](https://www.kent.gov.uk/about-the-council/information-and-data/open-data/invoices-paid-over-250)  
**Wayback archive**: [https://web.archive.org/web/*/https://www.kent.gov.uk/about-the-council/informat…](https://web.archive.org/web/*/https://www.kent.gov.uk/about-the-council/information-and-data/open-data/invoices-paid-over-250)  
**Audit link captured**: 2026-04-14T23:36:55.917Z  
**Financial year**: 2023/24  
**Publisher description**: Kent CC Invoices Over £250 (kent.gov.uk)  

**Raw files** (12):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `kent/kent_2023_04.csv` | 5.9MB | `967dab9e624a9b62…` |
| `kent/kent_2023_05.csv` | 7.9MB | `8d6aaee023db63a8…` |
| `kent/kent_2023_06.csv` | 6.8MB | `d4eb2c24ba1c5819…` |
| `kent/kent_2023_07.csv` | 6.5MB | `cfc51ab464887d3f…` |
| `kent/kent_2023_08.csv` | 8.1MB | `42f1b63043335c17…` |
| `kent/kent_2023_09.csv` | 6.1MB | `76cf4c7e9b5ccc35…` |
| `kent/kent_2023_10.csv` | 7.2MB | `a2338ed41910910d…` |
| `kent/kent_2023_11.csv` | 6.6MB | `4a792cf98cec7270…` |
| `kent/kent_2023_12.csv` | 6.7MB | `779afeac7412e40b…` |
| `kent/kent_2024_01.csv` | 6.6MB | `5b1121b29142254e…` |
| `kent/kent_2024_02.csv` | 7.2MB | `5e7c4b188efef81b…` |
| `kent/kent_2024_03.csv` | 6.6MB | `4ca72e4bd0f91114…` |

**Total**: 12 files, 82.1MB

### Lambeth

**Live source**: [https://www.lambeth.gov.uk/finance-and-performance/council-finances/payments-over-500](https://www.lambeth.gov.uk/finance-and-performance/council-finances/payments-over-500)  
**Wayback archive**: [https://web.archive.org/web/*/https://www.lambeth.gov.uk/finance-and-performance…](https://web.archive.org/web/*/https://www.lambeth.gov.uk/finance-and-performance/council-finances/payments-over-500)  
**Audit link captured**: 2026-04-14T23:36:55.917Z  
**Financial year**: 2023/24  
**Publisher description**: Lambeth Council Spend Over £500 (lambeth.gov.uk)  

**Raw files** (7):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `lambeth/lambeth_2023_24_q1.csv` | 10.2MB | `b01b656a6cbebf65…` |
| `lambeth/lambeth_2023_24_q1.xlsx` | 2.9MB | `5b65f1fcba5b1ea1…` |
| `lambeth/lambeth_2023_24_q2.csv` | 11.6MB | `255120e73b20f44c…` |
| `lambeth/lambeth_2023_24_q2.xlsx` | 3.3MB | `f1e4d8dd76ea700e…` |
| `lambeth/lambeth_2023_24_q3.csv` | 12.2MB | `3889443d12479c91…` |
| `lambeth/lambeth_2023_24_q3.xlsx` | 3.5MB | `77cb2d5c9306d7db…` |
| `lambeth/lambeth_2023_24_q4.csv` | 12.6MB | `0773d27ff92a9eae…` |

**Total**: 7 files, 56.2MB

### Lancashire

**Live source**: [https://transparency.lancashire.gov.uk/](https://transparency.lancashire.gov.uk/)  
**Wayback archive**: [https://web.archive.org/web/20260414232019/https://transparency.lancashire.gov.u…](https://web.archive.org/web/20260414232019/https://transparency.lancashire.gov.uk/)  
**Audit link captured**: 2026-04-14T23:36:55.917Z  
**Financial year**: 2023/24  
**Publisher description**: Lancashire County Council Payments to Suppliers (transparency.lancashire.gov.uk, 11/12 months — March 2024 not published upstream)  

**Raw files** (11):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `lancashire/apr_2023.csv` | 2.1MB | `feeb6a818c9c8570…` |
| `lancashire/aug_2023.csv` | 2.4MB | `61c7dbaf2940aad4…` |
| `lancashire/dec_2023.csv` | 2.8MB | `ffa23442c8385db7…` |
| `lancashire/feb_2024.csv` | 1.7MB | `02b4406dd8e8677f…` |
| `lancashire/jan_2024.csv` | 11.5MB | `285a3f6b9830bd0a…` |
| `lancashire/jul_2023.csv` | 2.9MB | `fd2bee9b1e28dcdf…` |
| `lancashire/jun_2023.csv` | 3.0MB | `5019c867dee1fc64…` |
| `lancashire/may_2023.csv` | 2.1MB | `e690ec5409e62d79…` |
| `lancashire/nov_2023.csv` | 3.0MB | `bc0f8ea2ee0cc18e…` |
| `lancashire/oct_2023.csv` | 2.7MB | `25e32f3b79b01df1…` |
| `lancashire/sep_2023.csv` | 4.7MB | `16b67ef8609cf467…` |

**Total**: 11 files, 38.9MB

### Leeds

**Live source**: [https://datamillnorth.org/dataset/leeds-city-council-transactions-over-500](https://datamillnorth.org/dataset/leeds-city-council-transactions-over-500)  
**Wayback archive**: [https://web.archive.org/web/*/https://datamillnorth.org/dataset/leeds-city-counc…](https://web.archive.org/web/*/https://datamillnorth.org/dataset/leeds-city-council-transactions-over-500)  
**Audit link captured**: 2026-04-14T23:36:55.917Z  
**Financial year**: 2023/24  
**Publisher description**: Leeds City Council via Data Mill North CKAN API  

_No raw files found on disk — may have been processed in-memory from an API._

### Lincolnshire

**Live source**: [https://lcc.portaljs.com/dataset/lincolnshire-county-council-spending](https://lcc.portaljs.com/dataset/lincolnshire-county-council-spending)  
**Wayback archive**: [https://web.archive.org/web/*/https://lcc.portaljs.com/dataset/lincolnshire-coun…](https://web.archive.org/web/*/https://lcc.portaljs.com/dataset/lincolnshire-county-council-spending)  
**Audit link captured**: 2026-04-14T23:32:21.049Z  
**Financial year**: 2023/24  
**Publisher description**: Lincolnshire County Council Spending (lcc.portaljs.com via Datopian — includes transactions below £500)  

**Raw files** (12):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `lincolnshire/2023-04.csv` | 5.2MB | `fce44741aa444cfd…` |
| `lincolnshire/2023-05.csv` | 7.2MB | `713c07aee1f19bc9…` |
| `lincolnshire/2023-06.csv` | 10.0MB | `ba44ffb1c31dfc55…` |
| `lincolnshire/2023-07.csv` | 9.5MB | `e28feffc6865e6b2…` |
| `lincolnshire/2023-08.csv` | 10.3MB | `0a72cc823ef3b606…` |
| `lincolnshire/2023-09.csv` | 9.2MB | `a188434583171b88…` |
| `lincolnshire/2023-10.csv` | 8.3MB | `7d7ab8708f2807fd…` |
| `lincolnshire/2023-11.csv` | 8.4MB | `1f4a15a0d231aedd…` |
| `lincolnshire/2023-12.csv` | 7.9MB | `805cac64a6decc57…` |
| `lincolnshire/2024-01.csv` | 9.4MB | `14726273b9487bfe…` |
| `lincolnshire/2024-02.csv` | 8.6MB | `ec4593d84e16fd0d…` |
| `lincolnshire/2024-03.csv` | 9.5MB | `8757d24f4ef364f3…` |

**Total**: 12 files, 103.5MB

### Liverpool

**Live source**: [https://liverpool.gov.uk/council/transparency-and-performance/payments-to-suppliers/](https://liverpool.gov.uk/council/transparency-and-performance/payments-to-suppliers/)  
**Wayback archive**: [https://web.archive.org/web/*/https://liverpool.gov.uk/council/transparency-and-…](https://web.archive.org/web/*/https://liverpool.gov.uk/council/transparency-and-performance/payments-to-suppliers/)  
**Audit link captured**: 2026-04-14T23:36:55.917Z  
**Financial year**: 2023/24  
**Publisher description**: Liverpool City Council Spend Over £500 (liverpool.gov.uk)  

**Raw files** (24):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `liverpool/apr_2023.csv` | 1.1MB | `3f9c1a95b0cb778e…` |
| `liverpool/apr_2023.xlsx` | 403.9KB | `25139a6605d6ae87…` |
| `liverpool/aug_2023.csv` | 1.3MB | `fd08381b9e41bc63…` |
| `liverpool/aug_2023.xlsx` | 480.7KB | `6667f2adbbcadd84…` |
| `liverpool/dec_2023.csv` | 1.3MB | `bfc903f5c3e59658…` |
| `liverpool/dec_2023.xlsx` | 479.3KB | `30bafafbfaeccb71…` |
| `liverpool/feb_2024.csv` | 1.3MB | `eaecc55bb62362d9…` |
| `liverpool/feb_2024.xlsx` | 462.5KB | `5a2ace889611cd08…` |
| `liverpool/jan_2024.csv` | 1.3MB | `638c79853d57fc80…` |
| `liverpool/jan_2024.xlsx` | 471.0KB | `d48baf9e3f9bb832…` |
| `liverpool/jul_2023.csv` | 1.2MB | `ca4700c7bcb5706b…` |
| `liverpool/jul_2023.xlsx` | 450.9KB | `20d1df40c026cfc8…` |
| `liverpool/jun_2023.csv` | 1.3MB | `075f815dea513e8b…` |
| `liverpool/jun_2023.xlsx` | 484.8KB | `68b9a8005adec1dd…` |
| `liverpool/mar_2024.csv` | 1.6MB | `6477a9ee17637e6b…` |
| `liverpool/mar_2024.xlsx` | 559.9KB | `e6ecd65270afcd63…` |
| `liverpool/may_2023.csv` | 1.3MB | `15a37dcfeeb666cf…` |
| `liverpool/may_2023.xlsx` | 492.6KB | `b2068d6ad5a75660…` |
| `liverpool/nov_2023.csv` | 1.2MB | `35f32931d9ac942e…` |
| `liverpool/nov_2023.xlsx` | 438.9KB | `2efd011b725e8442…` |
| `liverpool/oct_2023.csv` | 1.2MB | `af088c943b815014…` |
| `liverpool/oct_2023.xlsx` | 456.9KB | `a8d548a647110d72…` |
| `liverpool/sep_2023.csv` | 1.2MB | `43855038c555f055…` |
| `liverpool/sep_2023.xlsx` | 458.8KB | `29548d0c92b1b7dd…` |

**Total**: 24 files, 20.8MB

### Manchester

**Live source**: [https://www.manchester.gov.uk/info/200031/council_expenditure_and_performance/7665/payments_to_suppliers](https://www.manchester.gov.uk/info/200031/council_expenditure_and_performance/7665/payments_to_suppliers)  
**Wayback archive**: [https://web.archive.org/web/*/https://www.manchester.gov.uk/info/200031/council_…](https://web.archive.org/web/*/https://www.manchester.gov.uk/info/200031/council_expenditure_and_performance/7665/payments_to_suppliers)  
**Audit link captured**: 2026-04-14T23:36:55.917Z  
**Financial year**: 2023/24  
**Publisher description**: Manchester City Council Spend Over £500  

**Raw files** (12):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `manchester/apr_2023.csv` | 422.1KB | `5f14ca445dc3725e…` |
| `manchester/aug_2023.csv` | 479.2KB | `a2a95b5e8b116222…` |
| `manchester/dec_2023.csv` | 400.8KB | `61b0b4e9859b7cbb…` |
| `manchester/feb_2024.csv` | 462.2KB | `7de933c3c4b91b54…` |
| `manchester/jan_2024.csv` | 505.2KB | `424df46c093aa596…` |
| `manchester/jul_2023.csv` | 537.6KB | `8eac17aaecb048ed…` |
| `manchester/jun_2023.csv` | 406.1KB | `70f76dcb389abb62…` |
| `manchester/mar_2024.csv` | 650.6KB | `575762669c4b9cf9…` |
| `manchester/may_2023.csv` | 624.5KB | `21838af25e42234b…` |
| `manchester/nov_2023.csv` | 520.6KB | `8867affa6b34119e…` |
| `manchester/oct_2023.csv` | 462.0KB | `cd82e0de40b56f6a…` |
| `manchester/sep_2023.csv` | 470.8KB | `a6f129b4ac9ee34b…` |

**Total**: 12 files, 5.8MB

### Merton

**Live source**: [https://www.merton.gov.uk/council/council-expenditure](https://www.merton.gov.uk/council/council-expenditure)  
**Wayback archive**: [https://web.archive.org/web/*/https://www.merton.gov.uk/council/council-expendit…](https://web.archive.org/web/*/https://www.merton.gov.uk/council/council-expenditure)  
**Audit link captured**: 2026-04-14T23:36:55.917Z  
**Financial year**: 2023/24  
**Publisher description**: Merton Council Spend Over £500 (merton.gov.uk)  

**Raw files** (2):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `merton/merton_2023.csv` | 7.5MB | `720208d16ff43c20…` |
| `merton/merton_2024.csv` | 8.0MB | `8d501c904059dc53…` |

**Total**: 2 files, 15.5MB

### Norfolk

**Live source**: [https://www.norfolk.gov.uk/what-we-do-and-how-we-work/transparency/spending-over-500](https://www.norfolk.gov.uk/what-we-do-and-how-we-work/transparency/spending-over-500)  
**Wayback archive**: [https://web.archive.org/web/*/https://www.norfolk.gov.uk/what-we-do-and-how-we-w…](https://web.archive.org/web/*/https://www.norfolk.gov.uk/what-we-do-and-how-we-work/transparency/spending-over-500)  
**Audit link captured**: 2026-04-14T23:36:55.917Z  
**Financial year**: 2023/24  
**Publisher description**: Norfolk CC Spend Over £500 (norfolk.gov.uk)  

**Raw files** (5):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `norfolk/norfolk_q1.csv` | 16.6MB | `d083e1328a87231d…` |
| `norfolk/norfolk_q2.csv` | 13.3MB | `a0d74ef996199082…` |
| `norfolk/norfolk_q3.csv` | 16.3MB | `75e27d0ad321c9b2…` |
| `norfolk/norfolk_q4.csv` | 17.7MB | `ad27565a199585a1…` |
| `norfolk/norfolk_q4.xlsx` | 6.1MB | `cdfea054b6ffed67…` |

**Total**: 5 files, 70.1MB

### North Yorkshire

**Live source**: [https://datanorthyorkshire.org/dataset/payments-to-suppliers](https://datanorthyorkshire.org/dataset/payments-to-suppliers)  
**Wayback archive**: [https://web.archive.org/web/*/https://datanorthyorkshire.org/dataset/payments-to…](https://web.archive.org/web/*/https://datanorthyorkshire.org/dataset/payments-to-suppliers)  
**Audit link captured**: 2026-04-14T23:36:55.917Z  
**Financial year**: 2023/24  
**Publisher description**: North Yorkshire Council Spend Over £500 (datanorthyorkshire.org)  

**Raw files** (5):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `north_yorkshire/northyorks_q1.csv` | 6.1MB | `c4b518c414dd3a56…` |
| `north_yorkshire/northyorks_q1.xlsx` | 1.5MB | `826f059ef08a2c56…` |
| `north_yorkshire/northyorks_q2.csv` | 6.3MB | `857c340eba5317c9…` |
| `north_yorkshire/northyorks_q3.csv` | 6.7MB | `aee4c94d36181468…` |
| `north_yorkshire/northyorks_q4.csv` | 7.0MB | `252a258acc435fc6…` |

**Total**: 5 files, 27.5MB

### Nottinghamshire

**Live source**: [https://www.nottinghamshire.gov.uk/council-and-democracy/council-spending/payments-to-suppliers](https://www.nottinghamshire.gov.uk/council-and-democracy/council-spending/payments-to-suppliers)  
**Wayback archive**: [https://web.archive.org/web/*/https://www.nottinghamshire.gov.uk/council-and-dem…](https://web.archive.org/web/*/https://www.nottinghamshire.gov.uk/council-and-democracy/council-spending/payments-to-suppliers)  
**Audit link captured**: 2026-04-14T23:36:55.917Z  
**Financial year**: 2023/24  
**Publisher description**: Nottinghamshire CC Spend Over £500 (nottinghamshire.gov.uk)  

**Raw files** (12):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `nottinghamshire/notts_2023_04.csv` | 1.1MB | `f7d9a72180982fa4…` |
| `nottinghamshire/notts_2023_05.csv` | 1.3MB | `d5527b7c89bdc097…` |
| `nottinghamshire/notts_2023_06.csv` | 1.6MB | `1329254894477cd0…` |
| `nottinghamshire/notts_2023_07.csv` | 1.3MB | `ff6c6ed385df7154…` |
| `nottinghamshire/notts_2023_08.csv` | 1.4MB | `28e78993ea7f23b3…` |
| `nottinghamshire/notts_2023_09.csv` | 1.2MB | `60e0214b65959b1e…` |
| `nottinghamshire/notts_2023_10.csv` | 1.2MB | `024923add567a536…` |
| `nottinghamshire/notts_2023_11.csv` | 1.3MB | `8a50ae7a3f058bd0…` |
| `nottinghamshire/notts_2023_12.csv` | 1.3MB | `fdcd5d7a1540190b…` |
| `nottinghamshire/notts_2024_01.csv` | 1.5MB | `43db7420d7b62321…` |
| `nottinghamshire/notts_2024_02.csv` | 1.3MB | `ee75fdb9f6f57542…` |
| `nottinghamshire/notts_2024_03.csv` | 1.3MB | `f645d20061ac069a…` |

**Total**: 12 files, 15.8MB

### Rochdale

**Live source**: [https://www.rochdale.gov.uk/council/council-spending/Pages/payments-to-suppliers.aspx](https://www.rochdale.gov.uk/council/council-spending/Pages/payments-to-suppliers.aspx)  
**Wayback archive**: [https://web.archive.org/web/*/https://www.rochdale.gov.uk/council/council-spendi…](https://web.archive.org/web/*/https://www.rochdale.gov.uk/council/council-spending/Pages/payments-to-suppliers.aspx)  
**Audit link captured**: 2026-04-14T23:36:55.917Z  
**Financial year**: 2023/24  
**Publisher description**: Rochdale Borough Council Open Data (Spend Over £500)  

**Raw files** (12):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `rochdale/2023_APR_Spend.csv` | 2.9MB | `b1282e1525971c1d…` |
| `rochdale/2023_AUG_Spend.csv` | 2.4MB | `d84055b6b5ac8f3e…` |
| `rochdale/2023_DEC_Spend.csv` | 3.9MB | `a63016324274284a…` |
| `rochdale/2023_JUL_Spend.csv` | 2.7MB | `2a71fe639cda8fcf…` |
| `rochdale/2023_JUN_Spend.csv` | 3.7MB | `38c61e4efb4ec351…` |
| `rochdale/2023_MAY_Spend.csv` | 3.3MB | `7fe28f5a89e94250…` |
| `rochdale/2023_NOV_Spend.csv` | 3.2MB | `54bf902e29d44048…` |
| `rochdale/2023_OCT_Spend.csv` | 3.8MB | `468de1cf40ccaa6f…` |
| `rochdale/2023_SEP_Spend.csv` | 2.1MB | `acd2e7fdc4980de2…` |
| `rochdale/2024_FEB_Spend.csv` | 3.2MB | `8bbffd397f2354d3…` |
| `rochdale/2024_JAN_Spend.csv` | 2.9MB | `bee45f990a39a9c0…` |
| `rochdale/2024_MAR_Spend.csv` | 3.5MB | `45d42200556c1bf5…` |

**Total**: 12 files, 37.6MB

### Sheffield

**Live source**: [https://www.sheffield.gov.uk/your-city-council/spending-and-performance/payments-suppliers-over-250](https://www.sheffield.gov.uk/your-city-council/spending-and-performance/payments-suppliers-over-250)  
**Wayback archive**: [https://web.archive.org/web/*/https://www.sheffield.gov.uk/your-city-council/spe…](https://web.archive.org/web/*/https://www.sheffield.gov.uk/your-city-council/spending-and-performance/payments-suppliers-over-250)  
**Audit link captured**: 2026-04-14T23:36:55.917Z  
**Financial year**: 2023/24  
**Publisher description**: Sheffield City Council Spend Over £250 (Data Mill North)  

**Raw files** (12):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `sheffield/sheffield_2023_04.csv` | 6.2MB | `4be7a6599b6c6c50…` |
| `sheffield/sheffield_2023_05.csv` | 6.3MB | `81ececb43df351c6…` |
| `sheffield/sheffield_2023_06.csv` | 6.5MB | `8437d9dd51a967c5…` |
| `sheffield/sheffield_2023_07.csv` | 6.2MB | `bc4a4a0f6ea5030b…` |
| `sheffield/sheffield_2023_08.csv` | 7.3MB | `94182a4c71f01e03…` |
| `sheffield/sheffield_2023_09.csv` | 6.0MB | `b62d5dc477c72ec7…` |
| `sheffield/sheffield_2023_10.csv` | 6.4MB | `8c4f919d9a6d6d01…` |
| `sheffield/sheffield_2023_11.csv` | 6.1MB | `432450644c6aae1f…` |
| `sheffield/sheffield_2023_12.csv` | 5.5MB | `c5769c9d90de134a…` |
| `sheffield/sheffield_2024_01.csv` | 7.2MB | `64e714504742aff8…` |
| `sheffield/sheffield_2024_02.csv` | 5.3MB | `868b771a24038fda…` |
| `sheffield/sheffield_2024_03.csv` | 7.2MB | `a117b5ff9509281e…` |

**Total**: 12 files, 76.3MB

### South Gloucestershire

**Live source**: [https://www.southglos.gov.uk/council-and-democracy/council-budgets-and-spending/payments-to-suppliers/](https://www.southglos.gov.uk/council-and-democracy/council-budgets-and-spending/payments-to-suppliers/)  
**Wayback archive**: [https://web.archive.org/web/*/https://www.southglos.gov.uk/council-and-democracy…](https://web.archive.org/web/*/https://www.southglos.gov.uk/council-and-democracy/council-budgets-and-spending/payments-to-suppliers/)  
**Audit link captured**: 2026-04-14T23:36:55.917Z  
**Financial year**: 2023/24  
**Publisher description**: South Gloucestershire Council Spend Over £500 (southglos.gov.uk)  

**Raw files** (12):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `south_glos/sglos_2023_04.csv` | 969.7KB | `24034a7fbb1faa4d…` |
| `south_glos/sglos_2023_05.csv` | 1.2MB | `0c70be17ea9b4a18…` |
| `south_glos/sglos_2023_06.csv` | 991.5KB | `417b346b2e30e433…` |
| `south_glos/sglos_2023_07.csv` | 885.5KB | `6ccd9ce66c3a9910…` |
| `south_glos/sglos_2023_08.csv` | 1.0MB | `f9474daed6d58e38…` |
| `south_glos/sglos_2023_09.csv` | 1.1MB | `6aa282830dd00f1f…` |
| `south_glos/sglos_2023_10.csv` | 1.0MB | `d72f5dba05eac3e2…` |
| `south_glos/sglos_2023_11.csv` | 1013.3KB | `d3c47114c8314b81…` |
| `south_glos/sglos_2023_12.csv` | 1.0MB | `c88115d11a84f7bd…` |
| `south_glos/sglos_2024_01.csv` | 1.1MB | `9a0f12d67916e04a…` |
| `south_glos/sglos_2024_02.csv` | 932.7KB | `bfc3757d20d7b51b…` |
| `south_glos/sglos_2024_03.csv` | 1.5MB | `c1a15682c0b375a2…` |

**Total**: 12 files, 12.6MB

### Southwark

**Live source**: [https://www.southwark.gov.uk/council-and-democracy/transparency/how-we-spend-our-money/payments-to-suppliers](https://www.southwark.gov.uk/council-and-democracy/transparency/how-we-spend-our-money/payments-to-suppliers)  
**Wayback archive**: [https://web.archive.org/web/*/https://www.southwark.gov.uk/council-and-democracy…](https://web.archive.org/web/*/https://www.southwark.gov.uk/council-and-democracy/transparency/how-we-spend-our-money/payments-to-suppliers)  
**Audit link captured**: 2026-04-14T23:36:55.917Z  
**Financial year**: 2023/24  
**Publisher description**: Southwark Council Spend Over £250 (southwark.gov.uk)  

**Raw files** (24):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `southwark/southwark_2023_04.csv` | 1.2MB | `0b3547263550cdba…` |
| `southwark/southwark_2023_04.xlsx` | 546.9KB | `bcb74968a265a531…` |
| `southwark/southwark_2023_05.csv` | 1.1MB | `c294522dcbe0a71c…` |
| `southwark/southwark_2023_05.xlsx` | 562.5KB | `d921b6ca058cf67a…` |
| `southwark/southwark_2023_06.csv` | 1.5MB | `a1ccd523ff8c71cf…` |
| `southwark/southwark_2023_06.xlsx` | 608.0KB | `0e21df53d0bccd5f…` |
| `southwark/southwark_2023_07.csv` | 1.3MB | `abb43d16423f1c9a…` |
| `southwark/southwark_2023_07.xlsx` | 548.8KB | `2c19288871da4bd1…` |
| `southwark/southwark_2023_08.csv` | 1.3MB | `0c96c7650abafe14…` |
| `southwark/southwark_2023_08.xlsx` | 564.3KB | `494e22ace43c4a0f…` |
| `southwark/southwark_2023_09.csv` | 1.5MB | `4988ee400ce66ded…` |
| `southwark/southwark_2023_09.xlsx` | 623.1KB | `363abe5c7e9411fa…` |
| `southwark/southwark_2023_10.csv` | 1.3MB | `1d4a794835cabde7…` |
| `southwark/southwark_2023_10.xlsx` | 1.3MB | `e8ff6fa24c428d7a…` |
| `southwark/southwark_2023_11.csv` | 1.4MB | `8c5c0012f97187c0…` |
| `southwark/southwark_2023_11.xlsx` | 1.3MB | `cb404ee8592cfab6…` |
| `southwark/southwark_2023_12.csv` | 1.2MB | `ca42ac86ddef8103…` |
| `southwark/southwark_2023_12.xlsx` | 1.3MB | `fa8564f77a02df33…` |
| `southwark/southwark_2024_01.csv` | 857.9KB | `18f78ad044ce8149…` |
| `southwark/southwark_2024_01.xlsx` | 1.6MB | `747ca7b7008a90e9…` |
| `southwark/southwark_2024_02.csv` | 1.5MB | `88fb606028ff869e…` |
| `southwark/southwark_2024_02.xlsx` | 1.4MB | `e2448a84e9801808…` |
| `southwark/southwark_2024_03.csv` | 1.4MB | `f454c37369f82f4b…` |
| `southwark/southwark_2024_03.xlsx` | 1.3MB | `378b9d258e235b67…` |

**Total**: 24 files, 27.1MB

### Staffordshire

**Live source**: [https://www.staffordshire.gov.uk/council-and-democracy/transparency/expenditure-exceeding-ps500/20232024](https://www.staffordshire.gov.uk/council-and-democracy/transparency/expenditure-exceeding-ps500/20232024)  
**Wayback archive**: [https://web.archive.org/web/20260414235005/https://www.staffordshire.gov.uk/coun…](https://web.archive.org/web/20260414235005/https://www.staffordshire.gov.uk/council-and-democracy/transparency/expenditure-exceeding-ps500/20232024)  
**Audit link captured**: 2026-04-14T23:36:55.917Z  
**Financial year**: 2023/24  
**Publisher description**: Staffordshire County Council Expenditure Over £500 (staffordshire.gov.uk)  

**Raw files** (12):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `staffordshire/29-02-2024.csv` | 765.5KB | `36e5f4c293d2ef5e…` |
| `staffordshire/30-04-2023.csv` | 974.5KB | `1c09ba9a30cdaf9b…` |
| `staffordshire/30-06-2023.csv` | 721.4KB | `4f8f63841265468a…` |
| `staffordshire/30-09-2023.csv` | 689.0KB | `6516aaadae5baaa8…` |
| `staffordshire/30-11-2023.csv` | 834.0KB | `ac6a4f783a401564…` |
| `staffordshire/31-01-2024.csv` | 919.2KB | `3b34ba8a050583ea…` |
| `staffordshire/31-03-2024.csv` | 1.0MB | `a3b2bfd8044c9c7d…` |
| `staffordshire/31-05-2023.csv` | 816.0KB | `7d70a8a494958262…` |
| `staffordshire/31-07-2023.csv` | 889.3KB | `477ef052144fb346…` |
| `staffordshire/31-08-2023.csv` | 728.7KB | `fec4184113ffd6ce…` |
| `staffordshire/31-10-2023.csv` | 667.4KB | `37445eaf324c41ab…` |
| `staffordshire/31-12-2023.csv` | 695.6KB | `c42b21b814d84b65…` |

**Total**: 12 files, 9.5MB

### Surrey

_No raw files tracked — data fetched via API at build time._

### West Sussex

**Live source**: [https://www.westsussex.gov.uk/about-the-council/how-the-council-works/council-spending/](https://www.westsussex.gov.uk/about-the-council/how-the-council-works/council-spending/)  
**Wayback archive**: [https://web.archive.org/web/*/https://www.westsussex.gov.uk/about-the-council/ho…](https://web.archive.org/web/*/https://www.westsussex.gov.uk/about-the-council/how-the-council-works/council-spending/)  
**Audit link captured**: 2026-04-14T23:36:55.917Z  
**Financial year**: 2023/24  
**Publisher description**: West Sussex CC Spend Data (westsussex.gov.uk)  

**Raw files** (2):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `west_sussex/wscc_spend_2023_24.csv` | 41.7MB | `4786cde0f714bb37…` |
| `west_sussex/wscc_spend_2023_24.xlsx` | 9.8MB | `ffba1e1602a6b2d5…` |

**Total**: 2 files, 51.5MB

### Greater London Authority

The GLA subsystem is a synthetic entry that aggregates four independent publishers, each mapping to different service buckets under `Other Authorities > Greater London Authority` in the tree:

#### London Fire Brigade (LFB)

**Maps to**: Greater London Authority > Fire & Rescue  
**Live source**: [https://www.london-fire.gov.uk/about-us/structure-governance-and-accountability/lfc-spending-over-250/](https://www.london-fire.gov.uk/about-us/structure-governance-and-accountability/lfc-spending-over-250/)  
**Wayback archive**: [https://web.archive.org/web/*/https://www.london-fire.gov.uk/about-us/structure-…](https://web.archive.org/web/*/https://www.london-fire.gov.uk/about-us/structure-governance-and-accountability/lfc-spending-over-250/)  

**Raw files** (12):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `lfb/apr_2023.csv` | 604.4KB | `7aaa81e9cf127df2…` |
| `lfb/aug_2023.csv` | 492.5KB | `4d69c104775e434d…` |
| `lfb/dec_2023.csv` | 345.9KB | `3c9ec0f2999424f7…` |
| `lfb/feb_2024.csv` | 614.5KB | `51c66fa99c67e541…` |
| `lfb/jan_2024.csv` | 743.9KB | `73647eb8bac2bf77…` |
| `lfb/jul_2023.csv` | 882.9KB | `8ba8e2b500480956…` |
| `lfb/jun_2023.csv` | 927.7KB | `ac79b8f17609898d…` |
| `lfb/mar_2024.csv` | 568.2KB | `e4f983294e2f218b…` |
| `lfb/may_2023.csv` | 525.2KB | `1ef3d397da78e6b5…` |
| `lfb/nov_2023.csv` | 829.2KB | `484aac536adc078d…` |
| `lfb/oct_2023.csv` | 592.2KB | `66578a9c08ceaa30…` |
| `lfb/sep_2023.csv` | 509.5KB | `db67aa8985a3f3bb…` |

**Total**: 12 files, 7.5MB

#### Transport for London (TfL)

**Maps to**: Greater London Authority > Transport  
**Live source**: [https://tfl.gov.uk/corporate/transparency/freedom-of-information/foi-request-detail?referenceId=FOI-1306-2223](https://tfl.gov.uk/corporate/transparency/freedom-of-information/foi-request-detail?referenceId=FOI-1306-2223)  
**Wayback archive**: [https://web.archive.org/web/*/https://tfl.gov.uk/corporate/transparency/freedom-…](https://web.archive.org/web/*/https://tfl.gov.uk/corporate/transparency/freedom-of-information/foi-request-detail?referenceId=FOI-1306-2223)  

**Raw files** (14):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `tfl/contracts_awarded.csv` | 632.5KB | `a5b011c80dbe15cb…` |
| `tfl/p01.csv` | 1.5MB | `ce825c729942be70…` |
| `tfl/p02.csv` | 1.5MB | `421e5212db9b3911…` |
| `tfl/p03.csv` | 1.4MB | `18922b91c1536b5b…` |
| `tfl/p04.csv` | 1.5MB | `0ffec0fd8a081be0…` |
| `tfl/p05.csv` | 1.6MB | `6a26a95b434f2e5e…` |
| `tfl/p06.csv` | 1.5MB | `1696ae600c7f51fe…` |
| `tfl/p07.csv` | 1.6MB | `64c455f5d6220d22…` |
| `tfl/p08.csv` | 1.7MB | `e5ea7923e6f9a7b2…` |
| `tfl/p09.csv` | 1.7MB | `d5d2142e3dfd64ef…` |
| `tfl/p10.csv` | 1.6MB | `4a979a11d6aa5206…` |
| `tfl/p11.csv` | 1.3MB | `e4f287f2adc8cd1c…` |
| `tfl/p12.csv` | 1.6MB | `ad6573170cc10484…` |
| `tfl/p13.csv` | 1.9MB | `b06dc1d82f02f264…` |

**Total**: 14 files, 20.8MB

#### Greater London Authority core

**Maps to**: Greater London Authority > Central Services / Education / Planning / Housing / Culture / Environment  
**Live source**: [https://data.london.gov.uk/dataset/gla-group-expenditure-over-250](https://data.london.gov.uk/dataset/gla-group-expenditure-over-250)  
**Wayback archive**: [https://web.archive.org/web/*/https://data.london.gov.uk/dataset/gla-group-expen…](https://web.archive.org/web/*/https://data.london.gov.uk/dataset/gla-group-expenditure-over-250)  

**Raw files** (1):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `gla_core/consolidated_p1_p13_2023_24.csv` | 2.6MB | `8a7b56c9c54cca78…` |

**Total**: 1 files, 2.6MB

#### Metropolitan Police Service (MPS)

**Maps to**: Greater London Authority > Police  
**Live source**: [https://www.met.police.uk/foi-ai/af/accessing-information/published-items/?q=mopac%20mps%20expenditure](https://www.met.police.uk/foi-ai/af/accessing-information/published-items/?q=mopac%20mps%20expenditure)  
**Wayback archive**: [https://web.archive.org/web/*/https://www.met.police.uk/foi-ai/af/accessing-info…](https://web.archive.org/web/*/https://www.met.police.uk/foi-ai/af/accessing-information/published-items/?q=mopac%20mps%20expenditure)  

**Raw files** (2):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `mps/mps_sep2023_mar2024.xlsx` | 1.6MB | `e879024236ca7066…` |
| `mps/sep23_mar24.csv` | 2.7MB | `4717f03053159b05…` |

**Total**: 2 files, 4.3MB

## Summary

- **Entities**: 33 (32 councils + GLA subsystem)
- **Raw files**: 350
- **Total size**: 1226.7MB
- **Coverage**: 35.6% of UK Local Government England (£46.8B of £131.6B) as of 2026-04-14

---

_This manifest is regenerated by `scripts/generate_sources_md.js` after every council addition. To verify a file yourself:_

```bash
git clone https://github.com/JuanBlanco9/Budget-Galaxy.git
cd Budget-Galaxy/data/uk/local_authorities/spend/hampshire
sha256sum jan_2024.xlsx
```
