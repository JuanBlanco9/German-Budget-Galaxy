#!/usr/bin/env python3
"""
classify_uk_suppliers.py

Reads data/recipients/uk/supplier_ranking.json and assigns a `category` +
`ch_eligible` flag to every supplier using pure-regex rules. No external calls.

Categories:
  nhs_icb           NHS Integrated Care Boards (commissioning bodies)
  nhs_trust         NHS provider trusts / foundation trusts
  nhs_other         NHS England, NHS BSA, NHS Resolution, etc.
  council           Local authorities (councils, boroughs, counties, cities)
  govt_dept         Central govt depts and arms-length bodies acting as buyers
  public_body       Royal-charter / NDPB / statutory bodies (BBC, UKRI, HS2, Network Rail...)
  academic          Universities, research institutes
  housing           Housing associations
  charity           Trusts/charities/foundations (non-NHS)
  internal_code     Malformed / accounting codes / JVs / truncated strings
  commercial        Default — looks like a private company
  unclear           Short or ambiguous — worth trying CH

ch_eligible = True for: commercial, public_body, academic, housing, charity, unclear
              False for: nhs_icb, nhs_trust, nhs_other, council, govt_dept, internal_code

Output: data/recipients/uk/supplier_ranking_classified.json
"""

import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UK_DIR = ROOT / "data" / "recipients" / "uk"
IN = UK_DIR / "supplier_ranking.json"
OUT = UK_DIR / "supplier_ranking_classified.json"

# --- regex rules, ordered: first match wins ---

# NDPBs / executive agencies / royal charter bodies that are NOT in Companies House.
# Calling CH for these returns a wrong "phonetic" match. Keep them in the ranking but
# block the CH lookup. Their annual reports are at their own website (gov.uk/org/...).
PUBLIC_BODY_NDPB_NAMES = [
    r"\bHomes\s+England\b",
    r"\bOffice\s+[Ff]or\s+Students\b",
    r"\bUK\s+Space\s+Agency\b",
    r"\bThe\s+Royal\s+Society\b(?!\s+for)",  # Royal Society (science academy)
    r"\bRoyal\s+Academy\s+of\s+Engineering\b",
    r"\bEnvironment\s+Agency\b",
    r"\bMet\s+Office\b",
    r"\bNational\s+Savings\b",
    r"\bSport\s+England\b",
    r"\bArts\s+Council\b",
    r"\bBritish\s+Library\b",
    r"\bBritish\s+Council\b",
    r"\bUKRI\b|\bUK\s+Research\s+and\s+Innovation\b",
    r"\bInnovate\s+UK\b|\bUkri-innovate\s+Uk\b",
    r"\bResearch\s+Council\b",
    r"\bBuilding\s+Digital\s+UK\b|\bBDUK\b",
    r"\bStudent\s+Awards\s+Agency\b",
    r"\bSocial\s+Investment\s+Buisness\b|\bSocial\s+Investment\s+Business\b",
    r"\bCentre\s+for\s+Health\s+(&|and)\s+Disability\s+Assessment",
    r"\bGreater\s+London\s+Authority\b(?!\s+Holdings)",  # GLA the body, not GLA Holdings Ltd
    r"\bPension\s+Protection\s+Fund\b",
    r"\bNHS\s+Business\s+Services\s+Authority\b",  # explicit; caught by NHS rule but reinforce
    r"\bBank\s+of\s+England\b",
    r"\bBritish\s+Broadcasting\s+Corporation\b(?!\s+Ltd|\s+Limited)",  # BBC proper is RC, matches but noisy
    r"\bOrdnance\s+Survey\b(?!\s+Ltd|\s+Limited)",
    r"\bHealth\s+and\s+Social\s+Care\s+Board\b",  # NI HSCB, dissolved 2022
    r"\bHealth\s+Education\s+England\b",
    r"\bMarine\s+Management\s+Organisation\b",
    r"\bForestry\s+Commission\b",
    r"\bNatural\s+England\b",
]
NDPB_RULES = [(re.compile(p, re.I), "public_body_ndpb", False) for p in PUBLIC_BODY_NDPB_NAMES]

RULES: list[tuple[str, re.Pattern, bool]] = [
    # (category, pattern on display_name, ch_eligible)

    # NDPBs / royal charter / exec agencies — block CH lookup entirely.
    # These run FIRST so they win over the looser public_body rules below.
    *[(cat, pat, elig) for pat, cat, elig in NDPB_RULES],

    # international / supranational — must run BEFORE internal_code catches "IBRD-IFFIM"
    ("international_body", re.compile(r"\bEUROPEAN\s+COMMISSION\b", re.I), False),
    ("international_body", re.compile(r"\bEUROPEAN\s+UNION\b|\bEUROPEAN\s+INVESTMENT\s+BANK\b", re.I), False),
    ("international_body", re.compile(r"\bUNITED\s+NATIONS\b|\bUNHCR\b|\bUNICEF\b|\bUNDP\b|\bUNRWA\b", re.I), False),
    ("international_body", re.compile(r"\bWORLD\s+BANK\b|\bIBRD\b|\bIDA\b|\bIFC\b|\bIFFI?M\b", re.I), False),
    ("international_body", re.compile(r"\bIMF\b|\bInternational\s+Monetary\s+Fund\b", re.I), False),
    ("international_body", re.compile(r"\bOECD\b|\bNATO\b"), False),
    ("international_body", re.compile(r"\bWFP\b|\bWorld\s+Food\s+Programme\b", re.I), False),
    ("international_body", re.compile(r"\bWHO\b|\bWorld\s+Health\s+Organi[sz]ation\b", re.I), False),
    ("international_body", re.compile(r"\bGAVI\b", re.I), False),
    ("international_body", re.compile(r"\bOCCAR\b", re.I), False),
    ("international_body", re.compile(r"\bUnited\s+States\s+Government\b", re.I), False),
    ("international_body", re.compile(r"\bGovernment\s+of\s+\w+", re.I), False),
    ("international_body", re.compile(r"\bRepublic\s+of\s+\w+", re.I), False),

    # internal accounting / JV / malformed
    ("internal_code", re.compile(r"^\s*0*\d+\s*[-–—_]"), False),
    ("internal_code", re.compile(r"\(N\d+\)\s*$"), False),  # strictly (N1), (N2) — not (NHSBSA)
    ("internal_code", re.compile(r"\bOFFICE\s+OF\s+THE\s+PAYMASTER\s+GENERAL\b", re.I), False),
    ("internal_code", re.compile(r"\bJV\b"), False),  # any "JV" token
    ("internal_code", re.compile(r"\bJoint\s+Venture\b", re.I), False),
    ("internal_code", re.compile(r"\bJOINT\s*$", re.I), False),  # truncated "... JOINT"
    ("internal_code", re.compile(r"\bN/A\b|\bNOT\s+APPLICABLE\b|\bUNKNOWN\b|\bVARIOUS\b", re.I), False),
    ("internal_code", re.compile(r"^\s*-+\s*$|^\s*\.\s*$"), False),

    ("nhs_icb", re.compile(r"\bICB\b"), False),
    ("nhs_icb", re.compile(r"\bIntegrated\s+Care\s+Board\b", re.I), False),
    ("nhs_trust", re.compile(r"\bNHS\b.*\bFoundation\s+Trust\b", re.I), False),
    ("nhs_trust", re.compile(r"\bNHS\b.*\bTrust\b", re.I), False),
    ("nhs_trust", re.compile(r"\bNHS\s+Trust\b", re.I), False),
    ("nhs_other", re.compile(r"^\s*NHS\b", re.I), False),
    ("nhs_other", re.compile(r"\bNational\s+Health\s+Service\b", re.I), False),
    ("nhs_other", re.compile(r"\bCCG\b"), False),
    ("nhs_other", re.compile(r"\(NHS[A-Z]+\)\s*$"), False),  # (NHSBSA), (NHSBT), (NHSE)

    ("council", re.compile(r"\bCouncil\b", re.I), False),
    ("council", re.compile(r"\bCNCL\b", re.I), False),  # abbreviation used in DfE/MHCLG feeds
    ("council", re.compile(r"\bBorough\s+of\b", re.I), False),
    ("council", re.compile(r"\bCity\s+of\s+\w+", re.I), False),
    ("council", re.compile(r"\b(County|District|Metropolitan|Unitary)\s+(Council|Authority|Borough)\b", re.I), False),
    ("council", re.compile(r"\bLondon\s+Borough\b", re.I), False),
    ("council", re.compile(r"\bCombined\s+Authority\b", re.I), False),
    ("council", re.compile(r"\bParish\s+Council\b", re.I), False),
    ("council", re.compile(r"\bCC\b$"), False),  # "Kent CC", "Essex CC"
    ("council", re.compile(r"\bMBC\b"), False),  # Metropolitan Borough Council
    ("council", re.compile(r"\bDCC\b"), False),  # District County Council
    ("council", re.compile(r"\bLB\s*$"), False),  # "Lewisham LB"
    ("council", re.compile(r"\bGMCA\b|\bWMCA\b|\bLCRCA\b"), False),  # combined authorities
    ("council", re.compile(r"County\s*Council", re.I), False),  # catches "CountyCouncil" typo

    ("govt_dept", re.compile(r"^\s*(Department|Ministry|Office)\s+(of|for)\b", re.I), False),
    ("govt_dept", re.compile(r"^\s*HM\s+(Revenue|Treasury|Prison|Courts|Land)", re.I), False),
    ("govt_dept", re.compile(r"^\s*(Home|Cabinet|Foreign|Scotland|Wales)\s+Office\b", re.I), False),
    ("govt_dept", re.compile(r"\bGovernment\s+(Property|Legal|Digital)\b", re.I), False),
    ("govt_dept", re.compile(r"\bCrown\s+(Commercial|Prosecution|Estate|Office)\b", re.I), False),
    ("govt_dept", re.compile(r"^\s*(Welsh|Scottish|Northern\s+Ireland)\s+Government\b", re.I), False),
    ("govt_dept", re.compile(r"\bConsolidated\s+Fund\b", re.I), False),
    ("govt_dept", re.compile(r"\bExchequer\b", re.I), False),

    # public bodies — many ARE in Companies House (Network Rail, National Highways, SLC)
    ("public_body", re.compile(r"\bBritish\s+Broadcasting\b", re.I), True),
    ("public_body", re.compile(r"\bBBC\b"), True),
    ("public_body", re.compile(r"\bUKRI\b|\bUK\s+Research\s+and\s+Innovation\b", re.I), True),
    ("public_body", re.compile(r"\bResearch\s+Council\b", re.I), True),
    ("public_body", re.compile(r"\bNetwork\s+Rail\b", re.I), True),
    ("public_body", re.compile(r"\bNational\s+Highways\b", re.I), True),
    ("public_body", re.compile(r"\bHighways\s+England\b", re.I), True),
    ("public_body", re.compile(r"\bHS2\b", re.I), True),
    ("public_body", re.compile(r"\bHigh\s+Speed\s+Two\b", re.I), True),
    ("public_body", re.compile(r"\bStudent\s+Loans\s+Company\b", re.I), True),
    ("public_body", re.compile(r"\bEnvironment\s+Agency\b", re.I), True),
    ("public_body", re.compile(r"\bOfsted|Ofcom|Ofwat|Ofgem\b", re.I), True),
    ("public_body", re.compile(r"\bCQC\b|\bCare\s+Quality\s+Commission\b", re.I), True),
    ("public_body", re.compile(r"\bArts\s+Council\b", re.I), True),
    ("public_body", re.compile(r"\bSport\s+England\b", re.I), True),
    ("public_body", re.compile(r"\bNational\s+Audit\s+Office\b", re.I), True),
    ("public_body", re.compile(r"\bDriver\s+and\s+Vehicle\b", re.I), True),
    ("public_body", re.compile(r"\bDVLA\b|\bDVSA\b"), True),
    ("public_body", re.compile(r"\bTransport\s+for\s+London\b|\bTfL\b", re.I), True),
    ("public_body", re.compile(r"\bGreater\s+London\s+Authority\b|\bGLA\b", re.I), True),
    ("public_body", re.compile(r"\bPost\s+Office\s+(Ltd|Limited)\b", re.I), True),
    ("public_body", re.compile(r"\bRoyal\s+Mail\b", re.I), True),
    ("public_body", re.compile(r"\bBank\s+of\s+England\b", re.I), True),
    ("public_body", re.compile(r"\bFinancial\s+Conduct\s+Authority\b|\bFCA\b", re.I), True),
    ("public_body", re.compile(r"\bPension\s+Protection\s+Fund\b", re.I), True),
    ("public_body", re.compile(r"\bCivil\s+Aviation\s+Authority\b|\bCAA\b", re.I), True),
    ("public_body", re.compile(r"\bMaritime\s+and\s+Coastguard\b", re.I), True),
    ("public_body", re.compile(r"\bPublic\s+Health\s+England\b|\bUKHSA\b", re.I), True),
    ("public_body", re.compile(r"\bHomes\s+England\b", re.I), True),
    ("public_body", re.compile(r"\bInnovate\s+UK\b", re.I), True),
    ("public_body", re.compile(r"\bNational\s+Crime\s+Agency\b|\(NCA\)\s*$", re.I), True),
    ("public_body", re.compile(r"\bOffice\s+[Ff]or\s+Students\b", re.I), True),
    ("public_body", re.compile(r"\bUK\s+Space\s+Agency\b", re.I), True),
    ("public_body", re.compile(r"\bThe\s+Royal\s+Society\b", re.I), True),
    ("public_body", re.compile(r"\bBritish\s+Council\b", re.I), True),
    ("public_body", re.compile(r"\bMet\s+Office\b", re.I), True),
    ("public_body", re.compile(r"\bOrdnance\s+Survey\b", re.I), True),
    ("public_body", re.compile(r"\bCompanies\s+House\b", re.I), False),
    ("public_body", re.compile(r"\bRoyal\s+Academy\s+of\s+Engineering\b", re.I), True),
    ("public_body", re.compile(r"\bNational\s+Savings\b", re.I), True),
    ("public_body", re.compile(r"\bFCDO\s+Services\b", re.I), True),
    ("public_body", re.compile(r"\bBuilding\s+Digital\s+UK\b|\bBDUK\b", re.I), True),
    ("public_body", re.compile(r"\bStudent\s+Awards\s+Agency\b", re.I), True),
    ("public_body", re.compile(r"\bNational\s+Assembly\s+for\s+Wales\b", re.I), False),

    ("international_body", re.compile(r"\bUNICEF\b|\bChildren'?s\s+Fund\b", re.I), False),
    ("international_body", re.compile(r"\bOrganisation\s+for\s+Joint\s+Armaments\b", re.I), False),
    ("international_body", re.compile(r"\bUNFPA\b|\bPopulation\s+Fund\b", re.I), False),
    ("international_body", re.compile(r"\bICRC\b|\bInternational\s+Committee\s+of\s+the\s+Red\s+Cross\b", re.I), False),
    ("international_body", re.compile(r"\bIFRC\b|\bRed\s+Crescent\b", re.I), False),
    ("international_body", re.compile(r"\bIOM\b|\bInternational\s+Organi[sz]ation\s+for\s+Migration\b", re.I), False),
    ("international_body", re.compile(r"\bILO\b|\bInternational\s+Labour\s+Organi[sz]ation\b", re.I), False),
    ("international_body", re.compile(r"\bFAO\b|\bFood\s+and\s+Agriculture\s+Organi[sz]ation\b", re.I), False),
    ("international_body", re.compile(r"\bUNESCO\b|\bUNIDO\b|\bUNOPS\b|\bUNEP\b|\bUNODC\b"), False),
    ("international_body", re.compile(r"\bGlobal\s+Fund\b", re.I), False),
    ("international_body", re.compile(r"\bPTE\s+LTD\b|\bPTE\.\s+LTD\b", re.I), False),  # Singapore co — foreign jurisdiction

    # Rail — franchise operators, mostly Ltd but some appear without suffix in feeds
    ("commercial", re.compile(r"\b(Railway|Trains|Rail)\b\s*(Ltd|Limited|PLC)?\s*$", re.I), True),
    ("commercial", re.compile(r"\b(LNER|GWR|TFW|ScotRail|Merseyrail|Greater\s+Anglia)\b", re.I), True),

    ("academic", re.compile(r"^\s*University\s+of\b", re.I), True),
    ("academic", re.compile(r"\bUniversity\b.*\b(of|College)\b", re.I), True),
    ("academic", re.compile(r"\bImperial\s+College\b", re.I), True),
    ("academic", re.compile(r"\bKing'?s\s+College\b", re.I), True),
    ("academic", re.compile(r"\bRoyal\s+(Holloway|Veterinary)\b", re.I), True),
    ("academic", re.compile(r"\bLondon\s+School\s+of\b", re.I), True),
    ("academic", re.compile(r"\bInstitute\s+of\s+Technology\b", re.I), True),

    ("housing", re.compile(r"\bHousing\s+Association\b", re.I), True),
    ("housing", re.compile(r"\bHousing\s+(Group|Society|Trust)\b", re.I), True),
    ("housing", re.compile(r"\bPlaces\s+for\s+People\b", re.I), True),
    ("housing", re.compile(r"\bPeabody\b", re.I), True),

    ("charity", re.compile(r"\bCharity\b|\bCharitable\s+Trust\b", re.I), True),
    ("charity", re.compile(r"\bFoundation\s+(Ltd|Limited)?\s*$", re.I), True),
    ("charity", re.compile(r"\bBritish\s+Red\s+Cross\b|\bOxfam\b|\bSave\s+the\s+Children\b", re.I), True),
    ("charity", re.compile(r"\b(Action|Help)\s+for\b", re.I), True),
]

COMMERCIAL_HINT = re.compile(
    r"\b(Ltd|Limited|PLC|LLP|LLC|Inc|Incorporated|Corp|Corporation|Company|Co\.)\b",
    re.IGNORECASE,
)


def classify(name: str) -> tuple[str, bool]:
    for cat, pat, eligible in RULES:
        if pat.search(name):
            return cat, eligible
    if COMMERCIAL_HINT.search(name):
        return "commercial", True
    if len(name.strip()) < 4:
        return "unclear", False
    return "unclear", True


def main():
    if not IN.exists():
        print(f"Missing {IN}. Run build_uk_supplier_ranking.py first.", file=sys.stderr)
        sys.exit(1)

    data = json.loads(IN.read_text(encoding="utf-8"))
    suppliers = data["suppliers"]

    cat_counter: Counter = Counter()
    cat_spend: dict = Counter()
    cat_eligible_spend: dict = Counter()
    cat_eligible_count: Counter = Counter()

    for s in suppliers:
        cat, eligible = classify(s["display_name"])
        s["category"] = cat
        s["ch_eligible"] = eligible
        cat_counter[cat] += 1
        cat_spend[cat] += s["total_gbp"]
        if eligible:
            cat_eligible_spend[cat] += s["total_gbp"]
            cat_eligible_count[cat] += 1

    data["suppliers"] = suppliers
    data["classification_summary"] = {
        cat: {
            "count": cat_counter[cat],
            "total_gbp": cat_spend[cat],
            "ch_eligible_count": cat_eligible_count.get(cat, 0),
        }
        for cat in cat_counter
    }

    total_eligible = sum(1 for s in suppliers if s["ch_eligible"])
    total_eligible_spend = sum(s["total_gbp"] for s in suppliers if s["ch_eligible"])
    data["ch_lookup_plan"] = {
        "eligible_count": total_eligible,
        "eligible_spend_gbp": total_eligible_spend,
        "eligible_pct_of_total": round(total_eligible_spend / data["total_gbp"] * 100, 2),
    }

    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Wrote {OUT.relative_to(ROOT)}")
    print()
    print(f"{'Category':<18} {'Count':>7} {'Spend (£M)':>14} {'CH-eligible':>12}")
    print("-" * 60)
    for cat in sorted(cat_counter, key=lambda c: -cat_spend[c]):
        print(
            f"{cat:<18} {cat_counter[cat]:>7,} {cat_spend[cat]/1e6:>14,.0f} "
            f"{cat_eligible_count.get(cat, 0):>12,}"
        )
    print("-" * 60)
    print(
        f"{'TOTAL':<18} {sum(cat_counter.values()):>7,} "
        f"{sum(cat_spend.values())/1e6:>14,.0f} {total_eligible:>12,}"
    )
    print()
    print(
        f"CH lookup plan: {total_eligible:,} suppliers covering "
        f"£{total_eligible_spend/1e9:.1f}B "
        f"({data['ch_lookup_plan']['eligible_pct_of_total']}%)"
    )


if __name__ == "__main__":
    main()
