# Contributing

Thanks for looking. This is a personal portfolio project, so the most useful
contributions are **well-formed bug reports** and **small, focused fixes**. If
you are planning anything larger than a bug fix, please open an issue first so
we do not both waste effort.

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Development setup

Requires Node 20+ (developed and witnessed on Node 20.19.6).

```bash
git clone https://github.com/alchemyflownode/ai-evaluation-workbench.git
cd ai-evaluation-workbench
npm ci          # use ci, not install - it respects the committed lockfile
npm run dev     # http://localhost:5178
```

On Windows you can also double-click `start.bat` for a menu, or pass an argument
for scripted, non-pausing runs:

```bat
start.bat dev
start.bat build
start.bat verify
start.bat witness
```

## Before you open a pull request

Run the same three layers of verification the project uses on itself:

```bash
npm run typecheck      # strict tsc --noEmit
npm run audit:offline  # fails if any network API appears under src/
npm run build          # tsc --noEmit && vite build
```

All three must pass. If your change touches behaviour, also run the witness:

```bash
cd witness && npm ci && npx playwright install chromium
node witness/witness.mjs
```

The witness writes `witness/witness-report.json` and eight state screenshots.
**Commit the regenerated evidence with your change** if you altered behaviour —
the report is cited by the README, so a code change without it leaves the docs
lying.

## The one rule that matters

This project's entire value is that it does not overstate what it can do. Two
consequences:

1. **No claim without evidence.** If you add a performance, accuracy, or
   security claim to the README, link it to something re-runnable: a script, a
   check name in `witness-report.json`, or a named source file with a line.
2. **Do not weaken the witness to make it pass.** If a check fails, either fix
   the behaviour or correct the claim. Editing an assertion so a red check turns
   green without changing behaviour is the one thing that would make this
   project worthless.

Where the app and its documentation disagree, **the documentation is presumed
wrong** until proven otherwise — that has been the actual resolution of every
finding so far (D5, D1c).

## Code style

There is no linter or formatter configured yet — that is a known gap, not an
endorsement of free-form code. Until one lands, match the surrounding file
exactly:

- TypeScript strict mode, `noUnusedLocals` and `noUnusedParameters` are on.
- 2-space indent, single quotes, semicolons, trailing commas in multiline
  literals.
- Prefer pure functions in `src/*.ts` and keep React components free of domain
  logic — `pattern.ts`, `escalation.ts` and `exporters.ts` are deliberately
  testable without a DOM.
- Comments explain **why**, not what. The existing comments are the standard to
  match.

## Commit messages

Conventional Commits. This history already follows it.

```
fix(export): gate taskContent in the JSON export
feat(patterns): allow renaming a confirmed group
docs(readme): correct the off-by-one grouping claim
chore(ci): add the offline audit step
```

Scopes in use: `export`, `patterns`, `journal`, `witness`, `readme`, `ci`.

## Branch and pull request strategy

- Branch from `main`; name it `fix/…`, `feat/…`, or `docs/…`.
- One logical change per pull request. Keep unrelated formatting out of it.
- Describe **what you observed** and **how you verified it** — not just what you
  changed. A pull request that says "fixed the bug" will be asked for evidence.
- `main` requires the CI check to pass. Do not commit directly to `main`.

## The offline promise is structural

If your change adds any of `fetch`, `XMLHttpRequest`, `axios`, `sendBeacon`,
`WebSocket` or `EventSource` to `src/`, `npm run audit:offline` will fail the
build, and the witness will fail its runtime network check. That is intentional
and not negotiable: the app's core claim is that data never leaves the machine.
