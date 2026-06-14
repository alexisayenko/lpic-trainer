import { ToggleChip } from './ToggleChip';
import {
  ORIGINS,
  ORIGIN_LABELS,
  RESULT_FILTERS,
  RESULT_OPTION_LABELS,
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
}: Readonly<{
  resultFilter: ResultSelection;
  toggleResultFilter: (f: ResultOption) => void;
  sourceFilter: SourceSelection;
  toggleSourceFilter: (o: Origin) => void;
  unseenToday: boolean;
  setUnseenToday: (on: boolean) => void;
}>) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <span className="w-20 shrink-0 py-1.5 text-slate-300">Mastery</span>
        <div className="flex flex-wrap gap-1">
          {RESULT_FILTERS.map((f) => (
            <ToggleChip key={String(f)} on={resultFilter.includes(f)} onClick={() => toggleResultFilter(f)}>
              {RESULT_OPTION_LABELS[f]}
            </ToggleChip>
          ))}
        </div>
      </div>
      <div className="flex items-start gap-2">
        <span className="w-20 shrink-0 py-1.5 text-slate-300">Source</span>
        <div className="flex flex-wrap gap-1">
          {ORIGINS.map((o) => (
            <ToggleChip key={o} on={sourceFilter.includes(o)} onClick={() => toggleSourceFilter(o)}>
              {ORIGIN_LABELS[o]}
            </ToggleChip>
          ))}
        </div>
      </div>
      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={unseenToday}
          onChange={(e) => setUnseenToday(e.target.checked)}
          className="h-4 w-4 accent-sky-500"
        />
        <span>Only questions unseen in the last 21h</span>
      </label>
    </div>
  );
}
