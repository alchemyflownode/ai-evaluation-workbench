/**
 * Domain types for the AI Evaluation Workbench.
 *
 * Design doctrine (see README): the app ORGANIZES a human's observations; it never
 * decides what they mean. Human status transitions are the only way a pattern becomes
 * "confirmed", and escalation drafts may only be built from confirmed patterns.
 */

/** A human analyst's recorded ruling on an evaluated response. */
export type Decision = 'accept' | 'revise' | 'reject' | 'escalate' | 'unclear';

/** The analyst's own confidence in the ruling. */
export type Confidence = 'low' | 'medium' | 'high';

/** Lifecycle of a candidate pattern. Default is `candidate` until a human confirms/rejects. */
export type PatternStatus = 'candidate' | 'confirmed' | 'rejected';

/**
 * One personal review observation.
 *
 * `taskContent` is OPTIONAL and is never required, never searched, and never
 * included in exports by default — filtering works on tags/decisions/notes only.
 */
export interface ReviewRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  /** The analyst's own short reason tag; the unit the pattern engine groups on. */
  reasonTag: string;
  decision: Decision;
  /** Guideline / rubric reference, free text (e.g. "R1.2"). */
  rubricRef: string;
  confidence: Confidence;
  /** Human-marked ambiguity — surfaced as its own filter. */
  ambiguous: boolean;
  /** Personal evidence notes. */
  notes: string;
  /** OPTIONAL. Never required. Excluded from search and from default exports. */
  taskContent?: string;
}

/** A human decision laid over a derived candidate pattern. */
export interface PatternDecision {
  status: PatternStatus;
  /** When set (and the target is itself confirmed), this candidate is folded into the target. */
  mergedInto?: string;
  /** Optional human-edited canonical label. */
  label?: string;
  decidedAt?: string;
}

/** A candidate pattern DERIVED from records; `status`/`label` come from the human overlay. */
export interface PatternCandidate {
  /** Normalized grouping key (stable across tag spelling/word-order variants). */
  key: string;
  label: string;
  tagVariants: string[];
  recordIds: string[];
  frequency: number;
  firstSeen: string;
  lastSeen: string;
  status: PatternStatus;
  mergedInto?: string;
}

/** A group of confirmed (and human-merged) candidates, aggregated for escalation. */
export interface ConfirmedGroup {
  key: string;
  label: string;
  recordIds: string[];
  tags: string[];
  memberKeys: string[];
  firstSeen: string;
  lastSeen: string;
}

/** A single assertion inside an escalation draft, bound to the source records that support it. */
export interface DraftClaim {
  id: string;
  text: string;
  /** TRACEABILITY LINK: the exact review records this claim is derived from. */
  recordIds: string[];
}

/** A human-approved (or draft) escalation, built only from confirmed patterns. */
export interface EscalationDraft {
  id: string;
  patternKey: string;
  title: string;
  impact: string;
  nextSteps: string;
  claims: DraftClaim[];
  createdAt: string;
  approved: boolean;
}

/** Journal filter. Note: `query` matches tag + notes + rubricRef ONLY — never taskContent. */
export interface JournalFilter {
  decision: Decision | 'all';
  confidence: Confidence | 'all';
  rubricRef: string;
  query: string;
  ambiguousOnly: boolean;
}

/** Whole persisted state. Everything lives locally; nothing leaves the machine. */
export interface WorkbenchState {
  version: 1;
  records: ReviewRecord[];
  patternDecisions: Record<string, PatternDecision>;
  drafts: EscalationDraft[];
}

/** Functional state updater passed to child surfaces. */
export type StateUpdater = (mutator: (prev: WorkbenchState) => WorkbenchState) => void;
