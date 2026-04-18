/* Budget Galaxy — UK Tax Calculator
 *
 * Pure functions. No DOM, no network. Callable from browser or Node for tests.
 * Exposes window.UKTax = { loadBands, calcIncomeTax, calcNI, calcTotal, ... }
 *
 * Covers:
 *   - Income Tax (rUK: England/Wales/NI, and Scotland with its 5-6 bands)
 *   - Personal Allowance taper (£1 lost per £2 above £100k)
 *   - NI Class 1 employee contributions (main rate + above-UEL rate)
 *
 * NOT covered here (added in later modules):
 *   - VAT estimate (uk_vat.js, decile consumption model)
 *   - Council Tax (uk_ct.js, postcode → council → band lookup)
 *   - Fuel Duty, APD, etc. (uk_indirect.js)
 *   - Self-employed NIC (Class 2/4)
 *   - Dividend tax, savings tax
 *
 * All calcs are annual, in GBP. No pence.
 *
 * Source of truth: data/uk/fiscal/uk_tax_bands.json (loaded at runtime).
 */
(function (global) {
  'use strict';

  let _bandsCache = null;

  /** Fetch and cache the bands JSON. Returns a Promise<bands>. */
  async function loadBands(url) {
    if (_bandsCache) return _bandsCache;
    const href = url || '/data/uk/fiscal/uk_tax_bands.json';
    const res = await fetch(href);
    if (!res.ok) throw new Error(`loadBands: HTTP ${res.status} for ${href}`);
    _bandsCache = await res.json();
    return _bandsCache;
  }

  /** Synchronous setter for tests (inject bands without fetch). */
  function setBands(bands) { _bandsCache = bands; }

  /** Return the effective Personal Allowance given gross income and the year's base PA.
   *  Taper: £1 lost per £2 above £100,000. Fully eliminated once income reaches
   *  £100,000 + 2 * PA.
   */
  function effectivePA(grossIncome, basePA, taperStart) {
    if (!taperStart || grossIncome <= taperStart) return basePA;
    const excess = grossIncome - taperStart;
    const reduction = Math.floor(excess / 2);
    return Math.max(0, basePA - reduction);
  }

  /** rUK income tax:  basic 20% / higher 40% / additional 45% on taxable income.
   *  Returns: { total, by_band: [...], effective_PA, taxable_income }
   */
  function calcIncomeTaxRUK(gross, year, bandsRoot) {
    const b = (bandsRoot || _bandsCache).rUK[year];
    if (!b) throw new Error(`No rUK bands for year ${year}`);

    const pa = effectivePA(gross, b.personal_allowance, b.pa_taper_start);
    const taxable = Math.max(0, gross - pa);

    const basicCap = b.basic_rate_limit;          // taxable income <= this pays basic
    const higherCap = b.higher_rate_limit;        // next band cap (from 2023/24: 125140)

    const basicSlice = Math.min(taxable, basicCap);
    const higherSlice = Math.max(0, Math.min(taxable, higherCap) - basicCap);
    const addlSlice = Math.max(0, taxable - higherCap);

    const basicTax = basicSlice * b.basic_rate;
    const higherTax = higherSlice * b.higher_rate;
    const addlTax = addlSlice * b.additional_rate;

    const total = basicTax + higherTax + addlTax;
    return {
      total,
      effective_PA: pa,
      taxable_income: taxable,
      by_band: [
        { name: 'Basic rate',      rate: b.basic_rate,      income: basicSlice,  tax: basicTax },
        { name: 'Higher rate',     rate: b.higher_rate,     income: higherSlice, tax: higherTax },
        { name: 'Additional rate', rate: b.additional_rate, income: addlSlice,   tax: addlTax  },
      ].filter(x => x.income > 0),
    };
  }

  /** Scotland income tax. Uses explicit bands from the JSON.
   *  Each band has a `rate` and `upper_taxable` (threshold on taxable income, not gross).
   *  upper_taxable = null means "and above".
   */
  function calcIncomeTaxScotland(gross, year, bandsRoot) {
    const b = (bandsRoot || _bandsCache).scotland[year];
    if (!b) throw new Error(`No Scotland bands for year ${year}`);

    const pa = effectivePA(gross, b.personal_allowance, 100000);
    const taxable = Math.max(0, gross - pa);

    let remaining = taxable;
    let lowerBound = 0;
    const breakdown = [];
    let total = 0;

    for (const band of b.bands) {
      if (remaining <= 0) break;
      const upper = band.upper_taxable == null ? Infinity : band.upper_taxable;
      const sliceTop = Math.min(taxable, upper);
      const slice = Math.max(0, sliceTop - lowerBound);
      if (slice > 0) {
        const tax = slice * band.rate;
        breakdown.push({ name: band.name + ' rate', rate: band.rate, income: slice, tax });
        total += tax;
        remaining -= slice;
      }
      lowerBound = upper;
    }

    return {
      total,
      effective_PA: pa,
      taxable_income: taxable,
      by_band: breakdown,
    };
  }

  /** Income Tax router: jurisdiction = 'rUK' | 'scotland'. */
  function calcIncomeTax(gross, year, jurisdiction, bandsRoot) {
    const j = (jurisdiction || 'rUK').toLowerCase();
    if (j === 'scotland') return calcIncomeTaxScotland(gross, year, bandsRoot);
    return calcIncomeTaxRUK(gross, year, bandsRoot);
  }

  /** Class 1 employee NIC (annualised). Employer contributions are NOT here —
   *  they come out of the employer's pocket, not the employee's. If we ever want
   *  to show "hidden" employer NI, that's a separate visualization.
   */
  function calcNI(gross, year, bandsRoot) {
    const b = (bandsRoot || _bandsCache).rUK[year];
    if (!b) throw new Error(`No bands for year ${year}`);

    const pt = b.ni_primary_threshold;
    const uel = b.ni_upper_earnings_limit;

    const mainSlice = Math.max(0, Math.min(gross, uel) - pt);
    const uelSlice = Math.max(0, gross - uel);

    const mainNI = mainSlice * b.ni_employee_main_rate;
    const uelNI = uelSlice * b.ni_employee_above_uel_rate;
    const total = mainNI + uelNI;

    return {
      total,
      primary_threshold: pt,
      uel: uel,
      by_band: [
        { name: `Main rate (${(b.ni_employee_main_rate * 100).toFixed(1)}%)`,
          rate: b.ni_employee_main_rate, income: mainSlice, contribution: mainNI },
        { name: `Above UEL (${(b.ni_employee_above_uel_rate * 100).toFixed(1)}%)`,
          rate: b.ni_employee_above_uel_rate, income: uelSlice, contribution: uelNI },
      ].filter(x => x.income > 0),
    };
  }

  /** Roll-up: return the full direct-tax picture for one scenario. */
  function calcTotal(gross, year, jurisdiction, bandsRoot) {
    const it = calcIncomeTax(gross, year, jurisdiction, bandsRoot);
    const ni = calcNI(gross, year, bandsRoot);
    const total = it.total + ni.total;
    return {
      gross_income: gross,
      year,
      jurisdiction: (jurisdiction || 'rUK').toLowerCase(),
      income_tax: it,
      national_insurance: ni,
      total_direct_tax: total,
      net_income: gross - total,
      effective_rate: gross > 0 ? total / gross : 0,
    };
  }

  const api = {
    loadBands,
    setBands,
    effectivePA,
    calcIncomeTax,
    calcIncomeTaxRUK,
    calcIncomeTaxScotland,
    calcNI,
    calcTotal,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.UKTax = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
