import { ToggleChip } from './ToggleChip';
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
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-20 text-slate-300">Mastery</span>
        {RESULT_FILTERS.map((f) => (
          <ToggleChip key={String(f)} on={resultFilter.includes(f)} onClick={() => toggleResultFilter(f)}>
            {f === 'unseen' ? 'unrated' : f}
          </ToggleChip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-20 text-slate-300">Source</span>
        {SOURCE_FILTERS.map((o) => (
          <ToggleChip key={o} on={sourceFilter.includes(o)} onClick={() => toggleSourceFilter(o)}>
            {ORIGIN_LABELS[o]}
          </ToggleChip>
        ))}
      </div>
      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={unseenToday}
          onChange={(e) => setUnseenToday(e.target.checked)}
          className="h-4 w-4 accent-emerald-500"
        />
        practice only questions unseen today or in the last 21h
      </label>
    </div>
  );
}
