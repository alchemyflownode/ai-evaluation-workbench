// builds/apps/ai-evaluation-workbench/witness/witness.mjs
//
// OBSERVATION ONLY. This instrument never edits the artifact and never patches source.
// House doctrine (see builds/apps/resonance-gate/EVIDENCE.md):
//   - verdicts fail the run; no silent clicks; selectors verified before use;
//   - state is identified by a header discriminator, never by the nav rail;
//   - network is monitored at RUNTIME (the structural grep in tools/no-network-scan.mjs
//     cannot see a request a bundler injected);
//   - EVIDENCE SURVIVES INTERRUPTION: the report is flushed after every check, so a
//     SIGTERM leaves a partial ledger rather than nothing.
//
// TRACEABILITY: every hard-coded expectation carries the contract it derives from.
//   demo.ts declares 14 rows                       -> seeded === 14
//   normalizeTag() over those 14 tags -> 8 keys    -> first-load candidate count === 8
//   the journey ADDS one record ('witness probe tag', a brand-new key)
//                                                   -> post-journey candidate count === 9
//   'formatting drift' x2 + 'formatting-drift' normalize to one key, frequency 3
//                                                   -> label 'formatting drift', badge x3
//   formatting records are demo_006/007/008        -> draft trace === those ids

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(HERE, '..');
const DIST = path.join(APP, 'dist');
const REPORT = path.join(HERE, 'witness-report.json');
const PORT = 5199;
const URL_ = process.env.WORKBENCH_URL || `http://127.0.0.1:${PORT}/`;

const checks = [];
const failures = [];
const observations = [];
const external = [];
const consoleErrors = [];
const stages = [];
let currentStage = 'boot';
const row = (k, v) => console.log('  ' + String(k).padEnd(52) + v);
const stage = (s) => {
  currentStage = s;
  stages.push(s);
};

function buildReport(verdict) {
  const passed = checks.filter((c) => c.ok).length;
  return {
    mission: 'ai-evaluation-workbench :: v0.1 behavioral witness',
    instrument: 'builds/apps/ai-evaluation-workbench/witness/witness.mjs',
    method: 'playwright-chromium, real pointer/keyboard input, observation only (never edits the artifact)',
    runtime: `Node ${process.version} · Playwright 1.63.0 · Chromium`,
    generatedAt: new Date().toISOString(),
    lastStage: currentStage,
    stages,
    url: URL_,
    viewport: '1440x900 (mobile pass at 390x844)',
    contract: {
      seededRecords: 14,
      demoCandidateKeysAt14: 8,
      demoCandidateKeysAt15: 9,
      formattingTraceIds: ['demo_006', 'demo_007', 'demo_008'],
    },
    checksTotal: checks.length,
    passed,
    failed: failures,
    checks,
    observations,
    externalRequests: external,
    consoleErrors,
    verdict: verdict ?? (failures.length === 0 ? 'WITNESS_VERIFIED' : 'WITNESS_FAILED'),
  };
}
function flush(verdict) {
  try {
    fs.writeFileSync(REPORT, JSON.stringify(buildReport(verdict), null, 2));
  } catch {
    /* never let evidence-writing break the run */
  }
}

function check(n, ok, d = '', kind = 'ACCEPTANCE') {
  checks.push({ n, ok: !!ok, d, kind });
  row((ok ? 'PASS ' : 'FAIL ') + n, d);
  if (!ok) failures.push(`${n}${d ? ' — ' + d : ''}`);
  flush();
}
function note(k, v) {
  observations.push({ k, v });
  row('OBS  ' + k, v);
  flush();
}
async function act(label, fn) {
  try {
    return await fn();
  } catch (e) {
    const w = String(e?.message ?? e).split('\n')[0].slice(0, 160);
    row('ACTION FAILED: ' + label, w);
    failures.push(`action "${label}": ${w}`);
    flush();
    return undefined;
  }
}

// ── serve dist, dependency-free ───────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const file = path.normalize(path.join(DIST, rel));
  if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    return res.end('not found');
  }
  res.writeHead(200, {
    'content-type': MIME[path.extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  res.end(fs.readFileSync(file));
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

// ── freshness: dist must not predate src ──────────────────────────────────────
const newest = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).reduce((m, e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? Math.max(m, newest(p)) : Math.max(m, fs.statSync(p).mtimeMs);
  }, 0);
const srcT = newest(path.join(APP, 'src'));
const distT = fs.statSync(path.join(DIST, 'index.html')).mtimeMs;

console.log('\nAI EVALUATION WORKBENCH — BROWSER WITNESS (observation only)');
console.log('='.repeat(88));
flush('WITNESS_IN_PROGRESS');
check(
  'dist is NOT stale vs src/**',
  distT >= srcT,
  `dist ${new Date(distT).toISOString()} >= src ${new Date(srcT).toISOString()}`,
  'INSTRUMENT',
);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
page.on('request', (r) => {
  const u = r.url();
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)/.test(u) && !/^(data|about|blob):/.test(u))
    external.push(u);
});
let dialogMode = 'accept';
page.on('dialog', (d) => {
  if (dialogMode === 'accept') d.accept(d.type() === 'prompt' ? 'Witness canonical label' : '');
  else d.dismiss();
});

const body = () => page.locator('body').innerText();
const h1 = () => page.locator('header h1').innerText();
const cards = () => page.locator('main article');
const shot = (n) => page.screenshot({ path: path.join(HERE, n), fullPage: true });
const countOf = (rx, text) => Number((text.match(rx) ?? [])[1] ?? -1);
const pause = (ms = 140) => page.waitForTimeout(ms);
// card = the rounded-xl ancestor of an h3 whose text matches `label`
const cardFor = (label) =>
  page
    .locator('h3', { hasText: label })
    .first()
    .locator('xpath=ancestor::*[contains(@class,"rounded-xl")][1]');

try {
  // ── S1 · load ───────────────────────────────────────────────────────────────
  stage('S1 load');
  await page.goto(URL_, { waitUntil: 'load', timeout: 60000 });
  await page.waitForSelector('header h1', { timeout: 20000 });
  check('page titles correctly', /Evaluation Workbench/.test(await page.title()), await page.title());
  check('S1 discriminator: Journal header', (await h1()) === 'Review Journal', await h1());
  const seeded = countOf(/(\d+) observation\(s\) recorded/, await body());
  check('demo.ts seeds 14 synthetic observations', seeded === 14, `${seeded}`);
  await shot('state-01-journal.png');

  // ── S2 · create ─────────────────────────────────────────────────────────────
  stage('S2 create');
  const controls = await page.getByRole('combobox').count();
  check('filter bar exposes exactly 3 labelled selects', controls === 3, `${controls}`, 'INSTRUMENT');
  await act('open New observation', () =>
    page.getByRole('button', { name: 'New observation' }).click(),
  );
  const tagInput = page.getByLabel(/Reason tag/);
  check('create form exposes the reason-tag input', (await tagInput.count()) === 1);
  check(
    '"Add observation" is disabled while the tag is empty',
    await page.getByRole('button', { name: 'Add observation' }).isDisabled(),
  );
  await act('fill tag', () => tagInput.fill('witness probe tag'));
  await act('decision=revise', () => page.getByLabel('Decision').selectOption('revise'));
  await act('fill notes', () =>
    page.getByLabel('Evidence notes').fill('WITNESSTOKEN created by the instrument.'),
  );
  await act('add', () => page.getByRole('button', { name: 'Add observation' }).click());
  await pause(200);
  const afterCreate = countOf(/(\d+) observation\(s\) recorded/, await body());
  check('create adds exactly one record', afterCreate === seeded + 1, `${seeded} -> ${afterCreate}`);
  check('the new card renders its tag', (await page.locator('h3', { hasText: 'witness probe tag' }).count()) === 1);
  check('the new card shows its decision badge', /revise/.test(await cardFor('witness probe tag').innerText()));
  await shot('state-02-created.png');

  // ── S3 · edit ───────────────────────────────────────────────────────────────
  stage('S3 edit');
  await act('open edit on the new record', () =>
    cardFor('witness probe tag').getByRole('button', { name: 'Edit observation' }).click(),
  );
  check('form is now in Edit mode', (await page.getByRole('heading', { name: 'Edit observation' }).count()) === 1);
  await act('change notes', () => page.getByLabel('Evidence notes').fill('WITNESSTOKEN EDITED.'));
  await act('save changes', () => page.getByRole('button', { name: 'Save changes' }).click());
  await pause(200);
  check('edit persisted to the card', /WITNESSTOKEN EDITED/.test(await body()));
  check('form closed after save', (await page.getByRole('button', { name: 'Save changes' }).count()) === 0);

  // ── S4 · search scope (defensibility) ───────────────────────────────────────
  stage('S4 search');
  const search = page.getByPlaceholder(/Search tag/);
  await act('search a token that exists ONLY in taskContent', () => search.fill('4,812'));
  await pause(200);
  const contentHits = await cards().count();
  check('search does NOT reach taskContent', contentHits === 0, `${contentHits} card(s) matched "4,812"`);
  await act('search a token present only in a note', () => search.fill('boundary mistake'));
  await pause(200);
  check('search DOES reach notes', (await cards().count()) === 1, `${await cards().count()}`);
  await act('clear search', () => search.fill(''));
  await pause(160);

  // ── S5 · filters ────────────────────────────────────────────────────────────
  stage('S5 filters');
  await act('filter decision=reject', () => page.getByRole('combobox').nth(0).selectOption('reject'));
  await pause(200);
  const rejectTexts = await cards().allInnerTexts();
  check('every card under decision=reject carries the reject badge', rejectTexts.length > 0 && rejectTexts.every((t) => /reject/.test(t)), `${rejectTexts.length} cards`);
  await act('reset decision filter', () => page.getByRole('combobox').nth(0).selectOption('all'));
  await act('ambiguous-only on', () => page.getByLabel(/Show only observations I marked ambiguous/).check());
  await pause(200);
  const ambTexts = await cards().allInnerTexts();
  check('every card under ambiguous-only carries the ambiguous badge', ambTexts.length > 0 && ambTexts.every((t) => /ambiguous/.test(t)), `${ambTexts.length} cards`);
  await act('ambiguous-only off', () => page.getByLabel(/Show only observations I marked ambiguous/).uncheck());
  await pause(160);

  // ── S6 · task content protected by default ──────────────────────────────────
  stage('S6 task-content');
  check('task content is NOT in the DOM before reveal', !/4,812/.test(await body()));
  const reveal = page.getByRole('button', { name: /Task content hidden/ });
  check('a reveal control exists for the record that has content', (await reveal.count()) === 1, `${await reveal.count()}`);
  await act('reveal task content', () => reveal.first().click());
  check('task content appears only after the human reveals it', /4,812/.test(await body()));
  await shot('state-03-revealed.png');

  // ── S7 · pattern engine ─────────────────────────────────────────────────────
  stage('S7 patterns');
  await act('open Pattern Escalation', () => page.getByRole('button', { name: 'Pattern Escalation' }).click());
  await pause(260);
  check('S7 discriminator: Patterns header', (await h1()) === 'Pattern Escalation', await h1());
  const candN = countOf(/Candidate patterns \((\d+)\)/i, await body());
  check('candidate count is 9 (8 demo keys + 1 from the probe record)', candN === 9, `${candN}`);
  check('grouping collapses the 3 formatting variants to one x3 candidate', /×3/.test(await cardFor('formatting drift').innerText()));
  await shot('state-04-patterns.png');

  // D5 · the README's own grouping claim, tested
  const candSection = page.locator('section').first();
  const offCards = candSection.locator('h3').filter({ hasText: /off.by.one/i });
  const offN = await offCards.count();
  note('D5 · cards covering the off-by-one variants', String(offN));
  check(
    'D5/README claims off-by-one, off-by-one error and error off by one land in ONE candidate',
    offN === 1,
    `observed ${offN} separate candidates (README says 1)`,
    'DOCUMENTATION',
  );

  // ── S8 · escalation gate ────────────────────────────────────────────────────
  stage('S8 gate');
  check('no confirmed patterns yet', /Confirmed patterns \(0\)/i.test(await body()));
  check('NO draft control exists before any confirmation', (await page.getByRole('button', { name: /Generate escalation draft/ }).count()) === 0);
  await act('confirm "formatting drift"', () => cardFor('formatting drift').getByRole('button', { name: 'Confirm' }).click());
  await pause(260);
  check('human confirmation creates the group', /Confirmed patterns \(1\)/i.test(await body()));
  check('draft control appears ONLY after confirmation', (await page.getByRole('button', { name: /Generate escalation draft/ }).count()) === 1);
  await shot('state-05-confirmed.png');

  // ── S9 · draft + traceability ───────────────────────────────────────────────
  stage('S9 draft+trace');
  await act('generate draft', () => page.getByRole('button', { name: /Generate escalation draft/ }).click());
  await pause(260);
  check('draft created', /Escalation drafts \(1\)/i.test(await body()));
  check('draft is NOT auto-approved', /not approved/.test(await body()));
  check('draft title names the human-confirmed pattern', /Recurring issue: formatting drift/.test(await body()));
  await act('expand first claim trace', () => page.getByRole('button', { name: /source record\(s\)/ }).first().click());
  await pause(200);
  const liTexts = await page.locator('ul li').allInnerTexts();
  const traced = [...new Set(liTexts.join(' ').match(/demo_\d{3}/g) ?? [])].sort();
  check(
    'trace ids point at the real formatting-drift records',
    JSON.stringify(traced) === JSON.stringify(['demo_006', 'demo_007', 'demo_008']),
    traced.join(','),
  );
  await shot('state-06-draft.png');

  // P3 · every traced id resolves to a record that exists in the journal
  await act('open Review Journal', () => page.getByRole('button', { name: 'Review Journal' }).click());
  await pause(220);
  const journalText = await body();
  check('every traced id resolves to a real journal record', traced.every((id) => journalText.includes(id)), traced.join(','));
  await act('back to Pattern Escalation', () => page.getByRole('button', { name: 'Pattern Escalation' }).click());
  await pause(260);

  // ── S10 · D3 · merge into an UNCONFIRMED target ─────────────────────────────
  stage('S10 merge');
  const confirmedBefore = countOf(/Confirmed patterns \((\d+)\)/i, await body());
  const srcCard = cardFor('tone too formal');
  await act('merge "tone too formal" -> "ambiguous instruction" (unconfirmed)', () =>
    srcCard.getByRole('combobox').selectOption({ label: 'ambiguous instruction' }),
  );
  await pause(260);
  const confirmedAfter = countOf(/Confirmed patterns \((\d+)\)/i, await body());
  note('D3 · confirmed groups before -> after merge into unconfirmed target', `${confirmedBefore} -> ${confirmedAfter}`);
  note('D3 · source card shows a "merged" badge', String(/merged/.test(await srcCard.innerText())));
  check(
    'D3/contract: merging into an UNCONFIRMED target folds, and does not create a standing group',
    confirmedAfter === confirmedBefore,
    `standing confirmed groups went ${confirmedBefore} -> ${confirmedAfter}`,
    'DOCUMENTATION',
  );

  // ── S11 · D4 · reject behavior ──────────────────────────────────────────────
  stage('S11 reject');
  await act('reject "sentiment misread"', () => cardFor('sentiment misread').getByRole('button', { name: 'Reject' }).click());
  await pause(220);
  const rejectedLeft = await candSection.locator('h3').filter({ hasText: /sentiment misread/i }).count();
  note('D4 · rejected candidate still listed under "Candidate patterns"', String(rejectedLeft));
  check(
    'D4/README claims rejecting a candidate returns its records to the ungrouped pool',
    rejectedLeft === 0,
    `still present: ${rejectedLeft} card(s)`,
    'DOCUMENTATION',
  );

  // ── S12 · export surface ────────────────────────────────────────────────────
  stage('S12 export');
  await act('open Export & Data', () => page.getByRole('button', { name: 'Export & Data' }).click());
  await pause(220);
  check('S12 discriminator: Data header', (await h1()) === 'Export & Data', await h1());
  await act('open Markdown preview', () => page.locator('summary', { hasText: 'Preview Markdown findings report' }).click());
  const md = await page.locator('details pre').innerText();
  check('Markdown carries the confirmed pattern AND its source trace', /Recurring issue: formatting drift/.test(md) && /demo_006/.test(md));
  check('Markdown excludes task content', !/4,812/.test(md));
  note('Markdown preview length (chars)', String(md.length));

  const grab = async (click) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), click()]);
    return fs.readFileSync(await dl.path(), 'utf8');
  };
  const csvDefault = await act('download CSV (default)', () => grab(() => page.getByRole('button', { name: /Download CSV/ }).click()));
  check('D1a · CSV omits taskContent by default', !/taskContent/.test(String(csvDefault).split('\n')[0]));
  await act('opt into task content', () => page.getByLabel(/Include optional task content/).check());
  const csvWith = await act('download CSV (opted in)', () => grab(() => page.getByRole('button', { name: /Download CSV/ }).click()));
  check('D1b · CSV includes taskContent when opted in', /taskContent/.test(String(csvWith).split('\n')[0]));
  const json = await act('download JSON', () => grab(() => page.getByRole('button', { name: /Download JSON/ }).click()));
  check(
    'D1c/contract: JSON export excludes task content (types.ts: excluded from default exports)',
    !/taskContent/.test(String(json)),
    /taskContent/.test(String(json)) ? 'taskContent IS present in JSON' : '',
    'DOCUMENTATION',
  );

  // ── S13 · delete + reset ────────────────────────────────────────────────────
  stage('S13 delete+reset');
  dialogMode = 'dismiss';
  await act('Delete all with dialogs DISMISSED', () => page.getByRole('button', { name: /Delete all local data/ }).click());
  await pause(160);
  note('D2 · state preserved when a confirm() is dismissed', String(/\d+ observation/.test(await body())));
  dialogMode = 'accept';
  await act('Delete all local data (accepted)', () => page.getByRole('button', { name: /Delete all local data/ }).click());
  await pause(260);
  check('delete-all empties the store', /0 observation\(s\)/.test(await body()), (await body()).slice(0, 60));
  await act('Reset to synthetic demo data', () => page.getByRole('button', { name: /Reset to synthetic demo data/ }).click());
  await pause(260);
  check('reset restores the synthetic set', /14 observation\(s\)/.test(await body()));
  const ls = await page.evaluate(() => localStorage.getItem('ai-evaluation-workbench.v1'));
  check('persisted under the documented localStorage key', !!ls && /"records"/.test(ls));
  await shot('state-07-data.png');

  // ── S14 · responsive (SCOPE question: DreamSpec says "local desktop web app") ─
  stage('S14 responsive');
  await act('open Review Journal', () => page.getByRole('button', { name: 'Review Journal' }).click());
  await page.setViewportSize({ width: 390, height: 844 });
  await pause(240);
  const ow = await page.evaluate(() => document.documentElement.scrollWidth);
  const iw = await page.evaluate(() => document.documentElement.clientWidth);
  const mainW = (await page.locator('main').boundingBox())?.width ?? -1;
  note('S14 · document scrollWidth vs clientWidth at 390px', `${ow} vs ${iw}`);
  note('S14 · main column width at 390px (px)', String(Math.round(mainW)));
  check('no horizontal page overflow at 390px', !(ow > iw + 1), `${ow} > ${iw}`, 'SCOPE');
  await shot('state-08-mobile-390.png');
  await page.setViewportSize({ width: 1440, height: 900 });

  // ── S15 · runtime offline proof ─────────────────────────────────────────────
  stage('S15 network');
  check('NO external network requests during the whole journey (runtime)', external.length === 0, external.slice(0, 3).join(' | ') || '');
  check('no console errors', consoleErrors.length === 0, `${consoleErrors.length}`);
  consoleErrors.slice(0, 5).forEach((e) => row('  console', e.slice(0, 120)));
} catch (e) {
  failures.push('journey aborted: ' + String(e?.message ?? e).split('\n')[0]);
  row('JOURNEY ABORTED', String(e?.message ?? e).split('\n')[0]);
}

await browser.close();
server.close();

const finalVerdict = failures.length === 0 ? 'WITNESS_VERIFIED' : 'WITNESS_FAILED';
flush(finalVerdict);

console.log('\n' + '='.repeat(88));
console.log(
  failures.length === 0
    ? 'WITNESS VERIFIED — every check passed.'
    : `WITNESS FAILED — ${failures.length} finding(s):\n` + failures.map((f) => '  x ' + f).join('\n'),
);
console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} checks passed · ${observations.length} observations · report: witness/witness-report.json\n`);
process.exit(failures.length === 0 ? 0 : 1);
