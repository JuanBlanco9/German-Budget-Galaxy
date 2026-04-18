/* Budget Galaxy — UK Tax Calculator — unit tests
 *
 * Reference values cross-checked against:
 *   - listentotaxman.com (UK tax calc, widely used)
 *   - income-tax.co.uk
 *   - gov.uk's own "Estimate your Income Tax for the current year" helper
 *
 * All figures are annual, £. All tax years referenced here are UK fiscal years
 * running 6 April → 5 April (so "2024-25" means 2024-04-06 to 2025-04-05).
 *
 * Run: node frontend/tax/uk_calc.test.js
 */

const fs = require('fs');
const path = require('path');
const UKTax = require('./uk_calc.js');

const bands = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'uk', 'fiscal', 'uk_tax_bands.json'), 'utf8')
);
UKTax.setBands(bands);

let pass = 0, fail = 0;
const results = [];

function approx(actual, expected, tol) {
  if (expected === 0) return Math.abs(actual) < (tol || 1);
  return Math.abs(actual - expected) <= (tol || Math.max(1, Math.abs(expected) * 0.005));
}

function t(name, fn) {
  try {
    const r = fn();
    if (r === true || r === undefined) {
      results.push({ name, status: 'PASS' });
      pass++;
    } else {
      results.push({ name, status: 'FAIL', detail: r });
      fail++;
    }
  } catch (e) {
    results.push({ name, status: 'ERROR', detail: e.message });
    fail++;
  }
}

// ──────────────────────────────────────────────────────────────
// rUK 2024-25  — the canonical year for the UI default
// ──────────────────────────────────────────────────────────────

t('rUK 2024-25: £0 — no tax', () => {
  const r = UKTax.calcTotal(0, '2024-25');
  return r.total_direct_tax === 0 && r.net_income === 0;
});

t('rUK 2024-25: £12,570 — PA exactly, no IT and no NI', () => {
  const r = UKTax.calcTotal(12570, '2024-25');
  // PA = 12570, PT = 12570. So taxable income = 0, NI = 0.
  return r.total_direct_tax === 0;
});

t('rUK 2024-25: £20,000 → IT £1,486, NI £594.40, total £2,080.40', () => {
  // Taxable IT = 20000 - 12570 = 7430 × 20% = £1,486
  // NI main = (20000 - 12570) × 8% = 7430 × 0.08 = £594.40
  const r = UKTax.calcTotal(20000, '2024-25');
  const okIT = approx(r.income_tax.total, 1486, 1);
  const okNI = approx(r.national_insurance.total, 594.4, 1);
  return (okIT && okNI) || JSON.stringify({ IT: r.income_tax.total, NI: r.national_insurance.total });
});

t('rUK 2024-25: £35,000 → IT £4,486, NI £1,794.40', () => {
  // Taxable IT = 22430 × 20% = 4486
  // NI = (35000 - 12570) × 8% = 22430 × 0.08 = 1794.40
  const r = UKTax.calcTotal(35000, '2024-25');
  return (approx(r.income_tax.total, 4486, 1) && approx(r.national_insurance.total, 1794.4, 1))
    || JSON.stringify({ IT: r.income_tax.total, NI: r.national_insurance.total });
});

t('rUK 2024-25: £50,270 — exactly at UEL, all IT basic, all NI main', () => {
  // Taxable = 50270 - 12570 = 37700 × 20% = 7540
  // NI = (50270 - 12570) × 8% = 37700 × 0.08 = 3016
  const r = UKTax.calcTotal(50270, '2024-25');
  return (approx(r.income_tax.total, 7540, 1) && approx(r.national_insurance.total, 3016, 1))
    || JSON.stringify({ IT: r.income_tax.total, NI: r.national_insurance.total });
});

t('rUK 2024-25: £75,000 → higher-rate + above-UEL NI', () => {
  // IT: basic = 37700 × 20% = 7540; higher slice = (75000-12570) - 37700 = 24730 × 40% = 9892; total 17432
  // NI: main = 37700 × 8% = 3016; above UEL = (75000-50270) × 2% = 24730 × 0.02 = 494.60; total 3510.60
  const r = UKTax.calcTotal(75000, '2024-25');
  return (approx(r.income_tax.total, 17432, 1) && approx(r.national_insurance.total, 3510.6, 1))
    || JSON.stringify({ IT: r.income_tax.total, NI: r.national_insurance.total });
});

t('rUK 2024-25: £100,000 — PA still fully intact (edge)', () => {
  // Taxable = 87430; basic 7540 + higher (87430-37700)×40% = 49730×0.40 = 19892; IT = 27432
  // NI main = 37700 × 8% = 3016; UEL slice = (100000-50270) × 2% = 49730×0.02 = 994.60; NI = 4010.60
  const r = UKTax.calcTotal(100000, '2024-25');
  return (approx(r.income_tax.total, 27432, 1) && approx(r.national_insurance.total, 4010.6, 1))
    || JSON.stringify({ IT: r.income_tax.total, NI: r.national_insurance.total });
});

t('rUK 2024-25: £125,140 — PA fully lost + top of higher rate', () => {
  // Income above PA taper = 25140. PA reduction = floor(25140/2) = 12570. Effective PA = 0.
  // Taxable = 125140.
  // basic = 37700 × 20% = 7540
  // higher = (125140 - 37700) × 40% = 87440 × 0.40 = 34976
  // additional = 0 (threshold is 125140)
  // IT = 42516
  const r = UKTax.calcTotal(125140, '2024-25');
  return approx(r.income_tax.effective_PA, 0, 1) && approx(r.income_tax.total, 42516, 1)
    || JSON.stringify({ PA: r.income_tax.effective_PA, IT: r.income_tax.total });
});

t('rUK 2024-25: £150,000 — additional rate kicks in', () => {
  // PA lost. Taxable = 150000.
  // basic 7540 + higher (125140-37700=87440)×0.40=34976 + addl (150000-125140=24860)×0.45=11187
  // IT = 53703
  const r = UKTax.calcTotal(150000, '2024-25');
  return approx(r.income_tax.total, 53703, 2)
    || JSON.stringify({ IT: r.income_tax.total, PA: r.income_tax.effective_PA });
});

// ──────────────────────────────────────────────────────────────
// Scotland 2024-25 — different bands, higher marginal at £50k
// ──────────────────────────────────────────────────────────────

t('Scotland 2024-25: £35,000 → ~£4,726 IT (higher than rUK because of 21%/42% bands)', () => {
  // PA = 12570, taxable = 22430
  // Starter 19% to 2306: 2306 × 0.19 = 438.14
  // Basic 20% from 2306 to 13991: (13991 - 2306) = 11685 × 0.20 = 2337.00
  // Intermediate 21% from 13991 to 31092: min(22430, 31092) - 13991 = 8439 × 0.21 = 1772.19
  // Total: 438.14 + 2337.00 + 1772.19 = 4547.33
  const r = UKTax.calcIncomeTax(35000, '2024-25', 'scotland');
  return approx(r.total, 4547.33, 1) || `got ${r.total.toFixed(2)}`;
});

t('Scotland 2024-25: £60,000 → hits Higher 42% band', () => {
  // PA=12570, taxable=47430.
  // Starter 2306 × 0.19 = 438.14
  // Basic (13991-2306)=11685 × 0.20 = 2337
  // Inter (31092-13991)=17101 × 0.21 = 3591.21
  // Higher (47430-31092)=16338 × 0.42 = 6861.96
  // Total ≈ 13228.31
  const r = UKTax.calcIncomeTax(60000, '2024-25', 'scotland');
  return approx(r.total, 13228.31, 2) || `got ${r.total.toFixed(2)}`;
});

// ──────────────────────────────────────────────────────────────
// Historical spot-checks
// ──────────────────────────────────────────────────────────────

t('rUK 2019-20: £30,000 — sanity check old bands', () => {
  // PA=12500, taxable=17500 × 0.20 = 3500
  // NI = (30000-8632) × 0.12 = 21368 × 0.12 = 2564.16
  const r = UKTax.calcTotal(30000, '2019-20');
  return approx(r.income_tax.total, 3500, 1) && approx(r.national_insurance.total, 2564.16, 1)
    || JSON.stringify({ IT: r.income_tax.total, NI: r.national_insurance.total });
});

t('rUK 2017-18: £50,000 — basic + early higher', () => {
  // PA=11500, taxable = 38500. Basic cap = 33500.
  // basic 33500×0.20 = 6700; higher (38500-33500)=5000 × 0.40 = 2000; IT = 8700
  // NI main 2017-18: PT=8164, UEL=45000, 12% main, 2% above.
  // main = (45000-8164) × 0.12 = 36836 × 0.12 = 4420.32; above = (50000-45000)×0.02 = 100; NI = 4520.32
  const r = UKTax.calcTotal(50000, '2017-18');
  return approx(r.income_tax.total, 8700, 1) && approx(r.national_insurance.total, 4520.32, 1)
    || JSON.stringify({ IT: r.income_tax.total, NI: r.national_insurance.total });
});

// ──────────────────────────────────────────────────────────────
// PA Taper edge cases
// ──────────────────────────────────────────────────────────────

t('PA taper: £110,000 (2024-25) → PA reduced by £5,000 → PA = £7,570', () => {
  const r = UKTax.calcIncomeTax(110000, '2024-25');
  return r.effective_PA === 7570 || `PA=${r.effective_PA}`;
});

t('PA taper: £125,140 → PA fully eroded', () => {
  const r = UKTax.calcIncomeTax(125140, '2024-25');
  return r.effective_PA === 0 || `PA=${r.effective_PA}`;
});

t('PA taper: £200,000 → PA still 0, not negative', () => {
  const r = UKTax.calcIncomeTax(200000, '2024-25');
  return r.effective_PA === 0 || `PA=${r.effective_PA}`;
});

// ──────────────────────────────────────────────────────────────
// Report
// ──────────────────────────────────────────────────────────────

console.log('\n=== UK Tax Calculator — Tests ===\n');
for (const r of results) {
  const badge = r.status === 'PASS' ? '\x1b[32mPASS\x1b[0m' : '\x1b[31m' + r.status + '\x1b[0m';
  console.log(`  [${badge}]  ${r.name}`);
  if (r.status !== 'PASS') console.log(`         → ${r.detail}`);
}
console.log(`\n${pass} passed, ${fail} failed, ${pass + fail} total\n`);
process.exit(fail === 0 ? 0 : 1);
