import type { ConfirmedGroup } from './pattern';
import type { DraftClaim, EscalationDraft, ReviewRecord } from './types';
import { countBy, formatDate, newId } from './util';

/**
 * Build an escalation draft from an ALREADY-CONFIRMED group.
 *
 * Enforced here, in code: the draft can only reference records that belong to the
 * confirmed group, and every claim carries `recordIds` — the traceable link back to
 * the source note. Nothing is inferred; each claim is a restatement of the human's
 * own recorded data.
 */
export function buildEscalationDraft(
  group: ConfirmedGroup,
  records: ReviewRecord[],
): EscalationDraft {
  const members = records
    .filter((r) => group.recordIds.includes(r.id))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const allIds = members.map((r) => r.id);
  const decisionCounts = countBy(members.map((r) => r.decision));
  const decisionSummary = Object.entries(decisionCounts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k} ×${v}`)
    .join(', ');

  const rubrics = Array.from(new Set(members.map((r) => r.rubricRef).filter((x) => x.length > 0)));
  const ambiguous = members.filter((r) => r.ambiguous);

  const claims: DraftClaim[] = [
    {
      id: newId('claim'),
      text: `${members.length} personal observation(s) recorded under the confirmed pattern "${group.label}", spanning ${formatDate(
        group.firstSeen,
      )} to ${formatDate(group.lastSeen)}.`,
      recordIds: allIds,
    },
    {
      id: newId('claim'),
      text: `My recorded rulings across these observations: ${decisionSummary || 'none'}.`,
      recordIds: allIds,
    },
  ];

  if (rubrics.length > 0) {
    claims.push({
      id: newId('claim'),
      text: `Guideline references involved: ${rubrics.join(', ')}.`,
      recordIds: members.filter((r) => r.rubricRef.length > 0).map((r) => r.id),
    });
  }

  if (ambiguous.length > 0) {
    claims.push({
      id: newId('claim'),
      text: `${ambiguous.length} of these observation(s) was marked ambiguous by me and may not belong to the pattern.`,
      recordIds: ambiguous.map((r) => r.id),
    });
  }

  return {
    id: newId('draft'),
    patternKey: group.key,
    title: `Recurring issue: ${group.label}`,
    impact:
      'Describe the impact of this recurring issue in your own words. (Draft — edit before approving.)',
    nextSteps:
      'Describe what you propose should happen next. (Draft — edit before approving.)',
    claims,
    createdAt: new Date().toISOString(),
    approved: false,
  };
}
