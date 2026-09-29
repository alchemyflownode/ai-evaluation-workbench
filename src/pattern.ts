import type {
  ConfirmedGroup,
  PatternCandidate,
  PatternDecision,
  ReviewRecord,
} from './types';

// Re-export the aggregate/derived types from this module's public surface so
// consumers can import the pattern engine and its result shapes from one place.
export type { ConfirmedGroup, PatternCandidate } from './types';

/**
 * Deterministic, LOCAL candidate-pattern engine.
 *
 * It does NOT call a model and does NOT decide anything. It groups the analyst's own
 * reason tags by a normalized signature (lowercased, punctuation stripped, stopwords
 * removed, tokens sorted) so that spelling and word-order variants land together —
 * e.g. "off-by-one error", "off-by-one" and "error off by one" share one signature.
 *
 * Everything the engine produces is a CANDIDATE. Whether it means anything is the
 * human's decision, recorded in `patternDecisions`.
 */

const STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'to', 'in', 'on', 'and', 'or', 'with', 'for', 'by', 'at', 'is', 'was',
]);

/** Normalize a tag into a stable grouping key. */
export function normalizeTag(tag: string): string {
  const tokens = tag
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !STOPWORDS.has(t));

  const unique = Array.from(new Set(tokens)).sort();
  if (unique.length === 0) return tag.trim().toLowerCase();
  return unique.join(' ');
}

interface Group {
  key: string;
  tagCounts: Map<string, number>;
  ids: string[];
  first: string;
  last: string;
}

/** Derive candidate patterns from records, layered with the human's decisions. */
export function derivePatterns(
  records: ReviewRecord[],
  decisions: Record<string, PatternDecision>,
): PatternCandidate[] {
  const groups = new Map<string, Group>();

  for (const r of records) {
    const key = normalizeTag(r.reasonTag);
    let g = groups.get(key);
    if (!g) {
      g = { key, tagCounts: new Map(), ids: [], first: r.createdAt, last: r.createdAt };
      groups.set(key, g);
    }
    const tag = r.reasonTag.trim();
    g.tagCounts.set(tag, (g.tagCounts.get(tag) ?? 0) + 1);
    g.ids.push(r.id);
    if (r.createdAt < g.first) g.first = r.createdAt;
    if (r.createdAt > g.last) g.last = r.createdAt;
  }

  const list: PatternCandidate[] = [];
  for (const g of groups.values()) {
    const decision: PatternDecision = decisions[g.key] ?? { status: 'candidate' };
    const variants = Array.from(g.tagCounts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map((e) => e[0]);

    const humanLabel = decision.label?.trim();
    list.push({
      key: g.key,
      label: humanLabel && humanLabel.length > 0 ? humanLabel : variants[0] ?? g.key,
      tagVariants: variants,
      recordIds: g.ids.slice().sort(),
      frequency: g.ids.length,
      firstSeen: g.first,
      lastSeen: g.last,
      status: decision.status,
      ...(decision.mergedInto ? { mergedInto: decision.mergedInto } : {}),
    });
  }

  list.sort((a, b) => b.frequency - a.frequency || a.label.localeCompare(b.label));
  return list;
}

/**
 * Aggregate CONFIRMED candidates into escalation-ready groups, folding any candidate
 * whose `mergedInto` points at a confirmed target.
 */
export function confirmedGroups(patterns: PatternCandidate[]): ConfirmedGroup[] {
  const byKey = new Map(patterns.map((p) => [p.key, p]));
  const groups = new Map<string, ConfirmedGroup>();

  for (const p of patterns) {
    if (p.status !== 'confirmed') continue;

    const targetIsConfirmed = p.mergedInto ? byKey.get(p.mergedInto)?.status === 'confirmed' : false;
    const targetKey = targetIsConfirmed && p.mergedInto ? p.mergedInto : p.key;
    const target = byKey.get(targetKey);
    if (!target) continue;

    let g = groups.get(targetKey);
    if (!g) {
      g = {
        key: targetKey,
        label: target.label,
        recordIds: [],
        tags: [],
        memberKeys: [],
        firstSeen: target.firstSeen,
        lastSeen: target.lastSeen,
      };
      groups.set(targetKey, g);
    }

    g.recordIds.push(...p.recordIds);
    g.tags.push(...p.tagVariants);
    g.memberKeys.push(p.key);
    if (p.firstSeen < g.firstSeen) g.firstSeen = p.firstSeen;
    if (p.lastSeen > g.lastSeen) g.lastSeen = p.lastSeen;
  }

  return Array.from(groups.values()).map((g) => ({
    ...g,
    recordIds: Array.from(new Set(g.recordIds)).sort(),
    tags: Array.from(new Set(g.tags)),
    memberKeys: Array.from(new Set(g.memberKeys)).sort(),
  }));
}
