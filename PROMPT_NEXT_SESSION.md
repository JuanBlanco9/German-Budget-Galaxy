# Budget Galaxy — Next Session (NHS Trusts + Local Government)

## Context
Read: AGENT_UK.md for full UK data knowledge.
Repo: https://github.com/JuanBlanco9/Budget-Galaxy
Live: https://budgetgalaxy.com
Server: 96.30.199.112 (Vultr Atlanta)

## CRITICAL ARCHITECTURE RULE
NHS Provider Sector and Local Government go as NEW top-level
siblings of existing departments, NEVER as children of DHSC
or any other department. If injected inside DHSC, the tree
adds £330B of double-counting and no number closes.

## Files already downloaded and ready to parse

### NHS TAC Data (Task 1)
- `data/uk/nhs_tac_trusts_2024.xlsx` (18.8MB, 66 NHS Trusts)
- `data/uk/nhs_tac_ft_2024.xlsx` (39.3MB, 143 Foundation Trusts)
- `data/uk/nhs_tac_illustrative.xlsx` (306KB, explains subcodes)
- Combined: 209 trusts, ~£130.8B total operating expenditure
- Key subcodes: EXP0390 (total op exp), STA0360 (total staff costs)
- Data is in "All data" sheet, MainCode=CY, values in GBP thousands
- Parse approach: filter by SubCode='EXP0390' + MainCode='CY' to get
  one row per trust with total expenditure

### Local Government England (Task 2)
- `data/uk/local_authorities/revenue_outturn_timeseries.csv` ALREADY EXISTS
- Contains 413 councils × 8 years (2017-2025)
- RSX columns: RSX_edu_net_cur_exp, RSX_asc_net_cur_exp,
  RSX_csc_net_cur_exp, RSX_hous_net_cur_exp, RSX_trans_net_cur_exp,
  RSX_env_net_cur_exp, RSX_phs_net_cur_exp, RSX_totsx_net_cur_exp
- Values in GBP thousands
- Filter by year=202403 (FY 2023-24) for 2024 tree
- Group by LA_class (County, Metropolitan, London Borough, Unitary, District)

## What to build

### Script: scripts/inject_nhs_trusts.js
1. Parse both TAC xlsx files
2. Extract: trust name, total expenditure, staff costs per trust
3. Classify trusts: Acute, Mental Health, Ambulance, Community, Specialist
4. Group by type
5. Inject as NEW top-level child of tree root with id="nhs_provider_sector"

### Script: scripts/inject_local_gov.js
1. Parse revenue_outturn_timeseries.csv for year=202403
2. Extract: council name, class, total net expenditure, service breakdown
3. Group by council type (County, Metro, London, Unitary, District)
4. Inject as NEW top-level child of tree root with id="local_government_england"

### After injection, verify:
- New nodes are siblings of "DEPARTMENT FOR WORK AND PENSIONS" etc.
- NOT children of any existing department
- Tree root value updated to include new nodes
- d3.pack() still works (no zero-value or negative nodes)

### Frontend: _loadUKCombinedTree() may need updating
- The devolved nations restructuring runs on every load
- New nodes should pass through untouched
- Test: load UK in Multiverse, check new nodes appear

## Deploy checklist
1. Validate JS: node -e "const h=require('fs')..."
2. Backup: cp frontend/index.html data/backups/...
3. Deploy trees: scp data/uk/uk_budget_tree_2024.json to server
4. Deploy frontend if changed
5. Test on budgetgalaxy.com

## Stretch goals (after Tasks 1+2)
- Devolved government internal spending (Scotland/Wales/NI)
- L5 supplier data for individual NHS trusts
- Coverage calculation: (central + NHS + LG) / UK TME £1,205B
