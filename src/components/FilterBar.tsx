import {
  ORIGIN_LABELS,
  RESULT_FILTERS,
  SOURCE_FILTERS,
  type Origin,
  type ResultOption,
  type ResultSelection,
  type SourceSelection,
} from '../types';

export function FilterBar({
  resultFilter,
  toggleResultFilter,
  sourceFilter,
  toggleSourceFilter,
  unseenToday,
  setUnseenToday,
}: {
  resultFilter: ResultSelection;
  toggleResultFilter: (f: ResultOption) => void;
  sourceFilter: SourceSelection;
  toggleSourceFilter: (o: Origin) => void;
  unseenToday: boolean;
  setUnseenToday: (on: boolean) => void;
}) {
  const btnClass = (on: boolean) =>
    `px-3 py-1.5 rounded-md border text-xs transition-colors ${
      on
        ? 'border-emerald-500 bg-emerald-900/40 text-emerald-100'
        : 'border-slate-700 bg-slate-800/60 text-slate-200 hover:bg-slate-800'
    }`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-20 text-slate-300">Mastery</span>
        {RESULT_FILTERS.map((f) => (
          <button
            key={String(f)}
            type="button"
            onClick={() => toggleResultFilter(f)}
            className={btnClass(resultFilter.includes(f))}
          >
            {f === 'unseen' ? 'unrated' : f}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-20 text-slate-300">Source</span>
        {SOURCE_FILTERS.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => toggleSourceFilter(o)}
            className={btnClass(sourceFilter.includes(o))}
          >
            {ORIGIN_LABELS[o]}
          </button>
        ))}
      </div>
      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={unseenToday}
          onChange={(e) => setUnseenToday(e.target.checked)}
          className="h-4 w-4 accent-emerald-500"
        />
        practice only questions unseen today
      </label>
    </div>
  );
}
