import {
  ORIGIN_LABELS,
  RESULT_FILTERS,
  SOURCE_FILTERS,
  type ResultFilter,
  type SourceFilter,
} from '../types';
import { MasteryChip } from './QuestionStats';

export function FilterBar({
  resultFilter,
  setResultFilter,
  sourceFilter,
  setSourceFilter,
}: {
  resultFilter: ResultFilter;
  setResultFilter: (f: ResultFilter) => void;
  sourceFilter: SourceFilter;
  setSourceFilter: (s: SourceFilter) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <div className="flex flex-wrap rounded-md overflow-hidden border border-slate-700 w-fit">
        {RESULT_FILTERS.map((f) => (
          <button
            key={String(f)}
            type="button"
            onClick={() => setResultFilter(f)}
            className={`px-2 py-1.5 bg-slate-800 ${
              resultFilter === f ? 'text-white ring-1 ring-inset ring-emerald-500' : 'text-slate-300'
            }`}
          >
            {f === 'all' ? (
              <span className="px-1">All</span>
            ) : f === 'unseen' || f === 'unseen-today' ? (
              <span className="rounded border px-1.5 py-0.5 text-[10px] bg-slate-700/40 text-slate-400 border-slate-600">
                {f === 'unseen' ? 'unseen' : 'unseen today'}
              </span>
            ) : (
              <MasteryChip score={f} />
            )}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap rounded-md overflow-hidden border border-slate-700 w-fit">
        {SOURCE_FILTERS.map((sKey) => (
          <button
            key={sKey}
            type="button"
            onClick={() => setSourceFilter(sKey)}
            className={`px-3 py-1.5 bg-slate-800 ${
              sourceFilter === sKey ? 'text-white ring-1 ring-inset ring-emerald-500' : 'text-slate-300'
            }`}
          >
            {sKey === 'all' ? 'All' : ORIGIN_LABELS[sKey]}
          </button>
        ))}
      </div>
    </div>
  );
}
