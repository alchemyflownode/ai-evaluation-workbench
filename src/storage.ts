import type { WorkbenchState } from './types';
import { seedRecords } from './demo';

/**
 * Local-first persistence seam.
 *
 * The MVP uses `localStorage`. There is intentionally NO fetch/XHR anywhere in this
 * app: swapping this module for IndexedDB or SQLite is the only place storage lives,
 * and no data is ever transmitted off the machine.
 */
const KEY = 'ai-evaluation-workbench.v1';

export function emptyState(): WorkbenchState {
  return { version: 1, records: [], patternDecisions: {}, drafts: [] };
}

/** A fresh, seeded state (synthetic demo data) — used on first run and on "reset demo". */
export function demoState(): WorkbenchState {
  return { ...emptyState(), records: seedRecords() };
}

export function loadState(): WorkbenchState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return demoState();
    const parsed = JSON.parse(raw) as Partial<WorkbenchState> | null;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.records)) {
      return demoState();
    }
    return {
      version: 1,
      records: parsed.records,
      patternDecisions: parsed.patternDecisions ?? {},
      drafts: Array.isArray(parsed.drafts) ? parsed.drafts : [],
    };
  } catch {
    // Corrupt or blocked storage: fall back to a clean seeded session, never throw.
    return demoState();
  }
}

export function saveState(state: WorkbenchState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: the UI keeps working in-memory for this session.
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing to do
  }
}
