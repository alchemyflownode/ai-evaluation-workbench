/**
 * Structural "offline by design" proof.
 *
 * The app claims it makes NO network calls. A claim stated only in prose has to be
 * taken on trust; this script makes it re-runnable. It scans every source file under
 * src/ for the browser/network APIs that would violate that claim and exits non-zero
 * if any are present.
 *
 * Run: node tools/no-network-scan.mjs   (wired as `npm run audit:offline`)
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', 'src');

const FORBIDDEN = [
  'fetch(',
  'XMLHttpRequest',
  'axios',
  'sendBeacon',
  'WebSocket',
  'new EventSource',
];

/** @type {string[]} */
const hits = [];

/** @param {string} dir */
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(p);
    } else {
      const text = readFileSync(p, 'utf8');
      for (const token of FORBIDDEN) {
        if (text.includes(token)) hits.push(`${p} :: ${token}`);
      }
    }
  }
}

walk(root);

if (hits.length > 0) {
  console.error('NETWORK_CALLS_FOUND — the offline claim is false:');
  for (const h of hits) console.error(`  ${h}`);
  process.exit(1);
}

console.log('NO_NETWORK_CALLS_FOUND — offline claim holds (0/6 network APIs present).');
