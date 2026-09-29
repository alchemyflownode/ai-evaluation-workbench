import { useState } from 'react';
import { Download, FileJson, FileSpreadsheet, FileText, Trash2, RefreshCw } from 'lucide-react';
import type { WorkbenchState } from '../types';
import type { ConfirmedGroup } from '../pattern';
import { toCSV, toJSON, toMarkdown } from '../exporters';

interface Props {
  state: WorkbenchState;
  groups: ConfirmedGroup[];
  onDeleteAll: () => void;
  onResetDemo: () => void;
}

function download(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ExportPanel({ state, groups, onDeleteAll, onResetDemo }: Props) {
  const [includeContent, setIncludeContent] = useState(false);

  const stamp = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 text-sm text-slate-400">
        <p>
          {state.records.length} observation(s) · {groups.length} confirmed pattern(s) ·{' '}
          {state.drafts.length} draft(s).
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Everything is stored in this browser only. Exports are generated locally — no upload, no
          network.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Export</h2>

        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={includeContent}
            onChange={(e) => setIncludeContent(e.target.checked)}
            className="h-4 w-4 rounded border-slate-600 bg-slate-900"
          />
          Include optional task content in the CSV export (off by default)
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              download(`workbench-${stamp}.json`, toJSON(state), 'application/json')
            }
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            <FileJson className="h-4 w-4" /> Download JSON
          </button>
          <button
            type="button"
            onClick={() =>
              download(
                `workbench-records-${stamp}.csv`,
                toCSV(state.records, includeContent),
                'text/csv',
              )
            }
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            <FileSpreadsheet className="h-4 w-4" /> Download CSV
          </button>
          <button
            type="button"
            onClick={() =>
              download(
                `workbench-findings-${stamp}.md`,
                toMarkdown(state, groups, state.drafts),
                'text/markdown',
              )
            }
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            <FileText className="h-4 w-4" /> Download Markdown report
          </button>
        </div>

        <details className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
          <summary className="cursor-pointer text-xs text-slate-400">
            Preview Markdown findings report
          </summary>
          <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap text-xs text-slate-400">
            {toMarkdown(state, groups, state.drafts)}
          </pre>
        </details>

        <div className="inline-flex items-center gap-2 text-xs text-slate-500">
          <Download className="h-3.5 w-3.5" /> Markdown excludes task content and links every claim
          to its source record id.
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Data</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Delete ALL local records, patterns and drafts? This cannot be undone.')) {
                onDeleteAll();
              }
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-rose-500/40 px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/10"
          >
            <Trash2 className="h-4 w-4" /> Delete all local data
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Replace current data with the synthetic demo dataset?')) {
                onResetDemo();
              }
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" /> Reset to synthetic demo data
          </button>
        </div>
      </section>
    </div>
  );
}
