import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Search, Eye, EyeOff, X } from 'lucide-react';
import type {
  Confidence,
  Decision,
  JournalFilter,
  ReviewRecord,
  StateUpdater,
  WorkbenchState,
} from '../types';
import { formatDate, newId } from '../util';

interface Props {
  state: WorkbenchState;
  update: StateUpdater;
}

const DECISIONS: Decision[] = ['accept', 'revise', 'reject', 'escalate', 'unclear'];
const CONFIDENCES: Confidence[] = ['low', 'medium', 'high'];

const DECISION_STYLES: Record<Decision, string> = {
  accept: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30',
  revise: 'bg-amber-500/10 text-amber-300 ring-amber-500/30',
  reject: 'bg-rose-500/10 text-rose-300 ring-rose-500/30',
  escalate: 'bg-sky-500/10 text-sky-300 ring-sky-500/30',
  unclear: 'bg-slate-500/10 text-slate-300 ring-slate-500/30',
};

interface FormState {
  reasonTag: string;
  decision: Decision;
  rubricRef: string;
  confidence: Confidence;
  ambiguous: boolean;
  notes: string;
  taskContent: string;
}

const EMPTY_FORM: FormState = {
  reasonTag: '',
  decision: 'unclear',
  rubricRef: '',
  confidence: 'medium',
  ambiguous: false,
  notes: '',
  taskContent: '',
};

const EMPTY_FILTER: JournalFilter = {
  decision: 'all',
  confidence: 'all',
  rubricRef: '',
  query: '',
  ambiguousOnly: false,
};

export function ReviewJournal({ state, update }: Props) {
  const [filter, setFilter] = useState<JournalFilter>(EMPTY_FILTER);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const rubricOptions = useMemo(
    () =>
      Array.from(new Set(state.records.map((r) => r.rubricRef).filter((x) => x.length > 0))).sort(),
    [state.records],
  );

  const filtered = useMemo(() => {
    const q = filter.query.trim().toLowerCase();
    return state.records
      .filter((r) => {
        if (filter.decision !== 'all' && r.decision !== filter.decision) return false;
        if (filter.confidence !== 'all' && r.confidence !== filter.confidence) return false;
        if (filter.rubricRef && r.rubricRef !== filter.rubricRef) return false;
        if (filter.ambiguousOnly && !r.ambiguous) return false;
        if (q) {
          // SEARCH SCOPE: tag + notes + rubricRef ONLY. taskContent is deliberately excluded.
          const hay = `${r.reasonTag} ${r.notes} ${r.rubricRef}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [state.records, filter]);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormOpen(true);
  };

  const openEdit = (r: ReviewRecord) => {
    setForm({
      reasonTag: r.reasonTag,
      decision: r.decision,
      rubricRef: r.rubricRef,
      confidence: r.confidence,
      ambiguous: r.ambiguous,
      notes: r.notes,
      taskContent: r.taskContent ?? '',
    });
    setEditingId(r.id);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const save = () => {
    const tag = form.reasonTag.trim();
    if (tag.length === 0) return;
    const now = new Date().toISOString();

    update((prev) => {
      if (editingId) {
        return {
          ...prev,
          records: prev.records.map((r) =>
            r.id === editingId
              ? {
                  ...r,
                  reasonTag: tag,
                  decision: form.decision,
                  rubricRef: form.rubricRef.trim(),
                  confidence: form.confidence,
                  ambiguous: form.ambiguous,
                  notes: form.notes,
                  updatedAt: now,
                  taskContent: form.taskContent.trim() ? form.taskContent : undefined,
                }
              : r,
          ),
        };
      }
      const rec: ReviewRecord = {
        id: newId('rec'),
        createdAt: now,
        updatedAt: now,
        reasonTag: tag,
        decision: form.decision,
        rubricRef: form.rubricRef.trim(),
        confidence: form.confidence,
        ambiguous: form.ambiguous,
        notes: form.notes,
        ...(form.taskContent.trim() ? { taskContent: form.taskContent } : {}),
      };
      return { ...prev, records: [rec, ...prev.records] };
    });

    closeForm();
  };

  const remove = (id: string) => {
    if (!window.confirm('Delete this observation? This cannot be undone.')) return;
    update((prev) => ({ ...prev, records: prev.records.filter((r) => r.id !== id) }));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">
          {state.records.length} observation(s) recorded. Search and filters use tags, notes and
          rubric references only — never task content.
        </p>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-500/90 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-400"
        >
          <Plus className="h-4 w-4" /> New observation
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="search"
            value={filter.query}
            onChange={(e) => setFilter((f) => ({ ...f, query: e.target.value }))}
            placeholder="Search tag / notes / rubric…"
            className="w-full rounded-lg border border-slate-700 bg-slate-950/60 py-2 pl-9 pr-3 text-sm text-slate-200 outline-none focus:border-sky-500"
          />
        </label>
        <select
          value={filter.decision}
          onChange={(e) =>
            setFilter((f) => ({ ...f, decision: e.target.value as JournalFilter['decision'] }))
          }
          className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500"
        >
          <option value="all">All decisions</option>
          {DECISIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={filter.confidence}
          onChange={(e) =>
            setFilter((f) => ({ ...f, confidence: e.target.value as JournalFilter['confidence'] }))
          }
          className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500"
        >
          <option value="all">All confidence</option>
          {CONFIDENCES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={filter.rubricRef}
          onChange={(e) => setFilter((f) => ({ ...f, rubricRef: e.target.value }))}
          className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500"
        >
          <option value="">Any rubric</option>
          {rubricOptions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-300 lg:col-span-5">
          <input
            type="checkbox"
            checked={filter.ambiguousOnly}
            onChange={(e) => setFilter((f) => ({ ...f, ambiguousOnly: e.target.checked }))}
            className="h-4 w-4 rounded border-slate-600 bg-slate-900"
          />
          Show only observations I marked ambiguous
        </label>
      </div>

      {/* FORM */}
      {formOpen && (
        <div className="rounded-xl border border-sky-500/30 bg-slate-900/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-100">
              {editingId ? 'Edit observation' : 'New observation'}
            </h3>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              aria-label="Close form"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-400 sm:col-span-2">
              Reason tag <span className="text-slate-600">(your own short label — this is what patterns group on)</span>
              <input
                value={form.reasonTag}
                onChange={(e) => setForm((f) => ({ ...f, reasonTag: e.target.value }))}
                placeholder="e.g. off-by-one error"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500"
              />
            </label>
            <label className="text-xs text-slate-400">
              Decision
              <select
                value={form.decision}
                onChange={(e) => setForm((f) => ({ ...f, decision: e.target.value as Decision }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500"
              >
                {DECISIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-400">
              Confidence
              <select
                value={form.confidence}
                onChange={(e) => setForm((f) => ({ ...f, confidence: e.target.value as Confidence }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500"
              >
                {CONFIDENCES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-400">
              Guideline / rubric reference
              <input
                value={form.rubricRef}
                onChange={(e) => setForm((f) => ({ ...f, rubricRef: e.target.value }))}
                placeholder="e.g. R1.2"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500"
              />
            </label>
            <label className="flex items-center gap-2 self-end text-xs text-slate-400">
              <input
                type="checkbox"
                checked={form.ambiguous}
                onChange={(e) => setForm((f) => ({ ...f, ambiguous: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-600 bg-slate-900"
              />
              Mark as ambiguous
            </label>
            <label className="text-xs text-slate-400 sm:col-span-2">
              Evidence notes
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="mt-1 w-full resize-y rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500"
              />
            </label>
            <label className="text-xs text-slate-400 sm:col-span-2">
              Task content <span className="text-slate-600">(optional — never searched, never exported by default)</span>
              <textarea
                value={form.taskContent}
                onChange={(e) => setForm((f) => ({ ...f, taskContent: e.target.value }))}
                rows={2}
                className="mt-1 w-full resize-y rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500"
              />
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={form.reasonTag.trim().length === 0}
              className="rounded-lg bg-sky-500/90 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {editingId ? 'Save changes' : 'Add observation'}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* LIST */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/20 p-8 text-center text-sm text-slate-500">
            No observations match. Record one, or widen the filters.
          </div>
        )}
        {filtered.map((r) => {
          const show = revealed[r.id] ?? false;
          return (
            <article key={r.id} className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ring-1 ${DECISION_STYLES[r.decision]}`}
                    >
                      {r.decision}
                    </span>
                    <span className="rounded-full bg-slate-800/80 px-2 py-0.5 text-xs text-slate-300 ring-1 ring-slate-700">
                      {r.confidence}
                    </span>
                    {r.rubricRef && (
                      <span className="rounded-full bg-slate-800/80 px-2 py-0.5 text-xs text-slate-300 ring-1 ring-slate-700">
                        {r.rubricRef}
                      </span>
                    )}
                    {r.ambiguous && (
                      <span className="rounded-full bg-fuchsia-500/10 px-2 py-0.5 text-xs text-fuchsia-300 ring-1 ring-fuchsia-500/30">
                        ambiguous
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 truncate text-sm font-semibold text-slate-100">{r.reasonTag}</h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-400">{r.notes}</p>

                  {r.taskContent ? (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => setRevealed((p) => ({ ...p, [r.id]: !show }))}
                        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300"
                      >
                        {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        {show ? 'Hide task content' : 'Task content hidden — reveal'}
                      </button>
                      {show && (
                        <p className="mt-1 rounded-md bg-slate-950/60 p-2 text-xs text-slate-400">
                          {r.taskContent}
                        </p>
                      )}
                    </div>
                  ) : null}

                  <p className="mt-2 text-xs text-slate-600">
                    Created {formatDate(r.createdAt)}
                    {r.updatedAt !== r.createdAt ? ` · updated ${formatDate(r.updatedAt)}` : ''} · {r.id}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(r)}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    aria-label="Edit observation"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(r.id)}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-300"
                    aria-label="Delete observation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
