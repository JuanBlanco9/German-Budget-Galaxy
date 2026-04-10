#!/bin/bash
DIR="D:/germany-ngo-map/data/recipients/uk/spend25k"

echo "=== DfT (12 months) ==="
curl -sL -o "$DIR/dft_01.csv" "https://assets.publishing.service.gov.uk/media/66e953c87f20ecc7ec3aa27b/dfts-spending-over-_25000-for-january-2024.csv" &
curl -sL -o "$DIR/dft_02.csv" "https://assets.publishing.service.gov.uk/media/66e9564bf8082e9740881c2a/dfts-spending-over-_25000-for-february-2024.csv" &
curl -sL -o "$DIR/dft_03.csv" "https://assets.publishing.service.gov.uk/media/6708ff01e84ae1fd8592f1f4/dfts-spending-over-25000-for-march-2024.csv" &
curl -sL -o "$DIR/dft_04.csv" "https://assets.publishing.service.gov.uk/media/6708ffec080bdf716392f210/dfts-spending-over-25000-for-april-2024.csv" &
curl -sL -o "$DIR/dft_05.csv" "https://assets.publishing.service.gov.uk/media/6740908af4f9feabf492906b/dfts-spending-over-25_000-for-may-2024.csv" &
curl -sL -o "$DIR/dft_06.csv" "https://assets.publishing.service.gov.uk/media/674091a702bf39539bdee87a/dfts-spending-over-25_000-for-june-2024.csv" &
curl -sL -o "$DIR/dft_07.csv" "https://assets.publishing.service.gov.uk/media/678e3ef491b710d43488f639/dfts-spending-over-25000-for-july-2024.csv" &
curl -sL -o "$DIR/dft_08.csv" "https://assets.publishing.service.gov.uk/media/678e3fdeaf483d80fc9bdaf8/dfts-spending-over-25000-for-august-2024.csv" &
curl -sL -o "$DIR/dft_09.csv" "https://assets.publishing.service.gov.uk/media/67b2ff70b56d8b0856c2fd32/dft-spending-over-25000-for-september-2024.csv" &
curl -sL -o "$DIR/dft_10.csv" "https://assets.publishing.service.gov.uk/media/67b300df421271d7e45f57dc/dft-spending-over-25000-for-october-2024.csv" &
curl -sL -o "$DIR/dft_11.csv" "https://assets.publishing.service.gov.uk/media/67ff6534393a986ec5cf8de1/dfts-spending-over-_25000-for-november-2024.csv" &
curl -sL -o "$DIR/dft_12.csv" "https://assets.publishing.service.gov.uk/media/67ff667db73354468d1354fd/dfts-spending-over-_25000-for-december-2024.csv" &
wait
echo "DfT done: $(ls -1 $DIR/dft_*.csv | wc -l) files"

echo "=== HMRC (12 months) ==="
curl -sL -o "$DIR/hmrc_01.csv" "https://assets.publishing.service.gov.uk/media/65d76e5d87005a001180f876/HMRC_spending_over_25000_for_January_2024.csv" &
curl -sL -o "$DIR/hmrc_02.csv" "https://assets.publishing.service.gov.uk/media/6601630df1d3a06c5532acd6/HMRC_spending_over_25000_for_February_2024.csv" &
curl -sL -o "$DIR/hmrc_03.csv" "https://assets.publishing.service.gov.uk/media/662973a8932c7db64ca7e4fa/HMRC_spending_over_25000_for_March_2024.csv" &
curl -sL -o "$DIR/hmrc_04.csv" "https://assets.publishing.service.gov.uk/media/6657478ed470e3279dd33373/HMRC_spending_over_25000_for_April_2024.csv" &
curl -sL -o "$DIR/hmrc_05.csv" "https://assets.publishing.service.gov.uk/media/667d85c9aec8650b10090125/HMRC_spending_over_25000_for_May_2024.csv" &
curl -sL -o "$DIR/hmrc_06.csv" "https://assets.publishing.service.gov.uk/media/66a36c16ce1fd0da7b592d9c/HMRC_spending_over_25000_for_June_2024.csv" &
curl -sL -o "$DIR/hmrc_07.csv" "https://assets.publishing.service.gov.uk/media/66cef4730b53069322597bcf/HMRC_spending_over_25000_for_July_2024.csv" &
curl -sL -o "$DIR/hmrc_08.csv" "https://assets.publishing.service.gov.uk/media/66f511a53b919067bb48273d/HMRC_spending_over_25000_for_August_2024.csv" &
curl -sL -o "$DIR/hmrc_09.csv" "https://assets.publishing.service.gov.uk/media/67176ba1a0acc1ea2be2c35a/HMRC_spending_over_25000_for_September_2024.csv" &
curl -sL -o "$DIR/hmrc_10.csv" "https://assets.publishing.service.gov.uk/media/6746d6a9da210676b4ffe1d9/HMRC_spending_over_25000_for_October_2024.csv" &
curl -sL -o "$DIR/hmrc_11.csv" "https://assets.publishing.service.gov.uk/media/676972e9be7b2c675de309ee/HMRC_spending_over_25000_for_November_2024.csv" &
curl -sL -o "$DIR/hmrc_12.csv" "https://assets.publishing.service.gov.uk/media/679a49f20601880a921f7877/HMRC_spending_over_25000_for_December_2024.csv" &
wait
echo "HMRC done: $(ls -1 $DIR/hmrc_*.csv | wc -l) files"

echo "=== Home Office (12 months) ==="
curl -sL -o "$DIR/ho_01.csv" "https://assets.publishing.service.gov.uk/media/6601636f65ca2fc1fa7da78a/Home+Office+Spending+Over+25000+Janurary+2024.csv" &
curl -sL -o "$DIR/ho_02.csv" "https://assets.publishing.service.gov.uk/media/662764f6838212a903a7e4fa/Home+Office+Spending+Over+25000+February+2024.csv" &
curl -sL -o "$DIR/ho_03.csv" "https://assets.publishing.service.gov.uk/media/66559a8a0c8f88e868d33276/Home+Office+Spending+Over+25000+March+2024.csv" &
curl -sL -o "$DIR/ho_04.csv" "https://assets.publishing.service.gov.uk/media/667be89faec8650b10090051/Home+Office+Spending+Over+25000+April+2024.csv" &
curl -sL -o "$DIR/ho_05.csv" "https://assets.publishing.service.gov.uk/media/669a5a6dab418ab055592906/Home+Office+Spending+Over+25000+May+2024.csv" &
curl -sL -o "$DIR/ho_06.csv" "https://assets.publishing.service.gov.uk/media/66cda145b0bac21caec708ec/Home+Office+Spending+Over+25000+June+2024.csv" &
curl -sL -o "$DIR/ho_07.csv" "https://assets.publishing.service.gov.uk/media/66ed4102d82c72546b9a8c44/Home+Office+Spending+Over+25000+July+2024.csv" &
curl -sL -o "$DIR/ho_08.csv" "https://assets.publishing.service.gov.uk/media/6720b29287df31a87d8c47b0/Home+Office+Spending+Over+25000+Aug++2024.csv" &
curl -sL -o "$DIR/ho_09.csv" "https://assets.publishing.service.gov.uk/media/674445ef4a89e48361cb3515/Home+Office+Spending+Over+25000+September+2024.csv" &
curl -sL -o "$DIR/ho_10.csv" "https://assets.publishing.service.gov.uk/media/6758247bf72b1d96e06bbfb9/Home+Office+Spending+Over+25000+October+2024.csv" &
curl -sL -o "$DIR/ho_11.csv" "https://assets.publishing.service.gov.uk/media/6790bebf43f931eea1a34d9e/Home+Office+Spending+Over+25000+November+2024.csv" &
curl -sL -o "$DIR/ho_12.csv" "https://assets.publishing.service.gov.uk/media/67bde5de89b4a58925ac6d38/Home_Office_Spending_Over_25000_December_2024.csv" &
wait
echo "Home Office done: $(ls -1 $DIR/ho_*.csv | wc -l) files"
