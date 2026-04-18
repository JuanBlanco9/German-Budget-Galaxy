/* End-to-end trace test for the UK taxpayer pipeline.
 *
 * Synthetic scenario: Gareth, £42,000 gross salary, lives in Hillingdon, Band D.
 * Walk through: UKTax.calcTotal → UKVAT.estimate → UKCouncilTax.lookup → UKTrace.traceFlow
 * Assert: totals make sense, graph is connected, numbers reconcile.
 *
 * Run: node frontend/tax/uk_trace.test.js
 */

const fs = require('fs');
const path = require('path');
const UKTax = require('./uk_calc.js');
const UKVAT = require('./uk_vat.js');
const UKCouncilTax = require('./uk_council_tax.js');
const UKTrace = require('./uk_trace.js');

const D = path.join(__dirname, '..', '..', 'data', 'uk');
UKTax.setBands(JSON.parse(fs.readFileSync(path.join(D, 'fiscal', 'uk_tax_bands.json'), 'utf8')));
UKVAT.setShares(JSON.parse(fs.readFileSync(path.join(D, 'fiscal', 'uk_indirect_tax_shares_by_decile.json'), 'utf8')));
UKCouncilTax.setData(JSON.parse(fs.readFileSync(path.join(D, 'fiscal', 'council_tax', 'uk_council_tax_2024_25.json'), 'utf8')));

UKTrace.setTrees({
  spending: JSON.parse(fs.readFileSync(path.join(D, 'uk_budget_tree_2024.json'), 'utf8')),
  revenue:  JSON.parse(fs.readFileSync(path.join(D, 'fiscal', 'uk_revenue_2024_2025.json'), 'utf8')),
  psnb:     JSON.parse(fs.readFileSync(path.join(D, 'fiscal', 'uk_psnb_historical.json'), 'utf8')),
});

let pass = 0, fail = 0;
function t(name, fn) {
  try {
    const r = fn();
    if (r === true || r === undefined) { console.log(`  \x1b[32mPASS\x1b[0m  ${name}`); pass++; }
    else                                 { console.log(`  \x1b[31mFAIL\x1b[0m  ${name} — ${r}`); fail++; }
  } catch (e) {
    console.log(`  \x1b[31mERR\x1b[0m   ${name} — ${e.message}`); fail++;
  }
}
const approx = (a, b, tol = 1) => Math.abs(a - b) <= tol;

// ── Step 1: Direct taxes ──
const direct = UKTax.calcTotal(42000, '2024-25', 'rUK');

// IT: (42000 - 12570) × 0.20 = 29430 × 0.20 = 5886
// NI: (42000 - 12570) × 0.08 = 29430 × 0.08 = 2354.40
// total direct = 8240.40
t('Gareth direct taxes match manual calc', () => {
  return approx(direct.income_tax.total, 5886, 1) && approx(direct.national_insurance.total, 2354.4, 1);
});

// ── Step 2: Council Tax ──
const ct = UKCouncilTax.lookup({ council: 'Hillingdon', band: 'D' });
t('Hillingdon Band D council tax lookup resolves', () => ct && ct.amount_gbp > 1500 && ct.amount_gbp < 2500);

// ── Step 3: VAT estimate ──
const disposable = 42000 - direct.total_direct_tax - ct.amount_gbp;
const vat = UKVAT.estimate({
  grossSalary: 42000,
  disposableIncome: disposable,
  year: '2024-25',
});
t('VAT estimate yields positive total indirect', () => vat.total_indirect_gbp > 0 && vat.decile >= 1 && vat.decile <= 10);
t('VAT decile for £42k sits roughly in the middle', () => vat.decile >= 4 && vat.decile <= 7);

// ── Step 4: Full trace ──
const trace = UKTrace.traceFlow({
  gross_salary: 42000,
  income_tax: direct.income_tax.total,
  national_insurance: direct.national_insurance.total,
  vat_estimate: vat.per_tax_gbp.vat,
  council_tax: ct.amount_gbp,
  council_name: 'Hillingdon',
  fiscal_year_label: '2024-25',
  jurisdiction: 'rUK',
});

t('Trace produces nodes + links', () => trace.nodes.length > 5 && trace.links.length > 5);
t('Trace has a "user" source node', () => trace.nodes.some(n => n.id === 'user'));
t('Trace has a Consolidated Fund pool node', () => trace.nodes.some(n => n.id === 'consolidated_fund'));
t('Trace has borrowing node with positive per-household value', () => {
  const b = trace.nodes.find(n => n.id === 'borrowing');
  return b && b.per_household_gbp > 100;
});

// ── Reconciliation: user → HMRC buckets → CF must equal user.IT + NI + VAT ──
const userLinks = trace.links.filter(l => l.source === 'user');
const userTotal = userLinks.reduce((s, l) => s + l.value, 0);
const hmrcToCF = trace.links
  .filter(l => l.source.startsWith('hmrc_') && l.target === 'consolidated_fund')
  .reduce((s, l) => s + l.value, 0);

t('User outflows total = IT+NI+VAT+CT', () =>
  approx(userTotal, direct.total_direct_tax + ct.amount_gbp + vat.per_tax_gbp.vat, 1));

t('HMRC buckets fully flush to Consolidated Fund', () =>
  approx(hmrcToCF, direct.total_direct_tax + vat.per_tax_gbp.vat, 1));

// ── Spending side: CF outflows should ≈ (user's central contribution + borrowing share) ──
const cfOutflows = trace.links
  .filter(l => l.source === 'consolidated_fund')
  .reduce((s, l) => s + l.value, 0);
const expectedCFOut = (direct.total_direct_tax + vat.per_tax_gbp.vat)
                    + (trace.nodes.find(n => n.id === 'borrowing').per_household_gbp);
t('CF outflow distribution conserves user contribution + borrowing', () =>
  approx(cfOutflows, expectedCFOut, 2));

// ── Pretty print summary for manual eyeballing ──
console.log('\n=== Gareth, £42,000 rUK, Hillingdon Band D, 2024-25 ===\n');
const s = trace.summary;
console.log(`  Income Tax:       £${s.taxes_you_paid_gbp.income_tax.toFixed(0).padStart(8)}`);
console.log(`  NI:               £${s.taxes_you_paid_gbp.national_insurance.toFixed(0).padStart(8)}`);
console.log(`  VAT (est.):       £${s.taxes_you_paid_gbp.vat_estimated.toFixed(0).padStart(8)}   (decile ${vat.decile})`);
console.log(`  Council Tax:      £${s.taxes_you_paid_gbp.council_tax.toFixed(0).padStart(8)}`);
console.log(`  ─────────────────────────────────`);
console.log(`  Total taxes paid: £${s.taxes_you_paid_gbp.total.toFixed(0).padStart(8)}`);
console.log(`                    £${s.per_day_equivalent_gbp.toFixed(2).padStart(8)}/day`);
console.log(`  Effective rate:    ${(s.effective_rate_vs_salary * 100).toFixed(1)}% of gross`);
console.log(`\n  + Per-household borrowing: £${s.per_household_borrowing_gbp.toFixed(0)} (funded by gov debt)`);
console.log(`  = Effective total flowing through gov for you: £${s.effective_contribution_gbp.toFixed(0)}`);

console.log('\n  Spending flows from Consolidated Fund (your share):');
const spending = trace.links.filter(l => l.source === 'consolidated_fund');
spending.sort((a, b) => b.value - a.value);
for (const l of spending) {
  const tgt = trace.nodes.find(n => n.id === l.target);
  console.log(`    → ${tgt.name.padEnd(42)} £${l.value.toFixed(0).padStart(6)}`);
}

console.log(`\n${pass} passed, ${fail} failed, ${pass + fail} total\n`);
process.exit(fail === 0 ? 0 : 1);
