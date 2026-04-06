import os

# Database
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://ngo_user:ngo_pass@45.77.165.30:5432/germany_ngo",
)

# API keys
DIP_API_KEY = os.getenv("DIP_API_KEY", "OSOegLs.PR2lwJ1dwCeje9vTj7FPOt3hvpYKtwKkhw")

# Scraper settings
REQUEST_DELAY = 0.5  # seconds between API calls
MAX_RETRIES = 3
RETRY_BACKOFF = 2.0  # exponential backoff multiplier

# IATI
IATI_BASE_URL = "https://iatidatastore.iatistandard.org/api/activities/"
IATI_PAGE_SIZE = 100
IATI_REPORTING_ORGS = ["XM-DAC-5", "XM-DAC-5-GIZ"]

# Bundeshaushalt — filenames differ by year
BUNDESHAUSHALT_URLS = {
    2015: "https://www.bundeshaushalt.de/static/daten/2015/soll/Haushalt_2015_utf8.csv",
    2016: "https://www.bundeshaushalt.de/static/daten/2016/soll/Haushalt_2016_utf8.csv",
    2017: "https://www.bundeshaushalt.de/static/daten/2017/soll/hh_2017_utf8.csv",
    2018: "https://www.bundeshaushalt.de/static/daten/2018/soll/hh_2018_utf8.csv",
    2019: "https://www.bundeshaushalt.de/static/daten/2019/soll/hh_2019_utf8.csv",
    2020: "https://www.bundeshaushalt.de/static/daten/2020/soll/hh_2020_utf8.csv",
    2021: "https://www.bundeshaushalt.de/static/daten/2021/soll/hh_2021_n2_utf8.csv",
    2022: "https://www.bundeshaushalt.de/static/daten/2022/soll/hh_2022_utf8.csv",
    2023: "https://www.bundeshaushalt.de/static/daten/2023/soll/HH_2023.csv",
    2024: "https://www.bundeshaushalt.de/static/daten/2024/soll/HH_2024.csv",
}
BUNDESHAUSHALT_YEARS = list(BUNDESHAUSHALT_URLS.keys())

# Berlin ZDB
BERLIN_ZDB_URL = (
    "https://www.berlin.de/sen/finanzen/service/zuwendungsdatenbank/"
    "index.php/api/1/georss.json"
)
BERLIN_ZDB_PAGE_SIZE = 100

# OECD CRS
OECD_CRS_BULK_URL = (
    "https://stats.oecd.org/DownloadFiles.aspx?HF=PC_AXA&DatasetCode=CRS1"
)

# Bundestag DIP
DIP_BASE_URL = "https://search.dip.bundestag.de/api/v1"
DIP_SEARCH_TERMS = [
    "Zuwendungen Nichtregierungsorganisationen",
    "Zuwendungen NGO",
    "Förderung zivilgesellschaftlicher Organisationen",
]

# FragDenStaat
FRAGDENSTAAT_BASE_URL = "https://fragdenstaat.de/api/v1/request/"
FRAGDENSTAAT_SEARCH_TERMS = [
    "Zuwendungen NGO",
    "Nichtregierungsorganisationen Förderung",
]

# Einzelplan → Ministry mapping
EINZELPLAN_TO_MINISTRY = {
    "04": "BUNDESKANZLERAMT",
    "05": "AA",
    "06": "BMI",
    "09": "BMWK",
    "10": "BMEL",
    "11": "BMAS",
    "12": "BMVD",
    "14": "BMVg",
    "15": "BMG",
    "16": "BMUV",
    "17": "BMFSFJ",
    "23": "BMZ",
    "30": "BMBF",
}

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)
