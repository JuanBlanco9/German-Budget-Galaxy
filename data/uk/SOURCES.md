# Budget Galaxy — UK Council Spend Sources Manifest

_Generated: 2026-04-15T02:57:11.899Z_

This file lists every raw data source behind the supplier-level coverage on Budget Galaxy's UK Local Government tree, along with the audit trail that lets independent auditors verify that the figures shown on https://budgetgalaxy.com come from authentic government publications and were not modified after download.

## The three-layer audit trail

**Layer 1 — Live landing pages.** Each council has a `Live source` link to the publisher's official dataset page. These URLs may rot over time (government sites restructure, rolling windows purge old files).

**Layer 2 — Wayback Machine snapshots.** Each landing page has a `Wayback archive` link to an Internet Archive snapshot. Where the Save Page Now API accepted the request, the link points at a direct snapshot (`web/YYYYMMDDHHMMSS/...`). Where it returned rate-limit errors, the link falls back to Wayback's calendar view (`web/*/...`) which lets auditors browse any prior snapshots of that URL from earlier Internet Archive crawls.

**Layer 3 — Raw files committed to git with SHA256 hashes.** Every CSV/XLSX we downloaded is committed to the public repository at `data/uk/local_authorities/spend/{council}/`. The SHA256 hashes listed in each section below let auditors verify that a given file has not been modified since the commit in which it first appeared. Combined with the Wayback snapshot of the landing page, this provides third-party independent verification of authenticity at the time of capture.

**Layer 4 — archive.org collection mirror.** Every raw file is also uploaded to the public Internet Archive item `budget-galaxy-uk-councils-2024` (see https://archive.org/details/budget-galaxy-uk-councils-2024). This gives every file a permanent, immutable URL independent of both git and the original publisher. Where Wayback's Save Page Now refused to crawl dynamic dataset URLs, and where the original publisher used a Cloudflare managed challenge (Hampshire, Surrey, MPS), this collection is the only externally-verifiable copy. The 'archive.org mirror' column in each table below links to the individual file. To verify authenticity, an auditor can download the mirror, compute its SHA256, and confirm it matches the hash listed in this manifest.

**Known limitation.** The three external layers (Wayback landing page snapshot + archive.org file mirror + SHA256 hash) together provide a strong audit trail but do not cryptographically prove that the file content came from the listed publisher. An auditor who is skeptical of the upload chain can re-fetch the current version from the live source URL, compute its SHA256, and compare. If the live source has since changed, the git history + archive.org mirror + Wayback landing page snapshot collectively document what was published at capture time.

## How to verify a file in 60 seconds

If you want to check that any raw file listed below is the same one Budget Galaxy downloaded from the publisher at capture time, run these three commands:

```bash
git clone https://github.com/JuanBlanco9/Budget-Galaxy.git
cd Budget-Galaxy/data/uk/local_authorities/spend
sha256sum hampshire/jan_2024.xlsx   # replace with the file you want to verify
```

Then compare the first 16 characters of the output against the `SHA256 (first 16)` column in the council's section below. If they match, the file is byte-for-byte identical to what Budget Galaxy committed.

**Prefer not to clone the whole repo?** Every file can also be downloaded directly from its `archive.org mirror` column link, or fetched from GitHub via the `raw.githubusercontent.com/JuanBlanco9/Budget-Galaxy/main/` path — both surfaces give identical bytes and will hash to the same value.

### If the hash does NOT match

Please [open an issue on the Budget Galaxy repository](https://github.com/JuanBlanco9/Budget-Galaxy/issues/new) with:

- The file path you verified (e.g. `hampshire/jan_2024.xlsx`)
- The SHA256 you computed locally
- The SHA256 shown in this manifest
- Where you obtained the file (git clone, archive.org mirror, raw.githubusercontent.com, or the publisher's live source)

A mismatch indicates one of three things and is not automatically a tampering incident — but it does need to be reconciled:

1. **This manifest is out of date**: a more recent commit replaced the file with a newer capture and the manifest hasn't been regenerated. We will regenerate and push.
2. **The publisher updated the file upstream** after our capture and you compared against the live source. This is normal for rolling-window transparency portals. The git history + archive.org mirror still document what was published at our capture time.
3. **Tampering**: the file was modified after commit without updating the manifest. This would be a breach of the audit trail contract and would require a forensic diff against git history. We treat this as the highest-priority issue class.

In every case, open the issue — the audit trail is a cooperative protocol, not a trust-us promise.

## Councils with supplier-level metadata

### Barking and Dagenham

**Live source**: [https://www.lbbd.gov.uk/council-and-democracy/performance-and-spending/corporate-procurement/payments-over-ps250-and-ps500](https://www.lbbd.gov.uk/council-and-democracy/performance-and-spending/corporate-procurement/payments-over-ps250-and-ps500)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: London Borough of Barking & Dagenham — Payments over £250 (lbbd.gov.uk, filtered to £500+)  

**Raw files** (12):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `barking_dagenham/2023_04.csv` | 717.7KB | `82cc8c04125eb75b…` |
| `barking_dagenham/2023_05.csv` | 902.2KB | `a841cd1fc50a275d…` |
| `barking_dagenham/2023_06.csv` | 1.0MB | `1b89f3f980c0f7ea…` |
| `barking_dagenham/2023_07.csv` | 1.1MB | `301af8912ed5b822…` |
| `barking_dagenham/2023_08.csv` | 972.1KB | `4fd40ded0493e647…` |
| `barking_dagenham/2023_09.csv` | 946.3KB | `b34ca0b46a3264e9…` |
| `barking_dagenham/2023_10.csv` | 953.3KB | `e0686c8f407e2253…` |
| `barking_dagenham/2023_11.csv` | 1013.7KB | `814e68270d11baf9…` |
| `barking_dagenham/2023_12.csv` | 993.5KB | `e4f866e452ef712a…` |
| `barking_dagenham/2024_01.csv` | 12.8MB | `64c480def24f3c02…` |
| `barking_dagenham/2024_02.csv` | 1023.1KB | `4c1173c38314b87d…` |
| `barking_dagenham/2024_03.csv` | 1.2MB | `a7a7771e338607bc…` |

**Total**: 12 files, 23.4MB

### Barnet

**Live source**: [https://open.barnet.gov.uk/dataset/2331d/expenditure-reporting-202324](https://open.barnet.gov.uk/dataset/2331d/expenditure-reporting-202324)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: London Borough of Barnet — Expenditure Reporting (open.barnet.gov.uk CKAN)  

**Raw files** (12):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `barnet/2023_04.csv` | 1.5MB | `fc0e16952b22e646…` |
| `barnet/2023_05.csv` | 1.8MB | `e0c57f6594f33cdc…` |
| `barnet/2023_06.csv` | 1.9MB | `d9ffa910d52119db…` |
| `barnet/2023_07.csv` | 1.7MB | `6fd66a10ea46fd66…` |
| `barnet/2023_08.csv` | 1.7MB | `6894f74bba18b0f5…` |
| `barnet/2023_09.csv` | 1.6MB | `7a0432d17deb9ff6…` |
| `barnet/2023_10.csv` | 1.8MB | `2480ae9c7f113b82…` |
| `barnet/2023_11.csv` | 1.8MB | `ea9a4b07b8de4f3c…` |
| `barnet/2023_12.csv` | 1.8MB | `b78cd0c73785bbff…` |
| `barnet/2024_01.csv` | 1.9MB | `ea7326dcf83fe863…` |
| `barnet/2024_02.csv` | 1.6MB | `4f0839bb26f956e1…` |
| `barnet/2024_03.csv` | 1.9MB | `f61266a6af13c9e5…` |

**Total**: 12 files, 20.9MB

### Bexley

**Live source**: [https://www.bexley.gov.uk/bexley-business-employment/business-services/contracts-tenders-and-procurement/expenditure-records/publication-payments-over-ps500](https://www.bexley.gov.uk/bexley-business-employment/business-services/contracts-tenders-and-procurement/expenditure-records/publication-payments-over-ps500)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: London Borough of Bexley — Payments over £500 (bexley.gov.uk)  

**Raw files** (12):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `bexley/2023_04.csv` | 675.1KB | `dec6a572a8eb091d…` |
| `bexley/2023_05.csv` | 633.3KB | `6daa6c74e36fe0ad…` |
| `bexley/2023_06.csv` | 952.8KB | `0bf84da244b84184…` |
| `bexley/2023_07.csv` | 945.0KB | `e098fcbc88c3b933…` |
| `bexley/2023_08.csv` | 669.8KB | `0ccd8d782f8f89e7…` |
| `bexley/2023_09.csv` | 1.2MB | `e4ed169b869a9bf1…` |
| `bexley/2023_10.csv` | 837.1KB | `1af3d72a24241564…` |
| `bexley/2023_11.csv` | 658.5KB | `c23daf8c0056c8f5…` |
| `bexley/2023_12.csv` | 695.1KB | `d5717e73bc7113e3…` |
| `bexley/2024_01.csv` | 616.3KB | `35c73167b2c9e480…` |
| `bexley/2024_02.csv` | 920.8KB | `ae6498d35ef1e44b…` |
| `bexley/2024_03.csv` | 915.7KB | `8b644b5ad15699b0…` |

**Total**: 12 files, 9.5MB

### Birmingham

**Live source**: [https://cityobservatory.birmingham.gov.uk/explore/dataset/expenditure-over-ps500-2024-25/](https://cityobservatory.birmingham.gov.uk/explore/dataset/expenditure-over-ps500-2024-25/)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2024/25  
**Publisher description**: Birmingham City Council Spend Over £500 (City Observatory, FY 2024-25)  

**Raw files** (1):

| File | Size | SHA256 (first 16) | archive.org mirror |
|---|---|---|---|
| `birmingham_spend_2024_25.csv` | 16.1MB | `88b7c9f64a4912ca…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/birmingham_birmingham_spend_2024_25.csv) |

**Total**: 1 files, 16.1MB

### Bradford

**Live source**: [https://datahub.bradford.gov.uk/ebase/datahub/dataset/get.do?datasetId=9](https://datahub.bradford.gov.uk/ebase/datahub/dataset/get.do?datasetId=9)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: Bradford Council Spend Over £500 (datahub.bradford.gov.uk)  

**Raw files** (4):

| File | Size | SHA256 (first 16) | archive.org mirror |
|---|---|---|---|
| `bradford/q1_apr_jun_2023.csv` | 6.3MB | `3fd228731b0ae2bd…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/bradford_q1_apr_jun_2023.csv) |
| `bradford/q2_jul_sep_2023.csv` | 7.0MB | `4dd58e861a836f47…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/bradford_q2_jul_sep_2023.csv) |
| `bradford/q3_oct_dec_2023.csv` | 7.1MB | `a81518038be41ac9…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/bradford_q3_oct_dec_2023.csv) |
| `bradford/q4_jan_mar_2024.csv` | 5.9MB | `880bbe9d95672d91…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/bradford_q4_jan_mar_2024.csv) |

**Total**: 4 files, 26.3MB

### Brent

**Live source**: [https://data.brent.gov.uk/dataset/vq756/what-we-spend](https://data.brent.gov.uk/dataset/vq756/what-we-spend)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: London Borough of Brent — What We Spend quarterly (data.brent.gov.uk CKAN)  

**Raw files** (5):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `brent/dec_feb_2024.csv` | 2.2MB | `6de6d684feb528e0…` |
| `brent/jun_aug_2023.csv` | 2.2MB | `e57a04e4baeb8aa8…` |
| `brent/mar_may_2023.csv` | 2.2MB | `b08b87765a97fa7a…` |
| `brent/mar_may_2024.csv` | 2.2MB | `f261d24cec251a30…` |
| `brent/sep_nov_2023.csv` | 2.2MB | `e6e83b4b409e127f…` |

**Total**: 5 files, 11.1MB

### Bristol

**Live source**: [https://www.bristol.gov.uk/council-and-mayor/council-finance/spending-over-500](https://www.bristol.gov.uk/council-and-mayor/council-finance/spending-over-500)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: Bristol City Council Spend Over £500 (bristol.gov.uk)  

**Raw files** (12):

| File | Size | SHA256 (first 16) | archive.org mirror |
|---|---|---|---|
| `bristol/bristol_2023_04.csv` | 991.8KB | `c7824abced685ff5…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/bristol_bristol_2023_04.csv) |
| `bristol/bristol_2023_05.csv` | 1.0MB | `7b3780538017fa85…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/bristol_bristol_2023_05.csv) |
| `bristol/bristol_2023_06.csv` | 1.2MB | `6e9968e15faba473…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/bristol_bristol_2023_06.csv) |
| `bristol/bristol_2023_07.csv` | 1016.9KB | `fd2f6b4cc0a2ed20…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/bristol_bristol_2023_07.csv) |
| `bristol/bristol_2023_08.csv` | 1.1MB | `68e9233be7072a25…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/bristol_bristol_2023_08.csv) |
| `bristol/bristol_2023_09.csv` | 1.0MB | `3978c68f888374b7…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/bristol_bristol_2023_09.csv) |
| `bristol/bristol_2023_10.csv` | 1019.1KB | `30b473e1ea5e284b…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/bristol_bristol_2023_10.csv) |
| `bristol/bristol_2023_11.csv` | 1.1MB | `580de9b1ee47140a…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/bristol_bristol_2023_11.csv) |
| `bristol/bristol_2023_12.csv` | 1.1MB | `e818a4ad05a9c7f5…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/bristol_bristol_2023_12.csv) |
| `bristol/bristol_2024_01.csv` | 1.1MB | `654b2409e48c2a3b…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/bristol_bristol_2024_01.csv) |
| `bristol/bristol_2024_02.csv` | 1.2MB | `ce85e66a037967d3…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/bristol_bristol_2024_02.csv) |
| `bristol/bristol_2024_03.csv` | 1.3MB | `dc05f36f1cb28ec3…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/bristol_bristol_2024_03.csv) |

**Total**: 12 files, 13.1MB

### Bromley

**Live source**: [https://www.bromley.gov.uk/council-budgets-spending/council-spending/2](https://www.bromley.gov.uk/council-budgets-spending/council-spending/2)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: London Borough of Bromley — Payments to Suppliers Over £500 (bromley.gov.uk)  

**Raw files** (24):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `bromley/2023_04.csv` | 255.3KB | `bd5f0e05920fa7ae…` |
| `bromley/2023_04.xlsx` | 130.0KB | `c05bca00317e1b56…` |
| `bromley/2023_05.csv` | 311.3KB | `1abc96d1e3ac4c67…` |
| `bromley/2023_05.xlsx` | 153.6KB | `bf97fe5dab464176…` |
| `bromley/2023_06.csv` | 283.1KB | `d6ff885311460bdf…` |
| `bromley/2023_06.xlsx` | 141.8KB | `1fd8bb92f8c05797…` |
| `bromley/2023_07.csv` | 587.4KB | `d481c5b598fd5467…` |
| `bromley/2023_07.xlsx` | 219.5KB | `9843ea3483425524…` |
| `bromley/2023_08.csv` | 722.6KB | `ad84f99cf294aeb1…` |
| `bromley/2023_08.xlsx` | 267.8KB | `ffb3db94a63c348f…` |
| `bromley/2023_09.csv` | 606.7KB | `54308254a255a843…` |
| `bromley/2023_09.xlsx` | 232.7KB | `ced4b6d0cd06edaf…` |
| `bromley/2023_10.csv` | 641.8KB | `c1c8d754cb1ed709…` |
| `bromley/2023_10.xlsx` | 244.9KB | `dd32f0dc3f520861…` |
| `bromley/2023_11.csv` | 742.0KB | `dd9f3fd67f46a123…` |
| `bromley/2023_11.xlsx` | 273.2KB | `f06f6b91a147d802…` |
| `bromley/2023_12.csv` | 567.2KB | `51e5a926d80fecd1…` |
| `bromley/2023_12.xlsx` | 220.3KB | `1c71c4429b5a29e4…` |
| `bromley/2024_01.csv` | 1.0MB | `20648e0fafb714a9…` |
| `bromley/2024_01.xlsx` | 387.0KB | `384dbf39911b7529…` |
| `bromley/2024_02.csv` | 789.1KB | `aa644a835aceabae…` |
| `bromley/2024_02.xlsx` | 300.3KB | `8eab82403bb7ac0f…` |
| `bromley/2024_03.csv` | 664.6KB | `cdaa18ef88c3cd53…` |
| `bromley/2024_03.xlsx` | 264.6KB | `0faabb95241a4a1d…` |

**Total**: 24 files, 9.8MB

### Buckinghamshire

**Live source**: [https://www.buckinghamshire.gov.uk/your-council/access-to-information-and-data/open-data/payments-to-suppliers/](https://www.buckinghamshire.gov.uk/your-council/access-to-information-and-data/open-data/payments-to-suppliers/)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: Buckinghamshire Council Spend Over £500 (buckinghamshire.gov.uk)  

**Raw files** (11):

| File | Size | SHA256 (first 16) | archive.org mirror |
|---|---|---|---|
| `buckinghamshire/bucks_2023_04.csv` | 2.7MB | `cdae141e09020171…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/buckinghamshire_bucks_2023_04.csv) |
| `buckinghamshire/bucks_2023_06.csv` | 2.4MB | `db82830e73fdbbd2…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/buckinghamshire_bucks_2023_06.csv) |
| `buckinghamshire/bucks_2023_07.csv` | 2.1MB | `43c6efbdd0bc6f64…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/buckinghamshire_bucks_2023_07.csv) |
| `buckinghamshire/bucks_2023_08.csv` | 3.3MB | `5e291830fa1e9bf7…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/buckinghamshire_bucks_2023_08.csv) |
| `buckinghamshire/bucks_2023_09.csv` | 2.0MB | `13942b4a476d766e…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/buckinghamshire_bucks_2023_09.csv) |
| `buckinghamshire/bucks_2023_10.csv` | 2.5MB | `0061d48468da7f98…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/buckinghamshire_bucks_2023_10.csv) |
| `buckinghamshire/bucks_2023_11.csv` | 2.4MB | `88090ecb93e37082…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/buckinghamshire_bucks_2023_11.csv) |
| `buckinghamshire/bucks_2023_12.csv` | 2.4MB | `f0eb6feb62b37d31…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/buckinghamshire_bucks_2023_12.csv) |
| `buckinghamshire/bucks_2024_01.csv` | 2.3MB | `e8bf73e711796b53…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/buckinghamshire_bucks_2024_01.csv) |
| `buckinghamshire/bucks_2024_02.csv` | 2.1MB | `1adb03830cd29877…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/buckinghamshire_bucks_2024_02.csv) |
| `buckinghamshire/bucks_2024_03.csv` | 2.5MB | `3cd95e58eb5ca426…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/buckinghamshire_bucks_2024_03.csv) |

**Total**: 11 files, 26.6MB

### Camden

**Live source**: [https://opendata.camden.gov.uk/Finance/Camden-Payments-to-Suppliers/nzbs-6v3d](https://opendata.camden.gov.uk/Finance/Camden-Payments-to-Suppliers/nzbs-6v3d)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: Camden Council Open Data Portal (Socrata SODA API)  

**Raw files** (1):

| File | Size | SHA256 (first 16) | archive.org mirror |
|---|---|---|---|
| `camden_spend_2023_24.csv` | 16.1MB | `fb5ffe1608d332de…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/camden_camden_spend_2023_24.csv) |

**Total**: 1 files, 16.1MB

### City of London

**Live source**: [https://www.cityoflondon.gov.uk/about-us/budgets-spending/local-authority-expenditure](https://www.cityoflondon.gov.uk/about-us/budgets-spending/local-authority-expenditure)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: City of London Corporation — Local Authority Expenditure monthly XLSX (cityoflondon.gov.uk)  

**Raw files** (24):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `city_of_london/2023_04.csv` | 635.6KB | `f0749a8420df03dd…` |
| `city_of_london/2023_04.xlsx` | 237.6KB | `cdefb4b3ebfde578…` |
| `city_of_london/2023_05.csv` | 532.7KB | `e4d812036e87f983…` |
| `city_of_london/2023_05.xlsx` | 208.8KB | `df7cf99dc8e80292…` |
| `city_of_london/2023_06.csv` | 487.2KB | `da5f5b482d7b24e1…` |
| `city_of_london/2023_06.xlsx` | 197.7KB | `e6287ab10137a484…` |
| `city_of_london/2023_07.csv` | 520.7KB | `d1af05a0ff8ea66a…` |
| `city_of_london/2023_07.xlsx` | 211.1KB | `66fb3497feccc78f…` |
| `city_of_london/2023_08.csv` | 652.6KB | `675ff6742c34cbfb…` |
| `city_of_london/2023_08.xlsx` | 254.6KB | `ab21dcf5c1249d82…` |
| `city_of_london/2023_09.csv` | 576.1KB | `8fe7b25e6aedcd9a…` |
| `city_of_london/2023_09.xlsx` | 228.2KB | `1a88c7866475244c…` |
| `city_of_london/2023_10.csv` | 543.5KB | `c21e5e11cf8b0221…` |
| `city_of_london/2023_10.xlsx` | 217.5KB | `6c2befbbd32c8475…` |
| `city_of_london/2023_11.csv` | 563.0KB | `9e548100e907e7ee…` |
| `city_of_london/2023_11.xlsx` | 224.8KB | `8507498849d8142c…` |
| `city_of_london/2023_12.csv` | 508.8KB | `cbe4d7cc21a586d0…` |
| `city_of_london/2023_12.xlsx` | 203.7KB | `e073da99a7de27a4…` |
| `city_of_london/2024_01.csv` | 617.3KB | `7efba18bd0aa0beb…` |
| `city_of_london/2024_01.xlsx` | 239.2KB | `0b4947a6a7742c3c…` |
| `city_of_london/2024_02.csv` | 522.0KB | `d742efce39abc121…` |
| `city_of_london/2024_02.xlsx` | 210.0KB | `e5c18f6483e82f5c…` |
| `city_of_london/2024_03.csv` | 614.6KB | `c8176ecd5b56ce06…` |
| `city_of_london/2024_03.xlsx` | 243.7KB | `1040a83d1077f01a…` |

**Total**: 24 files, 9.2MB

### Cornwall

**Live source**: [https://www.cornwall.gov.uk/council-and-democracy/council-information-and-accounts/finance-information-for-cornwall-council/payments-to-suppliers/](https://www.cornwall.gov.uk/council-and-democracy/council-information-and-accounts/finance-information-for-cornwall-council/payments-to-suppliers/)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: Cornwall Council Spend Over £500 (cornwall.gov.uk)  

**Raw files** (12):

| File | Size | SHA256 (first 16) | archive.org mirror |
|---|---|---|---|
| `cornwall/cornwall_2023_04.csv` | 5.1MB | `d1c17ffe6174e74a…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/cornwall_cornwall_2023_04.csv) |
| `cornwall/cornwall_2023_05.csv` | 6.4MB | `d89f2bf461fc2db4…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/cornwall_cornwall_2023_05.csv) |
| `cornwall/cornwall_2023_06.csv` | 5.1MB | `f3c54c620da07185…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/cornwall_cornwall_2023_06.csv) |
| `cornwall/cornwall_2023_07.csv` | 4.7MB | `0a687a7acc561c1f…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/cornwall_cornwall_2023_07.csv) |
| `cornwall/cornwall_2023_08.csv` | 5.1MB | `ad2f732403414089…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/cornwall_cornwall_2023_08.csv) |
| `cornwall/cornwall_2023_09.csv` | 4.4MB | `7dbd1296cbc62a8b…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/cornwall_cornwall_2023_09.csv) |
| `cornwall/cornwall_2023_10.csv` | 6.1MB | `afc2e3662e89dd8e…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/cornwall_cornwall_2023_10.csv) |
| `cornwall/cornwall_2023_11.csv` | 5.4MB | `f60d5855b89d9769…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/cornwall_cornwall_2023_11.csv) |
| `cornwall/cornwall_2023_12.csv` | 4.8MB | `821d60585dd44915…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/cornwall_cornwall_2023_12.csv) |
| `cornwall/cornwall_2024_01.csv` | 6.0MB | `526bdcf732048d60…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/cornwall_cornwall_2024_01.csv) |
| `cornwall/cornwall_2024_02.csv` | 5.8MB | `1537ad90c99ef3f5…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/cornwall_cornwall_2024_02.csv) |
| `cornwall/cornwall_2024_03.csv` | 6.7MB | `a84de44d963b7d50…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/cornwall_cornwall_2024_03.csv) |

**Total**: 12 files, 65.8MB

### Coventry

**Live source**: [https://www.coventry.gov.uk/council-spending/expenditure-exceeding-500](https://www.coventry.gov.uk/council-spending/expenditure-exceeding-500)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: Coventry City Council Spend Over £500 (coventry.gov.uk)  

**Raw files** (12):

| File | Size | SHA256 (first 16) | archive.org mirror |
|---|---|---|---|
| `coventry/apr_2023.csv` | 1.2MB | `655669c81e09429d…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/coventry_apr_2023.csv) |
| `coventry/aug_2023.csv` | 1.8MB | `2e9d399d03214515…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/coventry_aug_2023.csv) |
| `coventry/dec_2023.csv` | 1.7MB | `4b176a2790f233a6…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/coventry_dec_2023.csv) |
| `coventry/feb_2024.csv` | 2.0MB | `3584be08c8ec9d86…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/coventry_feb_2024.csv) |
| `coventry/jan_2024.csv` | 1.8MB | `103627be7a92c544…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/coventry_jan_2024.csv) |
| `coventry/jul_2023.csv` | 1.8MB | `bf07056d42fb1085…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/coventry_jul_2023.csv) |
| `coventry/jun_2023.csv` | 2.6MB | `d8938fac1063bbe3…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/coventry_jun_2023.csv) |
| `coventry/mar_2024.csv` | 1.8MB | `cf65711f381b3eba…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/coventry_mar_2024.csv) |
| `coventry/may_2023.csv` | 2.2MB | `bd48ade39fcf5c2f…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/coventry_may_2023.csv) |
| `coventry/nov_2023.csv` | 1.9MB | `288ad09a8edaef2e…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/coventry_nov_2023.csv) |
| `coventry/oct_2023.csv` | 1.7MB | `b8e5d9b636d76c7b…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/coventry_oct_2023.csv) |
| `coventry/sep_2023.csv` | 1.7MB | `33871645bc98c53a…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/coventry_sep_2023.csv) |

**Total**: 12 files, 22.2MB

### Croydon

**Live source**: [https://www.croydon.gov.uk/council/transparency-and-performance/open-data/council-spending-over-ps500](https://www.croydon.gov.uk/council/transparency-and-performance/open-data/council-spending-over-ps500)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: Croydon Council Payments Over £500 (croydon.gov.uk)  

**Raw files** (24):

| File | Size | SHA256 (first 16) | archive.org mirror |
|---|---|---|---|
| `croydon/apr_2023.csv` | 4.9MB | `33031299bd9d3ac7…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/croydon_apr_2023.csv) |
| `croydon/apr_2023.xlsx` | 1.5MB | `3f454cf5da4c1f6a…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/croydon_apr_2023.xlsx) |
| `croydon/aug_2023.csv` | 3.7MB | `d1cfb57c4e7ecf13…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/croydon_aug_2023.csv) |
| `croydon/aug_2023.xlsx` | 1.8MB | `ce950736a3a0258e…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/croydon_aug_2023.xlsx) |
| `croydon/dec_2023.csv` | 8.1MB | `1fdb5a64e51b556c…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/croydon_dec_2023.csv) |
| `croydon/dec_2023.xlsx` | 3.0MB | `17b226d6fdc5ff24…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/croydon_dec_2023.xlsx) |
| `croydon/feb_2024.csv` | 8.3MB | `919a9f67109753bb…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/croydon_feb_2024.csv) |
| `croydon/feb_2024.xlsx` | 3.2MB | `ec8e6ad6d63fe441…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/croydon_feb_2024.xlsx) |
| `croydon/jan_2024.csv` | 8.5MB | `e5664d283f956b74…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/croydon_jan_2024.csv) |
| `croydon/jan_2024.xlsx` | 3.2MB | `71082aeeb2cda87a…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/croydon_jan_2024.xlsx) |
| `croydon/jul_2023.csv` | 3.6MB | `f548a707e3974d5a…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/croydon_jul_2023.csv) |
| `croydon/jul_2023.xlsx` | 1.2MB | `e164eae1b1560cbb…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/croydon_jul_2023.xlsx) |
| `croydon/jun_2023.csv` | 3.2MB | `0c334cd137cb2781…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/croydon_jun_2023.csv) |
| `croydon/jun_2023.xlsx` | 1.0MB | `410cc0ac50d32eff…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/croydon_jun_2023.xlsx) |
| `croydon/mar_2024.csv` | 8.0MB | `06a19572eac57077…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/croydon_mar_2024.csv) |
| `croydon/mar_2024.xlsx` | 2.3MB | `a5c4f3ae3bd04061…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/croydon_mar_2024.xlsx) |
| `croydon/may_2023.csv` | 6.2MB | `793ac70cdd0f19ae…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/croydon_may_2023.csv) |
| `croydon/may_2023.xlsx` | 1.8MB | `8d97f6ae3de1e570…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/croydon_may_2023.xlsx) |
| `croydon/nov_2023.csv` | 5.2MB | `7af546e8ee287317…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/croydon_nov_2023.csv) |
| `croydon/nov_2023.xlsx` | 2.2MB | `b9c4b2ec564ecb99…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/croydon_nov_2023.xlsx) |
| `croydon/oct_2023.csv` | 5.4MB | `f81003b58ad6d50d…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/croydon_oct_2023.csv) |
| `croydon/oct_2023.xlsx` | 2.3MB | `1019d6d9aa8000ab…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/croydon_oct_2023.xlsx) |
| `croydon/sep_2023.csv` | 3.1MB | `fd532aaed505a0d4…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/croydon_sep_2023.csv) |
| `croydon/sep_2023.xlsx` | 1.6MB | `134ec556c845954b…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/croydon_sep_2023.xlsx) |

**Total**: 24 files, 93.3MB

### Devon

**Live source**: [https://www.devon.gov.uk/factsandfigures/dataset/spending-over-500/](https://www.devon.gov.uk/factsandfigures/dataset/spending-over-500/)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: Devon County Council Spending Over £500 (github.com/Devon-County-Council/spending)  

**Raw files** (12):

| File | Size | SHA256 (first 16) | archive.org mirror |
|---|---|---|---|
| `devon/202304.csv` | 1.8MB | `21884b36b515d356…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/devon_202304.csv) |
| `devon/202305.csv` | 2.0MB | `5326657d34bbd389…` | — |
| `devon/202306.csv` | 2.0MB | `4a41c540b544cd7e…` | — |
| `devon/202307.csv` | 2.0MB | `ce1295bb1abf857d…` | — |
| `devon/202308.csv` | 1.6MB | `a23bab2af40c770f…` | — |
| `devon/202309.csv` | 2.0MB | `6dfcb50b10dc21bf…` | — |
| `devon/202310.csv` | 1.7MB | `853c34f4b63250da…` | — |
| `devon/202311.csv` | 2.1MB | `a76f810f8274d902…` | — |
| `devon/202312.csv` | 1.7MB | `7b9ecce91421184d…` | — |
| `devon/202401.csv` | 2.0MB | `638f512b01f8bb3b…` | — |
| `devon/202402.csv` | 2.0MB | `0d10e7e7ad696210…` | — |
| `devon/202403.csv` | 1.8MB | `fa112b4eedfcd26b…` | — |

**Total**: 12 files, 22.8MB

### Dudley

**Live source**: [https://www.dudley.gov.uk/council-community/about-the-council/information-performance/transparency/payments-over-500/](https://www.dudley.gov.uk/council-community/about-the-council/information-performance/transparency/payments-over-500/)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: Dudley Council Spend Over £500 (dudley.gov.uk)  

**Raw files** (12):

| File | Size | SHA256 (first 16) | archive.org mirror |
|---|---|---|---|
| `dudley/dudley_2023_04.csv` | 2.4MB | `f1f3eeb0e880ecaf…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/dudley_dudley_2023_04.csv) |
| `dudley/dudley_2023_05.csv` | 2.2MB | `b7cac2ab1bb99e9d…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/dudley_dudley_2023_05.csv) |
| `dudley/dudley_2023_06.csv` | 2.0MB | `e46d19ebac600c86…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/dudley_dudley_2023_06.csv) |
| `dudley/dudley_2023_07.csv` | 2.0MB | `679fdb456c6cd939…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/dudley_dudley_2023_07.csv) |
| `dudley/dudley_2023_08.csv` | 2.2MB | `3d2f019a222a49f3…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/dudley_dudley_2023_08.csv) |
| `dudley/dudley_2023_09.csv` | 1.8MB | `73d58f4789059299…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/dudley_dudley_2023_09.csv) |
| `dudley/dudley_2023_10.csv` | 1.9MB | `5417ff5dfce77db2…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/dudley_dudley_2023_10.csv) |
| `dudley/dudley_2023_11.csv` | 2.0MB | `dbdc52fd527518da…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/dudley_dudley_2023_11.csv) |
| `dudley/dudley_2023_12.csv` | 2.0MB | `ff54c49f839f7ec2…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/dudley_dudley_2023_12.csv) |
| `dudley/dudley_2024_01.csv` | 2.0MB | `4d48e7b65a86f6e1…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/dudley_dudley_2024_01.csv) |
| `dudley/dudley_2024_02.csv` | 1.8MB | `c160bbd5e8396cab…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/dudley_dudley_2024_02.csv) |
| `dudley/dudley_2024_03.csv` | 2.0MB | `e50c74853b1601e3…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/dudley_dudley_2024_03.csv) |

**Total**: 12 files, 24.2MB

### Ealing

**Live source**: [https://www.ealing.gov.uk/info/201041/council_budgets_and_spending/864/council_spending_over_250/1](https://www.ealing.gov.uk/info/201041/council_budgets_and_spending/864/council_spending_over_250/1)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: London Borough of Ealing — Council Spending Over £250 (ealing.gov.uk, filtered to £500+)  

**Raw files** (12):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `ealing/2023_04.csv` | 2.4MB | `a21b96dbfaf62008…` |
| `ealing/2023_05.csv` | 2.4MB | `5f0cbfd93e9ee778…` |
| `ealing/2023_06.csv` | 2.1MB | `5469f5e7129c137f…` |
| `ealing/2023_07.csv` | 2.1MB | `1f5b41ff41a86ad3…` |
| `ealing/2023_08.csv` | 2.4MB | `077f672eda8a90cf…` |
| `ealing/2023_09.csv` | 1.9MB | `958c9e56e1b41d2e…` |
| `ealing/2023_10.csv` | 2.1MB | `8dcb381f5925d3b2…` |
| `ealing/2023_11.csv` | 2.5MB | `f1544d765760e976…` |
| `ealing/2023_12.csv` | 1.8MB | `3faba4a944813b96…` |
| `ealing/2024_01.csv` | 2.2MB | `d52c1f93eba4fe58…` |
| `ealing/2024_02.csv` | 2.4MB | `b5cba166605cff05…` |
| `ealing/2024_03.csv` | 2.4MB | `23083e1b34454775…` |

**Total**: 12 files, 26.6MB

### East Sussex

**Live source**: [https://www.eastsussex.gov.uk/your-council/about/transparency/finance/spending-over-500](https://www.eastsussex.gov.uk/your-council/about/transparency/finance/spending-over-500)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: East Sussex CC Spend Over £500 (eastsussex.gov.uk)  

**Raw files** (8):

| File | Size | SHA256 (first 16) | archive.org mirror |
|---|---|---|---|
| `east_sussex/eastsussex_q1.csv` | 947.7KB | `489e66bad8f0cc7a…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/east_sussex_eastsussex_q1.csv) |
| `east_sussex/eastsussex_q2.csv` | 881.0KB | `4587b754021aa671…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/east_sussex_eastsussex_q2.csv) |
| `east_sussex/eastsussex_q3.csv` | 986.2KB | `88d9a46e22064a85…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/east_sussex_eastsussex_q3.csv) |
| `east_sussex/eastsussex_q4.csv` | 1.1MB | `dccecc35a01d41f5…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/east_sussex_eastsussex_q4.csv) |
| `east_sussex/q1.xlsx` | 483.4KB | `afad2416e7ab4812…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/east_sussex_q1.xlsx) |
| `east_sussex/q2.xlsx` | 459.0KB | `6504c560fc9e0ab8…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/east_sussex_q2.xlsx) |
| `east_sussex/q3.xlsx` | 520.4KB | `dc9cf0a0f57c5f06…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/east_sussex_q3.xlsx) |
| `east_sussex/q4.xlsx` | 588.6KB | `e10acc43b28d3e0a…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/east_sussex_q4.xlsx) |

**Total**: 8 files, 5.9MB

### Enfield

**Live source**: [https://www.enfield.gov.uk/services/business-and-licensing/doing-business-with-the-council/monthly-reports-for-transactions-over-500](https://www.enfield.gov.uk/services/business-and-licensing/doing-business-with-the-council/monthly-reports-for-transactions-over-500)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: London Borough of Enfield — Monthly Transactions over £250 (enfield.gov.uk, via Playwright profile; filtered to £500+)  

**Raw files** (24):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `enfield/2023_04.csv` | 612.8KB | `b6bc8948864489d8…` |
| `enfield/2023_04.xlsx` | 281.3KB | `b39f973d5fb8abc6…` |
| `enfield/2023_05.csv` | 727.5KB | `fe5e35b53b573083…` |
| `enfield/2023_05.xlsx` | 327.5KB | `5a32e421d6c080db…` |
| `enfield/2023_06.csv` | 733.9KB | `ae392e48e980a28f…` |
| `enfield/2023_06.xlsx` | 334.4KB | `e8fa156460bfc15b…` |
| `enfield/2023_07.csv` | 679.3KB | `ef5b9f6ed9759354…` |
| `enfield/2023_07.xlsx` | 312.5KB | `58a71910da6b0522…` |
| `enfield/2023_08.csv` | 722.0KB | `5435386c8cea7931…` |
| `enfield/2023_08.xlsx` | 326.1KB | `40fde49e228af81c…` |
| `enfield/2023_09.csv` | 753.5KB | `754660634be5544f…` |
| `enfield/2023_09.xlsx` | 338.9KB | `244d018fc3b6f863…` |
| `enfield/2023_10.csv` | 752.6KB | `889cfc17a20a2089…` |
| `enfield/2023_10.xlsx` | 340.9KB | `fa1c82ae41154154…` |
| `enfield/2023_11.csv` | 765.5KB | `73507117eb5af75a…` |
| `enfield/2023_11.xlsx` | 344.3KB | `b953156df62083ba…` |
| `enfield/2023_12.csv` | 657.0KB | `be9b73c09e23f042…` |
| `enfield/2023_12.xlsx` | 302.9KB | `bf9f2ab30fdfccf5…` |
| `enfield/2024_01.csv` | 737.1KB | `348196598baf2b96…` |
| `enfield/2024_01.xlsx` | 334.9KB | `18930e8c96dc613c…` |
| `enfield/2024_02.csv` | 773.3KB | `5bcabaff2656fffd…` |
| `enfield/2024_02.xlsx` | 350.2KB | `a3d78280e4acfc97…` |
| `enfield/2024_03.csv` | 794.3KB | `49019fd17385fcb9…` |
| `enfield/2024_03.xlsx` | 361.4KB | `715ad7553ef66377…` |

**Total**: 24 files, 12.4MB

### Essex

**Live source**: [https://data.essex.gov.uk/dataset/day-to-day-spending](https://data.essex.gov.uk/dataset/day-to-day-spending)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: Essex County Council Day-to-Day Spending (essex.gov.uk)  

**Raw files** (8):

| File | Size | SHA256 (first 16) | archive.org mirror |
|---|---|---|---|
| `essex/q1_apr_jun_2023.csv` | 12.8MB | `b37de2801eba8f86…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/essex_q1_apr_jun_2023.csv) |
| `essex/q1_apr_jun_2023.xlsx` | 4.6MB | `70a717aa5af0493d…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/essex_q1_apr_jun_2023.xlsx) |
| `essex/q2_jul_sep_2023.csv` | 13.4MB | `6cbdc32ec5a6640e…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/essex_q2_jul_sep_2023.csv) |
| `essex/q2_jul_sep_2023.xls` | 15.6MB | `b259871beb6765a6…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/essex_q2_jul_sep_2023.xls) |
| `essex/q3_oct_dec_2023.csv` | 13.2MB | `bba08fa5e5d754ba…` | — |
| `essex/q3_oct_dec_2023.xlsx` | 4.7MB | `f2f8565384ccded8…` | — |
| `essex/q4_jan_mar_2024.csv` | 13.9MB | `4b44c516295bd219…` | — |
| `essex/q4_jan_mar_2024.xls` | 15.5MB | `b87d3910358e7276…` | — |

**Total**: 8 files, 93.8MB

### Greenwich

**Live source**: [https://www.royalgreenwich.gov.uk/downloads/download/1402/quarterly_payments_in_2023_and_2024](https://www.royalgreenwich.gov.uk/downloads/download/1402/quarterly_payments_in_2023_and_2024)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: Royal Borough of Greenwich — Greater than £500 quarterly (royalgreenwich.gov.uk)  

**Raw files** (8):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `greenwich/q1_apr_jun_2023.csv` | 1.7MB | `ee8fcdbd3d3de9a4…` |
| `greenwich/q1_apr_jun_2023.xlsx` | 628.5KB | `b37dfcd5f5aa2d52…` |
| `greenwich/q2_jul_sep_2023.csv` | 1.6MB | `2c3edf88d2e27cfb…` |
| `greenwich/q2_jul_sep_2023.xlsx` | 617.0KB | `1fed26ddc4817a71…` |
| `greenwich/q3_oct_dec_2023.csv` | 2.2MB | `6ab249efb587fa0b…` |
| `greenwich/q3_oct_dec_2023.xlsx` | 881.8KB | `d8f6d4a4aa8caa64…` |
| `greenwich/q4_jan_mar_2024.csv` | 2.3MB | `f1bd8a61de647124…` |
| `greenwich/q4_jan_mar_2024.xlsx` | 842.9KB | `b70e12bcbacde267…` |

**Total**: 8 files, 10.8MB

### Hackney

**Live source**: [https://www.hackney.gov.uk/council-and-elections/finances-and-transparency/transparency/council-spending-over-ps250](https://www.hackney.gov.uk/council-and-elections/finances-and-transparency/transparency/council-spending-over-ps250)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24 (11/12 months, May 2023 mislabeled in source)  
**Publisher description**: London Borough of Hackney — Council Spending Over £250 (hackney.gov.uk via Google Drive, filtered to £500+)  

**Raw files** (11):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `hackney/2023_04.csv` | 1.1MB | `1b7fdfdcdd81ff0c…` |
| `hackney/2023_06.csv` | 1.1MB | `273cd92c39de0921…` |
| `hackney/2023_07.csv` | 1.2MB | `13508ca73ab8f8b4…` |
| `hackney/2023_08.csv` | 1.0MB | `9bff816f2b1ed20d…` |
| `hackney/2023_09.csv` | 1.1MB | `685ec04b7543c171…` |
| `hackney/2023_10.csv` | 1.2MB | `be3fa75391eaf16e…` |
| `hackney/2023_11.csv` | 1.4MB | `7d674111226cd530…` |
| `hackney/2023_12.csv` | 1.2MB | `226e0a661a8bebac…` |
| `hackney/2024_01.csv` | 1.1MB | `4e0535d3dd5ba54a…` |
| `hackney/2024_02.csv` | 1.1MB | `b76bc486c2e1a51f…` |
| `hackney/2024_03.csv` | 1.4MB | `884ef1d98d1947a9…` |

**Total**: 11 files, 12.7MB

### Hampshire

**Live source**: [https://www.hants.gov.uk/aboutthecouncil/informationandstats/opendata/opendatasearch/supplierpayments](https://www.hants.gov.uk/aboutthecouncil/informationandstats/opendata/opendatasearch/supplierpayments)  
**Wayback archive**: [(none)](#)  
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

### Haringey

**Live source**: [https://haringey.gov.uk/business/selling-to-council/council-expenditure](https://haringey.gov.uk/business/selling-to-council/council-expenditure)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: London Borough of Haringey — Council Expenditure quarterly (haringey.gov.uk)  

**Raw files** (4):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `haringey/q1_apr_jun_2023.csv` | 1.9MB | `286e94187efba56f…` |
| `haringey/q2_jul_sep_2023.csv` | 1.1MB | `2e7e76a3e65268cd…` |
| `haringey/q3_oct_dec_2023.csv` | 1.4MB | `661dae27ce3f7375…` |
| `haringey/q4_jan_mar_2024.csv` | 1.3MB | `9b183e040e2adec7…` |

**Total**: 4 files, 5.7MB

### Harrow

**Live source**: [https://www.harrow.gov.uk/downloads/download/12587/council-budgets-and-spending](https://www.harrow.gov.uk/downloads/download/12587/council-budgets-and-spending)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: London Borough of Harrow — Council Spend quarterly (harrow.gov.uk)  

**Raw files** (8):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `harrow/q1_apr_jun_2023.csv` | 927.2KB | `a67a5e3ea586cc1f…` |
| `harrow/q1_apr_jun_2023.xlsx` | 456.3KB | `75c0db1c658e3a9e…` |
| `harrow/q2_jul_sep_2023.csv` | 1.3MB | `8cd5a509be1bba4c…` |
| `harrow/q2_jul_sep_2023.xlsx` | 642.1KB | `22777a158ae8cb85…` |
| `harrow/q3_oct_dec_2023.csv` | 1.4MB | `9bbb54457b776c2d…` |
| `harrow/q3_oct_dec_2023.xlsx` | 648.0KB | `33ea5a0c77da9064…` |
| `harrow/q4_jan_mar_2024.csv` | 1.4MB | `c6f36c525f865d33…` |
| `harrow/q4_jan_mar_2024.xlsx` | 709.5KB | `76c17fcc8449356c…` |

**Total**: 8 files, 7.4MB

### Havering

**Live source**: [https://www.havering.gov.uk/council-data-spending/spend-500](https://www.havering.gov.uk/council-data-spending/spend-500)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: London Borough of Havering — Spend Over £500 (havering.gov.uk)  

**Raw files** (12):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `havering/2023_04.csv` | 663.1KB | `cb3e84ff215f392c…` |
| `havering/2023_05.csv` | 901.2KB | `e065ee6063601fd5…` |
| `havering/2023_06.csv` | 930.8KB | `f0bdfda94c8d620d…` |
| `havering/2023_07.csv` | 712.6KB | `4ac005e2cfbdb39d…` |
| `havering/2023_08.csv` | 843.1KB | `cf3d5ac6cebcc32e…` |
| `havering/2023_09.csv` | 855.8KB | `e7b2d91047b2f681…` |
| `havering/2023_10.csv` | 765.5KB | `686312d5f665ea93…` |
| `havering/2023_11.csv` | 878.8KB | `08f45de5a7d4029a…` |
| `havering/2023_12.csv` | 849.8KB | `a8b4ade3341fc5c4…` |
| `havering/2024_01.csv` | 936.7KB | `a052ba2d8cbe5127…` |
| `havering/2024_02.csv` | 849.4KB | `38c72086962cf598…` |
| `havering/2024_03.csv` | 922.9KB | `8848e4962eef81b5…` |

**Total**: 12 files, 9.9MB

### Hertfordshire

**Live source**: [https://www.hertfordshire.gov.uk/about-the-council/freedom-of-information-and-council-data/data-and-statistics/payments-to-suppliers/payments-to-suppliers.aspx](https://www.hertfordshire.gov.uk/about-the-council/freedom-of-information-and-council-data/data-and-statistics/payments-to-suppliers/payments-to-suppliers.aspx)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: Hertfordshire CC Supplier Payments Over £250 (hertfordshire.gov.uk)  

**Raw files** (4):

| File | Size | SHA256 (first 16) | archive.org mirror |
|---|---|---|---|
| `hertfordshire/herts_q1.csv` | 12.2MB | `fae5863579663c36…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/hertfordshire_herts_q1.csv) |
| `hertfordshire/herts_q2.csv` | 10.8MB | `0a7e73ef31c30b87…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/hertfordshire_herts_q2.csv) |
| `hertfordshire/herts_q3.csv` | 13.0MB | `399465ba20cd6e85…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/hertfordshire_herts_q3.csv) |
| `hertfordshire/herts_q4.csv` | 12.9MB | `d4cf35415203a48e…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/hertfordshire_herts_q4.csv) |

**Total**: 4 files, 49.0MB

### Hillingdon

**Live source**: [https://pre.hillingdon.gov.uk/performance-spending/council-spending-500](https://pre.hillingdon.gov.uk/performance-spending/council-spending-500)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: London Borough of Hillingdon — Council Spending Over £500 (pre.hillingdon.gov.uk)  

**Raw files** (24):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `hillingdon/2023_04.csv` | 189.2KB | `4de07521bb514d3d…` |
| `hillingdon/2023_04.xlsx` | 109.1KB | `e41794d00df53c42…` |
| `hillingdon/2023_05.csv` | 203.3KB | `3f56d2cfaf7df8a7…` |
| `hillingdon/2023_05.xlsx` | 116.9KB | `69b86622fc2bab06…` |
| `hillingdon/2023_06.csv` | 204.9KB | `02b5da45d672381d…` |
| `hillingdon/2023_06.xlsx` | 113.7KB | `17b076d1c5c2c48a…` |
| `hillingdon/2023_07.csv` | 214.6KB | `cb3c04dbaa32024f…` |
| `hillingdon/2023_07.xlsx` | 112.3KB | `4f58976de7f2d122…` |
| `hillingdon/2023_08.csv` | 198.3KB | `cc25b652b80dde36…` |
| `hillingdon/2023_08.xlsx` | 101.0KB | `3f71bd6f4f2bb8bc…` |
| `hillingdon/2023_09.csv` | 202.3KB | `7759f7a7d75d13e7…` |
| `hillingdon/2023_09.xlsx` | 101.6KB | `8030660b0a498bf9…` |
| `hillingdon/2023_10.csv` | 221.0KB | `4f6be6d5b2feb105…` |
| `hillingdon/2023_10.xlsx` | 116.4KB | `9d085e172c4d940c…` |
| `hillingdon/2023_11.csv` | 224.4KB | `447ac71d04d34f5e…` |
| `hillingdon/2023_11.xlsx` | 113.1KB | `bdee6252932c6c41…` |
| `hillingdon/2023_12.csv` | 203.5KB | `16a6102bb5f8fa96…` |
| `hillingdon/2023_12.xlsx` | 104.9KB | `af413d9894ee2d4a…` |
| `hillingdon/2024_01.csv` | 214.4KB | `5a86b6dfe9f5500e…` |
| `hillingdon/2024_01.xlsx` | 113.5KB | `a88cbde54b3f330b…` |
| `hillingdon/2024_02.csv` | 200.9KB | `60f42358466d0e7d…` |
| `hillingdon/2024_02.xlsx` | 101.6KB | `81afe2af14464cc4…` |
| `hillingdon/2024_03.csv` | 225.8KB | `4a0513ebe965350f…` |
| `hillingdon/2024_03.xlsx` | 114.5KB | `0b7b84436c627644…` |

**Total**: 24 files, 3.7MB

### Hounslow

**Live source**: [https://data.hounslow.gov.uk/@london-borough-of-hounslow/council-spending-over-500](https://data.hounslow.gov.uk/@london-borough-of-hounslow/council-spending-over-500)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: London Borough of Hounslow — Invoices over £500 (data.hounslow.gov.uk / Datopian)  

**Raw files** (12):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `hounslow/2023_04.csv` | 465.1KB | `244a08509da8ff36…` |
| `hounslow/2023_05.csv` | 489.6KB | `a51ac6e327073670…` |
| `hounslow/2023_06.csv` | 511.2KB | `d46e8f70f24f3bdc…` |
| `hounslow/2023_07.csv` | 418.0KB | `a787225570a4274c…` |
| `hounslow/2023_08.csv` | 426.0KB | `cddf96c22c9d96e5…` |
| `hounslow/2023_09.csv` | 442.0KB | `00aa39af9d1f10cd…` |
| `hounslow/2023_10.csv` | 487.2KB | `66c4452ae91a7c3b…` |
| `hounslow/2023_11.csv` | 447.5KB | `1e2078924858a1df…` |
| `hounslow/2023_12.csv` | 477.7KB | `ccf69721065de31e…` |
| `hounslow/2024_01.csv` | 459.4KB | `f1887201de8c9307…` |
| `hounslow/2024_02.csv` | 499.7KB | `3c8108a677686059…` |
| `hounslow/2024_03.csv` | 627.0KB | `a50df1b2f9c320fe…` |

**Total**: 12 files, 5.6MB

### Islington

**Live source**: [https://www.islington.gov.uk/about-the-council/information-governance/freedom-of-information/publication-scheme/what-we-spend-and-how-we-spend-it/council-spending](https://www.islington.gov.uk/about-the-council/information-governance/freedom-of-information/publication-scheme/what-we-spend-and-how-we-spend-it/council-spending)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: London Borough of Islington — Council Spending quarterly (islington.gov.uk)  

**Raw files** (4):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `islington/q1_mar_jun_2023.csv` | 2.7MB | `0683288dae4aaec6…` |
| `islington/q2_jul_sep_2023.csv` | 2.0MB | `b4a08f996a66669f…` |
| `islington/q3_oct_dec_2023.csv` | 2.0MB | `9a204598a608660a…` |
| `islington/q4_jan_mar_2024.csv` | 2.3MB | `255c86b8a1ef3662…` |

**Total**: 4 files, 9.0MB

### Kensington and Chelsea

**Live source**: [https://www.rbkc.gov.uk/council-councillors-and-democracy/open-data-and-transparency/suppliers-contracts-transactions-equalities-information-and-staff-data](https://www.rbkc.gov.uk/council-councillors-and-democracy/open-data-and-transparency/suppliers-contracts-transactions-equalities-information-and-staff-data)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24 (calendar quarters)  
**Publisher description**: Royal Borough of Kensington & Chelsea — Suppliers/Contracts/Transactions calendar quarterly (rbkc.gov.uk)  

**Raw files** (4):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `rbkc/q1_2024_cal_jan_mar.csv` | 3.5MB | `317946920612197c…` |
| `rbkc/q2_2023_cal_apr_jun.csv` | 3.4MB | `3bae9fb6a97eb7f6…` |
| `rbkc/q3_2023_cal_jul_sep.csv` | 3.6MB | `21f7b0100ed0b349…` |
| `rbkc/q4_2023_cal_oct_dec.csv` | 3.7MB | `1dafb777fe1ab875…` |

**Total**: 4 files, 14.1MB

### Kent

**Live source**: [https://www.kent.gov.uk/about-the-council/information-and-data/open-data/invoices-paid-over-250](https://www.kent.gov.uk/about-the-council/information-and-data/open-data/invoices-paid-over-250)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: Kent CC Invoices Over £250 (kent.gov.uk)  

**Raw files** (12):

| File | Size | SHA256 (first 16) | archive.org mirror |
|---|---|---|---|
| `kent/kent_2023_04.csv` | 5.9MB | `967dab9e624a9b62…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/kent_kent_2023_04.csv) |
| `kent/kent_2023_05.csv` | 7.9MB | `8d6aaee023db63a8…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/kent_kent_2023_05.csv) |
| `kent/kent_2023_06.csv` | 6.8MB | `d4eb2c24ba1c5819…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/kent_kent_2023_06.csv) |
| `kent/kent_2023_07.csv` | 6.5MB | `cfc51ab464887d3f…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/kent_kent_2023_07.csv) |
| `kent/kent_2023_08.csv` | 8.1MB | `42f1b63043335c17…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/kent_kent_2023_08.csv) |
| `kent/kent_2023_09.csv` | 6.1MB | `76cf4c7e9b5ccc35…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/kent_kent_2023_09.csv) |
| `kent/kent_2023_10.csv` | 7.2MB | `a2338ed41910910d…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/kent_kent_2023_10.csv) |
| `kent/kent_2023_11.csv` | 6.6MB | `4a792cf98cec7270…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/kent_kent_2023_11.csv) |
| `kent/kent_2023_12.csv` | 6.7MB | `779afeac7412e40b…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/kent_kent_2023_12.csv) |
| `kent/kent_2024_01.csv` | 6.6MB | `5b1121b29142254e…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/kent_kent_2024_01.csv) |
| `kent/kent_2024_02.csv` | 7.2MB | `5e7c4b188efef81b…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/kent_kent_2024_02.csv) |
| `kent/kent_2024_03.csv` | 6.6MB | `4ca72e4bd0f91114…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/kent_kent_2024_03.csv) |

**Total**: 12 files, 82.1MB

### Kingston upon Thames

**Live source**: [https://www.kingston.gov.uk/your-council/privacy-and-data/local-government-transparency-code/finance](https://www.kingston.gov.uk/your-council/privacy-and-data/local-government-transparency-code/finance)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: Royal Borough of Kingston upon Thames — Over £500 Transparency Code (kingston.gov.uk)  

**Raw files** (12):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `kingston/RBK_Over___500_payments_May_2023_To_be_published.csv` | 648.9KB | `82349b67b26f55e8…` |
| `kingston/RBK_Payments_Over___500_April_2023___To_be_published.csv` | 514.8KB | `233faade337f9ae6…` |
| `kingston/RBK_Payments_over___500_June_2023___To_be_published.csv` | 524.2KB | `6bcf52f72adac232…` |
| `kingston/RBK_Payments_over___500_March_2024___To_be_published.csv` | 593.5KB | `327917b38e1e9462…` |
| `kingston/RBK_Payments_over___500_October_2023___For_publishing.csv` | 542.8KB | `8ccc3bacc3a42d71…` |
| `kingston/RBK_Payments_over___500_September_2023___To_be_published.csv` | 466.1KB | `19dafede6bc9ca95…` |
| `kingston/RBK_Payments_to_Suppliers_over___500_July_2023___TO_BE_PUBLISHED.csv` | 439.1KB | `c782e290ef6511ec…` |
| `kingston/RBK_payments_over___500_August_2023___To_be_published.csv` | 626.5KB | `6e48f4ba86d86d91…` |
| `kingston/RBK_payments_over___500_December_2023___For_publishing.csv` | 513.0KB | `45b3961cfe860709…` |
| `kingston/RBK_payments_over___500_February_2024___To_be_published.csv` | 525.7KB | `b0cb30db7f99b045…` |
| `kingston/RBK_payments_over___500_January_2024___To_be_published.csv` | 570.7KB | `5cb5eb53d3a6cd5e…` |
| `kingston/RBK_payments_over___500_November_2023___TO_BE_PUBLISHED.csv` | 484.0KB | `4adac928a93b71eb…` |

**Total**: 12 files, 6.3MB

### Lambeth

**Live source**: [https://www.lambeth.gov.uk/finance-and-performance/council-finances/payments-over-500](https://www.lambeth.gov.uk/finance-and-performance/council-finances/payments-over-500)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: Lambeth Council Spend Over £500 (lambeth.gov.uk)  

**Raw files** (7):

| File | Size | SHA256 (first 16) | archive.org mirror |
|---|---|---|---|
| `lambeth/lambeth_2023_24_q1.csv` | 10.2MB | `b01b656a6cbebf65…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/lambeth_lambeth_2023_24_q1.csv) |
| `lambeth/lambeth_2023_24_q1.xlsx` | 2.9MB | `5b65f1fcba5b1ea1…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/lambeth_lambeth_2023_24_q1.xlsx) |
| `lambeth/lambeth_2023_24_q2.csv` | 11.6MB | `255120e73b20f44c…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/lambeth_lambeth_2023_24_q2.csv) |
| `lambeth/lambeth_2023_24_q2.xlsx` | 3.3MB | `f1e4d8dd76ea700e…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/lambeth_lambeth_2023_24_q2.xlsx) |
| `lambeth/lambeth_2023_24_q3.csv` | 12.2MB | `3889443d12479c91…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/lambeth_lambeth_2023_24_q3.csv) |
| `lambeth/lambeth_2023_24_q3.xlsx` | 3.5MB | `77cb2d5c9306d7db…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/lambeth_lambeth_2023_24_q3.xlsx) |
| `lambeth/lambeth_2023_24_q4.csv` | 12.6MB | `0773d27ff92a9eae…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/lambeth_lambeth_2023_24_q4.csv) |

**Total**: 7 files, 56.2MB

### Lancashire

**Live source**: [https://transparency.lancashire.gov.uk/](https://transparency.lancashire.gov.uk/)  
**Wayback archive**: [(none)](#)  
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
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: Leeds City Council via Data Mill North CKAN API  

_No raw files found on disk — may have been processed in-memory from an API._

### Lewisham

**Live source**: [https://lewisham.gov.uk/mayorandcouncil/aboutthecouncil/finances/council-spending-over-250/council-spending-over-250-in-2023-2024](https://lewisham.gov.uk/mayorandcouncil/aboutthecouncil/finances/council-spending-over-250/council-spending-over-250-in-2023-2024)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24 (10/12 months, Apr+Jun 2023 broken upstream)  
**Publisher description**: London Borough of Lewisham — Council Spending Over £250 (lewisham.gov.uk, filtered to £500+)  

**Raw files** (20):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `lewisham/2023_05.csv` | 680.2KB | `069718f75687193c…` |
| `lewisham/2023_05.xlsx` | 215.1KB | `1536777c0c7dc616…` |
| `lewisham/2023_07.csv` | 707.7KB | `6a6a3cf7431e8e0f…` |
| `lewisham/2023_07.xlsx` | 229.0KB | `ffdf364b3dffbe54…` |
| `lewisham/2023_08.csv` | 644.8KB | `3ac6da3d251806b3…` |
| `lewisham/2023_08.xlsx` | 211.5KB | `a06bb7b80c7e0aae…` |
| `lewisham/2023_09.csv` | 741.3KB | `756a7ba9937a1aba…` |
| `lewisham/2023_09.xlsx` | 226.0KB | `7df0aebef3ef3e84…` |
| `lewisham/2023_10.csv` | 783.6KB | `5e4f0770e2040c3c…` |
| `lewisham/2023_10.xlsx` | 242.7KB | `714f1db43f97cacf…` |
| `lewisham/2023_11.csv` | 710.4KB | `499e2d08196bf65a…` |
| `lewisham/2023_11.xlsx` | 227.7KB | `f8be6e171f7a22e5…` |
| `lewisham/2023_12.csv` | 683.5KB | `edf98ecd04778615…` |
| `lewisham/2023_12.xlsx` | 219.6KB | `9dc12bd3938df998…` |
| `lewisham/2024_01.csv` | 769.0KB | `e4a47f011ba2dd6e…` |
| `lewisham/2024_01.xlsx` | 246.9KB | `e2705b8198efe62c…` |
| `lewisham/2024_02.csv` | 776.9KB | `c33a3f2178707f22…` |
| `lewisham/2024_02.xlsx` | 238.4KB | `7bc0fb2934c830e3…` |
| `lewisham/2024_03.csv` | 869.2KB | `32e5efb02c8dc468…` |
| `lewisham/2024_03.xlsx` | 276.8KB | `5102610f3481c5d1…` |

**Total**: 20 files, 9.5MB

### Lincolnshire

**Live source**: [https://lcc.portaljs.com/dataset/lincolnshire-county-council-spending](https://lcc.portaljs.com/dataset/lincolnshire-county-council-spending)  
**Wayback archive**: [(none)](#)  
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
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: Liverpool City Council Spend Over £500 (liverpool.gov.uk)  

**Raw files** (24):

| File | Size | SHA256 (first 16) | archive.org mirror |
|---|---|---|---|
| `liverpool/apr_2023.csv` | 1.1MB | `3f9c1a95b0cb778e…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/liverpool_apr_2023.csv) |
| `liverpool/apr_2023.xlsx` | 403.9KB | `25139a6605d6ae87…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/liverpool_apr_2023.xlsx) |
| `liverpool/aug_2023.csv` | 1.3MB | `fd08381b9e41bc63…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/liverpool_aug_2023.csv) |
| `liverpool/aug_2023.xlsx` | 480.7KB | `6667f2adbbcadd84…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/liverpool_aug_2023.xlsx) |
| `liverpool/dec_2023.csv` | 1.3MB | `bfc903f5c3e59658…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/liverpool_dec_2023.csv) |
| `liverpool/dec_2023.xlsx` | 479.3KB | `30bafafbfaeccb71…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/liverpool_dec_2023.xlsx) |
| `liverpool/feb_2024.csv` | 1.3MB | `eaecc55bb62362d9…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/liverpool_feb_2024.csv) |
| `liverpool/feb_2024.xlsx` | 462.5KB | `5a2ace889611cd08…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/liverpool_feb_2024.xlsx) |
| `liverpool/jan_2024.csv` | 1.3MB | `638c79853d57fc80…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/liverpool_jan_2024.csv) |
| `liverpool/jan_2024.xlsx` | 471.0KB | `d48baf9e3f9bb832…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/liverpool_jan_2024.xlsx) |
| `liverpool/jul_2023.csv` | 1.2MB | `ca4700c7bcb5706b…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/liverpool_jul_2023.csv) |
| `liverpool/jul_2023.xlsx` | 450.9KB | `20d1df40c026cfc8…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/liverpool_jul_2023.xlsx) |
| `liverpool/jun_2023.csv` | 1.3MB | `075f815dea513e8b…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/liverpool_jun_2023.csv) |
| `liverpool/jun_2023.xlsx` | 484.8KB | `68b9a8005adec1dd…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/liverpool_jun_2023.xlsx) |
| `liverpool/mar_2024.csv` | 1.6MB | `6477a9ee17637e6b…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/liverpool_mar_2024.csv) |
| `liverpool/mar_2024.xlsx` | 559.9KB | `e6ecd65270afcd63…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/liverpool_mar_2024.xlsx) |
| `liverpool/may_2023.csv` | 1.3MB | `15a37dcfeeb666cf…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/liverpool_may_2023.csv) |
| `liverpool/may_2023.xlsx` | 492.6KB | `b2068d6ad5a75660…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/liverpool_may_2023.xlsx) |
| `liverpool/nov_2023.csv` | 1.2MB | `35f32931d9ac942e…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/liverpool_nov_2023.csv) |
| `liverpool/nov_2023.xlsx` | 438.9KB | `2efd011b725e8442…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/liverpool_nov_2023.xlsx) |
| `liverpool/oct_2023.csv` | 1.2MB | `af088c943b815014…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/liverpool_oct_2023.csv) |
| `liverpool/oct_2023.xlsx` | 456.9KB | `a8d548a647110d72…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/liverpool_oct_2023.xlsx) |
| `liverpool/sep_2023.csv` | 1.2MB | `43855038c555f055…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/liverpool_sep_2023.csv) |
| `liverpool/sep_2023.xlsx` | 458.8KB | `29548d0c92b1b7dd…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/liverpool_sep_2023.xlsx) |

**Total**: 24 files, 20.8MB

### Manchester

**Live source**: [https://www.manchester.gov.uk/info/200031/council_expenditure_and_performance/7665/payments_to_suppliers](https://www.manchester.gov.uk/info/200031/council_expenditure_and_performance/7665/payments_to_suppliers)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: Manchester City Council Spend Over £500  

**Raw files** (12):

| File | Size | SHA256 (first 16) | archive.org mirror |
|---|---|---|---|
| `manchester/apr_2023.csv` | 422.1KB | `5f14ca445dc3725e…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/manchester_apr_2023.csv) |
| `manchester/aug_2023.csv` | 479.2KB | `a2a95b5e8b116222…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/manchester_aug_2023.csv) |
| `manchester/dec_2023.csv` | 400.8KB | `61b0b4e9859b7cbb…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/manchester_dec_2023.csv) |
| `manchester/feb_2024.csv` | 462.2KB | `7de933c3c4b91b54…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/manchester_feb_2024.csv) |
| `manchester/jan_2024.csv` | 505.2KB | `424df46c093aa596…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/manchester_jan_2024.csv) |
| `manchester/jul_2023.csv` | 537.6KB | `8eac17aaecb048ed…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/manchester_jul_2023.csv) |
| `manchester/jun_2023.csv` | 406.1KB | `70f76dcb389abb62…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/manchester_jun_2023.csv) |
| `manchester/mar_2024.csv` | 650.6KB | `575762669c4b9cf9…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/manchester_mar_2024.csv) |
| `manchester/may_2023.csv` | 624.5KB | `21838af25e42234b…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/manchester_may_2023.csv) |
| `manchester/nov_2023.csv` | 520.6KB | `8867affa6b34119e…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/manchester_nov_2023.csv) |
| `manchester/oct_2023.csv` | 462.0KB | `cd82e0de40b56f6a…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/manchester_oct_2023.csv) |
| `manchester/sep_2023.csv` | 470.8KB | `a6f129b4ac9ee34b…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/manchester_sep_2023.csv) |

**Total**: 12 files, 5.8MB

### Merton

**Live source**: [https://www.merton.gov.uk/council/council-expenditure](https://www.merton.gov.uk/council/council-expenditure)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: Merton Council Spend Over £500 (merton.gov.uk)  

**Raw files** (2):

| File | Size | SHA256 (first 16) | archive.org mirror |
|---|---|---|---|
| `merton/merton_2023.csv` | 7.5MB | `720208d16ff43c20…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/merton_merton_2023.csv) |
| `merton/merton_2024.csv` | 8.0MB | `8d501c904059dc53…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/merton_merton_2024.csv) |

**Total**: 2 files, 15.5MB

### Newham

**Live source**: [https://www.newham.gov.uk/council/council-spending](https://www.newham.gov.uk/council/council-spending)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: London Borough of Newham — Payments to Suppliers over £250 (newham.gov.uk, filtered to £500+)  

**Raw files** (12):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `newham/2023_04.csv` | 3.0MB | `653b6cdce9886dfc…` |
| `newham/2023_05.csv` | 2.9MB | `93daff13f9181aed…` |
| `newham/2023_06.csv` | 2.6MB | `021706e55b6061db…` |
| `newham/2023_07.csv` | 3.4MB | `d95c5cf6e095b790…` |
| `newham/2023_08.csv` | 3.3MB | `f0a2921d45d1af3b…` |
| `newham/2023_09.csv` | 2.8MB | `aabfc8aad59f7bfe…` |
| `newham/2023_10.csv` | 3.5MB | `e3fd65691714a773…` |
| `newham/2023_11.csv` | 2.7MB | `d15887b7e78a5094…` |
| `newham/2023_12.csv` | 2.4MB | `fdcc2885a58b2f88…` |
| `newham/2024_01.csv` | 3.5MB | `5d0f4a66afaad27a…` |
| `newham/2024_02.csv` | 3.5MB | `39afc80288eb2fc9…` |
| `newham/2024_03.csv` | 3.0MB | `7a38b454bac7dc22…` |

**Total**: 12 files, 36.8MB

### Norfolk

**Live source**: [https://www.norfolk.gov.uk/what-we-do-and-how-we-work/transparency/spending-over-500](https://www.norfolk.gov.uk/what-we-do-and-how-we-work/transparency/spending-over-500)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: Norfolk CC Spend Over £500 (norfolk.gov.uk)  

**Raw files** (5):

| File | Size | SHA256 (first 16) | archive.org mirror |
|---|---|---|---|
| `norfolk/norfolk_q1.csv` | 16.6MB | `d083e1328a87231d…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/norfolk_norfolk_q1.csv) |
| `norfolk/norfolk_q2.csv` | 13.3MB | `a0d74ef996199082…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/norfolk_norfolk_q2.csv) |
| `norfolk/norfolk_q3.csv` | 16.3MB | `75e27d0ad321c9b2…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/norfolk_norfolk_q3.csv) |
| `norfolk/norfolk_q4.csv` | 17.7MB | `ad27565a199585a1…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/norfolk_norfolk_q4.csv) |
| `norfolk/norfolk_q4.xlsx` | 6.1MB | `cdfea054b6ffed67…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/norfolk_norfolk_q4.xlsx) |

**Total**: 5 files, 70.1MB

### North Yorkshire

**Live source**: [https://datanorthyorkshire.org/dataset/payments-to-suppliers](https://datanorthyorkshire.org/dataset/payments-to-suppliers)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: North Yorkshire Council Spend Over £500 (datanorthyorkshire.org)  

**Raw files** (5):

| File | Size | SHA256 (first 16) | archive.org mirror |
|---|---|---|---|
| `north_yorkshire/northyorks_q1.csv` | 6.1MB | `c4b518c414dd3a56…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/north_yorkshire_northyorks_q1.csv) |
| `north_yorkshire/northyorks_q1.xlsx` | 1.5MB | `826f059ef08a2c56…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/north_yorkshire_northyorks_q1.xlsx) |
| `north_yorkshire/northyorks_q2.csv` | 6.3MB | `857c340eba5317c9…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/north_yorkshire_northyorks_q2.csv) |
| `north_yorkshire/northyorks_q3.csv` | 6.7MB | `aee4c94d36181468…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/north_yorkshire_northyorks_q3.csv) |
| `north_yorkshire/northyorks_q4.csv` | 7.0MB | `252a258acc435fc6…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/north_yorkshire_northyorks_q4.csv) |

**Total**: 5 files, 27.5MB

### Nottinghamshire

**Live source**: [https://www.nottinghamshire.gov.uk/council-and-democracy/council-spending/payments-to-suppliers](https://www.nottinghamshire.gov.uk/council-and-democracy/council-spending/payments-to-suppliers)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: Nottinghamshire CC Spend Over £500 (nottinghamshire.gov.uk)  

**Raw files** (12):

| File | Size | SHA256 (first 16) | archive.org mirror |
|---|---|---|---|
| `nottinghamshire/notts_2023_04.csv` | 1.1MB | `f7d9a72180982fa4…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/nottinghamshire_notts_2023_04.csv) |
| `nottinghamshire/notts_2023_05.csv` | 1.3MB | `d5527b7c89bdc097…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/nottinghamshire_notts_2023_05.csv) |
| `nottinghamshire/notts_2023_06.csv` | 1.6MB | `1329254894477cd0…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/nottinghamshire_notts_2023_06.csv) |
| `nottinghamshire/notts_2023_07.csv` | 1.3MB | `ff6c6ed385df7154…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/nottinghamshire_notts_2023_07.csv) |
| `nottinghamshire/notts_2023_08.csv` | 1.4MB | `28e78993ea7f23b3…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/nottinghamshire_notts_2023_08.csv) |
| `nottinghamshire/notts_2023_09.csv` | 1.2MB | `60e0214b65959b1e…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/nottinghamshire_notts_2023_09.csv) |
| `nottinghamshire/notts_2023_10.csv` | 1.2MB | `024923add567a536…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/nottinghamshire_notts_2023_10.csv) |
| `nottinghamshire/notts_2023_11.csv` | 1.3MB | `8a50ae7a3f058bd0…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/nottinghamshire_notts_2023_11.csv) |
| `nottinghamshire/notts_2023_12.csv` | 1.3MB | `fdcd5d7a1540190b…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/nottinghamshire_notts_2023_12.csv) |
| `nottinghamshire/notts_2024_01.csv` | 1.5MB | `43db7420d7b62321…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/nottinghamshire_notts_2024_01.csv) |
| `nottinghamshire/notts_2024_02.csv` | 1.3MB | `ee75fdb9f6f57542…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/nottinghamshire_notts_2024_02.csv) |
| `nottinghamshire/notts_2024_03.csv` | 1.3MB | `f645d20061ac069a…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/nottinghamshire_notts_2024_03.csv) |

**Total**: 12 files, 15.8MB

### Redbridge

**Live source**: [https://data.redbridge.gov.uk/View/finance/payments-over-500-2023-24](https://data.redbridge.gov.uk/View/finance/payments-over-500-2023-24)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: London Borough of Redbridge — Payments Over £500 (data.redbridge.gov.uk)  

**Raw files** (12):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `redbridge/2023_04.csv` | 6.7MB | `1aa9b0455bea32f6…` |
| `redbridge/2023_05.csv` | 8.0MB | `7fa61bfb8d4d54f3…` |
| `redbridge/2023_06.csv` | 7.4MB | `c856d06b7cea881d…` |
| `redbridge/2023_07.csv` | 11.5MB | `65cf4f68f8259787…` |
| `redbridge/2023_08.csv` | 8.6MB | `2c482839ffbaef21…` |
| `redbridge/2023_09.csv` | 8.9MB | `134606b8bed7cd02…` |
| `redbridge/2023_10.csv` | 9.8MB | `1de03741465ad9aa…` |
| `redbridge/2023_11.csv` | 14.8MB | `1f745e581c66849b…` |
| `redbridge/2023_12.csv` | 8.6MB | `c2b5c7e716ab1e94…` |
| `redbridge/2024_01.csv` | 12.5MB | `ca2cb1fbc278d9a7…` |
| `redbridge/2024_02.csv` | 8.8MB | `106e28c48df05352…` |
| `redbridge/2024_03.csv` | 9.0MB | `db530cb7eb56a800…` |

**Total**: 12 files, 114.6MB

### Richmond

**Live source**: [https://www.richmond.gov.uk/council_payments_to_suppliers](https://www.richmond.gov.uk/council_payments_to_suppliers)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: London Borough of Richmond upon Thames — Council Payments to Suppliers (richmond.gov.uk)  

**Raw files** (13):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `richmond/2023_04.csv` | 200.3KB | `9c15de6b9fd5e615…` |
| `richmond/2023_05.csv` | 241.0KB | `f69ee22f5916a1a5…` |
| `richmond/2023_06.csv` | 235.8KB | `5bfe873405cf8b30…` |
| `richmond/2023_07.csv` | 202.5KB | `499822a1da6cbfed…` |
| `richmond/2023_07.xlsx` | 100.8KB | `dad20f5fdbd02743…` |
| `richmond/2023_08.csv` | 215.0KB | `35b9fd9b86803cb1…` |
| `richmond/2023_09.csv` | 254.6KB | `fd0ae881ae977d4e…` |
| `richmond/2023_10.csv` | 247.0KB | `e6f6dd2e43fb51b4…` |
| `richmond/2023_11.csv` | 228.9KB | `4ce06d21d09e40b9…` |
| `richmond/2023_12.csv` | 204.8KB | `34feee11c97643d9…` |
| `richmond/2024_01.csv` | 223.4KB | `4b4e0687e5cb4131…` |
| `richmond/2024_02.csv` | 228.0KB | `a1f60711aaa4ba98…` |
| `richmond/2024_03.csv` | 257.7KB | `d32536b0148cb176…` |

**Total**: 13 files, 2.8MB

### Rochdale

**Live source**: [https://www.rochdale.gov.uk/council/council-spending/Pages/payments-to-suppliers.aspx](https://www.rochdale.gov.uk/council/council-spending/Pages/payments-to-suppliers.aspx)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: Rochdale Borough Council Open Data (Spend Over £500)  

**Raw files** (12):

| File | Size | SHA256 (first 16) | archive.org mirror |
|---|---|---|---|
| `rochdale/2023_APR_Spend.csv` | 2.9MB | `b1282e1525971c1d…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/rochdale_2023_APR_Spend.csv) |
| `rochdale/2023_AUG_Spend.csv` | 2.4MB | `d84055b6b5ac8f3e…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/rochdale_2023_AUG_Spend.csv) |
| `rochdale/2023_DEC_Spend.csv` | 3.9MB | `a63016324274284a…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/rochdale_2023_DEC_Spend.csv) |
| `rochdale/2023_JUL_Spend.csv` | 2.7MB | `2a71fe639cda8fcf…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/rochdale_2023_JUL_Spend.csv) |
| `rochdale/2023_JUN_Spend.csv` | 3.7MB | `38c61e4efb4ec351…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/rochdale_2023_JUN_Spend.csv) |
| `rochdale/2023_MAY_Spend.csv` | 3.3MB | `7fe28f5a89e94250…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/rochdale_2023_MAY_Spend.csv) |
| `rochdale/2023_NOV_Spend.csv` | 3.2MB | `54bf902e29d44048…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/rochdale_2023_NOV_Spend.csv) |
| `rochdale/2023_OCT_Spend.csv` | 3.8MB | `468de1cf40ccaa6f…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/rochdale_2023_OCT_Spend.csv) |
| `rochdale/2023_SEP_Spend.csv` | 2.1MB | `acd2e7fdc4980de2…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/rochdale_2023_SEP_Spend.csv) |
| `rochdale/2024_FEB_Spend.csv` | 3.2MB | `8bbffd397f2354d3…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/rochdale_2024_FEB_Spend.csv) |
| `rochdale/2024_JAN_Spend.csv` | 2.9MB | `bee45f990a39a9c0…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/rochdale_2024_JAN_Spend.csv) |
| `rochdale/2024_MAR_Spend.csv` | 3.5MB | `45d42200556c1bf5…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/rochdale_2024_MAR_Spend.csv) |

**Total**: 12 files, 37.6MB

### Sheffield

**Live source**: [https://www.sheffield.gov.uk/your-city-council/spending-and-performance/payments-suppliers-over-250](https://www.sheffield.gov.uk/your-city-council/spending-and-performance/payments-suppliers-over-250)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: Sheffield City Council Spend Over £250 (Data Mill North)  

**Raw files** (12):

| File | Size | SHA256 (first 16) | archive.org mirror |
|---|---|---|---|
| `sheffield/sheffield_2023_04.csv` | 6.2MB | `4be7a6599b6c6c50…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/sheffield_sheffield_2023_04.csv) |
| `sheffield/sheffield_2023_05.csv` | 6.3MB | `81ececb43df351c6…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/sheffield_sheffield_2023_05.csv) |
| `sheffield/sheffield_2023_06.csv` | 6.5MB | `8437d9dd51a967c5…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/sheffield_sheffield_2023_06.csv) |
| `sheffield/sheffield_2023_07.csv` | 6.2MB | `bc4a4a0f6ea5030b…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/sheffield_sheffield_2023_07.csv) |
| `sheffield/sheffield_2023_08.csv` | 7.3MB | `94182a4c71f01e03…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/sheffield_sheffield_2023_08.csv) |
| `sheffield/sheffield_2023_09.csv` | 6.0MB | `b62d5dc477c72ec7…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/sheffield_sheffield_2023_09.csv) |
| `sheffield/sheffield_2023_10.csv` | 6.4MB | `8c4f919d9a6d6d01…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/sheffield_sheffield_2023_10.csv) |
| `sheffield/sheffield_2023_11.csv` | 6.1MB | `432450644c6aae1f…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/sheffield_sheffield_2023_11.csv) |
| `sheffield/sheffield_2023_12.csv` | 5.5MB | `c5769c9d90de134a…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/sheffield_sheffield_2023_12.csv) |
| `sheffield/sheffield_2024_01.csv` | 7.2MB | `64e714504742aff8…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/sheffield_sheffield_2024_01.csv) |
| `sheffield/sheffield_2024_02.csv` | 5.3MB | `868b771a24038fda…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/sheffield_sheffield_2024_02.csv) |
| `sheffield/sheffield_2024_03.csv` | 7.2MB | `a117b5ff9509281e…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/sheffield_sheffield_2024_03.csv) |

**Total**: 12 files, 76.3MB

### South Gloucestershire

**Live source**: [https://www.southglos.gov.uk/council-and-democracy/council-budgets-and-spending/payments-to-suppliers/](https://www.southglos.gov.uk/council-and-democracy/council-budgets-and-spending/payments-to-suppliers/)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: South Gloucestershire Council Spend Over £500 (southglos.gov.uk)  

**Raw files** (12):

| File | Size | SHA256 (first 16) | archive.org mirror |
|---|---|---|---|
| `south_glos/sglos_2023_04.csv` | 969.7KB | `24034a7fbb1faa4d…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/south_gloucestershire_sglos_2023_04.csv) |
| `south_glos/sglos_2023_05.csv` | 1.2MB | `0c70be17ea9b4a18…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/south_gloucestershire_sglos_2023_05.csv) |
| `south_glos/sglos_2023_06.csv` | 991.5KB | `417b346b2e30e433…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/south_gloucestershire_sglos_2023_06.csv) |
| `south_glos/sglos_2023_07.csv` | 885.5KB | `6ccd9ce66c3a9910…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/south_gloucestershire_sglos_2023_07.csv) |
| `south_glos/sglos_2023_08.csv` | 1.0MB | `f9474daed6d58e38…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/south_gloucestershire_sglos_2023_08.csv) |
| `south_glos/sglos_2023_09.csv` | 1.1MB | `6aa282830dd00f1f…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/south_gloucestershire_sglos_2023_09.csv) |
| `south_glos/sglos_2023_10.csv` | 1.0MB | `d72f5dba05eac3e2…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/south_gloucestershire_sglos_2023_10.csv) |
| `south_glos/sglos_2023_11.csv` | 1013.3KB | `d3c47114c8314b81…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/south_gloucestershire_sglos_2023_11.csv) |
| `south_glos/sglos_2023_12.csv` | 1.0MB | `c88115d11a84f7bd…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/south_gloucestershire_sglos_2023_12.csv) |
| `south_glos/sglos_2024_01.csv` | 1.1MB | `9a0f12d67916e04a…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/south_gloucestershire_sglos_2024_01.csv) |
| `south_glos/sglos_2024_02.csv` | 932.7KB | `bfc3757d20d7b51b…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/south_gloucestershire_sglos_2024_02.csv) |
| `south_glos/sglos_2024_03.csv` | 1.5MB | `c1a15682c0b375a2…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/south_gloucestershire_sglos_2024_03.csv) |

**Total**: 12 files, 12.6MB

### Southwark

**Live source**: [https://www.southwark.gov.uk/council-and-democracy/transparency/how-we-spend-our-money/payments-to-suppliers](https://www.southwark.gov.uk/council-and-democracy/transparency/how-we-spend-our-money/payments-to-suppliers)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: Southwark Council Spend Over £250 (southwark.gov.uk)  

**Raw files** (24):

| File | Size | SHA256 (first 16) | archive.org mirror |
|---|---|---|---|
| `southwark/southwark_2023_04.csv` | 1.2MB | `0b3547263550cdba…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/southwark_southwark_2023_04.csv) |
| `southwark/southwark_2023_04.xlsx` | 546.9KB | `bcb74968a265a531…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/southwark_southwark_2023_04.xlsx) |
| `southwark/southwark_2023_05.csv` | 1.1MB | `c294522dcbe0a71c…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/southwark_southwark_2023_05.csv) |
| `southwark/southwark_2023_05.xlsx` | 562.5KB | `d921b6ca058cf67a…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/southwark_southwark_2023_05.xlsx) |
| `southwark/southwark_2023_06.csv` | 1.5MB | `a1ccd523ff8c71cf…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/southwark_southwark_2023_06.csv) |
| `southwark/southwark_2023_06.xlsx` | 608.0KB | `0e21df53d0bccd5f…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/southwark_southwark_2023_06.xlsx) |
| `southwark/southwark_2023_07.csv` | 1.3MB | `abb43d16423f1c9a…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/southwark_southwark_2023_07.csv) |
| `southwark/southwark_2023_07.xlsx` | 548.8KB | `2c19288871da4bd1…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/southwark_southwark_2023_07.xlsx) |
| `southwark/southwark_2023_08.csv` | 1.3MB | `0c96c7650abafe14…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/southwark_southwark_2023_08.csv) |
| `southwark/southwark_2023_08.xlsx` | 564.3KB | `494e22ace43c4a0f…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/southwark_southwark_2023_08.xlsx) |
| `southwark/southwark_2023_09.csv` | 1.5MB | `4988ee400ce66ded…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/southwark_southwark_2023_09.csv) |
| `southwark/southwark_2023_09.xlsx` | 623.1KB | `363abe5c7e9411fa…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/southwark_southwark_2023_09.xlsx) |
| `southwark/southwark_2023_10.csv` | 1.3MB | `1d4a794835cabde7…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/southwark_southwark_2023_10.csv) |
| `southwark/southwark_2023_10.xlsx` | 1.3MB | `e8ff6fa24c428d7a…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/southwark_southwark_2023_10.xlsx) |
| `southwark/southwark_2023_11.csv` | 1.4MB | `8c5c0012f97187c0…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/southwark_southwark_2023_11.csv) |
| `southwark/southwark_2023_11.xlsx` | 1.3MB | `cb404ee8592cfab6…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/southwark_southwark_2023_11.xlsx) |
| `southwark/southwark_2023_12.csv` | 1.2MB | `ca42ac86ddef8103…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/southwark_southwark_2023_12.csv) |
| `southwark/southwark_2023_12.xlsx` | 1.3MB | `fa8564f77a02df33…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/southwark_southwark_2023_12.xlsx) |
| `southwark/southwark_2024_01.csv` | 857.9KB | `18f78ad044ce8149…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/southwark_southwark_2024_01.csv) |
| `southwark/southwark_2024_01.xlsx` | 1.6MB | `747ca7b7008a90e9…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/southwark_southwark_2024_01.xlsx) |
| `southwark/southwark_2024_02.csv` | 1.5MB | `88fb606028ff869e…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/southwark_southwark_2024_02.csv) |
| `southwark/southwark_2024_02.xlsx` | 1.4MB | `e2448a84e9801808…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/southwark_southwark_2024_02.xlsx) |
| `southwark/southwark_2024_03.csv` | 1.4MB | `f454c37369f82f4b…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/southwark_southwark_2024_03.csv) |
| `southwark/southwark_2024_03.xlsx` | 1.3MB | `378b9d258e235b67…` | [mirror](https://archive.org/download/budget-galaxy-uk-councils-2024/southwark_southwark_2024_03.xlsx) |

**Total**: 24 files, 27.1MB

### Staffordshire

**Live source**: [https://www.staffordshire.gov.uk/council-and-democracy/transparency/expenditure-exceeding-ps500/20232024](https://www.staffordshire.gov.uk/council-and-democracy/transparency/expenditure-exceeding-ps500/20232024)  
**Wayback archive**: [(none)](#)  
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

**Live source**: [https://www.surreyi.gov.uk/dataset/council-spending](https://www.surreyi.gov.uk/dataset/council-spending)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24 (Q3+Q4 only, 6 of 12 months)  
**Publisher description**: Surrey County Council Transparency (surreyi.gov.uk, Oct 2023 – Mar 2024 via Playwright; Apr-Sep 2023 deleted from upstream rolling window)  

**Raw files** (2):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `surrey/q3_oct_dec_2023.csv` | 6.7MB | `5993e9788e6d1942…` |
| `surrey/q4_jan_mar_2024.csv` | 7.8MB | `c37a04092a7112dd…` |

**Total**: 2 files, 14.5MB

### Sutton

**Live source**: [https://www.sutton.gov.uk/web/guest/w/local-government-transparency-code](https://www.sutton.gov.uk/web/guest/w/local-government-transparency-code)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24 (11/12 months, Sep 2023 gap)  
**Publisher description**: London Borough of Sutton — Payments over £500 (sutton.gov.uk, Liferay DMS, Sep 2023 missing from source)  

**Raw files** (11):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `sutton/2023_04.csv` | 687.1KB | `b013d8a56d3f5591…` |
| `sutton/2023_05.csv` | 871.9KB | `84afa6ae8e77b4a4…` |
| `sutton/2023_06.csv` | 859.3KB | `7d34396993e53f83…` |
| `sutton/2023_07.csv` | 776.0KB | `1ca02cbe204a7dfb…` |
| `sutton/2023_08.csv` | 750.9KB | `2ed9c8a590af8743…` |
| `sutton/2023_10.csv` | 781.4KB | `dec7b945550ecde7…` |
| `sutton/2023_11.csv` | 839.6KB | `77723f5f7ea3be3c…` |
| `sutton/2023_12.csv` | 826.1KB | `fb229f1b29284844…` |
| `sutton/2024_01.csv` | 808.4KB | `e1adab988df8202e…` |
| `sutton/2024_02.csv` | 822.7KB | `ed62581cc7dbe8b8…` |
| `sutton/2024_03.csv` | 1.3MB | `df9acfa29732fb20…` |

**Total**: 11 files, 9.2MB

### Tower Hamlets

**Live source**: [https://www.towerhamlets.gov.uk/lgnl/council_and_democracy/transparency/payments_to_suppliers.aspx](https://www.towerhamlets.gov.uk/lgnl/council_and_democracy/transparency/payments_to_suppliers.aspx)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: London Borough of Tower Hamlets — 250 Spend (towerhamlets.gov.uk, filtered to £500+)  

**Raw files** (12):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `tower_hamlets/2023_04.csv` | 919.9KB | `55bbefcbab8f9554…` |
| `tower_hamlets/2023_05.csv` | 842.1KB | `39e35c13ba6e0d3e…` |
| `tower_hamlets/2023_06.csv` | 866.6KB | `580cbc91b44e0d1d…` |
| `tower_hamlets/2023_07.csv` | 878.8KB | `74dabc3532310b74…` |
| `tower_hamlets/2023_08.csv` | 835.0KB | `756eb7debb59fe40…` |
| `tower_hamlets/2023_09.csv` | 878.7KB | `2da827353e4063be…` |
| `tower_hamlets/2023_10.csv` | 955.1KB | `ddcf35fc3323c10a…` |
| `tower_hamlets/2023_11.csv` | 944.4KB | `d9d61c5ec8134cdf…` |
| `tower_hamlets/2023_12.csv` | 1.0MB | `e3ca81e11986c651…` |
| `tower_hamlets/2024_01.csv` | 906.8KB | `65c9442f55fa9ec2…` |
| `tower_hamlets/2024_02.csv` | 1006.6KB | `50a5092c368e384b…` |
| `tower_hamlets/2024_03.csv` | 1.3MB | `d12b28b6d1c9d219…` |

**Total**: 12 files, 11.2MB

### Waltham Forest

**Live source**: [https://www.walthamforest.gov.uk/council-and-elections/about-us/council-budgets-and-spending/council-transparency/spending-and-procurement-information/council-spending-above-ps500](https://www.walthamforest.gov.uk/council-and-elections/about-us/council-budgets-and-spending/council-transparency/spending-and-procurement-information/council-spending-above-ps500)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24 (7/12 months, Apr-Aug 2023 purged by rolling window)  
**Publisher description**: London Borough of Waltham Forest — Council Spending above £500 (walthamforest.gov.uk)  

**Raw files** (14):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `waltham_forest/2023_09.csv` | 149.9KB | `76f35518bafbf557…` |
| `waltham_forest/2023_09.xlsx` | 72.5KB | `23b8f9641c51b45f…` |
| `waltham_forest/2023_10.csv` | 155.4KB | `704cffddd8e164ec…` |
| `waltham_forest/2023_10.xlsx` | 76.3KB | `0e91487169f7f6b5…` |
| `waltham_forest/2023_11.csv` | 160.9KB | `95e19a44eaeb1d92…` |
| `waltham_forest/2023_11.xlsx` | 76.8KB | `c762d6f935c7b6e3…` |
| `waltham_forest/2023_12.csv` | 184.5KB | `df109c6217e56d2c…` |
| `waltham_forest/2023_12.xlsx` | 86.5KB | `52118809de6c9db4…` |
| `waltham_forest/2024_01.csv` | 187.8KB | `ead9c21567d07c7b…` |
| `waltham_forest/2024_01.xlsx` | 88.2KB | `0bb07571b31d0f4d…` |
| `waltham_forest/2024_02.csv` | 198.1KB | `0e089b9ce25f44df…` |
| `waltham_forest/2024_02.xlsx` | 95.6KB | `6958faa9db434841…` |
| `waltham_forest/2024_03.csv` | 273.8KB | `d4f2329300790071…` |
| `waltham_forest/2024_03.xlsx` | 117.1KB | `bce8c32559bc8192…` |

**Total**: 14 files, 1.9MB

### Wandsworth

**Live source**: [https://www.wandsworth.gov.uk/the-council/how-the-council-works/council-finances/council-expenditure/](https://www.wandsworth.gov.uk/the-council/how-the-council-works/council-finances/council-expenditure/)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: London Borough of Wandsworth — Council Expenditure (wandsworth.gov.uk)  

**Raw files** (12):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `wandsworth/2023_04.csv` | 339.2KB | `6bb5091fef7d8711…` |
| `wandsworth/2023_05.csv` | 415.8KB | `62b37eff7274c922…` |
| `wandsworth/2023_06.csv` | 372.8KB | `73b3d0c618449616…` |
| `wandsworth/2023_07.csv` | 363.4KB | `0caaba37f1815138…` |
| `wandsworth/2023_08.csv` | 432.3KB | `218b71dc76a5426f…` |
| `wandsworth/2023_09.csv` | 390.0KB | `11fb6b22430d7222…` |
| `wandsworth/2023_10.csv` | 400.8KB | `03d4e09fa035c9c3…` |
| `wandsworth/2023_11.csv` | 418.0KB | `b9e0cfd5ca938fd1…` |
| `wandsworth/2023_12.csv` | 389.8KB | `4e36ad4cd2a528fd…` |
| `wandsworth/2024_01.csv` | 395.1KB | `e1154cebf832a2d0…` |
| `wandsworth/2024_02.csv` | 370.2KB | `9be92f46021f02d8…` |
| `wandsworth/2024_03.csv` | 437.2KB | `b3efb921ac403787…` |

**Total**: 12 files, 4.6MB

### West Sussex

**Live source**: [https://www.westsussex.gov.uk/about-the-council/how-the-council-works/council-spending/](https://www.westsussex.gov.uk/about-the-council/how-the-council-works/council-spending/)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: West Sussex CC Spend Data (westsussex.gov.uk)  

**Raw files** (2):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `west_sussex/wscc_spend_2023_24.csv` | 41.7MB | `4786cde0f714bb37…` |
| `west_sussex/wscc_spend_2023_24.xlsx` | 9.8MB | `ffba1e1602a6b2d5…` |

**Total**: 2 files, 51.5MB

### Westminster

**Live source**: [https://www.westminster.gov.uk/about-council/transparency/spending-procurement-and-data-transparency/202324](https://www.westminster.gov.uk/about-council/transparency/spending-procurement-and-data-transparency/202324)  
**Wayback archive**: [(none)](#)  
**Financial year**: 2023/24  
**Publisher description**: Westminster City Council — Expenditure Over £500 quarterly (westminster.gov.uk)  

**Raw files** (4):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `westminster/q1_2023_24.csv` | 1.7MB | `9ac77c6092602e4e…` |
| `westminster/q2_2023_24.csv` | 1.8MB | `b41f7cefee041bac…` |
| `westminster/q3_2023_24.csv` | 1.8MB | `e3791b8b2445adb2…` |
| `westminster/q4_2023_24.csv` | 1.9MB | `49cede1c783c9a67…` |

**Total**: 4 files, 7.2MB

### Greater London Authority

The GLA subsystem is a synthetic entry that aggregates four independent publishers, each mapping to different service buckets under `Other Authorities > Greater London Authority` in the tree:

#### London Fire Brigade (LFB)

**Maps to**: Greater London Authority > Fire & Rescue  
**Live source**: [https://www.london-fire.gov.uk/about-us/structure-governance-and-accountability/lfc-spending-over-250/](https://www.london-fire.gov.uk/about-us/structure-governance-and-accountability/lfc-spending-over-250/)  

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

**Raw files** (1):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `gla_core/consolidated_p1_p13_2023_24.csv` | 2.6MB | `8a7b56c9c54cca78…` |

**Total**: 1 files, 2.6MB

#### Metropolitan Police Service (MPS)

**Maps to**: Greater London Authority > Police  
**Live source**: [https://www.met.police.uk/foi-ai/af/accessing-information/published-items/?q=mopac%20mps%20expenditure](https://www.met.police.uk/foi-ai/af/accessing-information/published-items/?q=mopac%20mps%20expenditure)  

**Raw files** (2):

| File | Size | SHA256 (first 16) |
|---|---|---|
| `mps/mps_sep2023_mar2024.xlsx` | 1.6MB | `e879024236ca7066…` |
| `mps/sep23_mar24.csv` | 2.7MB | `4717f03053159b05…` |

**Total**: 2 files, 4.3MB

## Summary

- **Entities**: 60 (59 councils + GLA subsystem)
- **Raw files**: 686
- **Total size**: 1646.9MB
- **Coverage**: 35.6% of UK Local Government England (£46.8B of £131.6B) as of 2026-04-14

---

_This manifest is regenerated by `scripts/generate_sources_md.js` after every council addition. See "How to verify a file in 60 seconds" near the top of this document for the verification protocol._
