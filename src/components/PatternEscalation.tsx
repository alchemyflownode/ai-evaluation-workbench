import { useMemo, useState } from 'react';
import {
  Check,
  X,
  RotateCcw,
  Pencil,
  GitMerge,
  FilePlus2,
  ChevronDown,
  ChevronRight,
  BadgeCheck,
  ShieldQuestion,
  Trash2,
} from 'lucide-react';
import type { EscalationDraft, PatternDecision, ReviewRecord, StateUpdater, WorkbenchState } from '../types';
import type { ConfirmedGroup, PatternCandidate } from '../pattern';
import { buildEscalationDraft } from '../escalation';
import { formatDate } from '../util';

interface Props {
  state: WorkbenchState;
  patterns: PatternCandidate[];
  groups: ConfirmedGroup[];
  update: StateUpdater;
}

const STATUS_STYLES: Record<PatternCandidate['status'], string> = {
  candidate: 'bg-amber-500/10 text-amber-300 ring-amber-500/30',
  confirmed: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30',
  rejected: 'bg-rose-500/10 text-rose-300 ring-rose-500/30',
};

export function PatternEscalation({ state, patterns, groups, update }: Props) {
  const [openTrace, setOpenTrace] = useState<Record<string, boolean>>({});

  const byId = useMemo(() => new Map(state.records.map((r) => [r.id, r])), [state.records]);

  const setDecision = (key: string, patch: Partial<PatternDecision>) => {
    update((prev) => {
      const current: PatternDecision = prev.patternDecisions[key] ?? { status: 'candidate' };
      const next: PatternDecision = { ...current, ...patch };
      const decisions = { ...prev.patternDecisions };
      const isClean = next.status === 'candidate' && !next.mergedInto && !next.label;
      if (isClean) {
        delete decisions[key];
      } else {
        decisions[key] = next;
      }
      return { ...prev, patternDecisions: decisions };
    });
  };

  const confirm = (key: string) =>
    setDecision(key, { status: 'confirmed', decidedAt: new Date().toISOString() });

  const reject = (key: string) =>
    setDecision(key, { status: 'rejected', mergedInto: undefined, decidedAt: new Date().toISOString() });

  const reset = (key: string) =>
    setDecision(key, { status: 'candidate', mergedInto: undefined, label: undefined });

  const rename = (p: PatternCandidate) => {
    const next = window.prompt('Canonical label for this pattern:', p.label);
    if (next === null) return;
    setDecision(p.key, { label: next.trim() });
  };

  const merge = (key: string, targetKey: string) => {
    if (targetKey === '') {
      setDecision(key, { mergedInto: undefined });
      return;
    }
    setDecision(key, { status: 'confirmed', mergedInto: targetKey, decidedAt: new Date().toISOString() });
  };

  const generateDraft = (group: ConfirmedGroup) => {
    const draft = buildEscalationDraft(group, state.records);
    update((prev) => ({ ...prev, drafts: [draft, ...prev.drafts] }));
  };

  const patchDraft = (id: string, patch: Partial<EscalationDraft>) => {
    update((prev) => ({
      ...prev,
      drafts: prev.drafts.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    }));
  };

  const deleteDraft = (id: string) => {
    update((prev) => ({ ...prev, drafts: prev.drafts.filter((d) => d.id !== id) }));
  };

  const renderTrace = (claimId: string, recordIds: string[]) => {
    const open = openTrace[claimId] ?? false;
    return (
      <div className="mt-1">
        <button
          type="button"
          onClick={() => setOpenTrace((p) => ({ ...p, [claimId]: !open }))}
          className="inline-flex items-center gap-1 text-xs text-sky-300 hover:text-sky-200"
        >
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          {recordIds.length} source record(s)
        </button>
        {open && (
          <ul className="mt-1 space-y-1 border-l border-slate-700 pl-3">
            {recordIds.map((id) => {
              const r: ReviewRecord | undefined = byId.get(id);
              if (!r) return null;
              return (
                <li key={id} className="text-xs text-slate-400">
                  <span className="font-mono text-slate-500">{id}</span> — {r.reasonTag} (
                  {r.decision}, {r.confidence}) — {r.notes}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 text-sm text-slate-400">
        <ShieldQuestion className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
        <p>
          Candidate patterns are grouped locally from <em>your own</em> reason tags by a normalized
          signature — no model is called. Nothing becomes a confirmed pattern except by your explicit
          action, and escalation drafts may only be built from confirmed patterns.
        </p>
      </div>

      {/* CANDIDATES */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Candidate patterns ({patterns.length})
        </h2>
        {patterns.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/20 p-6 text-center text-sm text-slate-500">
            No observations yet. Record entries in the Review Journal to surface candidates.
          </div>
        )}
        {patterns.map((p) => (
          <div key={p.key} className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ring-1 ${STATUS_STYLES[p.status]}`}>
                    {p.status}
                  </span>
                  <span className="rounded-full bg-slate-800/80 px-2 py-0.5 text-xs text-slate-300 ring-1 ring-slate-700">
                    ×{p.frequency}
                  </span>
                  {p.mergedInto && (
                    <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-xs text-sky-300 ring-1 ring-sky-500/30">
                      merged
                    </span>
                  )}
                </div>
                <h3 className="mt-2 text-sm font-semibold text-slate-100">{p.label}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Tag variants: {p.tagVariants.join(' · ')}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {p.recordIds.length} record(s) · first {formatDate(p.firstSeen)} · last{' '}
                  {formatDate(p.lastSeen)}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => confirm(p.key)}
                  className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/10"
                >
                  <Check className="h-3.5 w-3.5" /> Confirm
                </button>
                <button
                  type="button"
                  onClick={() => reject(p.key)}
                  className="inline-flex items-center gap-1 rounded-md border border-rose-500/40 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/10"
                >
                  <X className="h-3.5 w-3.5" /> Reject
                </button>
                <button
                  type="button"
                  onClick={() => rename(p)}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
                >
                  <Pencil className="h-3.5 w-3.5" /> Rename
                </button>
                <button
                  type="button"
                  onClick={() => reset(p.key)}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </button>
              </div>
            </div>

            <label className="mt-3 flex items-center gap-2 text-xs text-slate-400">
              <GitMerge className="h-3.5 w-3.5" /> Merge into:
              <select
                value={p.mergedInto ?? ''}
                onChange={(e) => merge(p.key, e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 text-xs text-slate-200 outline-none focus:border-sky-500"
              >
                <option value="">— none —</option>
                {patterns
                  .filter((o) => o.key !== p.key)
                  .map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
              </select>
            </label>
          </div>
        ))}
      </section>

      {/* CONFIRMED GROUPS */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Confirmed patterns ({groups.length})
        </h2>
        {groups.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/20 p-6 text-center text-sm text-slate-500">
            Nothing confirmed yet. Candidate patterns require your approval before they appear here.
          </div>
        )}
        {groups.map((g) => (
          <div key={g.key} className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-emerald-300" />
                  <h3 className="text-sm font-semibold text-slate-100">{g.label}</h3>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {g.recordIds.length} record(s) · {g.memberKeys.length} tag group(s) · first{' '}
                  {formatDate(g.firstSeen)} · last {formatDate(g.lastSeen)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => generateDraft(g)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-400"
              >
                <FilePlus2 className="h-3.5 w-3.5" /> Generate escalation draft
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* DRAFTS */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Escalation drafts ({state.drafts.length})
        </h2>
        {state.drafts.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/20 p-6 text-center text-sm text-slate-500">
            No drafts. Generate one from a confirmed pattern above.
          </div>
        )}
        {state.drafts.map((d) => (
          <div key={d.id} className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-100">{d.title}</h3>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ring-1 ${
                    d.approved
                      ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-300 ring-amber-500/30'
                  }`}
                >
                  {d.approved ? 'approved' : 'not approved'}
                </span>
                <button
                  type="button"
                  onClick={() => patchDraft(d.id, { approved: !d.approved })}
                  className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/10"
                >
                  <BadgeCheck className="h-3.5 w-3.5" /> {d.approved ? 'Unapprove' : 'Approve'}
                </button>
                <button
                  type="button"
                  onClick={() => deleteDraft(d.id)}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-300"
                  aria-label="Delete draft"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <label className="mt-3 block text-xs text-slate-400">
              Impact
              <textarea
                value={d.impact}
                onChange={(e) => patchDraft(d.id, { impact: e.target.value })}
                rows={2}
                className="mt-1 w-full resize-y rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500"
              />
            </label>
            <label className="mt-2 block text-xs text-slate-400">
              Suggested next steps
              <textarea
                value={d.nextSteps}
                onChange={(e) => patchDraft(d.id, { nextSteps: e.target.value })}
                rows={2}
                className="mt-1 w-full resize-y rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500"
              />
            </label>

            <div className="mt-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Claims &amp; traceability
              </p>
              {d.claims.map((c) => (
                <div key={c.id} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                  <p className="text-sm text-slate-300">{c.text}</p>
                  {renderTrace(c.id, c.recordIds)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
