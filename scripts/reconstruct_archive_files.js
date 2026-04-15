#!/usr/bin/env node
/**
 * reconstruct_archive_files.js
 *
 * Queries the Internet Archive metadata API for the Budget Galaxy item
 * and rebuilds the `archive_files` field on every council in the lookup.
 * Used after an upload job gets interrupted and the in-memory map is
 * lost but the files have already been uploaded to IA.
 *
 * The uploader names files as `{council_slug}_{original_filename}` so
 * we reverse that mapping here. GLA subentities use slugs `gla_lfb`,
 * `gla_tfl`, `gla_core`, `gla_mps`.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const LOOKUP = path.join(__dirname, '..', 'data', 'uk', 'local_authorities', 'spend', 'council_spend_lookup_2024.json');
const ITEM = 'budget-galaxy-uk-councils-2024';

function councilSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function fetchMetadata() {
  return new Promise((resolve, reject) => {
    https.get(`https://archive.org/metadata/${ITEM}`, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function main() {
  const meta = await fetchMetadata();
  const iaFiles = (meta.files || [])
    .map(f => f.name)
    .filter(n => n && !n.endsWith('_meta.xml') && !n.endsWith('_files.xml') && !n.endsWith('_reviews.xml'));

  console.log(`IA item has ${iaFiles.length} files`);

  const lookup = JSON.parse(fs.readFileSync(LOOKUP, 'utf8'));

  // Build slug → council name lookup
  const slugToCouncil = {};
  for (const name of Object.keys(lookup)) {
    if (name === 'Greater London Authority') {
      slugToCouncil['gla_lfb'] = { council: name, subdir: 'lfb' };
      slugToCouncil['gla_tfl'] = { council: name, subdir: 'tfl' };
      slugToCouncil['gla_core'] = { council: name, subdir: 'gla_core' };
      slugToCouncil['gla_mps'] = { council: name, subdir: 'mps' };
    } else {
      slugToCouncil[councilSlug(name)] = { council: name };
    }
  }

  // Sort slugs by length DESC so 'greater_london_authority' matches before 'greater'
  const sortedSlugs = Object.keys(slugToCouncil).sort((a, b) => b.length - a.length);

  // Initialize archive_files maps
  for (const name of Object.keys(lookup)) {
    if (!lookup[name].archive_files) lookup[name].archive_files = {};
  }

  let mapped = 0, unmapped = 0;
  const unmappedList = [];
  for (const iaFile of iaFiles) {
    // Find which slug matches
    let matched = null;
    for (const slug of sortedSlugs) {
      if (iaFile.startsWith(slug + '_')) {
        matched = slug;
        break;
      }
    }
    if (!matched) { unmapped++; unmappedList.push(iaFile); continue; }

    const { council, subdir } = slugToCouncil[matched];
    const entry = lookup[council];
    const archiveUrl = `https://archive.org/download/${ITEM}/${iaFile}`;

    // Strip slug prefix to get the filename key used by SOURCES.md generator
    const filename = iaFile.slice(matched.length + 1);
    // For GLA subentities, key is `{subdir}/{filename}`
    const key = subdir ? `${subdir}/${filename}` : filename;

    entry.archive_files[key] = archiveUrl;
    mapped++;
  }

  fs.writeFileSync(LOOKUP, JSON.stringify(lookup, null, 2));
  console.log(`Mapped: ${mapped}, unmapped: ${unmapped}`);
  if (unmapped > 0) {
    console.log('Unmapped files (first 10):');
    unmappedList.slice(0, 10).forEach(f => console.log('  ' + f));
  }

  // Summary
  let total = 0;
  for (const [name, e] of Object.entries(lookup)) {
    const n = Object.keys(e.archive_files || {}).length;
    if (n > 0) {
      total += n;
      console.log(`  ${name}: ${n} files`);
    }
  }
  console.log(`\nTotal archive_files restored: ${total}`);
}

main().catch(e => { console.error(e); process.exit(1); });
