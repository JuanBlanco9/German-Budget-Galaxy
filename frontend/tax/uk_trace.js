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
 *                                         │      ├──► [Your Council — grant]
 *                                         │      └──► [Other councils]
 *                                         │
 *                                         └──► [Debt Interest]
 *
 *   [You] ──Council Tax────────────► [Your Council — direct]
 *                                          │
 *                                          ├──► [Adult Social Care]
 *                                          ├──► [Education]
 *                                          ├──► [Children's Social Care]
 *                                          └──► ...
 *
 * Returns a shape friendly to d3-sankey:
 *   { nodes: [...], links: [{source, target, value, ...}], summary: {...} }
 *
 * Methodology (pro-rata + real council data, as of day-3):
 *   - Each £ of HMRC receipts funds a share of central spending = spending_line /
 *     total_central_spending.
 *   - The user's share of each spending line = their HMRC contribution ×
 *     spending_line_share.
 *   - For the Local Gov bucket: we split it PROPERLY using MHCLG's Revenue
 *     Outturn — user's share of central grants to their specific council =
 *     effectiveContribution × localgov_share × (their_council_grants /
 *     sum_of_all_councils_grants).
 *   - Council Tax goes DIRECTLY to the user's billing authority, not via the
 *     Consolidated Fund.
 *   - Per-household PSNB (OBR) is added as a separate source into the
 *     Consolidated Fund, scaled to the user's household.
 */
(function (global) {
  'use strict';

  // Household-count figure for PSNB per-household apportionment.
  // ONS estimates ~28.4 million UK households in 2023.
  const UK_HOUSEHOLD_COUNT = 28_400_000;

  let _spendingTree = null;
  let _revenueTree = null;
  let _psnb = null;
  let _councilFinance = null;

  async function loadTrees(opts = {}) {
    const urls = {
      spending:        opts.spendingUrl        || '/data/uk/uk_budget_tree_2024.json',
      revenue:         opts.revenueUrl         || '/data/uk/fiscal/uk_revenue_2024_2025.json',
      psnb:            opts.psnbUrl            || '/data/uk/fiscal/uk_psnb_historical.json',
      councilFinance:  opts.councilFinanceUrl  || '/data/uk/fiscal/uk_council_finance_2023_24.json',
    };
    const [s, r, p, cf] = await Promise.all([
      fetch(urls.spending).then(x => x.json()),
      fetch(urls.revenue).then(x => x.json()),
      fetch(urls.psnb).then(x => x.json()),
      fetch(urls.councilFinance).then(x => x.json()),
    ]);
    _spendingTree = s;
    _revenueTree = r;
    _psnb = p;
    _councilFinance = cf;
    return { spending: s, revenue: r, psnb: p, councilFinance: cf };
  }

  function setTrees({ spending, revenue, psnb, councilFinance }) {
    if (spending) _spendingTree = spending;
    if (revenue) _revenueTree = revenue;
    if (psnb) _psnb = psnb;
    if (councilFinance) _councilFinance = councilFinance;
  }

  function _psnbForYear(label) {
    if (!_psnb || !_psnb.series) return null;
    const match = _psnb.series.find(x => x.fiscal_year_label === label);
    if (match) return match;
    return _psnb.series[_psnb.series.length - 1];
  }

  function _normalise(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/\bcouncil\b/g, '')
      .replace(/\bborough\b/g, '')
      .replace(/\bcity of\b/g, '')
      .replace(/\bcity\b/g, '')
      .replace(/\bmetropolitan\b/g, '')
      .replace(/\bdistrict\b/g, '')
      .replace(/\bcounty\b/g, '')
      .replace(/&/g, 'and')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Find the council_finance record matching a council_name (best-effort). */
  function _findCouncilFinance(name) {
    if (!_councilFinance || !_councilFinance.councils) return null;
    const id = String(name || '').trim();
    if (!id) return null;
    const all = _councilFinance.councils;
    for (const c of all) if (c.name === id) return c;
    const nid = _normalise(id);
    for (const c of all) if (_normalise(c.name) === nid) return c;
    for (const c of all) {
      const cn = _normalise(c.name);
      if (cn.includes(nid) || nid.includes(cn)) return c;
    }
    return null;
  }

  function _groupSpending(tree) {
    const groups = {
      health: { name: 'Health & NHS', value: 0, matches: [
        'DEPARTMENT OF HEALTH', 'NHS Provider Sector',
      ]},
      dwp: { name: 'Work & Pensions', value: 0, matches: [
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
      local_gov: { name: 'Local Government grants', value: 0, matches: [
        'Local Government (England)',
        'MINISTRY OF HOUSING, COMMUNITIES AND LOCAL GOVERNMENT',
      ]},
      devolved: { name: 'Scotland / Wales / NI block grants', value: 0, matches: [
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
      other: { name: 'Other departments', value: 0, matches: [] },
    };

    const ucMatch = (deptName, needle) => {
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
          if (ucMatch(child.name, needle)) {
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

  /** Build the full trace graph.
   *
   *  input = {
   *    gross_salary, income_tax, national_insurance, vat_estimate,
   *    council_tax, council_name, fiscal_year_label, jurisdiction,
   *  }
   *
   *  Returns { nodes, links, summary } with link values populated at the
   *  USER'S POUND LEVEL — every link value is "£ of yours flowing through this
   *  edge this year".
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

    // ── Revenue totals (HMRC) ──
    const revTree = _revenueTree;
    const totalHMRC_gbp = (revTree.value_gbp_m || 0) * 1e6;
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

    // ── Borrowing ──
    const psnb = _psnbForYear(input.fiscal_year_label || '2024-25');
    const psnb_gbp = psnb ? (psnb.psnb_gbp_m || 0) * 1e6 : 0;
    const per_household_borrowing = psnb_gbp / UK_HOUSEHOLD_COUNT;

    // ── User contributions (£) ──
    const userIT = Number(input.income_tax) || 0;
    const userNI = Number(input.national_insurance) || 0;
    const userVAT = Number(input.vat_estimate) || 0;
    const userCT = Number(input.council_tax) || 0;
    const userCF_total = userIT + userNI + userVAT;
    const effectiveContribution = userCF_total + per_household_borrowing;

    // ── Find user's council in the finance data ──
    const userCouncilFinance = _findCouncilFinance(input.council_name);
    const councilGrantsTotal =
      _councilFinance?.totals?.central_grants_to_all_councils_gbp || 0;
    const userCouncilGrants = userCouncilFinance?.central_grants_in_gbp || 0;
    const userCouncilShareOfGrants =
      councilGrantsTotal > 0 ? userCouncilGrants / councilGrantsTotal : 0;

    // ── NODES ──
    addNode('user', 'You', 'source', { salary: input.gross_salary });
    addNode('hmrc_income_tax', 'HMRC · Income Tax', 'revenue_bucket',
            { annual_total_gbp: totalIncomeTax_gbp });
    addNode('hmrc_ni', 'HMRC · National Insurance', 'revenue_bucket',
            { annual_total_gbp: totalNI_gbp });
    addNode('hmrc_vat', 'HMRC · VAT', 'revenue_bucket',
            { annual_total_gbp: totalVAT_gbp });
    addNode('borrowing', 'Gov borrowing (your household share)', 'debt',
            { annual_total_gbp: psnb_gbp, per_household_gbp: per_household_borrowing });
    addNode('consolidated_fund', 'Consolidated Fund', 'pool',
            { annual_total_gbp: totalSpending_gbp });

    for (const key of Object.keys(groups)) {
      if (key === 'local_gov') continue; // handled specially
      const g = groups[key];
      addNode(`spend_${key}`, g.name, 'spending',
              { annual_total_gbp: g.value,
                share_of_spending: g.value / totalSpending_gbp });
    }
    // Intermediate local-gov grant pool
    const localGov = groups.local_gov;
    addNode('spend_local_gov', localGov.name, 'spending',
            { annual_total_gbp: localGov.value,
              share_of_spending: localGov.value / totalSpending_gbp });

    // User's council nodes
    const userCouncilDirectId = 'council_direct';
    const userCouncilGrantId = 'council_grant';
    addNode(userCouncilDirectId, `${input.council_name || 'Your Council'} (Council Tax)`,
            'local_pool',
            { total_ct_per_household: null });
    addNode(userCouncilGrantId, `${input.council_name || 'Your Council'} (central grant share)`,
            'local_pool',
            { central_grants_to_council_gbp: userCouncilGrants,
              share_of_all_council_grants: userCouncilShareOfGrants });
    addNode('council_other', 'Other councils (rest of England)', 'local_pool',
            { n_other_councils: (_councilFinance?.council_count || 0) - 1 });

    // ── LINKS: Revenue in ──
    addLink('user', 'hmrc_income_tax', userIT, 'Income Tax');
    addLink('user', 'hmrc_ni', userNI, 'National Insurance');
    addLink('user', 'hmrc_vat', userVAT, 'VAT (estimated)');
    addLink('user', userCouncilDirectId, userCT, 'Council Tax (direct)');

    addLink('hmrc_income_tax', 'consolidated_fund', userIT);
    addLink('hmrc_ni', 'consolidated_fund', userNI);
    addLink('hmrc_vat', 'consolidated_fund', userVAT);
    addLink('borrowing', 'consolidated_fund', per_household_borrowing,
            'Borrowed on your behalf this year');

    // ── LINKS: Central spending distribution (pro-rata) ──
    for (const key of Object.keys(groups)) {
      const g = groups[key];
      const userShare = effectiveContribution * (g.value / totalSpending_gbp);
      if (key === 'local_gov') {
        // CF → local_gov pool
        addLink('consolidated_fund', 'spend_local_gov', userShare);
        // local_gov pool → your council grant (real share)
        const toYourCouncil = userShare * userCouncilShareOfGrants;
        const toOthers = userShare - toYourCouncil;
        addLink('spend_local_gov', userCouncilGrantId, toYourCouncil,
                'Your council\'s share of central grants');
        addLink('spend_local_gov', 'council_other', toOthers,
                'Share going to all other councils');
      } else {
        addLink('consolidated_fund', `spend_${key}`, userShare);
      }
    }

    // ── LINKS: The user's council → services ──
    // We attribute user's contribution to their council proportionally across
    // the services that council spends on (from RS_*_net_exp data).
    const totalToUserCouncil =
      userCT + effectiveContribution *
        (localGov.value / totalSpending_gbp) * userCouncilShareOfGrants;

    if (userCouncilFinance && userCouncilFinance.services_net_gbp) {
      const services = userCouncilFinance.services_net_gbp;
      const serviceTotal = Object.values(services).reduce((a, b) => a + b, 0);
      if (serviceTotal > 0) {
        for (const [name, value] of Object.entries(services)) {
          if (value <= 0) continue;
          const id = `cs_${_slug(name)}`;
          addNode(id, name, 'council_service', { annual_total_gbp: value });
          const userShare = totalToUserCouncil * (value / serviceTotal);
          addLink(userCouncilDirectId, id, userShare / 2);
          addLink(userCouncilGrantId, id, userShare / 2);
        }
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
      per_day_equivalent_gbp: (userIT + userNI + userVAT + userCT) / 365,
      effective_rate_vs_salary:
        input.gross_salary > 0
          ? (userIT + userNI + userVAT + userCT) / input.gross_salary
          : 0,
      council_facts: userCouncilFinance
        ? {
            name: userCouncilFinance.name,
            ons_code: userCouncilFinance.ons_code,
            class: userCouncilFinance.class,
            central_grants_received_gbp: userCouncilGrants,
            share_of_all_council_grants: userCouncilShareOfGrants,
            net_current_expenditure_gbp:
              userCouncilFinance.net_current_expenditure_gbp,
            your_share_of_central_grant_gbp: effectiveContribution *
              (localGov.value / totalSpending_gbp) * userCouncilShareOfGrants,
            your_total_to_this_council_gbp: totalToUserCouncil,
          }
        : null,
      caveats: [
        'Pro-rata distribution: government doesn\'t earmark individual taxes. '
        + 'This shows "for every £ spent, where a £ of yours would fit" — an '
        + 'approximation, not a legal trace.',
        'Borrowing (PSNB) shown as per-household share of the annual deficit.',
        'VAT is estimated from ONS decile consumption data.',
        'Council grant share uses real MHCLG Revenue Outturn data for the user\'s '
        + 'billing authority. Precepts flowing to county/GLA/police/fire via '
        + 'the council tax bill are collapsed into "Your Council" in this view.',
      ],
    };

    return { nodes, links, summary };
  }

  function _slug(s) {
    return String(s || '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  }

  const api = { loadTrees, setTrees, traceFlow };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.UKTrace = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
