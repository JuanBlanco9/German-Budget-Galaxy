/* Budget Galaxy — UK Council Tax lookup.
 *
 * Given a council name (or ONS code or E code) and a band (A-H), return the
 * annual Council Tax bill for that dwelling. Uses MHCLG's published
 * "area council tax by band" — the all-in value that residents actually pay
 * (billing authority + county + GLA + police + fire + parish).
 *
 * Usage:
 *   await UKCouncilTax.load();
 *   const bill = UKCouncilTax.lookup({ council: 'Hillingdon', band: 'D' });
 *   // → { council, band: 'D', amount_gbp: 1850.66, year: '2024-25' }
 */
(function (global) {
  'use strict';

  let _data = null;

  async function load(url) {
    if (_data) return _data;
    const href = url || '/data/uk/fiscal/council_tax/uk_council_tax_2024_25.json';
    const res = await fetch(href);
    if (!res.ok) throw new Error(`load: HTTP ${res.status} for ${href}`);
    _data = await res.json();
    return _data;
  }

  function setData(d) { _data = d; }

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

  /** Find a council record by: ONS code ('E09000017'), E-code ('E5020'), or name. */
  function findCouncil(identifier) {
    if (!_data) throw new Error('UKCouncilTax: call load() first');
    const id = String(identifier || '').trim();
    if (!id) return null;
    const councils = _data.councils;

    // Exact ONS / E code match
    for (const c of councils) {
      if (c.ons_code === id || c.e_code === id) return c;
    }
    // Exact name match
    for (const c of councils) {
      if (c.name === id) return c;
    }
    // Normalised name match
    const nid = _normalise(id);
    for (const c of councils) {
      if (_normalise(c.name) === nid) return c;
    }
    // Substring (fuzzy)
    for (const c of councils) {
      const cn = _normalise(c.name);
      if (cn.includes(nid) || nid.includes(cn)) return c;
    }
    return null;
  }

  function listCouncils() {
    if (!_data) throw new Error('UKCouncilTax: call load() first');
    return _data.councils.map(c => ({
      name: c.name,
      ons_code: c.ons_code,
      region_code: c.region_code,
      band_D: c.band_D,
    }));
  }

  /** opts: { council, band }  band defaults to 'D'. */
  function lookup(opts) {
    const c = findCouncil(opts.council);
    if (!c) return null;
    const band = String(opts.band || 'D').toUpperCase();
    if (!/^[A-H]$/.test(band)) throw new Error(`Invalid band: ${band}`);
    const amount = c[`band_${band}`];
    if (amount == null) return null;
    return {
      council_name: c.name,
      ons_code: c.ons_code,
      region_code: c.region_code,
      band,
      amount_gbp: amount,
      fiscal_year_label: _data.fiscal_year_label,
      all_bands: 'ABCDEFGH'.split('').reduce((acc, b) => {
        acc[b] = c[`band_${b}`] ?? null;
        return acc;
      }, {}),
    };
  }

  const api = { load, setData, lookup, findCouncil, listCouncils };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.UKCouncilTax = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
