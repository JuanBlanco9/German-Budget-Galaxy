#!/usr/bin/env node
/**
 * refine_other_services.js
 *
 * Haiku classifier was too conservative for London boroughs: 25 of 28
 * have >20% of patterns classified as "Other Services". Many of these
 * have obvious keyword signals that should map to real MHCLG service
 * categories. This post-processor re-runs a keyword-rules engine on
 * every pattern currently labeled "Other Services" and re-maps where
 * there's a strong signal.
 *
 * Only rewrites patterns from "Other Services" → real category.
 * Never overrides a pattern that the classifier already put in a real
 * category (we trust those).
 *
 * Usage:
 *   node scripts/refine_other_services.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const SPEND = path.join(__dirname, '..', 'data', 'uk', 'local_authorities', 'spend');
const DRY_RUN = process.argv.includes('--dry-run');

// Keyword rules — ordered by specificity. First match wins.
// Each rule is [category, regex] where the regex matches dept|purpose combined.
const RULES = [
  // --- Children's Social Care (specific terms first) ---
  ["Children's Social Care", /\b(foster|fostering|adoption|adopt|looked[\s-]after|\blac\b|children\s*in\s*care|leaving\s*care|care\s*leaver|cwd|children[''s]*\s*residential|childrens\s*(placement|home|social)|cypl|cyp\s|young\s*people|youth\s*offending|cic\s|children\s*services|childrens?\s*social\s*care|csc\b|children[''s]*\s*(centre|team|placement)|troubled\s*families|sghc?\s*\(children|early\s*help|\bcwd\b)/i],
  // --- Adult Social Care ---
  ["Adult Social Care", /\b(adult\s*(social\s*care|services|placements?|safeguarding)|asc\b|older\s*people|\bop\b[\s-](residential|nursing|home\s*care|care|comm)|learning\s*disab|physical\s*disab|mental\s*health\s*(adult|placement)|day\s*care\s*adult|domicil\w+\s*care|home\s*care|residential\s*(care|placement|home)|nursing\s*(care|home|placement)|direct\s*payments?\s*(asc|adult)|\bpdsi\b|\bpd\b[\s-]physical|\bdirect\s*payments\s*direct\s*cash|\blts\b|long[\s-]term\s*support|supported\s*(living|accommodation)|personal\s*budget|\bcarers?\b\s*(assess|grant)|dementia|advocacy\s*adult|reablement)/i],
  // --- Education (schools, teaching) ---
  ["Education", /\b(schools?\b[^.]*\b(block|secondary|primary|special|sen|sixth|fund|grant)|sen\b\s|special\s*educational|dsg\b|high\s*needs|early\s*years|nursery|pupil|teacher|teaching|educational?\s*(psychology|welfare|service)|school\s*improvement|schools\s*fin|education\s*(dept|service)|\bed\s*(psychology|services)|children's?\s*centre|pvi\s*provider|catering\s*school|school\s*meals?|school\s*transport|children\s*with\s*disab\s*school|bsf\s*wave|basic\s*need|dedicated\s*schools?)/i],
  // --- Transport ---
  ["Transport", /\b(highway|\btransport|roads?\b|street\s*light|parking|traffic|concessionary\s*travel|school\s*transport|home[\s-]to[\s-]school|public\s*min\s*cost|bus\s*service|passenger\s*transport|road\s*safety|bridge|passenger\s*(services|fleet)|vehicle\s*fleet|fleet\s*services|bikability|\bev\s*charg)/i],
  // --- Environment (waste, recycling, parks) ---
  ["Environment", /\b(waste\s*(management|collection|disposal|recycling)|refuse\s*collection|recycl|street\s*clean|street\s*scene|parks?\b[\s-]?(maint|grounds|department|service)|grounds\s*maint|environment\s*(service|health|agency)|environmental\s*health|pest\s*control|\bhra\s*(environ|waste)|\bcemetery|cemetery|crematori|trading\s*standards|pollution|air\s*quality|flooding|drainage|landfill|bulky\s*waste|bin\s*service|biodiversity|\binsh\b|\bnrsa\b|parks\s*&?\s*open\s*spaces)/i],
  // --- Housing ---
  ["Housing", /\b(housing\s*(revenue|rent|benefit|needs|repair|service|assist|strategy|general|hra|management)|hra\b[\s-]?(repair|rent|tenant|property)|\bhra\s*operating|homeless|council\s*housing|housing\s*options|temporary\s*accomm|rent\s*(arrears|collect|account)|landlord|tenant|rsl\b|right\s*to\s*buy|leasehold|housing\s*stock|housing\s*repair|homeless|temp\s*accomm|decent\s*homes|disabled\s*facilities|dfg\b|housing\s*maint)/i],
  // --- Public Health ---
  ["Public Health", /\b(public\s*health|sexual\s*health|substance\s*misuse|drug\s*(misuse|service|treatment)|stop\s*smoking|health\s*visit|school\s*nurse|immuni[sz]ation|healthy\s*(weight|child|start)|health\s*improvement|disease\s*prevention|sugery\s*contract|\bgum\b|\bhiv\b|obesity|wellbeing\s*service|physical\s*activ|tobacco|healthwatch)/i],
  // --- Culture, Libraries, Leisure ---
  ["Culture", /\b(librar(y|ies)|museum|gallery|art\s*(gallery|centre|service)|cultural\s*service|leisure\s*(centre|service|complex)|sport\s*(centre|facility|development)|cinema|theatre|heritage|archaeology|tourist\s*info|community\s*centre|arts\s*council|coroner|registrars?\b[\s-]service)/i],
  // --- Planning & Development ---
  ["Planning", /\bplanning\s*(application|service|department|policy|fee|control|enforcement)|building\s*control|development\s*control|local\s*plan|conservation\s*area|planning\s*inspector|town\s*planning|major\s*(development|application)/i],
  // --- Police (for City of London, GLA etc.) ---
  ["Police", /\bpolice\b|metropolitan\s*police|constabulary|opcc/i],
  // --- Fire & Rescue ---
  ["Fire & Rescue", /\bfire\s*(service|rescue|authority|brigade|safety)|lfb\b|fire\s*(station|crew|training|kit)/i],
  // --- Central Services (finance, HR, legal, IT, etc.) ---
  ["Central Services", /\b(corporate\s*(service|support|finance|governance)|finance\s*(department|services|team)|treasury\s*management|audit\s*(service|fee|internal)|legal\s*service|democratic\s*service|hr\s|human\s*resources|payroll|revenues?\s*(dept|team|service)|benefits?\s*service|council\s*tax|business\s*rates|nndr\b|customer\s*service|procurement|\bict\b|\bit\b\s*(service|support|infrastructure)|information\s*tech|communications?\s*team|press\s*office|policy\s*team|performance\s*team|community\s*safety|registrar|elections?|electoral|chief\s*exec|management\s*team|director['s]*\s*office|committee\s*service|member\s*service|executive\s*(service|support)|admin\s*service|secretariat|strategic\s*manag|business\s*support)/i]
];

function refinePattern(patternKey) {
  // Combine dept + purpose for matching
  const combined = patternKey.replace('|', ' ').toLowerCase();
  for (const [category, regex] of RULES) {
    if (regex.test(combined)) return category;
  }
  return null;
}

function processFile(filePath) {
  const m = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const patterns = m.patterns || {};
  let refined = 0, stillOther = 0;
  const counts = {};
  for (const [key, val] of Object.entries(patterns)) {
    if (val !== 'Other Services') continue;
    const newCat = refinePattern(key);
    if (newCat) {
      patterns[key] = newCat;
      counts[newCat] = (counts[newCat] || 0) + 1;
      refined++;
    } else {
      stillOther++;
    }
  }
  if (!DRY_RUN) {
    if (!m._meta) m._meta = {};
    m._meta.refined_other_services = refined;
    m._meta.refined_at = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(m, null, 2), 'utf8');
  }
  return { refined, stillOther, total: Object.keys(patterns).length, counts };
}

function main() {
  const files = fs.readdirSync(SPEND)
    .filter(f => f.endsWith('_dept_mapping.json'))
    .map(f => path.join(SPEND, f));

  let totalRefined = 0, totalRemaining = 0;
  console.log(`Processing ${files.length} mapping files${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

  for (const fp of files) {
    const name = path.basename(fp).replace('_dept_mapping.json', '');
    const r = processFile(fp);
    if (r.refined > 0) {
      const top = Object.entries(r.counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k}:${v}`).join(' ');
      console.log(`  ${name.padEnd(25)} refined: ${r.refined}/${r.refined + r.stillOther} other (${top})`);
      totalRefined += r.refined;
      totalRemaining += r.stillOther;
    }
  }
  console.log(`\nTotal: ${totalRefined} patterns refined, ${totalRemaining} still "Other Services"`);
}

main();
