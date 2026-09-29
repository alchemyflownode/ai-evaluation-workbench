# Security Policy

## Reporting a vulnerability

Please report suspected vulnerabilities privately, **not** in a public issue:

**Email:** alchemynode@gmail.com

Include what you did, what happened, and what you expected. A minimal
reproduction is the single most useful thing you can send.

This is a personal portfolio project maintained by one person. There is no
on-call rotation and no SLA. Realistic expectations:

| Stage | Target |
| --- | --- |
| Acknowledgement of your report | within 7 days |
| Initial assessment (confirmed / not reproducible / not a vulnerability) | within 14 days |
| Fix or documented mitigation for a confirmed issue | best effort, prioritised by severity |

If a report is valid, you will be credited in `CHANGELOG.md` unless you ask not
to be.

## Supported versions

The latest commit on `main` is the only supported version. This project is
pre-1.0 and does not maintain back-ported release branches.

## Threat model

Stating this explicitly is the point: a claim of "secure" is worthless without
a stated adversary. Here is what this app does and does not defend against.

**What this app is.** A single-user, client-side React application. It has no
backend, no database, no accounts, no authentication, and no server-side
component. All state lives in the browser's `localStorage` under the key
`ai-evaluation-workbench.v1`.

### In scope — properties this project actively maintains

1. **No network egress by design.** The app must not transmit data anywhere.
   This is enforced structurally, not promised: `npm run audit:offline` scans
   every file under `src/` for `fetch(`, `XMLHttpRequest`, `axios`,
   `sendBeacon`, `WebSocket` and `new EventSource` and fails the build if any
   appear. The behavioural witness additionally records every runtime request
   and asserts the list is empty. A report of *any* outbound request from the
   app is a valid vulnerability.
2. **Optional task content stays opt-in.** `taskContent` is excluded from search
   and filtering, excluded from CSV and JSON exports by default (gated behind
   `includeContent`), and always excluded from the Markdown report. A path that
   leaks it into a default export is a valid vulnerability. This gate is
   regression-tested by the witness checks D1a–D1c.
3. **No secrets in the repository.** No API keys, tokens, or credentials are
   required to run this app, so none should ever be committed.
4. **No hidden remote code or telemetry.** No CDN-loaded scripts, no analytics,
   no fonts fetched at runtime.

### Out of scope — explicitly not defended

1. **`localStorage` is not encrypted.** It is plain-text, origin-scoped, and
   readable by any script running on the same origin, plus anyone with access to
   the user's browser profile or disk. **Do not enter confidential material into
   this app.** This is a documented design limit, not a vulnerability.
2. **Cross-site scripting.** React escapes interpolated values by default, and
   the app renders no user-supplied HTML. A demonstrated XSS via an unexpected
   sink (e.g. `dangerouslySetInnerHTML`) *is* in scope; a general "you should
   sanitise input" report without a working payload is not.
3. **Threats requiring local machine compromise.** Malware, a malicious browser
   extension, physical access, or a compromised OS are outside the boundary.
4. **Multi-user or shared-machine isolation.** The app assumes one trusted user.
5. **Denial of service via pathological local data.** State lives in the user's
   own browser.

### Secret handling policy

- The app requires no secrets to run; nothing is read from `.env`.
- `.env`, `.env.*`, `*.pem`, `*.key` and `*.log` are ignored via `.gitignore`.
  Only `.env.example` (with placeholder values) may be committed.
- If a secret is ever exposed in git history, treat it as compromised and rotate
  it. Removing the commit is not sufficient — assume it was scraped within
  seconds on a public repository.

## Reporting a dependency vulnerability

Dependency advisories are handled by Dependabot. You do not need to email for
those.
