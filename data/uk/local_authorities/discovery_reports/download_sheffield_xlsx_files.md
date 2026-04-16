# Download Sheffield XLSX files

_Agent: agent-abb7ef33737c80f46_

All 12 Sheffield City Council "Spend over 250" files for FY 2023-24 have been downloaded, converted, and saved. Here is the summary:

**Output directory:** `D:/germany-ngo-map/data/uk/local_authorities/spend/sheffield/`

**Files created (all 12 months):**

| File | Rows | Size |
|------|------|------|
| sheffield_2023_04.csv | 25,012 | 6,385 KB |
| sheffield_2023_05.csv | 25,476 | 6,501 KB |
| sheffield_2023_06.csv | 25,472 | 6,628 KB |
| sheffield_2023_07.csv | 24,693 | 6,338 KB |
| sheffield_2023_08.csv | 29,194 | 7,491 KB |
| sheffield_2023_09.csv | 23,977 | 6,159 KB |
| sheffield_2023_10.csv | 24,873 | 6,509 KB |
| sheffield_2023_11.csv | 23,854 | 6,241 KB |
| sheffield_2023_12.csv | 21,853 | 5,681 KB |
| sheffield_2024_01.csv | 28,628 | 7,399 KB |
| sheffield_2024_02.csv | 22,069 | 5,424 KB |
| sheffield_2024_03.csv | 29,765 | 7,334 KB |

**Total: ~304,866 rows across 12 files.**

**Column headers (14 data columns + trailing empty columns):**
`Body Name, Body, Portfolio, Organisation Code, Org Code Description, Object Code, Object Code Description, Certified Date, Supplier Reference, Value, Supplier, Category, Category Description, Supplier No`

**Notes:**
- Files for April-November 2023 were multi-sheet XLSM workbooks with a "Qtier_Cover" cover sheet; the data was extracted from the "Report" sheet (or equivalent like "JULY 2023").
- Files for December 2023-March 2024 were single-sheet workbooks with the data directly on the first sheet.
- The Value column format differs between the two groups: April-November uses plain numbers (e.g., `-1029.00`), while December-March uses formatted currency strings (e.g., `"-£2,895.06"`). You may want to normalize this during ingestion.