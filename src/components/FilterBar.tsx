import { ToggleChip } from './ToggleChip';
import {
  NOT_PRACTICED_WINDOWS,
  ORIGINS,
  ORIGIN_LABELS,
  RESULT_FILTERS,
  RESULT_OPTION_LABELS,
  type NotPracticedWindow,
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
  setResultFilter,
  setSourceFilter,
  notPracticed,
  setNotPracticed,
}: Readonly<{
  resultFilter: ResultSelection;
  toggleResultFilter: (f: ResultOption) => void;
  sourceFilter: SourceSelection;
  toggleSourceFilter: (o: Origin) => void;
  setResultFilter: (sel: ResultSelection) => void;
  setSourceFilter: (sel: SourceSelection) => void;
  notPracticed: NotPracticedWindow | null;
  setNotPracticed: (w: NotPracticedWindow | null) => void;
}>) {
  const allResults = resultFilter.length === RESULT_FILTERS.length;
  const allSources = sourceFilter.length === ORIGINS.length;
  return (
    <div className="filter-groups space-y-3">
      <div className="filter-row grid items-start gap-x-2 gap-y-1.5">
        <span className="w-20 shrink-0 py-1.5 text-sm text-slate-300">Mastery</span>
        <div className="filter-chips flex flex-wrap gap-1">
          {RESULT_FILTERS.map((f) => (
            <ToggleChip key={String(f)} on={resultFilter.includes(f)} onClick={() => toggleResultFilter(f)}>
              {RESULT_OPTION_LABELS[f]}
            </ToggleChip>
          ))}
        </div>
        <SelectAllButton
          allSelected={allResults}
          onClick={() => setResultFilter(allResults ? [] : [...RESULT_FILTERS])}
        />
      </div>
      <div className="filter-row grid items-start gap-x-2 gap-y-1.5">
        <span className="w-20 shrink-0 py-1.5 text-sm text-slate-300">Source</span>
        <div className="filter-chips flex flex-wrap gap-1">
          {ORIGINS.map((o) => (
            <ToggleChip key={o} on={sourceFilter.includes(o)} onClick={() => toggleSourceFilter(o)}>
              {ORIGIN_LABELS[o]}
            </ToggleChip>
          ))}
        </div>
        <SelectAllButton
          allSelected={allSources}
          onClick={() => setSourceFilter(allSources ? [] : [...ORIGINS])}
        />
      </div>
      <div className="filter-row grid items-start gap-x-2 gap-y-1.5">
        <span className="shrink-0 whitespace-nowrap py-1.5 text-sm text-slate-300">Not practiced</span>
        <div className="filter-chips flex flex-wrap gap-1">
          {NOT_PRACTICED_WINDOWS.map(({ key, label }) => (
            <ToggleChip
              key={key}
              on={notPracticed === key}
              onClick={() => setNotPracticed(notPracticed === key ? null : key)}
            >
              {label}
            </ToggleChip>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Right-aligned select-all / clear toggle for a filter row's chips. */
function SelectAllButton({ allSelected, onClick }: Readonly<{ allSelected: boolean; onClick: () => void }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="filter-action shrink-0 whitespace-nowrap py-1.5 text-xs text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
    >
      {allSelected ? 'Clear' : 'Select all'}
    </button>
  );
}
