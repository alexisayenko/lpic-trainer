import { ToggleChip } from './ToggleChip';
import {
  ALL_WEIGHTS,
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
  type WeightSelection,
} from '../types';

export function FilterBar({
  resultFilter,
  toggleResultFilter,
  sourceFilter,
  toggleSourceFilter,
  setResultFilter,
  setSourceFilter,
  weightFilter,
  toggleWeightFilter,
  setWeightFilter,
  weightFilterEnabled,
  notPracticed,
  setNotPracticed,
}: Readonly<{
  resultFilter: ResultSelection;
  toggleResultFilter: (f: ResultOption) => void;
  sourceFilter: SourceSelection;
  toggleSourceFilter: (o: Origin) => void;
  setResultFilter: (sel: ResultSelection) => void;
  setSourceFilter: (sel: SourceSelection) => void;
  weightFilter: WeightSelection;
  toggleWeightFilter: (w: number) => void;
  setWeightFilter: (sel: WeightSelection) => void;
  /** The weight filter only applies in the objective view; disabled otherwise. */
  weightFilterEnabled: boolean;
  notPracticed: NotPracticedWindow | null;
  setNotPracticed: (w: NotPracticedWindow | null) => void;
}>) {
  const allResults = resultFilter.length === RESULT_FILTERS.length;
  const allSources = sourceFilter.length === ORIGINS.length;
  const allWeights = weightFilter.length === ALL_WEIGHTS.length;
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
      <div
        className={`filter-row grid items-start gap-x-2 gap-y-1.5 ${weightFilterEnabled ? '' : 'opacity-40'}`}
        title={weightFilterEnabled ? undefined : 'Applies when grouping by objectives'}
      >
        <span className="shrink-0 whitespace-nowrap py-1.5 text-sm text-slate-300">Objective weight</span>
        <div className="filter-chips flex flex-wrap gap-1">
          {ALL_WEIGHTS.map((w) => (
            <ToggleChip
              key={w}
              on={weightFilter.includes(w)}
              onClick={() => toggleWeightFilter(w)}
              disabled={!weightFilterEnabled}
            >
              {w}
            </ToggleChip>
          ))}
        </div>
        {weightFilterEnabled && (
          <SelectAllButton
            allSelected={allWeights}
            onClick={() => setWeightFilter(allWeights ? [] : [...ALL_WEIGHTS])}
          />
        )}
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
