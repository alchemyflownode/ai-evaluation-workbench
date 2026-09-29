import type { ConfirmedGroup } from './pattern';
import type { EscalationDraft, ReviewRecord, WorkbenchState } from './types';
import { formatDate } from './util';

/**
 * Full local state as pretty JSON.
 *
 * `taskContent` is STRIPPED by default, matching `toCSV` and the doctrine in
 * `types.ts`: optional task material must never leave the app as a side effect of
 * a routine export. Pass `includeContent: true` for a deliberate full backup.
 *
 * NOTE: this output is download-only; the app never re-imports it, so stripping
 * here cannot silently drop data from a round-trip.
 */
export function toJSON(state: WorkbenchState, includeContent = false): string {
  if (includeContent) return JSON.stringify(state, null, 2);
  const records = state.records.map(({ taskContent: _taskContent, ...rest }) => rest);
  return JSON.stringify({ ...state, records }, null, 2);
}

function csvCell(value: string): string {
  const needsQuotes = /[",\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

/**
 * Records as CSV. `taskContent` is NOT exported by default (opt-in via `includeContent`),
 * so routine exports do not leak optional task material.
 */
export function toCSV(records: ReviewRecord[], includeContent = false): string {
  const header = [
    'id',
    'createdAt',
    'updatedAt',
    'reasonTag',
    'decision',
    'rubricRef',
    'confidence',
    'ambiguous',
    'notes',
    ...(includeContent ? ['taskContent'] : []),
  ];

  const lines = [header.join(',')];
  for (const r of records) {
    const row = [
      r.id,
      r.createdAt,
      r.updatedAt,
      r.reasonTag,
      r.decision,
      r.rubricRef,
      r.confidence,
      String(r.ambiguous),
      r.notes,
      ...(includeContent ? [r.taskContent ?? ''] : []),
    ];
    lines.push(row.map(csvCell).join(','));
  }
  return lines.join('\n');
}

/** A human-readable findings report with explicit claim → source traceability. */
export function toMarkdown(
  state: WorkbenchState,
  groups: ConfirmedGroup[],
  drafts: EscalationDraft[],
): string {
  const byId = new Map(state.records.map((r) => [r.id, r]));
  const out: string[] = [];

  out.push('# AI Evaluation Workbench — Personal Findings');
  out.push('');
  out.push(`Generated: ${formatDate(new Date().toISOString())}`);
  out.push('');
  out.push(
    `${state.records.length} observation(s) · ${groups.length} confirmed pattern(s) · ${drafts.length} escalation draft(s).`,
  );
  out.push('');
  out.push(
    '> This report contains only human-entered observations and human-confirmed patterns. Task content is excluded.',
  );
  out.push('');

  out.push('## Confirmed patterns');
  out.push('');
  if (groups.length === 0) {
    out.push('_No patterns confirmed yet._');
    out.push('');
  }
  groups.forEach((g, i) => {
    out.push(`### ${i + 1}. ${g.label}`);
    out.push('');
    out.push(`- Occurrences: ${g.recordIds.length}`);
    out.push(`- First seen: ${formatDate(g.firstSeen)}`);
    out.push(`- Last seen: ${formatDate(g.lastSeen)}`);
    out.push(`- Tag variants: ${g.tags.join(', ') || '—'}`);
    out.push('- Source records (traceability):');
    for (const id of g.recordIds) {
      const r = byId.get(id);
      if (!r) continue;
      out.push(`  - \`${id}\` — ${r.reasonTag} (${r.decision}, ${r.confidence}) — ${r.notes}`);
    }
    out.push('');
  });

  out.push('## Escalation drafts');
  out.push('');
  if (drafts.length === 0) {
    out.push('_No escalation drafts generated._');
    out.push('');
  }
  drafts.forEach((d, i) => {
    out.push(`### ${i + 1}. ${d.title} ${d.approved ? '✅ approved' : '⏳ not approved'}`);
    out.push('');
    out.push(`- Impact: ${d.impact}`);
    out.push(`- Next steps: ${d.nextSteps}`);
    out.push('- Claims and their sources:');
    for (const c of d.claims) {
      out.push(`  - ${c.text}`);
      out.push(`    - sources: ${c.recordIds.map((id) => `\`${id}\``).join(', ')}`);
    }
    out.push('');
  });

  return out.join('\n');
}
