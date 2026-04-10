#!/bin/bash
DIR="D:/germany-ngo-map/data/recipients/uk/spend25k"

echo "=== Cabinet Office (12 months) ==="
curl -sL -o "$DIR/cab_01.csv" "https://assets.publishing.service.gov.uk/media/65f9756b703c42001a58ef05/Cabinet_Office_-_spend_data_over__25_000_-_January_2024_CSV.csv" &
curl -sL -o "$DIR/cab_02.csv" "https://assets.publishing.service.gov.uk/media/6604135ce8c4420011220349/Annex_A_-_Expenditure_over__25_000_-_February_2024_-_Sheet1.csv" &
curl -sL -o "$DIR/cab_03.csv" "https://assets.publishing.service.gov.uk/media/66589515dc15efdddf1a8594/Expenditure-Over-25000-MARCH-2024.xlsx-Sheet1.csv" &
curl -sL -o "$DIR/cab_04.csv" "https://assets.publishing.service.gov.uk/media/665895420c8f88e868d333f1/Expenditure-Over-25000-APRIL-2024.xlsx-Sheet1.csv" &
curl -sL -o "$DIR/cab_05.csv" "https://assets.publishing.service.gov.uk/media/6682637b7d26b2be17a4b4a3/Expenditure-over-25000-MAY-2024-Sheet1.csv" &
curl -sL -o "$DIR/cab_06.csv" "https://assets.publishing.service.gov.uk/media/66a24860ce1fd0da7b592d22/Expenditure_over__25000_JUNE_2024_-_Sheet1.csv" &
curl -sL -o "$DIR/cab_07.csv" "https://assets.publishing.service.gov.uk/media/66d023a15f85c44e918b22a1/Expenditure_Over__25_000_-_JULY_2024_-_Sheet1.csv" &
curl -sL -o "$DIR/cab_08.csv" "https://assets.publishing.service.gov.uk/media/66f538b0a31f45a9c765ec91/Expenditure_Over__25_000_-_August_2024.csv" &
curl -sL -o "$DIR/cab_09.csv" "https://assets.publishing.service.gov.uk/media/671bb1651037a76fc9903e54/Expenditure_Over__25_000_-_September_2024.csv" &
curl -sL -o "$DIR/cab_10.csv" "https://assets.publishing.service.gov.uk/media/6740858553373262c0d825fe/Expenditure_Over__25_000_-_October_2024.csv" &
curl -sL -o "$DIR/cab_11.csv" "https://assets.publishing.service.gov.uk/media/675ac3b24cbda57cacd3477a/Expenditure_Over__25_000_-_November_2024.csv" &
curl -sL -o "$DIR/cab_12.csv" "https://assets.publishing.service.gov.uk/media/679a4a8f9e2b573e463f7f43/Expenditure_Over__25_000_-_December_2024.csv" &
wait
echo "Cabinet Office done: $(ls -1 $DIR/cab_*.csv | wc -l) files"

echo "=== MoJ (12 months) ==="
curl -sL -o "$DIR/moj_01.csv" "https://assets.publishing.service.gov.uk/media/691462779d50fc2fe8161660/MOJHQ_-_spend_January_2024.csv" &
curl -sL -o "$DIR/moj_02.csv" "https://assets.publishing.service.gov.uk/media/6914628f9d50fc2fe8161661/MOJHQ_-_spend_February_2024.csv" &
curl -sL -o "$DIR/moj_03.csv" "https://assets.publishing.service.gov.uk/media/691462b4493305b49ce6e65d/MOJHQ_-_spend_March_2024.csv" &
curl -sL -o "$DIR/moj_04.csv" "https://assets.publishing.service.gov.uk/media/692d859d2a37784b16ecf7a8/MOJHQ_-_spend_April_2024.csv" &
curl -sL -o "$DIR/moj_05.csv" "https://assets.publishing.service.gov.uk/media/692d85b5a245b0985f034336/MOJHQ_-_spend_May_2024.csv" &
curl -sL -o "$DIR/moj_06.csv" "https://assets.publishing.service.gov.uk/media/692d85ca9c1eda2cdf034348/MOJHQ_-_spend_June_2024.csv" &
curl -sL -o "$DIR/moj_07.csv" "https://assets.publishing.service.gov.uk/media/692d85e22a37784b16ecf7a9/MOJHQ_-_spend_July_2024.csv" &
curl -sL -o "$DIR/moj_08.csv" "https://assets.publishing.service.gov.uk/media/6971f07621a2f53a6a4fd446/MOJHQ_-_spend_Aug_2024.csv" &
curl -sL -o "$DIR/moj_09.csv" "https://assets.publishing.service.gov.uk/media/6971f09421a2f53a6a4fd447/MOJHQ_-_spend_Sep_2024.csv" &
curl -sL -o "$DIR/moj_10.csv" "https://assets.publishing.service.gov.uk/media/6971f0ae51bd707cb10ed885/MOJHQ_-_spend_Oct_2024.csv" &
curl -sL -o "$DIR/moj_11.csv" "https://assets.publishing.service.gov.uk/media/6971f0c93f2908a3490404ff/MOJHQ_-_spend_Nov_2024.csv" &
curl -sL -o "$DIR/moj_12.csv" "https://assets.publishing.service.gov.uk/media/6971f0e63f2908a349040500/MOJHQ_-_spend_Dec_2024.csv" &
wait
echo "MoJ done: $(ls -1 $DIR/moj_*.csv | wc -l) files"

echo "=== DSIT (12 months) ==="
curl -sL -o "$DIR/dsit_01.csv" "https://assets.publishing.service.gov.uk/media/67b367927c070e71525f5866/dsit-spending-over-25000-january-2024.csv" &
curl -sL -o "$DIR/dsit_02.csv" "https://assets.publishing.service.gov.uk/media/67b367a5d15c152ea555be80/dsit-spending-over-25000-february-2024.csv" &
curl -sL -o "$DIR/dsit_03.csv" "https://assets.publishing.service.gov.uk/media/67b367b27c070e71525f5867/dsit-spending-over-25000-march-2024.csv" &
curl -sL -o "$DIR/dsit_04.csv" "https://assets.publishing.service.gov.uk/media/68526923f2b86c081cfdb344/dsit-spending-over-25000-april-2024.csv" &
curl -sL -o "$DIR/dsit_05.csv" "https://assets.publishing.service.gov.uk/media/685269ed64cd9d9f5f1ec5d0/dsit-spending-over-25000-may-2024.csv" &
curl -sL -o "$DIR/dsit_06.csv" "https://assets.publishing.service.gov.uk/media/685269fb510376e43ffdb34b/dsit-spending-over-25000-june-2024.csv" &
curl -sL -o "$DIR/dsit_07.csv" "https://assets.publishing.service.gov.uk/media/68a5e2d59dc94e840696a3e8/dsit-spending-over-25000-july-2024.csv" &
curl -sL -o "$DIR/dsit_08.csv" "https://assets.publishing.service.gov.uk/media/68a5e2e3a6acbbc7fb96a3eb/dsit-spending-over-25000-august-2024.csv" &
curl -sL -o "$DIR/dsit_09.csv" "https://assets.publishing.service.gov.uk/media/68a5e2efae61a32c04994d75/dsit-spending-over-25000-september-2024.csv" &
curl -sL -o "$DIR/dsit_10.csv" "https://assets.publishing.service.gov.uk/media/69735a11a1311bdcfa0ed929/dsit-spending-over-25000-october-2024.csv" &
curl -sL -o "$DIR/dsit_11.csv" "https://assets.publishing.service.gov.uk/media/69735b4b21a2f53a6a4fd4f2/dsit-spending-over-25000-november-2024.csv" &
curl -sL -o "$DIR/dsit_12.csv" "https://assets.publishing.service.gov.uk/media/69735a33a1311bdcfa0ed92a/dsit-spending-over-25000-december-2024.csv" &
wait
echo "DSIT done: $(ls -1 $DIR/dsit_*.csv | wc -l) files"

echo "=== FCDO (12 months) ==="
curl -sL -o "$DIR/fcdo_01.csv" "https://assets.publishing.service.gov.uk/media/671a535c593bb124be9c145c/FCDO_spend_25k_January_2024.csv" &
curl -sL -o "$DIR/fcdo_02.csv" "https://assets.publishing.service.gov.uk/media/671a53f1593bb124be9c145d/FCDO_spend_25k_February_2024.csv" &
curl -sL -o "$DIR/fcdo_03.csv" "https://assets.publishing.service.gov.uk/media/671a543cf7c956b7d065a48d/FCDO_spend_25k_March_2024.csv" &
curl -sL -o "$DIR/fcdo_04.csv" "https://assets.publishing.service.gov.uk/media/671a54a2da8fb5e23e65a4a7/FCDO_spend_25k_April_2024.csv" &
curl -sL -o "$DIR/fcdo_05.csv" "https://assets.publishing.service.gov.uk/media/671a5508593bb124be9c145f/FCDO_spend_25k_May_2024.csv" &
curl -sL -o "$DIR/fcdo_06.csv" "https://assets.publishing.service.gov.uk/media/671a55c6f7c956b7d065a493/FCDO_spend_25k_June_2024.csv" &
curl -sL -o "$DIR/fcdo_07.csv" "https://assets.publishing.service.gov.uk/media/671a56526018ea87ac85a608/FCDO_spend_25k_July_2024.csv" &
curl -sL -o "$DIR/fcdo_08.csv" "https://assets.publishing.service.gov.uk/media/671a57b1da8fb5e23e65a4ae/FCDO_spend_25k_August_2024.csv" &
curl -sL -o "$DIR/fcdo_09.csv" "https://assets.publishing.service.gov.uk/media/671a586cb31c669e899c1475/FCDO_spend_25k_September_2024.csv" &
curl -sL -o "$DIR/fcdo_10.csv" "https://assets.publishing.service.gov.uk/media/67449fc34a89e48361cb35dd/FCDO_spend_25k_October_2024.csv" &
curl -sL -o "$DIR/fcdo_11.csv" "https://assets.publishing.service.gov.uk/media/67c038c072e83aab48866b7c/FCDO_Spend_25k_November_2024.csv" &
curl -sL -o "$DIR/fcdo_12.csv" "https://assets.publishing.service.gov.uk/media/67c03842a0f0c95a498d2027/FCDO_Spend_25k_December_2024.csv" &
wait
echo "FCDO done: $(ls -1 $DIR/fcdo_*.csv | wc -l) files"
