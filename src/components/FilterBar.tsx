import { ToggleChip } from './ToggleChip';
import {
  ALL_TOOLS,
  NOT_PRACTICED_WINDOWS,
  ORIGINS,
  ORIGIN_LABELS,
  RESULT_FILTERS,
  RESULT_OPTION_LABELS,
  TOOLS_BY_TOPIC,
  TOPIC_SHORT_LABELS,
  UTILITIES,
  type NotPracticedWindow,
  type Origin,
  type ResultOption,
  type ResultSelection,
  type SourceSelection,
  type ToolSelection,
} from '../types';

export function FilterBar({
  resultFilter,
  toggleResultFilter,
  sourceFilter,
  toggleSourceFilter,
  setResultFilter,
  setSourceFilter,
  toolFilter,
  toggleToolFilter,
  setToolFilter,
  notPracticed,
  setNotPracticed,
  topicsExpanded,
  setTopicsExpanded,
}: Readonly<{
  resultFilter: ResultSelection;
  toggleResultFilter: (f: ResultOption) => void;
  sourceFilter: SourceSelection;
  toggleSourceFilter: (o: Origin) => void;
  setResultFilter: (sel: ResultSelection) => void;
  setSourceFilter: (sel: SourceSelection) => void;
  toolFilter: ToolSelection;
  toggleToolFilter: (tool: string) => void;
  setToolFilter: (sel: ToolSelection) => void;
  notPracticed: NotPracticedWindow | null;
  setNotPracticed: (w: NotPracticedWindow | null) => void;
  topicsExpanded: boolean;
  setTopicsExpanded: (v: boolean) => void;
}>) {
  const allResults = resultFilter.length === RESULT_FILTERS.length;
  const allSources = sourceFilter.length === ORIGINS.length;
  const setTopicTools = (tools: string[], selectAll: boolean) => {
    const next = new Set(toolFilter);
    for (const tool of tools) {
      if (selectAll) next.add(tool);
      else next.delete(tool);
    }
    setToolFilter([...next]);
  };
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
      <div className="space-y-2.5 border-t border-slate-700 pt-3">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setTopicsExpanded(!topicsExpanded)}
            aria-expanded={topicsExpanded}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-200 hover:text-slate-100"
          >
            <svg
              viewBox="0 0 16 16"
              aria-hidden="true"
              className={`h-3 w-3 transition-transform ${topicsExpanded ? 'rotate-90' : ''}`}
              fill="currentColor"
            >
              <path d="M6 4l4 4-4 4z" />
            </svg>
            LPIC-2 Topics
          </button>
          <span className="flex items-center gap-2 text-xs text-slate-400">
            <button
              type="button"
              onClick={() => setToolFilter([...ALL_TOOLS])}
              disabled={toolFilter.length === ALL_TOOLS.length}
              className="underline-offset-4 hover:text-slate-200 hover:underline disabled:opacity-40 disabled:hover:text-slate-400 disabled:hover:no-underline"
            >
              Select all
            </button>
            <span className="text-slate-600">·</span>
            <button
              type="button"
              onClick={() => setToolFilter([])}
              disabled={toolFilter.length === 0}
              className="underline-offset-4 hover:text-slate-200 hover:underline disabled:opacity-40 disabled:hover:text-slate-400 disabled:hover:no-underline"
            >
              Clear
            </button>
          </span>
        </div>
        {topicsExpanded &&
          TOOLS_BY_TOPIC.map(({ topic, tools }) => {
          const allTools = tools.every((tool) => toolFilter.includes(tool));
          return (
            <div key={topic} className="filter-row grid items-start gap-x-2 gap-y-1.5">
              <span className="shrink-0 whitespace-nowrap py-1.5 text-sm text-slate-300">
                <span className="text-slate-500">{topic}</span> {TOPIC_SHORT_LABELS[topic]}
              </span>
              <div className="filter-chips flex flex-wrap gap-1">
                {tools.map((tool) => (
                  <ToggleChip key={tool} on={toolFilter.includes(tool)} onClick={() => toggleToolFilter(tool)}>
                    {UTILITIES[tool].label}
                  </ToggleChip>
                ))}
              </div>
              <SelectAllButton allSelected={allTools} onClick={() => setTopicTools(tools, !allTools)} />
            </div>
          );
        })}
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
