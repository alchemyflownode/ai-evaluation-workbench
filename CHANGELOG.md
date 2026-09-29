# Changelog

Notable changes to this project, following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Because this is a repository-first project, entries below are keyed to git
commits. The behavioural witness report committed alongside each change is the
evidence for its verification status.

## [Unreleased]

## [0.1.0] — 2026-09-29

Initial public release of the MVP.

### Added

- **Review Journal** — record and edit observations with a reason tag, decision,
  rubric reference, confidence, an ambiguity marker, evidence notes, and an
  optional task-content field.
- **Pattern Escalation** — deterministic, local candidate grouping over the
  analyst's own reason tags by normalized signature, with human
  Confirm / Reject / Rename / Merge overlays. Only confirmed patterns can produce
  an escalation draft, and every draft claim carries `recordIds` linking it to
  the exact source records.
- **Export & Data** — JSON, CSV and Markdown findings report, plus delete-all and
  reset-to-demo. `taskContent` is excluded from default exports.
- **Offline guarantee, enforced structurally** — `tools/no-network-scan.mjs`
  (`npm run audit:offline`) fails the build if any network API appears under
  `src/`.
- **Behavioural witness** — `witness/witness.mjs`, an observation-only Playwright
  journey of 15 stages and 47 checks that never edits the artifact, writing
  `witness/witness-report.json` and eight state screenshots as evidence.
- **Windows launcher** — `start.bat`, interactive or scripted via an argument.
- **CI** — `.github/workflows/ci.yml` runs `npm ci`, strict typecheck, the
  offline audit, the production build, and a build smoke test.
- **Docs and policy** — README, LICENSE (MIT), SECURITY.md with a threat model,
  CONTRIBUTING.md.

### Fixed

- **JSON export leaked task content.** `toJSON()` ignored the export gate that
  `toCSV()` honoured, so `taskContent` was present in every JSON download,
  contradicting the documented contract in `src/types.ts`. It now takes the same
  `includeContent` flag, defaulting to `false` (`d845850`).
- **Stale standalone paths in `start.bat`.** The dependency probe still looked
  for `..\..\..\node_modules` from when this app lived inside a larger workspace,
  so it reported dependencies as missing when they were present (`d845850`).
- **Witness asserted two false premises.** Check D5 required all three
  `off-by-one` variants to land in one candidate, which is impossible because
  `by` is a stopword; check D1c required JSON to omit task content immediately
  after the test itself had opted into including it. Both assertions were
  corrected to test the behaviour the code actually guarantees (`d845850`).
- **`witness/package.json` declared no dependencies**, so `import 'playwright'`
  could not resolve on a fresh clone (`d845850`).

### Known issues

Recorded openly rather than hidden. The committed witness report is the source
of truth: **45/47 checks pass, verdict `WITNESS_FAILED`.**

- **D3** — Merging a candidate into an *unconfirmed* target creates a standing
  confirmed group, where it should fold or be refused.
- **D4** — Rejecting a candidate marks it rejected but leaves it listed under
  candidate patterns, rather than returning its records to the ungrouped pool.

### Not in this release

Named in the spec but explicitly out of scope for v0.1: Self-Consistency
Auditor, Rubric Compliance Tracker, Work & Pace Log, and FIN memory integration.
"Splitting" a candidate is also unimplemented; merging, renaming and resetting
are.

[Unreleased]: https://github.com/alchemyflownode/ai-evaluation-workbench/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/alchemyflownode/ai-evaluation-workbench/releases/tag/v0.1.0
