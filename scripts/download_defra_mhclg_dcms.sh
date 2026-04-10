#!/bin/bash
DIR="D:/germany-ngo-map/data/recipients/uk/spend25k"

echo "=== Defra (12 months) ==="
curl -sL -o "$DIR/defra_01.csv" "https://assets.publishing.service.gov.uk/media/68516049dc640d9b20f3e918/Defra_25K_January_2024_rev3.csv" &
curl -sL -o "$DIR/defra_02.csv" "https://assets.publishing.service.gov.uk/media/67b495fe4a80c6718b55bf12/Over+_25K++February+2024.csv" &
curl -sL -o "$DIR/defra_03.csv" "https://assets.publishing.service.gov.uk/media/67b496954a80c6718b55bf15/Over+_25K++March+2024.csv" &
curl -sL -o "$DIR/defra_04.csv" "https://assets.publishing.service.gov.uk/media/67b496c04a80c6718b55bf16/Over+_25K++April+2024.csv" &
curl -sL -o "$DIR/defra_05.csv" "https://assets.publishing.service.gov.uk/media/6853c9472b367fdd44c15e97/Over+_25K++May+2024-Rev.csv" &
curl -sL -o "$DIR/defra_06.csv" "https://assets.publishing.service.gov.uk/media/67b49706423f67c0e67d3826/Over+_25K++June+2024.csv" &
curl -sL -o "$DIR/defra_07.csv" "https://assets.publishing.service.gov.uk/media/674d8e512e91c6fb83fb516e/Defra_Over__25K_Transparency_report_Jul_2024_rev.csv" &
curl -sL -o "$DIR/defra_08.csv" "https://assets.publishing.service.gov.uk/media/66fe5cef3b919067bb482b74/Defra_Over__25K_Transparency_report_Aug_2024.csv" &
curl -sL -o "$DIR/defra_09.csv" "https://assets.publishing.service.gov.uk/media/6853caf5679778c74ec15e9f/Over+_25K++Sep+2024-Rev.csv" &
curl -sL -o "$DIR/defra_10.csv" "https://assets.publishing.service.gov.uk/media/6853cb2799b009dcdcb7364e/Over+_25K++Oct+2024-Rev.csv" &
curl -sL -o "$DIR/defra_11.csv" "https://assets.publishing.service.gov.uk/media/6853cb4b679778c74ec15ea1/Over+_25K++Nov+2024-Rev.csv" &
curl -sL -o "$DIR/defra_12.csv" "https://assets.publishing.service.gov.uk/media/6853cb78235ba1380b6aa6ee/Over++_25K++Dec+2024-Rev.csv" &
wait
echo "Defra done: $(ls -1 $DIR/defra_*.csv | wc -l) files"

echo "=== MHCLG (12 months) ==="
curl -sL -o "$DIR/mhclg_01.csv" "https://assets.publishing.service.gov.uk/media/66c5eec5e5e471d6d6b18e24/TP_DLUHC_January_2024.csv" &
curl -sL -o "$DIR/mhclg_02.csv" "https://assets.publishing.service.gov.uk/media/66c5b6df81850effa1b18dea/TP_DLUHC_February_2024.csv" &
curl -sL -o "$DIR/mhclg_03.csv" "https://assets.publishing.service.gov.uk/media/66c5ee8281850effa1b18e40/TP_DLUHC_March_2024.csv" &
curl -sL -o "$DIR/mhclg_04.csv" "https://assets.publishing.service.gov.uk/media/66c5ee9e29be2af083dd27d4/TP_DLUHC_April_2024.csv" &
curl -sL -o "$DIR/mhclg_05.csv" "https://assets.publishing.service.gov.uk/media/66cf4ab1913d4f9812597c3b/TP_DLUHC_May_2024.csv" &
curl -sL -o "$DIR/mhclg_06.csv" "https://assets.publishing.service.gov.uk/media/66d0560c7c42acbece502c66/TP_DLUHC_June_2024.csv" &
curl -sL -o "$DIR/mhclg_07.csv" "https://assets.publishing.service.gov.uk/media/6707f22930536cb927482feb/TP_Report_MHCLG_July_2024.csv" &
curl -sL -o "$DIR/mhclg_08.csv" "https://assets.publishing.service.gov.uk/media/678646b1f0528401055d2396/TP_Report__25k_+_MHCLG_August_2024.csv" &
curl -sL -o "$DIR/mhclg_09.csv" "https://assets.publishing.service.gov.uk/media/67c041c568a61757838d2038/MHCLG_T.P_Report_September_2024.csv" &
curl -sL -o "$DIR/mhclg_10.csv" "https://assets.publishing.service.gov.uk/media/67c0459a750837d7604dbc33/MHCLG_T.P.Report_October_2024.csv" &
curl -sL -o "$DIR/mhclg_11.csv" "https://assets.publishing.service.gov.uk/media/67c05272b0bb6528ee866b9c/MHCLG_T.P.Report_November_2024.csv" &
curl -sL -o "$DIR/mhclg_12.csv" "https://assets.publishing.service.gov.uk/media/67c05a87a0f0c95a498d2059/MHCLG_T.P.Report_December_2024.csv" &
wait
echo "MHCLG done: $(ls -1 $DIR/mhclg_*.csv | wc -l) files"

echo "=== DCMS (12 months ODS) ==="
curl -sL -o "$DIR/dcms_01.ods" "https://assets.publishing.service.gov.uk/media/65e0960a2f2b3b001c7cd79e/DCMS_Transactions_over__25_000_January_2024.ods" &
curl -sL -o "$DIR/dcms_02.ods" "https://assets.publishing.service.gov.uk/media/660587faf9ab41001aeea4f6/DCMS_Transactions_over__25_000_February_2024.ods" &
curl -sL -o "$DIR/dcms_03.ods" "https://assets.publishing.service.gov.uk/media/662a692e55e1582b6ca7e69c/DCMS_Transactions_over__25_000_March_2024.ods" &
curl -sL -o "$DIR/dcms_04.ods" "https://assets.publishing.service.gov.uk/media/66586fcbdc15efdddf1a8575/DCMS_Transactions_over__25_000_April_2024.ods" &
curl -sL -o "$DIR/dcms_05.ods" "https://assets.publishing.service.gov.uk/media/667d7aa04ae39c5e45fe4d54/DCMS_Transactions_over__25_000_May_2024.ods" &
curl -sL -o "$DIR/dcms_06.ods" "https://assets.publishing.service.gov.uk/media/66a25ace0808eaf43b50d74d/DCMS_Transactions_over__25_000_June_2024.ods" &
curl -sL -o "$DIR/dcms_07.ods" "https://assets.publishing.service.gov.uk/media/66d05f7959b0ec2e151f84ae/DCMS_Transactions_over__25_000_July_2024.ods" &
curl -sL -o "$DIR/dcms_08.ods" "https://assets.publishing.service.gov.uk/media/66ffc8eca31f45a9c765f138/DCMS_Transactions_over__25_000_August_2024.ods" &
curl -sL -o "$DIR/dcms_09.ods" "https://assets.publishing.service.gov.uk/media/675701b4a63e1781efb877c1/DCMS_Transactions_over__25_000_September_2024.ods" &
curl -sL -o "$DIR/dcms_10.ods" "https://assets.publishing.service.gov.uk/media/67ed4c8a199d1cd55b48c6a1/DCMS_Transactions_over__25_000_October_2024.ods" &
curl -sL -o "$DIR/dcms_11.ods" "https://assets.publishing.service.gov.uk/media/6765810bcdb5e64b69e30960/DCMS_Transactions_over__25_000_November_2024.ods" &
curl -sL -o "$DIR/dcms_12.ods" "https://assets.publishing.service.gov.uk/media/679c9fdda9ee53687470a2ec/DCMS_Transactions_over__25_000_December_2024.ods" &
wait
echo "DCMS done: $(ls -1 $DIR/dcms_*.ods | wc -l) files"
