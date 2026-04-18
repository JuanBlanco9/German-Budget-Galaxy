/* Budget Galaxy — UK taxpayer flow tracer.
 *
 * Given a user profile (salary, jurisdiction, council, band), build a directed
 * graph of how their money flows:
 *
 *   [You] ──Income Tax──► [HMRC] ──┐
 *         ──NI──────────► [HMRC] ──┤
 *         ──VAT (est.)──► [HMRC] ──┼──► [Consolidated Fund]
 *                                  │      │
 *   [Borrowing/head] ──────────────┘      ├──► [Health]
 *                                         ├──► [DWP]
 *                                         ├──► [Education]
 *                                         ├──► [Defence]
 *                                         ├──► [Local Gov grants]
 *                                         │      └──► [Your Council grants]
 *                                         │               │
 *                                         └──► [Debt Interest]
 *                                                         │
 *   [You] ──Council Tax──────────────────► [Your Council] ┘
 *                                                         │
 *                                                         ├──► [Social Care]
 *                                                         ├──► [Education (local)]
 *                                                         └──► ...
 *
 * The graph is returned in a shape friendly to d3-sankey:
 *   { nodes: [...], links: [{source, target, value, ...}], summary: {...} }
 *
 * Pro-rata methodology:
 *   - Each £ of HMRC receipts funds a share of central spending = spending_line /
 *     total_central_spending. The user's share of each spending line = their
 *     HMRC contribution × spending_line_share.
 *   - Per-household borrowing (from OBR PSNB) is added as a separate source node
 *     into the Consolidated Fund, scaled to ~per-household.
 *   - Council Tax goes directly to the user's council — not via Consolidated Fund.
 *
 * The flow is an approximation (government does not earmark taxes in reality —
 * all revenue flows into one Consolidated Fund). The pro-rata split reflects
 * "for every £X the government spends, where did £Y of yours come from".
 */
(function (global) {
  'use strict';

  // Household-count figure for PSNB per-household apportionment.
  // ONS estimates ~28.4 million UK households in 2023. We hard-code.
  const UK_HOUSEHOLD_COUNT = 28_400_000;

  let _spendingTree = null;
  let _revenueTree = null;
  let _psnb = null;

  async function loadTrees(opts = {}) {
    const spendUrl = opts.spendingUrl || '/data/uk/uk_budget_tree_2024.json';
    const revUrl = opts.revenueUrl || '/data/uk/fiscal/uk_revenue_2024_2025.json';
    const psnbUrl = opts.psnbUrl || '/data/uk/fiscal/uk_psnb_historical.json';
    const [s, r, p] = await Promise.all([
      fetch(spendUrl).then(x => x.json()),
      fetch(revUrl).then(x => x.json()),
      fetch(psnbUrl).then(x => x.json()),
    ]);
    _spendingTree = s;
    _revenueTree = r;
    _psnb = p;
    return { spending: _spendingTree, revenue: _revenueTree, psnb: _psnb };
  }

  function setTrees({ spending, revenue, psnb }) {
    if (spending) _spendingTree = spending;
    if (revenue) _revenueTree = revenue;
    if (psnb) _psnb = psnb;
  }

  /** Find PSNB for a fiscal_year_label like '2024-25'. Falls back to last known. */
  function _psnbForYear(label) {
    if (!_psnb || !_psnb.series) return null;
    const match = _psnb.series.find(x => x.fiscal_year_label === label);
    if (match) return match;
    // Fallback to most recent
    return _psnb.series[_psnb.series.length - 1];
  }

  /** Group the sprawling spending tree into ~10 visible top-level buckets.
   *  We keep the Local Gov and Scotland/Wales/NI blocks explicit — they matter
   *  for the "traced to YOUR council" story. Everything else rolls up.
   */
  function _groupSpending(tree) {
    const groups = {
      health: { name: 'Health & NHS', value: 0, matches: [
        'DEPARTMENT OF HEALTH', 'NHS Provider Sector',
      ]},
      dwp: { name: 'Work & Pensions (incl. State Pension)', value: 0, matches: [
        'DEPARTMENT FOR WORK AND PENSIONS',
      ]},
      education: { name: 'Education', value: 0, matches: [
        'DEPARTMENT FOR EDUCATION',
      ]},
      defence: { name: 'Defence', value: 0, matches: [
        'MINISTRY OF DEFENCE',
      ]},
      debt_interest: { name: 'Debt Interest', value: 0, matches: [
        'HM TREASURY',
      ]},
      local_gov: { name: 'Local Government (England)', value: 0, matches: [
        'Local Government (England)',
        'MINISTRY OF HOUSING, COMMUNITIES AND LOCAL GOVERNMENT',
      ]},
      devolved: { name: 'Scotland / Wales / NI (block grants)', value: 0, matches: [
        'SCOTLAND OFFICE', 'SCOTTISH GOVERNMENT',
        'WELSH ASSEMBLY GOVERNMENT', 'WALES OFFICE',
        'NORTHERN IRELAND EXECUTIVE', 'NORTHERN IRELAND OFFICE',
      ]},
      transport: { name: 'Transport', value: 0, matches: [
        'DEPARTMENT FOR TRANSPORT',
      ]},
      hmrc: { name: 'HMRC ops', value: 0, matches: [
        'HM REVENUE AND CUSTOMS',
      ]},
      other: { name: 'Other departments', value: 0, matches: [] /* catch-all */ },
    };

    const uppercaseMatch = (deptName, needle) => {
      const d = String(deptName || '').toUpperCase();
      const n = String(needle || '').toUpperCase();
      return d === n || d.startsWith(n + ' ') || d.includes(n);
    };

    let total = 0;
    for (const child of tree.children || []) {
      total += (child.value || 0);
      let routed = false;
      for (const key of Object.keys(groups)) {
        if (key === 'other') continue;
        const grp = groups[key];
        for (const needle of grp.matches) {
          if (uppercaseMatch(child.name, needle)) {
            grp.value += (child.value || 0);
            routed = true;
            break;
          }
        }
        if (routed) break;
      }
      if (!routed) groups.other.value += (child.value || 0);
    }
    return { groups, total };
  }

  /** Build the trace graph for one user scenario.
   *
   *  input = {
   *    gross_salary: 35000,
   *    income_tax: 4486,          // from uk_calc
   *    national_insurance: 1794,   // from uk_calc
   *    vat_estimate: 2250,         // from uk_vat
   *    council_tax: 1850,          // from uk_council_tax
   *    council_name: 'Hillingdon',
   *    fiscal_year_label: '2024-25',
   *  }
   */
  function traceFlow(input) {
    if (!_spendingTree || !_revenueTree || !_psnb)
      throw new Error('UKTrace: call loadTrees() first');

    const nodes = [];
    const links = [];
    const addNode = (id, name, type, extra) => {
      nodes.push({ id, name, type, ...(extra || {}) });
    };
    const addLink = (source, target, value, label, extra) => {
      if (value > 0) links.push({ source, target, value, label, ...(extra || {}) });
    };

    // ── Revenue totals from the HMRC tree (for proportional distribution) ──
    const revTree = _revenueTree;
    // revTree.value_gbp_m is total HMRC receipts in £m. Convert to £.
    const totalHMRC_gbp = (revTree.value_gbp_m || 0) * 1e6;
    // Per-tax totals (from the HMRC tree structure):
    let totalIncomeTax_gbp = 0, totalNI_gbp = 0, totalVAT_gbp = 0;
    for (const cat of revTree.children || []) {
      for (const ch of cat.children || []) {
        if (ch.id === 'uk_rev_income_tax') totalIncomeTax_gbp = (ch.value_gbp_m || 0) * 1e6;
        else if (ch.id === 'uk_rev_nic')   totalNI_gbp = (ch.value_gbp_m || 0) * 1e6;
        else if (ch.id === 'uk_rev_vat')   totalVAT_gbp = (ch.value_gbp_m || 0) * 1e6;
      }
    }

    // ── Spending groups ──
    const { groups, total: totalSpending_gbp } = _groupSpending(_spendingTree);

    // ── Borrowing apportionment ──
    const psnb = _psnbForYear(input.fiscal_year_label || '2024-25');
    const psnb_gbp_m = psnb ? (psnb.psnb_gbp_m || 0) : 0;
    const psnb_gbp = psnb_gbp_m * 1e6;
    const per_household_borrowing = psnb_gbp / UK_HOUSEHOLD_COUNT;

    // ── User's contribution amounts (in £) ──
    const userIT = Number(input.income_tax) || 0;
    const userNI = Number(input.national_insurance) || 0;
    const userVAT = Number(input.vat_estimate) || 0;
    const userCT = Number(input.council_tax) || 0;

    // Total user → central Consolidated Fund
    const userCF_total = userIT + userNI + userVAT;
    // User's total "cost to gov": their taxes + their share of borrowing
    const effectiveContribution = userCF_total + per_household_borrowing;

    // ── NODES ──
    addNode('user', 'You', 'source', { salary: input.gross_salary });
    addNode('hmrc_income_tax', 'HMRC · Income Tax',
            'revenue_bucket', { annual_total_gbp: totalIncomeTax_gbp });
    addNode('hmrc_ni', 'HMRC · National Insurance',
            'revenue_bucket', { annual_total_gbp: totalNI_gbp });
    addNode('hmrc_vat', 'HMRC · VAT',
            'revenue_bucket', { annual_total_gbp: totalVAT_gbp });
    addNode('borrowing', 'Gov borrowing (your household share)', 'debt',
            { annual_total_gbp: psnb_gbp, per_household_gbp: per_household_borrowing });
    addNode('consolidated_fund', 'Consolidated Fund (central gov pool)', 'pool',
            { annual_total_gbp: totalSpending_gbp });

    for (const key of Object.keys(groups)) {
      const g = groups[key];
      addNode(`spend_${key}`, g.name, 'spending',
              { annual_total_gbp: g.value, share_of_spending: g.value / totalSpending_gbp });
    }

    // Local gov further split for "your council"
    const userCouncilId = 'council_user';
    addNode(userCouncilId, `Your Council (${input.council_name || '—'})`, 'local_pool');
    addNode('council_other', 'Other councils (rest of England)', 'local_pool');

    // ── LINKS: Revenue side ──
    addLink('user', 'hmrc_income_tax', userIT, 'Income Tax');
    addLink('user', 'hmrc_ni', userNI, 'National Insurance');
    addLink('user', 'hmrc_vat', userVAT, 'VAT (estimated)');
    addLink('user', userCouncilId, userCT, 'Council Tax (direct)');

    addLink('hmrc_income_tax', 'consolidated_fund', userIT);
    addLink('hmrc_ni', 'consolidated_fund', userNI);
    addLink('hmrc_vat', 'consolidated_fund', userVAT);
    addLink('borrowing', 'consolidated_fund', per_household_borrowing,
            'Borrowed on your behalf this year');

    // ── LINKS: Central spending distribution (pro-rata) ──
    // User's slice of each spending group = effectiveContribution × (group / total).
    for (const key of Object.keys(groups)) {
      const g = groups[key];
      const userShare = effectiveContribution * (g.value / totalSpending_gbp);
      // Special handling for local_gov: split into "your council" vs "others"
      if (key === 'local_gov') {
        // Without full per-council grant data we approximate 1/N for user's council.
        // This is a placeholder; day-3 will integrate the MHCLG RS_ grant data
        // to compute the ACTUAL share going to the user's council.
        const nCouncils = 300; // approx English principal councils
        const toYourCouncil = userShare / nCouncils;
        const toOthers = userShare - toYourCouncil;
        addLink('consolidated_fund', userCouncilId, toYourCouncil,
                'Central grant to your council');
        addLink('consolidated_fund', 'council_other', toOthers,
                'Central grants to other councils');
      } else {
        addLink('consolidated_fund', `spend_${key}`, userShare);
      }
    }

    // ── Summary ──
    const summary = {
      gross_salary: input.gross_salary,
      jurisdiction: input.jurisdiction || 'rUK',
      fiscal_year_label: input.fiscal_year_label || '2024-25',
      council_name: input.council_name || null,
      taxes_you_paid_gbp: {
        income_tax: userIT,
        national_insurance: userNI,
        vat_estimated: userVAT,
        council_tax: userCT,
        total: userIT + userNI + userVAT + userCT,
      },
      per_household_borrowing_gbp: per_household_borrowing,
      effective_contribution_gbp: effectiveContribution + userCT,
      // Pounds per day ("£14.47/day")
      per_day_equivalent_gbp:
        ((userIT + userNI + userVAT + userCT) / 365),
      // Share of income
      effective_rate_vs_salary:
        input.gross_salary > 0
          ? (userIT + userNI + userVAT + userCT) / input.gross_salary
          : 0,
      caveats: [
        'Pro-rata distribution: government doesn\'t earmark individual taxes. '
        + 'This shows "for every £ spent, where a £ of yours would fit" — an '
        + 'approximation, not a legal trace.',
        'Borrowing (PSNB) shown as per-household share. This adds funding to '
        + 'the Consolidated Fund in addition to receipts.',
        'VAT figure is estimated from ONS decile consumption data.',
        'Council grant to your specific council is approximated (1/N) here; '
        + 'day-3 work will integrate MHCLG RS_ grant data for exact share.',
      ],
    };

    return { nodes, links, summary };
  }

  const api = { loadTrees, setTrees, traceFlow };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.UKTrace = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
