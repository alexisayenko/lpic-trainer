import type { ReactNode } from 'react';
import { TOPIC_LABELS, type Topic } from '../types';
import { MasteryBar } from './MasteryBar';

/** Selectable topic row: number + label, "answered" count, expand toggle, mastery bar.
 *  Expanded content (tool stats + question cards) is passed as children. */
export function TopicCard({
  topic,
  seen,
  total,
  buckets,
  selected,
  isOpen,
  onToggleSelect,
  onToggleOpen,
  children,
}: Readonly<{
  topic: Topic;
  seen: number;
  total: number;
  buckets: Map<number, number> | undefined;
  selected: boolean;
  isOpen: boolean;
  onToggleSelect: () => void;
  onToggleOpen: () => void;
  children?: ReactNode;
}>) {
  return (
    <li
      className={`rounded-md border overflow-hidden ${
        selected ? 'border-sky-500 bg-sky-900/10' : 'border-transparent'
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        onClick={onToggleSelect}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleSelect();
          }
        }}
        className="p-3 bg-slate-800/60 hover:bg-slate-800 cursor-pointer space-y-2"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-200">
            <span className="text-slate-500 mr-2">{topic}</span>
            {TOPIC_LABELS[topic]}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="whitespace-nowrap text-sm text-slate-400">
              <span className="hidden sm:inline">answered </span>{seen}/{total}
            </span>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-label={isOpen ? 'Hide questions' : 'Show questions'}
              onClick={(e) => {
                e.stopPropagation();
                onToggleOpen();
              }}
              className="p-2 -m-2 text-slate-400 hover:text-slate-200"
            >
              <svg
                viewBox="0 0 24 24"
                className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          </span>
        </div>
        <MasteryBar total={total} buckets={buckets} />
      </div>
      {isOpen && <div className="p-3 space-y-2 bg-slate-900/40">{children}</div>}
    </li>
  );
}
