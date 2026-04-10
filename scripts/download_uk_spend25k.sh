#!/bin/bash
# Download all UK Spend Over £25k files for 2024
DIR="D:/germany-ngo-map/data/recipients/uk/spend25k"
mkdir -p "$DIR"

echo "=== DWP (12 months) ==="
curl -sL -o "$DIR/dwp_01.csv" "https://assets.publishing.service.gov.uk/media/662910653b0122a378a7e619/dwp-spending-over-25000-january-2024.csv" &
curl -sL -o "$DIR/dwp_02.csv" "https://assets.publishing.service.gov.uk/media/662916983b0122a378a7e651/dwp-spending-over-25000-february-2024.csv" &
curl -sL -o "$DIR/dwp_03.csv" "https://assets.publishing.service.gov.uk/media/662918783b0122a378a7e6b5/dwp-spending-over-25000-march-2024.csv" &
curl -sL -o "$DIR/dwp_04.csv" "https://assets.publishing.service.gov.uk/media/66ab980e49b9c0597fdb099f/dwp-spending-over-25000-april-2024.csv" &
curl -sL -o "$DIR/dwp_05.csv" "https://assets.publishing.service.gov.uk/media/66ab9842fc8e12ac3edb096b/dwp-spending-over-25000-may-2024.csv" &
curl -sL -o "$DIR/dwp_06.csv" "https://assets.publishing.service.gov.uk/media/66ab987ea3c2a28abb50dbbc/dwp-spending-over-25000-june-2024.csv" &
curl -sL -o "$DIR/dwp_07.csv" "https://assets.publishing.service.gov.uk/media/68b8537ccc8356c3c882aa26/dwp-spending-over-25000-july-2024.csv" &
curl -sL -o "$DIR/dwp_08.csv" "https://assets.publishing.service.gov.uk/media/68b852f2d723ba6f74dba95f/dwp-spending-over-25000-august-2024.csv" &
curl -sL -o "$DIR/dwp_09.csv" "https://assets.publishing.service.gov.uk/media/68b850b63f3e5483efdba949/dwp-spending-over-25000-september-2024.csv" &
curl -sL -o "$DIR/dwp_10.csv" "https://assets.publishing.service.gov.uk/media/68b8501fcc8356c3c882aa21/dwp-spending-over-25000-october-2024.csv" &
curl -sL -o "$DIR/dwp_11.csv" "https://assets.publishing.service.gov.uk/media/68b84f7dd723ba6f74dba95c/dwp-spending-over-25000-november-2024.csv" &
curl -sL -o "$DIR/dwp_12.csv" "https://assets.publishing.service.gov.uk/media/68b84e57b0a373a01819fda8/dwp-spending-over-25000-december-2024.csv" &
wait
echo "DWP done"

echo "=== DHSC (12 months) ==="
curl -sL -o "$DIR/dhsc_01.csv" "https://assets.publishing.service.gov.uk/media/6613b9ac2138738e3b031b25/DHSC-spend-over-25000-January-2024.csv" &
curl -sL -o "$DIR/dhsc_02.csv" "https://assets.publishing.service.gov.uk/media/6644b280f34f9b5a56adc80f/DHSC-over-25000-spend-February-2024.csv" &
curl -sL -o "$DIR/dhsc_03.csv" "https://assets.publishing.service.gov.uk/media/6679939e4ae39c5e45fe4b8b/DHSC-spending-over-25000-March-2024.csv" &
curl -sL -o "$DIR/dhsc_04.csv" "https://assets.publishing.service.gov.uk/media/696a287bcbe2202b384248c4/dhsc-spending-over-25000-april-2024-amended.csv" &
curl -sL -o "$DIR/dhsc_05.csv" "https://assets.publishing.service.gov.uk/media/696a28f6e13af2b11d3b0470/dhsc-spending-over-25000-may-2024-amended.csv" &
curl -sL -o "$DIR/dhsc_06.csv" "https://assets.publishing.service.gov.uk/media/696a296a7b7f37aa8e4022fd/dhsc-spending-over-25000-june-2024-amended.csv" &
curl -sL -o "$DIR/dhsc_07.csv" "https://assets.publishing.service.gov.uk/media/696a2ac91c8a70fc0a3b046b/dhsc-spending-over-25000-july-2024-amended.csv" &
curl -sL -o "$DIR/dhsc_08.csv" "https://assets.publishing.service.gov.uk/media/696a2b170c654a0ec44022f4/dhsc-spending-over-25000-august-2024-amended.csv" &
curl -sL -o "$DIR/dhsc_09.csv" "https://assets.publishing.service.gov.uk/media/696a45467b7f37aa8e402318/dhsc-spending-over-25000-september-2024-amended.csv" &
curl -sL -o "$DIR/dhsc_10.csv" "https://assets.publishing.service.gov.uk/media/687e60b892957f2ec567c620/dhsc-spending-over-25000-october-2024.csv" &
curl -sL -o "$DIR/dhsc_11.csv" "https://assets.publishing.service.gov.uk/media/696a47567b7f37aa8e40231a/dhsc-spending-over-25000-november-2024-amended.csv" &
curl -sL -o "$DIR/dhsc_12.csv" "https://assets.publishing.service.gov.uk/media/696a48857b7f37aa8e40231b/dhsc-spending-over-25000-december-2024-amended.csv" &
wait
echo "DHSC done"

echo "=== DfE (12 months: Jan-Mar from FY23-24, Apr-Dec from FY24-25) ==="
curl -sL -o "$DIR/dfe_01.csv" "https://assets.publishing.service.gov.uk/media/66291394b0ace32985a7e6ea/DfE_Spend__25k_Jan_2024.csv" &
curl -sL -o "$DIR/dfe_02.csv" "https://assets.publishing.service.gov.uk/media/66292251b0ace32985a7e7aa/DfE_Spend__25k_Feb_2024.csv" &
curl -sL -o "$DIR/dfe_03.csv" "https://assets.publishing.service.gov.uk/media/66ab4b46ce1fd0da7b593142/DfE_Spend__25k_Mar_2024.csv" &
curl -sL -o "$DIR/dfe_04.csv" "https://assets.publishing.service.gov.uk/media/66a37d8f49b9c0597fdb0560/DfE_Spend__25k_April_2024.csv" &
curl -sL -o "$DIR/dfe_05.csv" "https://assets.publishing.service.gov.uk/media/66bf0f68c909b91981323f1b/DfE_spend__25k_May24.csv" &
curl -sL -o "$DIR/dfe_06.csv" "https://assets.publishing.service.gov.uk/media/66cdf46aface0992fa41f64e/DfE_25k_spend_June_2024.csv" &
curl -sL -o "$DIR/dfe_07.csv" "https://assets.publishing.service.gov.uk/media/671675f1583ef2380ad99848/DfE_Transparency__25k_JUL24.csv" &
curl -sL -o "$DIR/dfe_08.csv" "https://assets.publishing.service.gov.uk/media/6716782c4a6b12291ed9984d/DfE_Transparency__25k_August_2024.csv" &
curl -sL -o "$DIR/dfe_09.csv" "https://assets.publishing.service.gov.uk/media/674456951034a5f4a58568bb/DfE_Spend_Sept_2024_Transparency__25k.csv" &
curl -sL -o "$DIR/dfe_10.csv" "https://assets.publishing.service.gov.uk/media/675acb6d4cbda57cacd34786/DfE__25k_Transparency_Spend_Oct_2024.csv" &
curl -sL -o "$DIR/dfe_11.csv" "https://assets.publishing.service.gov.uk/media/6793907de863a0e7724f4b1d/DfE_Transparency__25k_Nov24.csv" &
curl -sL -o "$DIR/dfe_12.csv" "https://assets.publishing.service.gov.uk/media/67bc3c12ba253db298782c65/DFE_Transparency__25k_DEC24.csv" &
wait
echo "DfE done"

echo "=== MoD (12 months, ODS format) ==="
curl -sL -o "$DIR/mod_01.ods" "https://assets.publishing.service.gov.uk/media/65df21d5b8da630011c86386/MOD_spending_over__25_000_January_2024.ods" &
curl -sL -o "$DIR/mod_02.ods" "https://assets.publishing.service.gov.uk/media/660e8aa363b7f8001fde186f/Transparency_AP11_February_2024.ods" &
curl -sL -o "$DIR/mod_03.ods" "https://assets.publishing.service.gov.uk/media/6630b95887bdbae4ab19add9/MOD_s_spending_over__25_000_for_March_2024.ods" &
curl -sL -o "$DIR/mod_04.ods" "https://assets.publishing.service.gov.uk/media/6658856816cf36f4d63ebc53/MOD_s_spending_over__25_000_for_April_2024.ods" &
curl -sL -o "$DIR/mod_05.ods" "https://assets.publishing.service.gov.uk/media/6685183d541aeb9e928f43c0/MOD_spending_over__25_000_May_2024.ods" &
curl -sL -o "$DIR/mod_06.ods" "https://assets.publishing.service.gov.uk/media/66aa03ecfc8e12ac3edb07ff/MOD_s_spending_over__25_000_for_June_2024.ods" &
curl -sL -o "$DIR/mod_07.ods" "https://assets.publishing.service.gov.uk/media/66d6e8db5187a43f682ddd8e/MOD_spending_over__25_000_for_July_2024.ods" &
curl -sL -o "$DIR/mod_08.ods" "https://assets.publishing.service.gov.uk/media/66fd42b4080bdf716392ecba/MOD_spending_over__25_000_for_August_2024.ods" &
curl -sL -o "$DIR/mod_09.ods" "https://assets.publishing.service.gov.uk/media/67224cc94da1c0d41942a9ed/MOD_spending_over__25_000_for_September_2024.ods" &
curl -sL -o "$DIR/mod_10.ods" "https://assets.publishing.service.gov.uk/media/674746f1886c31e352d8d0f8/MOD_spending_over__25_000_for_October_2024.ods" &
curl -sL -o "$DIR/mod_11.ods" "https://assets.publishing.service.gov.uk/media/677d4b466f01ae28ab5c0480/MOD_s_spending_over__25_000_for_November_2024.ods" &
curl -sL -o "$DIR/mod_12.ods" "https://assets.publishing.service.gov.uk/media/67a090aa3f28b7444270a385/MOD_spending_over__25_000_December_2024.ods" &
wait
echo "MoD done"

echo "=== HMT (3 CSV + 9 XLSX) ==="
curl -sL -o "$DIR/hmt_01.csv" "https://assets.publishing.service.gov.uk/media/6657133edc15efdddf1a84dc/HMT_spend_greater_than__25_000_-_January_2024.csv" &
curl -sL -o "$DIR/hmt_02.csv" "https://assets.publishing.service.gov.uk/media/665734ead470e3279dd33347/HMT_spend_greater_than__25_000_-_February_2024.csv" &
curl -sL -o "$DIR/hmt_03.csv" "https://assets.publishing.service.gov.uk/media/66573ac7dc15efdddf1a84ff/HMT_spend_greater_than__25_000_-_March_2024.csv" &
curl -sL -o "$DIR/hmt_04.xlsx" "https://assets.publishing.service.gov.uk/media/672b4fd2541e1dfbf71e8c37/Inv_over__25k_-_Apr_24.xlsx" &
curl -sL -o "$DIR/hmt_05.xlsx" "https://assets.publishing.service.gov.uk/media/672b5086541e1dfbf71e8c3a/Inv_over__25k_-_May_24.xlsx" &
curl -sL -o "$DIR/hmt_06.xlsx" "https://assets.publishing.service.gov.uk/media/672b50c7fbd69e1861921c05/Inv_over__25k_-_Jun_24.xlsx" &
curl -sL -o "$DIR/hmt_07.xlsx" "https://assets.publishing.service.gov.uk/media/68a8747d2f185664821557c1/Inv_over__25k_-_Jul_24.xlsx" &
curl -sL -o "$DIR/hmt_08.xlsx" "https://assets.publishing.service.gov.uk/media/68a875793a052c9c504c8dad/Inv_over__25k_-_Aug_24.xlsx" &
curl -sL -o "$DIR/hmt_09.xlsx" "https://assets.publishing.service.gov.uk/media/68a877033a052c9c504c8daf/Inv_over__25k_-_Sep_24.xlsx" &
curl -sL -o "$DIR/hmt_10.xlsx" "https://assets.publishing.service.gov.uk/media/68a87800960e2d135b4c8dad/Inv_over__25k_-_Oct_24.xlsx" &
curl -sL -o "$DIR/hmt_11.xlsx" "https://assets.publishing.service.gov.uk/media/68a886613a052c9c504c8db9/Inv_over__25k_-_Nov_24.xlsx" &
curl -sL -o "$DIR/hmt_12.xlsx" "https://assets.publishing.service.gov.uk/media/68a887029e1cebdd2c96a119/Inv_over__25k_-_Dec_24.xlsx" &
wait
echo "HMT done"

echo "=== SUMMARY ==="
echo "DWP:  $(ls -1 $DIR/dwp_*.csv 2>/dev/null | wc -l) files"
echo "DHSC: $(ls -1 $DIR/dhsc_*.csv 2>/dev/null | wc -l) files"
echo "DfE:  $(ls -1 $DIR/dfe_*.csv 2>/dev/null | wc -l) files"
echo "MoD:  $(ls -1 $DIR/mod_*.ods 2>/dev/null | wc -l) files"
echo "HMT:  $(ls -1 $DIR/hmt_*.{csv,xlsx} 2>/dev/null | wc -l) files"
