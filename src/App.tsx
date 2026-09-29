import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, GitBranch, Database, ShieldCheck, WifiOff } from 'lucide-react';
import type { StateUpdater, WorkbenchState } from './types';
import { clearState, demoState, loadState, saveState } from './storage';
import { confirmedGroups, derivePatterns } from './pattern';
import type { ConfirmedGroup, PatternCandidate } from './pattern';
import { ReviewJournal } from './components/ReviewJournal';
import { PatternEscalation } from './components/PatternEscalation';
import { ExportPanel } from './components/ExportPanel';

type Tab = 'journal' | 'patterns' | 'data';

const NAV: Array<{ id: Tab; label: string; icon: typeof ClipboardList }> = [
  { id: 'journal', label: 'Review Journal', icon: ClipboardList },
  { id: 'patterns', label: 'Pattern Escalation', icon: GitBranch },
  { id: 'data', label: 'Export & Data', icon: Database },
];

export function App() {
  const [state, setState] = useState<WorkbenchState>(() => loadState());
  const [tab, setTab] = useState<Tab>('journal');

  useEffect(() => {
    saveState(state);
  }, [state]);

  const update: StateUpdater = (mutator) => setState((prev) => mutator(prev));

  const patterns: PatternCandidate[] = useMemo(
    () => derivePatterns(state.records, state.patternDecisions),
    [state.records, state.patternDecisions],
  );

  const groups: ConfirmedGroup[] = useMemo(() => confirmedGroups(patterns), [patterns]);

  const resetDemo = () => {
    clearState();
    setState(demoState());
  };

  const deleteAll = () => {
    clearState();
    setState({ version: 1, records: [], patternDecisions: {}, drafts: [] });
  };

  return (
    <div className="flex h-full min-h-screen bg-[#060910] text-slate-200">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-800/80 bg-[#0a0f1a] p-4">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sky-300">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-sm font-semibold tracking-wide">Evaluation Workbench</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Human judgment · local-first</p>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                  active
                    ? 'bg-sky-500/10 text-sky-200 ring-1 ring-sky-500/30'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2 rounded-lg border border-slate-800/80 bg-slate-900/40 p-3 text-xs text-slate-400">
          <div className="flex items-center gap-2 text-slate-300">
            <WifiOff className="h-3.5 w-3.5" /> Offline by design
          </div>
          <p>No network calls. All data stays in this browser.</p>
          <p>
            {state.records.length} records · {groups.length} confirmed patterns
          </p>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-800/80 bg-[#080d17] px-6 py-4">
          <h1 className="text-lg font-semibold text-slate-100">
            {tab === 'journal' && 'Review Journal'}
            {tab === 'patterns' && 'Pattern Escalation'}
            {tab === 'data' && 'Export & Data'}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Your judgment. Your evidence. Your consistency. AI may organize your observations — only
            you decide what they mean.
          </p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {tab === 'journal' && <ReviewJournal state={state} update={update} />}
          {tab === 'patterns' && (
            <PatternEscalation state={state} patterns={patterns} groups={groups} update={update} />
          )}
          {tab === 'data' && (
            <ExportPanel
              state={state}
              groups={groups}
              onDeleteAll={deleteAll}
              onResetDemo={resetDemo}
            />
          )}
        </div>
      </main>
    </div>
  );
}
