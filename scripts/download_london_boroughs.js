#!/usr/bin/env node
/**
 * download_london_boroughs.js
 *
 * Bulk downloader for London borough FY 2023/24 spend-over-£500 data.
 * Each borough has its own config with URL patterns extracted from
 * discovery reports. Runs serial to avoid overwhelming council sites.
 *
 * Usage:
 *   node scripts/download_london_boroughs.js [--only borough1,borough2]
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

const SPEND_DIR = path.join(__dirname, '..', 'data', 'uk', 'local_authorities', 'spend');

// Per-borough config. Each has:
//   dir: subdirectory name
//   files: array of [filename, url] OR
//   download: function(dir) => Promise<{ok, fail}>
const BOROUGHS = {

  // ── Batch 1 greens ───────────────────────────────────────

  'city_of_london': {
    dir: 'city_of_london',
    files: monthlyRange('04-2023', '03-2024', (mm, yyyy) =>
      [`${yyyy}_${mm}.xlsx`,
       `https://www.cityoflondon.gov.uk/assets/about-us/budget-and-spending/local-authority-expenditure-xlsx-${mm}-${yyyy}.xlsx`])
  },

  // ── Batch 2 greens ───────────────────────────────────────

  'havering': {
    dir: 'havering',
    files: [
      ['2023_04.csv', 'https://www.havering.gov.uk/downloads/file/6203/april-2023'],
      ['2023_05.csv', 'https://www.havering.gov.uk/downloads/file/6210/may-2023'],
      ['2023_06.csv', 'https://www.havering.gov.uk/downloads/file/6310/june-2023'],
      ['2023_07.csv', 'https://www.havering.gov.uk/downloads/file/6345/july-2023'],
      ['2023_08.csv', 'https://www.havering.gov.uk/downloads/file/6349/august-2023'],
      ['2023_09.csv', 'https://www.havering.gov.uk/downloads/file/6464/september-2023'],
      ['2023_10.csv', 'https://www.havering.gov.uk/downloads/file/6482/october-2023'],
      ['2023_11.csv', 'https://www.havering.gov.uk/downloads/file/6502/november-2023'],
      ['2023_12.csv', 'https://www.havering.gov.uk/downloads/file/6520/december-2023'],
      ['2024_01.csv', 'https://www.havering.gov.uk/downloads/file/6571/january-2024'],
      ['2024_02.csv', 'https://www.havering.gov.uk/downloads/file/6576/february-2024'],
      ['2024_03.csv', 'https://www.havering.gov.uk/downloads/file/6610/march-2024']
    ]
  },

  'greenwich': {
    dir: 'greenwich',
    files: [
      ['q1_apr_jun_2023.xlsx', 'https://www.royalgreenwich.gov.uk/sites/default/files/2025-12/Greater_than___500_Qtr_1_Apr_to_Jun_23_24_Final_for_Publishing.xlsx'],
      ['q2_jul_sep_2023.xlsx', 'https://www.royalgreenwich.gov.uk/sites/default/files/2025-12/Greater_than___500_Qtr_2_Jul_to_Sept_23_24_Final_for_Publishing.xlsx'],
      ['q3_oct_dec_2023.xlsx', 'https://www.royalgreenwich.gov.uk/sites/default/files/2025-12/Greater_than___500_Qtr_3_Oct_to_Dec_23_24_Final_for_Publishing.xlsx'],
      ['q4_jan_mar_2024.xlsx', 'https://www.royalgreenwich.gov.uk/sites/default/files/2025-12/Greater_than___500_Qtr_4_Jan_to_Mar_23_24.xlsx']
    ]
  },

  'haringey': {
    dir: 'haringey',
    files: [
      ['q1_apr_jun_2023.csv', 'https://www.haringey.gov.uk/sites/default/files/2024-07/council_expenditure_q1_23-24.csv'],
      ['q2_jul_sep_2023.csv', 'https://www.haringey.gov.uk/sites/default/files/2024-07/council_expenditure_q2_23-24.csv'],
      ['q3_oct_dec_2023.csv', 'https://www.haringey.gov.uk/sites/default/files/2024-07/council_expenditure_q3_23-24.csv'],
      ['q4_jan_mar_2024.csv', 'https://www.haringey.gov.uk/sites/default/files/2024-07/council_expenditure_q4_23-24.csv']
    ]
  },

  'harrow': {
    dir: 'harrow',
    files: [
      ['q1_apr_jun_2023.xlsx', 'https://www.harrow.gov.uk/downloads/file/31803/council-budget-and-spending-report-apr-to-jun-2023-final-xls-'],
      ['q2_jul_sep_2023.xlsx', 'https://www.harrow.gov.uk/downloads/file/31969/council-budget-and-spending-report-for-july-to-september-2023-xls-'],
      ['q3_oct_dec_2023.xlsx', 'https://www.harrow.gov.uk/downloads/file/32079/council-spend-september-december-2023-xls-'],
      ['q4_jan_mar_2024.xlsx', 'https://www.harrow.gov.uk/downloads/file/32231/council-spend-january-march-2024-xls-']
    ]
  },

  // ── Batch 4 greens ───────────────────────────────────────

  'westminster': {
    dir: 'westminster',
    files: [
      ['q1_2023_24.csv', 'https://www.westminster.gov.uk/media/document/q1-2023-24---expenditure-over-%C2%A3500'],
      ['q2_2023_24.csv', 'https://www.westminster.gov.uk/media/document/q2-2023-24---expenditure-over-%C2%A3500'],
      ['q3_2023_24.csv', 'https://www.westminster.gov.uk/media/document/q3-2023-24---expenditure-over-%C2%A3500'],
      ['q4_2023_24.csv', 'https://www.westminster.gov.uk/media/document/q4-2023-24---expenditure-over-%C2%A3500-report']
    ]
  },

  // ── Barking and Dagenham (report month = upload month +1) ──
  'barking_dagenham': {
    dir: 'barking_dagenham',
    files: [
      ['2023_04.csv', 'https://www.lbbd.gov.uk/sites/default/files/2023-05/Amounts%20paid%20April%202023%20%28CSV%29.csv'],
      ['2023_05.csv', 'https://www.lbbd.gov.uk/sites/default/files/2023-06/Amounts%20paid%20May%202023%20%28CSV%29.csv'],
      ['2023_06.csv', 'https://www.lbbd.gov.uk/sites/default/files/2023-07/Amounts%20paid%20June%202023%20%28CSV%29.csv'],
      ['2023_07.csv', 'https://www.lbbd.gov.uk/sites/default/files/2023-08/Amounts%20paid%20July%202023%20%28CSV%29.csv'],
      ['2023_08.csv', 'https://www.lbbd.gov.uk/sites/default/files/2023-09/Amounts%20paid%20August%202023%20%28CSV%29.csv'],
      ['2023_09.csv', 'https://www.lbbd.gov.uk/sites/default/files/2023-10/Amounts%20paid%20September%202023%20%28CSV%29.csv'],
      ['2023_10.csv', 'https://www.lbbd.gov.uk/sites/default/files/2023-11/Amounts%20paid%20October%202023%20%28CSV%29.csv'],
      ['2023_11.csv', 'https://www.lbbd.gov.uk/sites/default/files/2023-12/Amounts%20paid%20November%202023%20%28CSV%29.csv'],
      ['2023_12.csv', 'https://www.lbbd.gov.uk/sites/default/files/2024-01/Amounts%20paid%20December%202023%20%28CSV%29.csv'],
      ['2024_01.csv', 'https://www.lbbd.gov.uk/sites/default/files/2024-02/Amounts%20paid%20January%202024%20%28CSV%29.csv'],
      ['2024_02.csv', 'https://www.lbbd.gov.uk/sites/default/files/2024-03/Amounts%20paid%20February%202024%20%28CSV%29.csv'],
      ['2024_03.csv', 'https://www.lbbd.gov.uk/sites/default/files/2024-04/Amounts%20paid%20-%20March%202024%20%28CSV%29.csv']
    ]
  },

  // ── Bexley (12 irregular folders, hardcoded) ──
  'bexley': {
    dir: 'bexley',
    files: [
      ['2023_04.csv', 'https://www.bexley.gov.uk/sites/default/files/2023-06/april-2023.csv'],
      ['2023_05.csv', 'https://www.bexley.gov.uk/sites/default/files/2023-06/May-23-v2.csv'],
      ['2023_06.csv', 'https://www.bexley.gov.uk/sites/default/files/2023-07/june-2023.csv'],
      ['2023_07.csv', 'https://www.bexley.gov.uk/sites/default/files/2023-10/july-2023.csv'],
      ['2023_08.csv', 'https://www.bexley.gov.uk/sites/default/files/2023-11/aug-2023.csv'],
      ['2023_09.csv', 'https://www.bexley.gov.uk/sites/default/files/2023-11/sept-2023.csv'],
      ['2023_10.csv', 'https://www.bexley.gov.uk/sites/default/files/2024-01/oct-2023.csv'],
      ['2023_11.csv', 'https://www.bexley.gov.uk/sites/default/files/2024-03/nov-2023.csv'],
      ['2023_12.csv', 'https://www.bexley.gov.uk/sites/default/files/2024-03/dec-2023.csv'],
      ['2024_01.csv', 'https://www.bexley.gov.uk/sites/default/files/2024-04/january-2024.csv'],
      ['2024_02.csv', 'https://www.bexley.gov.uk/sites/default/files/2024-05/February-2024.csv'],
      ['2024_03.csv', 'https://www.bexley.gov.uk/sites/default/files/2024-05/march-2024.csv']
    ]
  },

  // ── Islington (4 quarterly CSVs) ──
  'islington': {
    dir: 'islington',
    files: [
      ['q1_mar_jun_2023.csv', 'https://www.islington.gov.uk/~/media/sharepoint-lists/public-records/finance/financialmanagement/expenditure/20232024/expenditure-for-march-2023-through-to-june-2023.csv'],
      ['q2_jul_sep_2023.csv', 'https://www.islington.gov.uk/~/media/sharepoint-lists/public-records/finance/financialmanagement/expenditure/20232024/expenditure-for-july-2023-through-to-september-2023.csv'],
      ['q3_oct_dec_2023.csv', 'https://www.islington.gov.uk/~/media/sharepoint-lists/public-records/finance/financialmanagement/expenditure/20232024/expenditure-report-for-october-2023-through-to-december-2023.csv'],
      ['q4_jan_mar_2024.csv', 'https://www.islington.gov.uk/~/media/sharepoint-lists/public-records/finance/financialmanagement/expenditure/20232024/expenditure-for-january-through-to-march-2024.csv']
    ]
  },

  // ── Kensington and Chelsea (calendar quarters, 4 files) ──
  'rbkc': {
    dir: 'rbkc',
    files: [
      ['q2_2023_cal_apr_jun.csv', 'https://www.rbkc.gov.uk/media/document/quarter-two-2023'],
      ['q3_2023_cal_jul_sep.csv', 'https://www.rbkc.gov.uk/media/document/quarter-three-2023'],
      ['q4_2023_cal_oct_dec.csv', 'https://www.rbkc.gov.uk/media/document/quarter-four-2023'],
      ['q1_2024_cal_jan_mar.csv', 'https://www.rbkc.gov.uk/media/document/quarter-one-2024']
    ]
  },

  // ── Barnet (CKAN API slugs, 12 monthly) ──
  'barnet': {
    dir: 'barnet',
    files: [
      ['2023_04.csv', 'https://open.barnet.gov.uk/download/2331d/dsv/Expenditure%20Report%20April%202023.csv'],
      ['2023_05.csv', 'https://open.barnet.gov.uk/download/2331d/w65/Expenditure%20Report%20May%202023.csv'],
      ['2023_06.csv', 'https://open.barnet.gov.uk/download/2331d/jzm/Expenditure%20Report%20June%202023.csv'],
      ['2023_07.csv', 'https://open.barnet.gov.uk/download/2331d/3n7/Expenditure%20Report%20July%202023.csv'],
      ['2023_08.csv', 'https://open.barnet.gov.uk/download/2331d/1lp/Expenditure%20Report%20August%202023.csv'],
      ['2023_09.csv', 'https://open.barnet.gov.uk/download/2331d/579/Expenditure%20Report%20September%202023.csv'],
      ['2023_10.csv', 'https://open.barnet.gov.uk/download/2331d/jdx/Expenditure%20Report%20October%202023.csv'],
      ['2023_11.csv', 'https://open.barnet.gov.uk/download/2331d/bc8/Expenditure%20Report%20November%202023.csv'],
      ['2023_12.csv', 'https://open.barnet.gov.uk/download/2331d/qjn/Expenditure%20Report%20December%202023.csv'],
      ['2024_01.csv', 'https://open.barnet.gov.uk/download/2331d/lml/Expenditure%20Report%20January%202024.csv'],
      ['2024_02.csv', 'https://open.barnet.gov.uk/download/2331d/yhv/Expenditure%20Report%20February%202024.csv'],
      ['2024_03.csv', 'https://open.barnet.gov.uk/download/2331d/n9b/Expenditure%20Report%20March%202024.csv']
    ]
  },

  // ── Brent (5 quarterly files spanning FY23/24 — boundary dedup needed for Mar files) ──
  'brent': {
    dir: 'brent',
    files: [
      ['mar_may_2023.csv', 'https://data.brent.gov.uk/download/vq756/d90/Transparency%20report%20Mar%202023%20-%20May%202023.csv'],
      ['jun_aug_2023.csv', 'https://data.brent.gov.uk/download/vq756/wqg/Transparency%20Report%20Jun%202023%20-%20Aug%202023.csv'],
      ['sep_nov_2023.csv', 'https://data.brent.gov.uk/download/vq756/fx1/Transparency%20Report%20Sep%202023%20-%20Nov%202023.csv'],
      ['dec_feb_2024.csv', 'https://data.brent.gov.uk/download/vq756/7tl/Transparency%20Report%20Dec%202023%20-%20Feb%202024.csv'],
      ['mar_may_2024.csv', 'https://data.brent.gov.uk/download/vq756/tnx/Transparency%20report%20Mar%202024%20%E2%80%93%20May%202024.csv']
    ]
  },

  // ── Hounslow (Datopian blob, 12 monthly with unique hashes) ──
  'hounslow': {
    dir: 'hounslow',
    files: [
      ['2023_04.csv', 'https://blob.datopian.com/resources/244a08509da8ff361af74960ecc0d61c5fbae369e749505cee6513b8940bed2e/invoices-over-500-april-2023.csv'],
      ['2023_05.csv', 'https://blob.datopian.com/resources/a51ac6e327073670458a0e48ead133f7de582f70cd91a131a2fec40ac18c7242/invoices-over-500-may-2023.csv'],
      ['2023_06.csv', 'https://blob.datopian.com/resources/d46e8f70f24f3bdc9790a0f189ead6e2cf7820fbccddf9b8258d7d4c63b587e8/invoices-over-500-june-2023.csv'],
      ['2023_07.csv', 'https://blob.datopian.com/resources/a787225570a4274cf2a0eebf3108ffa54ed9aaccd267d47aa123129a38172514/invoices-over-500-july-2023.csv'],
      ['2023_08.csv', 'https://blob.datopian.com/resources/cddf96c22c9d96e5ad4d02f60bb89162d6d41616b0ff10bd7c1bf8f4a3d43dd8/invoices-over-500-aug-2023.csv'],
      ['2023_09.csv', 'https://blob.datopian.com/resources/00aa39af9d1f10cdfcc3b15f582e4363affc66518a790d6613e9e9986d71b792/invoices-over-500-sep-2023.csv'],
      ['2023_10.csv', 'https://blob.datopian.com/resources/66c4452ae91a7c3b7c9188babcb07e187e8d762d244bab251d987daa9cecefa2/invoice-over-500-oct-2023.csv'],
      ['2023_11.csv', 'https://blob.datopian.com/resources/1e2078924858a1df311ddfe127b0cfe3daf388915c7de5a91817d2fb365005c7/invoices-over-500-nov-2023.csv'],
      ['2023_12.csv', 'https://blob.datopian.com/resources/ccf69721065de31e3d53ae5b0e7432c066e61ab3eab83d9e2561abfd9bead650/invoices-over-500-dec-2023.csv'],
      ['2024_01.csv', 'https://blob.datopian.com/resources/f1887201de8c9307452dfcbad28a487100047fe826c28598ef5f17c0ed08cb0b/invoices-over-500-jan-2024.csv'],
      ['2024_02.csv', 'https://blob.datopian.com/resources/3c8108a6776860592da3d3800c01ca07124c9fa7260e0b8473716e20902795dc/invoices-over-500-feb-2024.csv'],
      ['2024_03.csv', 'https://blob.datopian.com/resources/a50df1b2f9c320fead65ec79d7e9fafc67b2a856335b008fde8b9e76e55cedaf/invoices-over-500-march-2024.csv']
    ]
  },

  // ── Ealing (per-month numeric IDs, scraped from 2023-24 download folder) ──
  'ealing': {
    dir: 'ealing',
    files: [
      ['2023_04.csv', 'https://www.ealing.gov.uk/download/downloads/id/19036/april_2023.csv'],
      ['2023_05.csv', 'https://www.ealing.gov.uk/download/downloads/id/19079/may_2023.csv'],
      ['2023_06.csv', 'https://www.ealing.gov.uk/download/downloads/id/19080/june_2023.csv'],
      ['2023_07.csv', 'https://www.ealing.gov.uk/download/downloads/id/19216/july_2023.csv'],
      ['2023_08.csv', 'https://www.ealing.gov.uk/download/downloads/id/19217/august_2023.csv'],
      ['2023_09.csv', 'https://www.ealing.gov.uk/download/downloads/id/19234/september_2023.csv'],
      ['2023_10.csv', 'https://www.ealing.gov.uk/download/downloads/id/19348/october_2023.csv'],
      ['2023_11.csv', 'https://www.ealing.gov.uk/download/downloads/id/19394/november_2023.csv'],
      ['2023_12.csv', 'https://www.ealing.gov.uk/download/downloads/id/19651/december_2023.csv'],
      ['2024_01.csv', 'https://www.ealing.gov.uk/download/downloads/id/19652/january_2024.csv'],
      ['2024_02.csv', 'https://www.ealing.gov.uk/download/downloads/id/19746/february_2024.csv'],
      ['2024_03.csv', 'https://www.ealing.gov.uk/download/downloads/id/19745/march_2024.csv']
    ]
  },

  // ── Richmond (hashed slugs, mixed CSV + 1 xlsx for July) ──
  'richmond': {
    dir: 'richmond',
    files: [
      ['2023_04.csv', 'https://www.richmond.gov.uk/media/uarnd01p/council_expenditure_april_2023.csv'],
      ['2023_05.csv', 'https://www.richmond.gov.uk/media/o4yjiowe/council_expenditure_may_2023.csv'],
      ['2023_06.csv', 'https://www.richmond.gov.uk/media/x41lvonq/council_expenditure_june_2023.csv'],
      ['2023_07.xlsx','https://www.richmond.gov.uk/media/2hxajuw1/council_expenditure_july_2023.xlsx'],
      ['2023_08.csv', 'https://www.richmond.gov.uk/media/jwepiici/council_expenditure_august_2023.csv'],
      ['2023_09.csv', 'https://www.richmond.gov.uk/media/fvxb1imj/council_expenditure_september_2023.csv'],
      ['2023_10.csv', 'https://www.richmond.gov.uk/media/xilhta5x/council_expenditure_october_2023.csv'],
      ['2023_11.csv', 'https://www.richmond.gov.uk/media/4v0g4wbx/council_expenditure_november_2023.csv'],
      ['2023_12.csv', 'https://www.richmond.gov.uk/media/gbkhy0tv/council_expenditure_december_2023.csv'],
      ['2024_01.csv', 'https://www.richmond.gov.uk/media/2kxpwmrs/council_expenditure_january_2024.csv'],
      ['2024_02.csv', 'https://www.richmond.gov.uk/media/vsxnrgpd/council_expenditure_february_2024.csv'],
      ['2024_03.csv', 'https://www.richmond.gov.uk/media/iwwjwzv3/council_expenditure_march_2024.csv']
    ]
  },

  // ── Wandsworth (hashed slugs, 12 CSVs, same finance system as Richmond) ──
  'wandsworth': {
    dir: 'wandsworth',
    files: [
      ['2023_04.csv', 'https://www.wandsworth.gov.uk/media/13692/council_expenditure_april_2023.csv'],
      ['2023_05.csv', 'https://www.wandsworth.gov.uk/media/13771/council_expenditure_may_2023.csv'],
      ['2023_06.csv', 'https://www.wandsworth.gov.uk/media/13867/council_expenditure_june_2023.csv'],
      ['2023_07.csv', 'https://www.wandsworth.gov.uk/media/41ybg0a0/council_expenditure_july_2023.csv'],
      ['2023_08.csv', 'https://www.wandsworth.gov.uk/media/czoiyhny/council_expenditure_august_2023.csv'],
      ['2023_09.csv', 'https://www.wandsworth.gov.uk/media/f0ahprlk/council_expenditure_september_2023.csv'],
      ['2023_10.csv', 'https://www.wandsworth.gov.uk/media/25nbrn23/council_expenditure_october_2023.csv'],
      ['2023_11.csv', 'https://www.wandsworth.gov.uk/media/ygxnimwz/council_expenditure_november_2023.csv'],
      ['2023_12.csv', 'https://www.wandsworth.gov.uk/media/1rddbqvz/council_expenditure_december_2023.csv'],
      ['2024_01.csv', 'https://www.wandsworth.gov.uk/media/yprdoxkt/council_expenditure_january_2024.csv'],
      ['2024_02.csv', 'https://www.wandsworth.gov.uk/media/ovbhwhvh/council_expenditure_february_2024.csv'],
      ['2024_03.csv', 'https://www.wandsworth.gov.uk/media/brnjefjf/council_expenditure_march_2024.csv']
    ]
  },

  // ── Newham (numeric IDs, CSV variant) ──
  'newham': {
    dir: 'newham',
    files: [
      ['2023_04.csv', 'https://www.newham.gov.uk/downloads/file/6267/payments-to-suppliers-april-2023-csv-'],
      ['2023_05.csv', 'https://www.newham.gov.uk/downloads/file/6268/payments-to-suppliers-may-2023-csv-'],
      ['2023_06.csv', 'https://www.newham.gov.uk/downloads/file/6271/payments-to-suppliers-june-2023-csv-'],
      ['2023_07.csv', 'https://www.newham.gov.uk/downloads/file/6660/payments-to-suppliers-july-2023-csv-'],
      ['2023_08.csv', 'https://www.newham.gov.uk/downloads/file/6659/payments-to-suppliers-august-2023-csv-'],
      ['2023_09.csv', 'https://www.newham.gov.uk/downloads/file/6657/payments-to-suppliers-september-2023-csv-'],
      ['2023_10.csv', 'https://www.newham.gov.uk/downloads/file/6910/payments-to-suppliers-october-2023-csv-'],
      ['2023_11.csv', 'https://www.newham.gov.uk/downloads/file/6912/payments-to-suppliers-november-2023-csv-'],
      ['2023_12.csv', 'https://www.newham.gov.uk/downloads/file/6914/payments-to-suppliers-december-2023-csv-'],
      ['2024_01.csv', 'https://www.newham.gov.uk/downloads/file/7203/payments-to-suppliers-january-2024-csv-'],
      ['2024_02.csv', 'https://www.newham.gov.uk/downloads/file/7205/payments-to-suppliers-february-2024-csv-'],
      ['2024_03.csv', 'https://www.newham.gov.uk/downloads/file/7207/payments-to-suppliers-march-2024-csv-']
    ]
  },

  // ── Redbridge (predictable URL pattern, sept-2023 abbreviation) ──
  'redbridge': {
    dir: 'redbridge',
    files: [
      ['2023_04.csv', 'https://data.redbridge.gov.uk/Download/finance/payments-over-500-2023-24/april-2023/CSV'],
      ['2023_05.csv', 'https://data.redbridge.gov.uk/Download/finance/payments-over-500-2023-24/may-2023/CSV'],
      ['2023_06.csv', 'https://data.redbridge.gov.uk/Download/finance/payments-over-500-2023-24/june-2023/CSV'],
      ['2023_07.csv', 'https://data.redbridge.gov.uk/Download/finance/payments-over-500-2023-24/july-2023/CSV'],
      ['2023_08.csv', 'https://data.redbridge.gov.uk/Download/finance/payments-over-500-2023-24/august-2023/CSV'],
      ['2023_09.csv', 'https://data.redbridge.gov.uk/Download/finance/payments-over-500-2023-24/sept-2023/CSV'],
      ['2023_10.csv', 'https://data.redbridge.gov.uk/Download/finance/payments-over-500-2023-24/october-2023/CSV'],
      ['2023_11.csv', 'https://data.redbridge.gov.uk/Download/finance/payments-over-500-2023-24/november-2023/CSV'],
      ['2023_12.csv', 'https://data.redbridge.gov.uk/Download/finance/payments-over-500-2023-24/december-2023/CSV'],
      ['2024_01.csv', 'https://data.redbridge.gov.uk/Download/finance/payments-over-500-2023-24/january-2024/CSV'],
      ['2024_02.csv', 'https://data.redbridge.gov.uk/Download/finance/payments-over-500-2023-24/february-2024/CSV'],
      ['2024_03.csv', 'https://data.redbridge.gov.uk/Download/finance/payments-over-500-2023-24/march-2024/CSV']
    ]
  },

  // ── Hillingdon (XLSX via pre.hillingdon.gov.uk, non-sequential file IDs) ──
  'hillingdon': {
    dir: 'hillingdon',
    files: [
      ['2023_04.xlsx', 'https://pre.hillingdon.gov.uk/downloads/file/188/april-2023-council-spending-over-'],
      ['2023_05.xlsx', 'https://pre.hillingdon.gov.uk/downloads/file/197/may-2023-council-spending-over-'],
      ['2023_06.xlsx', 'https://pre.hillingdon.gov.uk/downloads/file/199/june-2023-council-spending-over-'],
      ['2023_07.xlsx', 'https://pre.hillingdon.gov.uk/downloads/file/195/july-2023-council-spending-over-'],
      ['2023_08.xlsx', 'https://pre.hillingdon.gov.uk/downloads/file/189/august-2023-council-spending-over-'],
      ['2023_09.xlsx', 'https://pre.hillingdon.gov.uk/downloads/file/196/september-2023-council-spending-over-'],
      ['2023_10.xlsx', 'https://pre.hillingdon.gov.uk/downloads/file/198/october-2023-council-spending-over-'],
      ['2023_11.xlsx', 'https://pre.hillingdon.gov.uk/downloads/file/194/november-2023-council-spending-over-'],
      ['2023_12.xlsx', 'https://pre.hillingdon.gov.uk/downloads/file/193/december-2023-council-spending-over-'],
      ['2024_01.xlsx', 'https://pre.hillingdon.gov.uk/downloads/file/184/january-2024-council-spending-over-'],
      ['2024_02.xlsx', 'https://pre.hillingdon.gov.uk/downloads/file/176/february-2024-council-spending-over-'],
      ['2024_03.xlsx', 'https://pre.hillingdon.gov.uk/downloads/file/177/march-2024-council-spending-over-']
    ]
  },

  // ── Sutton (Liferay DMS UUIDs, Sep 2023 gap in source = 11/12 months) ──
  'sutton': {
    dir: 'sutton',
    files: [
      ['2023_04.csv', 'https://www.sutton.gov.uk/documents/20124/884703/LBS+April+2023+Payments+over+%C2%A3500+-+To+be+published+%281%29.csv/d6c0cefb-91bb-b2e8-23c8-e5d90e8efdde?t=1687166415938'],
      ['2023_05.csv', 'https://www.sutton.gov.uk/documents/20124/943207/LBS+over+%C2%A3500+payments+May+2023+To+be+published.csv/563d3451-ce31-3c17-163b-77a3544d5798?t=1687440713269'],
      ['2023_06.csv', 'https://www.sutton.gov.uk/documents/20124/884703/Payments+over+%C2%A3500+June+2023+-+To+be+published.csv/fea25194-c0ec-681a-58c4-fbb10ce841c8?t=1691742667748'],
      ['2023_07.csv', 'https://www.sutton.gov.uk/documents/20124/884703/LBS+Payments+to+Suppliers+over+%C2%A3500+July+2023+-+TO+BE+PUBLISHED.csv/1e9562dc-3b4d-e2bf-cb10-1bbcc9c06a66?t=1691742688249'],
      ['2023_08.csv', 'https://www.sutton.gov.uk/documents/20124/884703/LBS+payments+over+%C2%A3500+August+2023+-+To+be+published.csv/93a54db2-584b-a027-5880-1993583dfc09?t=1694087875214'],
      ['2023_10.csv', 'https://www.sutton.gov.uk/documents/20124/884703/LBS+Payments+over+%C2%A3500+October+2023+-+To+be+published.csv/f3428f5a-5cfb-a881-8ddc-2edefda8b530?t=1697718431933'],
      ['2023_11.csv', 'https://www.sutton.gov.uk/documents/20124/884703/LBS+payments+over+%C2%A3500+November+2023+-+TO+BE+PUBLISHED.csv/0a5ef8a0-b997-1b0e-00f2-58853f8e9fcb?t=1702899957197'],
      ['2023_12.csv', 'https://www.sutton.gov.uk/documents/20124/884703/LBS+payments+over+%C2%A3500+December+2023+-+For+publishing.csv/df41f977-9850-7f7f-30ba-d7447b82f866?t=1705335484585'],
      ['2024_01.csv', 'https://www.sutton.gov.uk/documents/20124/1458527/LBS+payments+over+%C2%A3500+January+2024+-+To+be+published.csv/e52a3a30-3b7d-3b9e-2392-4f498afa6192?t=1707382267362'],
      ['2024_02.csv', 'https://www.sutton.gov.uk/documents/d/guest/lbs-payments-over-500-february-2024-to-be-published'],
      ['2024_03.csv', 'https://www.sutton.gov.uk/documents/d/guest/lbs-payments-over-500-march-2024-to-be-published']
    ]
  },

  // ── Lewisham (6 different directory stems, inconsistent casing, mix of .xlsx + .ashx) ──
  'lewisham': {
    dir: 'lewisham',
    files: [
      ['2023_04.xlsx', 'https://lewisham.gov.uk/-/media/0-finance/apr2023paymentsover250.ashx'],
      ['2023_05.xlsx', 'https://lewisham.gov.uk/-/media/mayor-and-council/about-us/finances/250-spend/spending-over-250/may2023paymentsover250.xlsx'],
      ['2023_06.xlsx', 'https://lewisham.gov.uk/-/media/0-finance/23-24/jun2023paymentsover250.ashx'],
      ['2023_07.xlsx', 'https://lewisham.gov.uk/-/media/mayor-and-council/about-us/finances/250-spend/spending-over-250/jul2023paymentsover250.xlsx'],
      ['2023_08.xlsx', 'https://lewisham.gov.uk/-/media/mayor-and-council/about-us/finances/finance/23-24/aug2023paymentsover250.xlsx'],
      ['2023_09.xlsx', 'https://lewisham.gov.uk/-/media/mayor-and-council/about-us/finances/finance/sep2023paymentsover250.xlsx'],
      ['2023_10.xlsx', 'https://lewisham.gov.uk/-/media/mayor-and-council/about-us/finances/250-spend/spending-over-250/23-24/oct2023paymentsover250.xlsx'],
      ['2023_11.xlsx', 'https://lewisham.gov.uk/-/media/mayor-and-council/about-us/finances/250-spend/spending-over-250/23-24/nov2023paymentsover250.xlsx'],
      ['2023_12.xlsx', 'https://lewisham.gov.uk/-/media/mayor-and-council/about-us/finances/250-spend/spending-over-250/dec2023paymentsover250.xlsx'],
      ['2024_01.xlsx', 'https://lewisham.gov.uk/-/media/mayor-and-council/about-us/finances/250-spend/spending-over-250/jan2024paymentsover250.xlsx'],
      ['2024_02.xlsx', 'https://lewisham.gov.uk/-/media/mayor-and-council/about-us/finances/250-spend/spending-over-250/feb2024paymentsover250.xlsx'],
      ['2024_03.xlsx', 'https://lewisham.gov.uk/-/media/mayor-and-council/about-us/finances/250-spend/spending-over-250/23-24/mar2024paymentsover250.xlsx']
    ]
  },

  // ── Waltham Forest (7/12 — Apr-Aug 2023 purged by rolling window) ──
  'waltham_forest': {
    dir: 'waltham_forest',
    files: [
      ['2023_09.xlsx', 'https://www.walthamforest.gov.uk/sites/default/files/2025-07/September%202023%20Transparenct%20Report.xlsx'],
      ['2023_10.xlsx', 'https://www.walthamforest.gov.uk/sites/default/files/2025-07/October%202023%20Transparency%20Report.xlsx'],
      ['2023_11.xlsx', 'https://www.walthamforest.gov.uk/sites/default/files/2025-07/November%202023%20Transparency%20Report.xlsx'],
      ['2023_12.xlsx', 'https://www.walthamforest.gov.uk/sites/default/files/2025-06/December%202023%20Transparenct%20Report.xlsx'],
      ['2024_01.xlsx', 'https://www.walthamforest.gov.uk/sites/default/files/2025-06/January%202024%20Transparency%20Report.xlsx'],
      ['2024_02.xlsx', 'https://www.walthamforest.gov.uk/sites/default/files/2025-05/February%202024%20Transparency%20Report.xlsx'],
      ['2024_03.xlsx', 'https://www.walthamforest.gov.uk/sites/default/files/2025-04/March%202024%20Transparency%20Report.xlsx']
    ]
  },

  // ── Bromley (XLSX, scraped IDs from Content-Disposition brute-force) ──
  'bromley': {
    dir: 'bromley',
    files: [
      ['2023_04.xlsx', 'https://www.bromley.gov.uk/downloads/file/2289/over-500-apr23'],
      ['2023_05.xlsx', 'https://www.bromley.gov.uk/downloads/file/2290/over-500-may23'],
      ['2023_06.xlsx', 'https://www.bromley.gov.uk/downloads/file/2291/over-500-jun23'],
      ['2023_07.xlsx', 'https://www.bromley.gov.uk/downloads/file/2351/over-500-data-jul23'],
      ['2023_08.xlsx', 'https://www.bromley.gov.uk/downloads/file/2355/over-500-data-aug23'],
      ['2023_09.xlsx', 'https://www.bromley.gov.uk/downloads/file/2388/over-500-data-sep23'],
      ['2023_10.xlsx', 'https://www.bromley.gov.uk/downloads/file/2389/over-500-data-oct23'],
      ['2023_11.xlsx', 'https://www.bromley.gov.uk/downloads/file/2390/over-500-data-nov23'],
      ['2023_12.xlsx', 'https://www.bromley.gov.uk/downloads/file/2391/over-500-data-dec23'],
      ['2024_01.xlsx', 'https://www.bromley.gov.uk/downloads/file/2464/payments-to-suppliers-over-500-january-2024'],
      ['2024_02.xlsx', 'https://www.bromley.gov.uk/downloads/file/2465/payments-to-suppliers-over-500-february-2024'],
      ['2024_03.xlsx', 'https://www.bromley.gov.uk/downloads/file/2466/payments-to-suppliers-over-500-march-2024']
    ]
  },

  // ── Hackney (Google Drive IDs per month, CSV-in-xlsx-label) ──
  // NOTE: file labels on landing page are unreliable — must validate by YEAR/MONTH columns after download
  'hackney': {
    dir: 'hackney',
    files: [
      ['2023_04.csv', 'https://drive.usercontent.google.com/download?id=1b_vkkNRytWfpV5trDPsn1d0NnfhFzA-R&export=download&confirm=t'],
      ['2023_05.csv', 'https://drive.usercontent.google.com/download?id=1r4XUoXtOmG6lPvIBt6b9hvjTj7lCdBVB&export=download&confirm=t'],
      ['2023_06.csv', 'https://drive.usercontent.google.com/download?id=19AlcuSa-9Mw2pJGbk5u5jTAbFt5hod-9&export=download&confirm=t'],
      ['2023_07.csv', 'https://drive.usercontent.google.com/download?id=1ITkbTvlgQi8Wkc1iRZRZQz0ncSsHZFXb&export=download&confirm=t'],
      ['2023_08.csv', 'https://drive.usercontent.google.com/download?id=12W71OPzwHNRBR5MQCOcTFagTAU31CWSG&export=download&confirm=t'],
      ['2023_09.csv', 'https://drive.usercontent.google.com/download?id=1Fx7nKUPZdBp0_GxLcjEOV_GzC8vWJw3F&export=download&confirm=t'],
      ['2023_10.csv', 'https://drive.usercontent.google.com/download?id=1qILyuMFTAg6DcIuw23aRXPH__ohg1_7j&export=download&confirm=t'],
      ['2023_11.csv', 'https://drive.usercontent.google.com/download?id=1BZ_zDV1Ofp2v22P9nr8SVcb99nBjilZ3&export=download&confirm=t'],
      ['2023_12.csv', 'https://drive.usercontent.google.com/download?id=1Yf-Jupt0xb5SPncPQ1mQl2SLJGIpY4Ab&export=download&confirm=t'],
      ['2024_01.csv', 'https://drive.usercontent.google.com/download?id=1bZLrQ6azEWsYwHV2_1cM6Ql4yM539Hqs&export=download&confirm=t'],
      ['2024_02.csv', 'https://drive.usercontent.google.com/download?id=1ndje7QaOxwnKpXslFqhxHYVO0bC2riiT&export=download&confirm=t'],
      ['2024_03.csv', 'https://drive.usercontent.google.com/download?id=1vGyq9qVEJg-UopDh0mSIkwlHJGQKptfA&export=download&confirm=t']
    ]
  },

  // ── Tower Hamlets (chaotic filename casing, all in 2022-2023 folder) ──
  'tower_hamlets': {
    dir: 'tower_hamlets',
    files: [
      ['2023_04.csv', 'https://www.towerhamlets.gov.uk/Documents/Transparency-data/Payments-to-suppliers/2022-2023/250-spend-April-2023.csv'],
      ['2023_05.csv', 'https://www.towerhamlets.gov.uk/Documents/Transparency-data/Payments-to-suppliers/2022-2023/250-spend-May-2023.csv'],
      ['2023_06.csv', 'https://www.towerhamlets.gov.uk/Documents/Transparency-data/Payments-to-suppliers/2022-2023/250-spend-June-2023.csv'],
      ['2023_07.csv', 'https://www.towerhamlets.gov.uk/Documents/Transparency-data/Payments-to-suppliers/2022-2023/250-spend-July-2023.csv'],
      ['2023_08.csv', 'https://www.towerhamlets.gov.uk/Documents/Transparency-data/Payments-to-suppliers/2022-2023/250-spend-Aug-2023.csv'],
      ['2023_09.csv', 'https://www.towerhamlets.gov.uk/Documents/Transparency-data/Payments-to-suppliers/2022-2023/250-spend-Sept-2023.csv'],
      ['2023_10.csv', 'https://www.towerhamlets.gov.uk/Documents/Transparency-data/Payments-to-suppliers/2022-2023/250-Spend-Oct-2023.csv'],
      ['2023_11.csv', 'https://www.towerhamlets.gov.uk/Documents/Transparency-data/Payments-to-suppliers/2022-2023/250-Spend-Nov-2023.csv'],
      ['2023_12.csv', 'https://www.towerhamlets.gov.uk/Documents/Transparency-data/Payments-to-suppliers/2022-2023/250-Spend-Dec-2023.csv'],
      ['2024_01.csv', 'https://www.towerhamlets.gov.uk/Documents/Transparency-data/Payments-to-suppliers/2023-2024/250-Spend-Jan-24-CSV.csv'],
      ['2024_02.csv', 'https://www.towerhamlets.gov.uk/Documents/Transparency-data/Payments-to-suppliers/2023-2024/250-Spend-Feb-24.csv'],
      ['2024_03.csv', 'https://www.towerhamlets.gov.uk/Documents/Transparency-data/Payments-to-suppliers/2023-2024/250-Spend-Mar-24.csv']
    ]
  }
};

// Helper: generate monthly URL array
function monthlyRange(fromMMYYYY, toMMYYYY, urlFn) {
  const [fmm, fyyyy] = fromMMYYYY.split('-').map(Number);
  const [tmm, tyyyy] = toMMYYYY.split('-').map(Number);
  const out = [];
  let m = fmm, y = fyyyy;
  while (y < tyyyy || (y === tyyyy && m <= tmm)) {
    out.push(urlFn(String(m).padStart(2, '0'), y));
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}

function download(url, outPath) {
  return new Promise((resolve) => {
    const followRedirects = (currentUrl, depth = 0) => {
      if (depth > 5) { resolve({ ok: false, err: 'too many redirects' }); return; }
      const req = https.get(currentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'en-GB,en;q=0.9'
        }
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const next = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, currentUrl).href;
          res.resume();
          followRedirects(next, depth + 1);
          return;
        }
        if (res.statusCode !== 200) {
          resolve({ ok: false, status: res.statusCode });
          res.resume();
          return;
        }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          if (buf.length < 500) {
            resolve({ ok: false, err: 'too small: ' + buf.length });
            return;
          }
          fs.writeFileSync(outPath, buf);
          resolve({ ok: true, bytes: buf.length });
        });
      });
      req.on('error', e => resolve({ ok: false, err: e.message }));
      req.setTimeout(60000, () => { req.destroy(); resolve({ ok: false, err: 'timeout' }); });
    };
    followRedirects(url);
  });
}

async function processBorough(name, config) {
  const dir = path.join(SPEND_DIR, config.dir);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  console.log(`\n── ${name} (${config.files.length} files) ──`);
  let ok = 0, fail = 0;
  for (const [filename, url] of config.files) {
    const outPath = path.join(dir, filename);
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 500) {
      console.log(`  ${filename}: exists, skip`);
      ok++;
      continue;
    }
    const result = await download(url, outPath);
    if (result.ok) {
      console.log(`  ${filename}: ${(result.bytes / 1024).toFixed(0)} KB`);
      ok++;
    } else {
      console.log(`  ${filename}: ✗ ${result.status || result.err}`);
      fail++;
    }
    // 600ms delay between requests to be polite
    await new Promise(r => setTimeout(r, 600));
  }
  console.log(`  → ${ok} ok, ${fail} fail`);
  return { ok, fail };
}

async function main() {
  const args = process.argv.slice(2);
  const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;

  const results = {};
  for (const [name, config] of Object.entries(BOROUGHS)) {
    if (only && !only.includes(name)) continue;
    results[name] = await processBorough(name, config);
  }

  console.log('\n════ Summary ════');
  let totalOk = 0, totalFail = 0;
  for (const [name, r] of Object.entries(results)) {
    console.log(`  ${name}: ${r.ok}/${r.ok + r.fail}`);
    totalOk += r.ok;
    totalFail += r.fail;
  }
  console.log(`  TOTAL: ${totalOk}/${totalOk + totalFail}`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
