/* Budget Galaxy — UK VAT & other-indirect-tax estimator.
 *
 * Given a user's gross salary, estimate annual VAT + other indirect taxes paid.
 * Method: use ONS "Effects of Taxes and Benefits" decile shares (share of
 * disposable income spent on each indirect tax) applied to the user's estimated
 * current-year disposable income.
 *
 * This is an ESTIMATE. The true figure depends on consumption patterns that
 * vary by household. The decile method is the widely-used convention (IFS,
 * Resolution Foundation, OBR all use variants of it).
 *
 * Usage:
 *   await UKVAT.loadShares();
 *   const v = UKVAT.estimate({ grossSalary: 35000, disposableIncome: 28720, year: '2024-25' });
 *   // → { vat: 2404, fuel_duty: 496, alcohol: 312, ..., total_indirect: 4700, decile: 5 }
 *
 * The caller is expected to supply `disposableIncome` computed by uk_calc.js
 * (gross − income tax − NI − council tax) for best accuracy; if omitted, we
 * approximate disposable ≈ 0.80 × gross.
 */
(function (global) {
  'use strict';

  let _shares = null;

  async function loadShares(url) {
    if (_shares) return _shares;
    const href = url || '/data/uk/fiscal/uk_indirect_tax_shares_by_decile.json';
    const res = await fetch(href);
    if (!res.ok) throw new Error(`loadShares: HTTP ${res.status} for ${href}`);
    _shares = await res.json();
    return _shares;
  }

  function setShares(s) { _shares = s; }

  /** Find the decile whose equivalised_disposable_income is closest to the
   *  user's equivalised disposable income. Returns the decile record (1-10).
   */
  function _findDecile(equivalisedDisposable, deciles) {
    let best = deciles[0];
    let bestDist = Math.abs(equivalisedDisposable - best.equivalised_disposable_income_gbp);
    for (const d of deciles) {
      const dist = Math.abs(equivalisedDisposable - d.equivalised_disposable_income_gbp);
      if (dist < bestDist) { best = d; bestDist = dist; }
    }
    return best;
  }

  /** Linearly interpolate a tax value between two neighbouring deciles.
   *  Returns interpolated £ for a user sitting between decile lower/upper.
   */
  function _interp(equivDisp, deciles, taxKey) {
    // Sort by equiv disposable asc (they already are)
    const sorted = deciles.slice().sort(
      (a, b) => a.equivalised_disposable_income_gbp - b.equivalised_disposable_income_gbp
    );
    if (equivDisp <= sorted[0].equivalised_disposable_income_gbp)
      return sorted[0].indirect_taxes_gbp[taxKey] ?? 0;
    if (equivDisp >= sorted[sorted.length - 1].equivalised_disposable_income_gbp)
      return sorted[sorted.length - 1].indirect_taxes_gbp[taxKey] ?? 0;

    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i], b = sorted[i + 1];
      const aInc = a.equivalised_disposable_income_gbp;
      const bInc = b.equivalised_disposable_income_gbp;
      if (equivDisp >= aInc && equivDisp <= bInc) {
        const t = (equivDisp - aInc) / (bInc - aInc);
        const av = a.indirect_taxes_gbp[taxKey] ?? 0;
        const bv = b.indirect_taxes_gbp[taxKey] ?? 0;
        return av + (bv - av) * t;
      }
    }
    return 0;
  }

  /** Main entry: estimate annual indirect taxes for one user.
   *
   *  opts = {
   *    grossSalary: number,         // GBP/year pre-tax
   *    disposableIncome?: number,   // GBP/year post direct tax (preferred)
   *    equivalisationFactor?: number, // 1.0 = single adult, 1.5 = couple, +0.3/child; default 1.0
   *    year?: string,               // '2024-25', for future scaling; currently unused
   *  }
   *
   *  Returns per-tax estimates + total.
   */
  function estimate(opts) {
    const shares = _shares;
    if (!shares) throw new Error('UKVAT: call loadShares() first');
    const deciles = shares.deciles;
    const gross = Number(opts.grossSalary) || 0;
    const disp = Number(opts.disposableIncome) || Math.max(0, gross * 0.80);
    const eqFactor = Number(opts.equivalisationFactor) || 1.0;
    const equivDisp = disp / eqFactor;

    const taxKeys = [
      'vat', 'fuel_duty', 'ved', 'tobacco_duty', 'beer_cider_duty',
      'wines_spirits_duty', 'tv_license', 'sdlt', 'customs', 'betting',
      'insurance_premium_tax', 'air_passenger_duty', 'national_lottery', 'other',
    ];

    const values = {};
    for (const k of taxKeys) values[k] = Math.round(_interp(equivDisp, deciles, k));

    const alcohol_total = values.beer_cider_duty + values.wines_spirits_duty;
    const total_indirect = taxKeys.reduce((s, k) => s + values[k], 0);

    const nearest = _findDecile(equivDisp, deciles);

    return {
      gross_salary: gross,
      disposable_income: disp,
      equivalised_disposable_income: equivDisp,
      decile: nearest.decile,
      decile_label: nearest.label,
      per_tax_gbp: {
        vat: values.vat,
        fuel_duty: values.fuel_duty,
        ved: values.ved,
        tobacco_duty: values.tobacco_duty,
        alcohol: alcohol_total,
        tv_license: values.tv_license,
        sdlt: values.sdlt,
        customs: values.customs,
        betting: values.betting,
        insurance_premium_tax: values.insurance_premium_tax,
        air_passenger_duty: values.air_passenger_duty,
        national_lottery: values.national_lottery,
        other: values.other,
      },
      total_indirect_gbp: total_indirect,
      effective_rate_vs_disposable: disp > 0 ? total_indirect / disp : 0,
      note: (
        'Estimate. Based on ONS "Effects of Taxes and Benefits" decile-level ' +
        'consumption patterns (FY 2017-18). Actual VAT/duty paid depends on ' +
        'individual spending; this is the typical figure for a household at ' +
        `the ${nearest.label} decile (equivalised disposable income £${Math.round(
          nearest.equivalised_disposable_income_gbp
        ).toLocaleString()}).`
      ),
    };
  }

  const api = { loadShares, setShares, estimate };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.UKVAT = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
