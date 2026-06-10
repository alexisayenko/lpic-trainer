import {
  ORIGIN_LABELS,
  RESULT_FILTERS,
  SOURCE_FILTERS,
  type ResultFilter,
  type SourceFilter,
} from '../types';

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
      <div className="flex rounded-md overflow-hidden border border-slate-700 w-fit">
        {RESULT_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setResultFilter(f)}
            className={`px-3 py-1.5 capitalize ${
              resultFilter === f ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap rounded-md overflow-hidden border border-slate-700 w-fit">
        {SOURCE_FILTERS.map((sKey) => (
          <button
            key={sKey}
            type="button"
            onClick={() => setSourceFilter(sKey)}
            className={`px-3 py-1.5 ${
              sourceFilter === sKey ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            {sKey === 'all' ? 'All' : ORIGIN_LABELS[sKey]}
          </button>
        ))}
      </div>
    </div>
  );
}
