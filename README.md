# AI Evaluation Workbench

[![CI](https://github.com/alchemyflownode/ai-evaluation-workbench/actions/workflows/ci.yml/badge.svg)](https://github.com/alchemyflownode/ai-evaluation-workbench/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Witness: 45/47](https://img.shields.io/badge/witness-45%2F47%20(2%20open)-orange.svg)](witness/witness-report.json)

> Local-first, human-governed workspace for an AI **evaluation analyst**.
> Version 0.1 — MVP. Offline. No network calls.

**The guiding principle: AI may organize your observations, but only you decide what they mean.**

This app does not grade anything. It helps a human evaluator keep a consistent,
evidence-backed record of their *own* judgments: what they saw, how they ruled,
why, and which recurring issues are worth escalating.

---

## What it is (and is not)

| Is | Is not |
| --- | --- |
| A personal review journal with tags and filters | An auto-grader |
| A local candidate-pattern finder over *your* tags | A model that decides your categories |
| A traceable escalation-draft builder | A tool that submits anything for you |
| Offline, browser-local storage | Any code that phones home |

**Explicitly out of scope:** reading platform tasks, grading from task content,
scraping/injecting into any platform, sending data to external models, or
auto-submitting reviews. Only synthetic demo data ships with the app.

---

## Modules (MVP)

1. **Review Journal** — record and edit observations: reason tag, decision,
   rubric reference, confidence, an ambiguity marker, evidence notes, and an
   *optional* task-content field.
2. **Pattern Escalation** — the app groups *your* reason tags into **candidate
   patterns** by a normalized signature; you **Confirm / Reject / Rename / Merge**
   them. Only confirmed patterns can produce an **escalation draft**, and every
   claim in that draft is traceable to the exact source records.
3. **Export & Data** — JSON, CSV (task content opt-in), and a Markdown findings
   report; delete-all and reset-to-demo.

Later phases named in the spec — Self-Consistency Auditor, Rubric Compliance
Tracker, Work & Pace Log, FIN memory integration — are **not** in v0.1.

---

## Why the pattern engine is not "AI"

`src/pattern.ts` is pure, deterministic, offline: it lowercases tags, strips
punctuation, removes stopwords, sorts the tokens, and groups on the resulting
signature. So `off-by-one error` and `error off by one` both normalize to
`error off one` and land in **one** candidate; `off-by-one` normalizes to
`off one` and forms a **second**. **No model is invoked anywhere in this app** —
that is a structural property, not a promise: `npm run audit:offline` scans every
file under `src/` for `fetch(`, `XMLHttpRequest`, `axios`, `sendBeacon`,
`WebSocket` and `new EventSource`, and exits non-zero if any appear.

> **Corrected claim.** An earlier revision of this README asserted that all three
> `off-by-one` variants collapse into a single candidate. That was wrong — `by` is
> a stopword, so `off-by-one` loses it while the other two keep `error`. The
> witness measured **2** candidates, not 1. The engine was correct; the prose was
> not. See *Verification* below.

Every grouping is a *candidate*. The human overlay (`patternDecisions`) is the
only thing that can promote one to `confirmed`.

---

## Architecture

```
src/
  main.tsx                 React 19 root (StrictMode)
  App.tsx                  shell: nav + state holder + persistence effect
  index.css                Tailwind v4 entrypoint
  types.ts                 domain types (ReviewRecord, PatternCandidate, …)
  util.ts                  newId / formatDate / countBy
  storage.ts               localStorage seam (the ONLY persistence point)
  demo.ts                  synthetic seed records (no client data)
  pattern.ts               deterministic candidate engine + confirmedGroups()
  escalation.ts            buildEscalationDraft() — confirmed-only, claim→record links
  exporters.ts             toJSON / toCSV / toMarkdown
  components/
    ReviewJournal.tsx      record/edit/filter/search (tag·notes·rubric only)
    PatternEscalation.tsx  confirm/reject/rename/merge → drafts → trace
    ExportPanel.tsx        export + delete/reset
tools/
  no-network-scan.mjs      structural proof of the offline claim
witness/
  witness.mjs              Playwright journey; observation only
  witness-report.json      47 checks + 8 state screenshots
```

### Doctrine encoded in code

- **Human authority before meaning.** A pattern becomes `confirmed` only via an
  explicit click; drafts can be built only from confirmed groups.
- **Traceability.** `DraftClaim.recordIds` links every draft claim to the source
  notes; the UI renders that link as an expandable trace, and the Markdown report
  prints it as `record id → note`.
- **Task content is opt-in.** Search and filter never touch it. CSV and JSON
  exports exclude it unless you tick the box; the Markdown report always excludes
  it.

---

## Documentation

| Document | What it covers |
| --- | --- |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Development setup, the evidence rule, commit and PR conventions |
| [SECURITY.md](SECURITY.md) | Threat model, what is and is not defended, how to report |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Community standards |
| [CHANGELOG.md](CHANGELOG.md) | Notable changes, including the known issues |
| [witness/witness-report.json](witness/witness-report.json) | Raw behavioural evidence: 47 checks, 8 observations |

---

## Run

```bash
npm install          # install dependencies
npm run dev          # dev server → http://localhost:5178
npm run typecheck    # tsc --noEmit  (structural verification)
npm run build        # tsc --noEmit && vite build
npm run audit:offline # proves the offline claim (see below)
npm run verify       # typecheck + audit:offline
```

Static-preview alternative (no install): this is a Vite app, so serve the built
`dist/` with any static file server.

### Easy start (Windows)

Double-click **`start.bat`** in this folder. It reports the Node version and where
dependencies resolve from, then offers a short menu:

| Choice | Action |
| --- | --- |
| `1` — or just press Enter | Start the app → `http://localhost:5178` |
| `2` | `npm run build`, then serve the production `dist/` |
| `3` | `npm run verify` — strict typecheck + offline network scan |
| `4` | Rebuild `dist/`, then run the browser witness → `witness/witness-report.json` |
| `5` | `npm install` |
| `6` | Exit |

Given an argument it runs **once and never pauses**, so it is safe to script
(it exits with the real exit code of the command it ran):

```bat
start.bat dev
start.bat build
start.bat verify
start.bat witness
start.bat install
```

---

## Acceptance criteria (§6 of the DreamSpec) — how each is met

| # | Criterion | Where |
| --- | --- | --- |
| 1 | Record & edit observations | `ReviewJournal` create/edit |
| 2 | Tag & filter without exposing task content | search scope = tag·notes·rubric; `taskContent` hidden by default |
| 3 | Suggest candidate patterns from tags | `pattern.ts` `derivePatterns()` |
| 4 | Human approval before confirming | `PatternEscalation` confirm/reject gates status |
| 5 | Draft from approved records only | `buildEscalationDraft()` requires a confirmed group |
| 6 | Claim → source-note traceability | `DraftClaim.recordIds` + trace UI + Markdown |
| 7 | Offline, no hidden AI calls | no `fetch`/`XHR`; `storage.ts` is the only I/O |
| 8 | Export & delete personal records | `ExportPanel` JSON/CSV/MD + delete-all |

---

## Claims → evidence

Every claim this project makes, and where you can check it yourself. This section
is the point of the repository: an evaluation tool that overstates its own
verification has no business evaluating anything else.

| Claim | Evidence | How to check |
| --- | --- | --- |
| No network calls, ever | `tools/no-network-scan.mjs`; witness check "NO external network requests during the whole journey (runtime)" | `npm run audit:offline` |
| Grouping is deterministic and local, no model involved | `src/pattern.ts` `normalizeTag()` / `derivePatterns()` | read the file; it imports no model and calls nothing |
| The two long `off-by-one` forms land in one candidate; the short form stands alone | witness check "D5/grouping"; screenshot `witness/state-04-patterns.png` | `node witness/witness.mjs` |
| Human confirmation gates escalation — no draft exists before a human confirms | witness checks "NO draft control exists before any confirmation" and "draft control appears ONLY after confirmation" | same |
| Every draft claim traces to exact source records | witness check "trace ids point at the real formatting-drift records" → `demo_006, demo_007, demo_008` | same; also the Markdown report |
| `taskContent` is excluded from default exports | witness checks D1a–D1c; `src/exporters.ts` `includeContent` gate | same |
| The app survives a 390px viewport without horizontal overflow | witness check "no horizontal page overflow at 390px"; `witness/state-08-mobile-390.png` | same |
| Types are strict, with no unused locals or params | `tsconfig.json`; CI step "Typecheck" | `npm run typecheck` |
| The build produces a real, offline bundle | CI step "Smoke test the built output" | `npm run build` then inspect `dist/index.html` |

**What is *not* claimed:** the witness currently passes 45 of 47 checks. The two
open findings (D3, D4) are listed below and in `witness/witness-report.json`.
Nothing in this README asserts a clean pass.

---

## Verification & honest limits

Three independent layers, all re-runnable:

| Layer | Command | What it proves |
| --- | --- | --- |
| Types | `npm run typecheck` | Strict `tsc --noEmit`; no unused locals/params |
| Offline claim | `npm run audit:offline` | No network API appears anywhere under `src/` |
| Behaviour | `npm run build` then `witness/witness.mjs` | Real pointer/keyboard journey in headless Chromium |

### Witness status: **45/47 checks passed — verdict `WITNESS_FAILED`**

The behavioural witness (`witness/witness-report.json`, 15 stages, 47 checks)
**does not pass cleanly, and this README does not claim it does.** Two checks
remain open, both genuine behaviour findings:

| # | Check | Observed | Status |
| --- | --- | --- | --- |
| D3 | Merging a candidate into an *unconfirmed* target should fold it, not create a standing group | confirmed groups went 1 → 2 | **open** — `confirmedGroups()` |
| D4 | Rejecting a candidate should return its records to the ungrouped pool | rejected candidate still listed | **open** — UI behaviour |

Three previously-failing checks are now resolved:

| # | Was | Fix |
| --- | --- | --- |
| D5 | Asserted the three `off-by-one` variants land in ONE candidate — a false premise | Claim corrected in this README **and** in `src/pattern.ts`; the check now asserts the grouping the engine actually guarantees (the two long forms share one ×2 candidate, the short form stands alone) |
| D1c | Asserted JSON excludes `taskContent` — but ran *after* the test itself ticked "include task content", contradicting D1b | `toJSON()` now honours the same `includeContent` gate as `toCSV()`; the check was corrected to assert opt-in behaviour |
| — | `witness/package.json` declared no dependencies | `playwright` declared, so the witness can run on a fresh clone |

The remaining 45 checks — including the human-confirmation gate (no draft control
exists before confirmation), claim→record traceability resolving to
`demo_006, demo_007, demo_008`, no horizontal overflow at 390px, and **zero
external network requests** observed at runtime — pass.

Treat D3 and D4 as known, recorded gaps rather than silent ones. The raw evidence,
including the eight state screenshots, is committed under `witness/`.

### Other limits

- **Not imported as a FIN surface.** This is a standalone local app, not wired
  into the `dreamphase-claw` workstation UI.
- **Persistence is `localStorage`.** The seam in `storage.ts` is the swap point
  for SQLite/IndexedDB; MVP scope only. It is plain-text and origin-scoped, so do
  not enter confidential material — see [SECURITY.md](SECURITY.md).
- **"Split" is not implemented.** Merging, renaming and resetting are.
  Rejecting currently marks the candidate rejected and leaves it listed
  (witness D4, open).
- **Synthetic data only.** `demo.ts` contains invented examples and is labelled as
  such.

**Roadmap:** v0.2 real local-model-assisted clustering (opt-in, offline) → v0.3
consistency auditor + rubric tracker → v0.4 optional FIN governed-memory
integration (read-only, human-authorized).
