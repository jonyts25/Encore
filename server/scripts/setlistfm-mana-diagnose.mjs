#!/usr/bin/env node
/**
 * Live setlist.fm API check for Maná León 2024-10-26.
 * Usage: SETLISTFM_API_KEY=... node server/scripts/setlistfm-mana-diagnose.mjs
 */
const key = process.env.SETLISTFM_API_KEY?.trim();
if (!key) {
  console.error('Missing SETLISTFM_API_KEY');
  process.exit(1);
}

const BASE = 'https://api.setlist.fm/rest';
const MBID = '55441123-89a2-49ab-ae3f-df7a3e86835a';
const DATE = '26-10-2024';
const SETLIST_ID = '5354c34d';

async function get(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: 'application/json', 'x-api-key': key },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

const queries = [
  ['mbid+date', `/1.0/search/setlists?artistMbid=${MBID}&date=${DATE}&p=1`],
  ['name+date', `/1.0/search/setlists?artistName=${encodeURIComponent('Maná')}&date=${DATE}&p=1`],
  ['setlist by id', `/1.0/setlist/${SETLIST_ID}`],
];

for (const [label, path] of queries) {
  const result = await get(path);
  console.log(`\n=== ${label} ===`);
  console.log(`GET ${path}`);
  console.log(`HTTP ${result.status}`);
  console.log(JSON.stringify(result.body, null, 2));
}
