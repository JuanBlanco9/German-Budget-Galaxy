# France Data Expert -- Budget Galaxy

## Fuentes oficiales verificadas

### PLF (Projet de Loi de Finances)
- **URL**: https://data.economie.gouv.fr (Ministry of Economy open data)
- **Formato**: CSV, hierarchy: Ministry > Mission > Programme > Action
- **Campo correcto**: CP (credits de paiement) -- expenditure commitments
- **NUNCA usar**: AE (autorisations d'engagement) -- multi-year authorizations, inflates totals
- **Anos**: 2015-2025
- **2015-2019 format**: `plf_YYYY_bg_msn_dest.csv` (Mission > Programme > Action, no ministry codes)
- **2020-2025 format**: `plf_YYYY_depenses.csv` (Ministry > Mission > Programme > Action, richer)
- **2017 EXCEPTION**: Uses LFI (Loi de Finances promulguee, enacted law) instead of PLF because PLF 2017 CSV is truncated at source (34KB vs 150KB+ for other years)
- **Valor PLF 2024**: EUR 812.1B
- **Parsers**: `scripts/build_fr_trees_2015_2019.js` (old format), `scripts/build_fr_trees_all.js` (new format)

### Protection Sociale (DREES)
- **What it IS**: Comptes de la Protection Sociale (CPS) -- comprehensive social protection spending by risk category (Health, Old Age, Family, Employment, Housing, Poverty)
- **What it is NOT**: PLFSS institutional breakdown (which is by caisse: CNAM, CNAV, CNAF). DREES CPS is functional, not institutional.
- **URL**: https://data.drees.solidarites-sante.gouv.fr
- **Dataset**: Comptes de la Protection Sociale
- **Formato**: CSV (semicolon-separated, UTF-8-sig)
- **Filter**: `nom_regime` contains "Total tous" (all regimes combined)
- **Anos**: 2000-2024 (25 years in DREES; integrated 2020-2024 in trees)
- **2015-2019**: SS data exists in DREES but was NOT in the PLF tree format before 2020
- **Valor SS 2024**: EUR 932.5B
- **6 risk categories**: Sante (EUR 347.8B), Vieillesse-Survie (EUR 426.7B), Famille (EUR 60.5B), Emploi (EUR 46.6B), Logement (EUR 20.2B), Pauvrete (EUR 30.9B)
- **Parser**: `scripts/build_fr_ss_trees.py`
- **Files**: `data/fr/securite_sociale/fr_ss_tree_YYYY.json` (2000-2024; stubs for 2000-2019, full for 2020-2024)

### Collectivites (Eurostat S1313)
- **API URL**: `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/gov_10a_exp?geo=FR&sector=S1313&na_item=TE&unit=MIO_EUR&cofog99=GF01&cofog99=GF03&cofog99=GF04&cofog99=GF05&cofog99=GF06&cofog99=GF07&cofog99=GF08&cofog99=GF09&cofog99=GF10&time=YYYY`
- **Dataset**: gov_10a_exp, sector S1313 (Local government), COFOG classification
- **Unit**: MIO_EUR (millions), converted to EUR in trees
- **Anos**: 2015-2024 (2015-2022 final, 2023-2024 provisional)
- **2025 NO EXISTE** -- Eurostat publishes ~T+18-22 months, expect late 2026/early 2027
- **Last updated**: 2026-03-27
- **9 COFOG categories**: Economic Affairs, General Public Services, Social Protection, Education, Culture, Housing, Environmental Protection, Public Order, Health
- **Valor 2024**: EUR 329.7B
- **Parser**: `scripts/build_fr_collectivites_trees.js`
- **Files**: `data/fr/collectivites/fr_collectivites_tree_YYYY.json` (2015-2024, 10 files)
- **Raw data**: `data/fr/collectivites/eurostat_s1313_fr.json`
- **Integration**: `_loadFRCombinedTree()` in frontend combines PLF + collectivites in memory. Deducts "Relations avec les collectivites territoriales" program from PLF (~EUR 3-4B) to avoid double-counting.

## Scripts existentes y que hacen

| Script | Funcion |
|--------|---------|
| `scripts/build_fr_trees_all.js` | Parsea PLF CSVs 2020-2025 a tree JSON |
| `scripts/build_fr_trees_2015_2019.js` | Parsea PLF CSVs 2015-2019 (old format) |
| `scripts/build_fr_ss_trees.py` | Parsea DREES CPS CSV a SS tree JSONs |
| `scripts/build_fr_collectivites_trees.js` | Parsea Eurostat S1313 a collectivites trees |
| `scripts/deduce_intergovernmental_fr.js` | Calcula overlap PLF/DREES, genera intergovernmental_fr_YYYY.json |
| `scripts/update_fr_ministry_names.js` | Actualiza traducciones de nombres de ministerios |
| `scripts/merge_fr_translations.js` | Merge de fuentes de traduccion FR->EN |

## Estructura de datos en data/

```
data/fr/
  fr_budget_tree_{2015..2025}.json         # 11 integrated trees (PLF + SS)
  intergovernmental_fr_{2015..2025}.json    # 11 deduction files
  translations_fr_en.json                   # 350+ FR->EN translations
  program_enrichment.json                   # 1,631 enrichment entries
  securite_sociale/
    fr_ss_tree_{2000..2024}.json           # 25 SS trees (stubs pre-2020)
    securite_sociale_enrichment.json        # 239 entries
    drees_cps_2024.csv                      # Source DREES data
  collectivites/
    fr_collectivites_tree_{2015..2024}.json # 10 local govt trees
    eurostat_s1313_fr.json                  # Raw Eurostat data
  plf_{2015..2025}_*.csv                    # 11 source PLF CSV files
  enrichment_top50.json                     # Top 50 program descriptions
```

## Consolidacion fiscal -- RESUELTA

### Overlap PLF/DREES por ano

| Ano | CAS Pensions | Solidarite | Travail | Cohesion | Regimes Sp. | TOTAL | % Root |
|-----|-------------|-----------|---------|----------|-------------|-------|--------|
| 2015 | 0 | 18.2B | 21.7B | 13.4B | 6.4B | 59.7B | 4.8% |
| 2016 | 0 | 20.6B | 22.0B | 17.9B | 6.3B | 66.8B | 5.3% |
| 2017 | 0 | 21.2B | 15.5B | 19.1B | 6.3B | 62.0B | 5.3% |
| 2018 | 0 | 23.0B | 15.4B | 17.2B | 6.3B | 61.9B | 5.2% |
| 2019 | 0 | 25.1B | 12.4B | 16.7B | 6.3B | 60.5B | 4.9% |
| 2020 | 59.6B | 28.8B | 12.8B | 15.2B | 6.2B | 122.5B | 8.1% |
| 2021 | 60.2B | 29.9B | 13.4B | 16.0B | 6.2B | 125.7B | 8.1% |
| 2022 | 61.0B | 32.0B | 13.4B | 17.1B | 6.1B | 129.5B | 8.2% |
| 2023 | 64.4B | 33.4B | 20.9B | 17.9B | 6.1B | 142.6B | 8.5% |
| 2024 | 67.6B | 36.0B | 22.6B | 37.9B | 6.2B | 170.3B | 9.8% |
| 2025 | 68.9B | 34.3B | 21.6B | 23.8B | 6.0B | 154.5B | 18.8%* |

*2025 only has PLF (no SS), so pct_of_root is inflated

### Metodo del overlap
`scripts/deduce_intergovernmental_fr.js` scans PLF tree for 5 overlap categories:
- **CAS Pensions**: exact name match (case-insensitive) -- "Pensions" program
- **Solidarite**: substring match -- "Solidarite, insertion"
- **Travail**: substring match -- "Travail" programs
- **Cohesion**: substring match -- "Cohesion des territoires" / APL housing
- **Regimes speciaux**: substring match -- "Regimes sociaux"

### Collectivites deduction
`_loadFRCombinedTree()` in frontend:
- Removes "Relations avec les collectivites territoriales" from PLF (~EUR 3-4B)
- Adds collectivites sphere (EUR 246-330B from Eurostat)
- Adjusts parent ministry value and root total

## Gotchas y errores conocidos -- NO REPETIR

### 1. CAS Pensions false positive 2015-2019
- **Problem**: CAS Pensions (EUR 60-68B) is ABSENT from 2015-2019 PLF trees
- **Why**: Older PLF format (before 2020) did not include CAS as a separate program
- **Result**: Overlap jumps from EUR 60B (2019) to EUR 123B (2020)
- **This is NOT a bug** -- it's a structural change in how PLF CSVs are published
- **Fix applied**: deduce_intergovernmental_fr.js correctly shows 0 for CAS pre-2020

### 2. Salto EUR 62B -> EUR 123B in 2020
- **Cause**: CAS Pensions integration (see above) + COVID response spending
- **Why it's correct**: 2020 PLF format includes programs not in 2015-2019 format
- **Status**: Documented, no fix needed -- the data reflects reality

### 3. Housing & Community +24% in 2024 (collectivites)
- **Value**: EUR 29.4B (2023) -> EUR 36.4B (2024)
- **This is real**: Reflects significant increase in local housing/urban development spending
- **Status**: Provisional Eurostat data but verified

### 4. 2017 PLF truncated at source
- **Problem**: `plf_2017_bg_msn_dest.csv` is only 34KB (vs 150KB+ for other years)
- **Fix**: Use LFI 2017 (enacted law) instead of PLF 2017 (proposed)
- **Parser**: `build_fr_trees_2015_2019.js` handles this automatically

### 5. 2025 has no Protection Sociale data
- **Problem**: DREES typically publishes mid-year; 2025 SS not yet available
- **Result**: 2025 tree is PLF-only (EUR 823B), significantly lower than 2024 (EUR 1.74T)
- **Intergovernmental pct_of_root = 18.8%** looks anomalous but is correct (denominator is PLF only)

### 6. PLF CSV column: ALWAYS use CP, NEVER use AE
- **CP** (Credits de paiement): Actual spending authorization for the year
- **AE** (Autorisations d'engagement): Multi-year commitment authority, double-counts future years

### 7. Collectivites 2025 does NOT exist on Eurostat
- Typical lag: T+18-22 months
- Expected: late 2026 / early 2027
- `_loadFRCombinedTree()` handles this via `.catch(()=>null)` fallback

## Estado actual de cobertura

| Fuente | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 |
|--------|------|------|------|------|------|------|------|------|------|------|------|
| PLF | OK | OK | LFI | OK | OK | OK | OK | OK | OK | OK | OK |
| DREES SS | -- | -- | -- | -- | -- | OK | OK | OK | OK | OK | -- |
| Collectivites | OK | OK | OK | OK | OK | OK | OK | OK | OK(p) | OK(p) | -- |
| Intergovernmental | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK |

Legend: OK=complete, LFI=enacted law (not PLF), (p)=provisional, --=not available

## Proximas fuentes a explorar

- **DREES 2025 CPS**: Expected mid-2026. Will complete the 2025 tree.
- **Eurostat S1313 2025**: Expected late 2026/early 2027. Will extend collectivites.
- **OFGL (ofgl.fr)**: Observatoire des Finances publique Locales -- may have more granular local data
- **DGCL**: Direction Generale des Collectivites Locales -- publishes annual local finance reports

## Reglas criticas para este pais

1. PLF trees use CP (credits de paiement), NEVER AE
2. 2017 always uses LFI, not PLF (truncated source)
3. CAS Pensions is absent from 2015-2019 trees -- this is expected
4. SS integration only for 2020-2024 (2025 pending DREES publication)
5. Collectivites integrated via `_loadFRCombinedTree()` in memory, not on disk
6. "Relations avec les collectivites" deducted from PLF to avoid double-counting
7. Intergovernmental files document PLF/DREES overlap, NOT PLF/collectivites overlap

## Infraestructura del proyecto

- **Server**: 96.30.199.112 (Vultr Atlanta)
- **Path**: /opt/germany-ngo-map/
- **SSH**: `ssh -i ~/.ssh/id_agro_intel root@96.30.199.112`
- **Deploy frontend**: `scp -i ~/.ssh/id_agro_intel "D:/germany-ngo-map/frontend/index.html" root@96.30.199.112:/opt/germany-ngo-map/frontend/`
- **Validate JS**: `node -e "const h=require('fs').readFileSync('D:/germany-ngo-map/frontend/index.html','utf8');const s=h.indexOf('<script>');const e=h.lastIndexOf('</script>');try{new Function(h.slice(s+8,e));console.log('OK')}catch(e){console.log('ERR:'+e.message)}"`
- **Restart API**: `ssh -i ~/.ssh/id_agro_intel root@96.30.199.112 "pkill -f uvicorn; sleep 1; cd /opt/germany-ngo-map; nohup /opt/germany-ngo-map/venv/bin/uvicorn api.main:app --host 0.0.0.0 --port 8088 --workers 2 > /var/log/budgetgalaxy.log 2>&1 &"`

## Reglas de datos (INVIOLABLES)

1. NUNCA agregar datos sin fuente verificada y descargada
2. NUNCA usar aproximaciones del training data del LLM
3. SIEMPRE documentar URL + fecha de descarga en campo "source"
4. SIEMPRE crear intergovernmental_{cc}_{year}.json al combinar multiples niveles de gobierno
5. SIEMPRE validar JS antes de deployar
6. SIEMPRE hacer backup antes de modificar trees (`data/backups/`)
