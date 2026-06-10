import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MASTERY_BUCKETS, ORIGINS, RESULT_FILTERS } from './types';
import type { AnswerRecord, Origin, ResultOption, ResultSelection, SourceSelection, Topic } from './types';

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

interface State {
  selectedTopics: Topic[] | null;
  /** Number of questions per quiz; null means "all matching questions". */
  quizSize: number | null;
  /** Restrict the quiz pool (and dashboard view) by mastery result; empty = match nothing. */
  resultFilter: ResultSelection;
  /** Restrict the quiz pool (and dashboard view) by question origin; empty = match nothing. */
  sourceFilter: SourceSelection;
  /** When on, further restrict to questions not attempted today (ANDed with the result filter). */
  unseenToday: boolean;
  history: AnswerRecord[];
  setTopics: (topics: Topic[] | null) => void;
  setQuizSize: (size: number | null) => void;
  toggleResultFilter: (f: ResultOption) => void;
  toggleSourceFilter: (o: Origin) => void;
  setUnseenToday: (on: boolean) => void;
  recordAnswer: (questionId: string, pickedIndex: number | undefined, correct: boolean) => void;
  /** Replace the whole answer log (used after a cloud sync/merge). */
  setHistory: (history: AnswerRecord[]) => void;
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      selectedTopics: null,
      quizSize: null,
      resultFilter: ['unseen', ...MASTERY_BUCKETS],
      sourceFilter: [...ORIGINS],
      unseenToday: false,
      history: [],
      setTopics: (selectedTopics) => set({ selectedTopics }),
      setQuizSize: (quizSize) => set({ quizSize }),
      toggleResultFilter: (f) =>
        set((s) => ({
          resultFilter: s.resultFilter.includes(f)
            ? s.resultFilter.filter((x) => x !== f)
            : [...s.resultFilter, f],
        })),
      toggleSourceFilter: (o) =>
        set((s) => ({
          sourceFilter: s.sourceFilter.includes(o)
            ? s.sourceFilter.filter((x) => x !== o)
            : [...s.sourceFilter, o],
        })),
      setUnseenToday: (unseenToday) => set({ unseenToday }),
      recordAnswer: (questionId, pickedIndex, correct) =>
        set((s) => ({
          history: [...s.history, { id: newId(), questionId, pickedIndex, correct, ts: Date.now() }],
        })),
      setHistory: (history) => set({ history }),
    }),
    {
      name: 'lpic-trainer-state',
      version: 6,
      // v0/v1: answer records gained a stable `id`, and the result/source
      // filters were added. v3: the result filter became mastery buckets —
      // 'unseen' carries over, anything else falls back to 'all'. v4:
      // 'unseen-today' split out of the result filter into its own toggle.
      // v5: the result filter became multi-select — 'all' maps to [] (no
      // filtering), any single value maps to a one-element selection.
      // v6: empty selections now match nothing, so [] / 'all' / missing map
      // to everything selected; the source filter became multi-select too.
      migrate: (state: unknown, version: number) => {
        const s = (state ?? {}) as Omit<Partial<State>, 'resultFilter' | 'sourceFilter'> & {
          resultFilter?: unknown;
          sourceFilter?: unknown;
        };
        s.history = Array.isArray(s.history)
          ? s.history.map((r) => (r.id ? r : { ...r, id: newId() }))
          : [];
        if (version < 3) {
          s.resultFilter = s.resultFilter === 'unseen' ? 'unseen' : 'all';
        }
        if (version < 4) {
          if (s.resultFilter === 'unseen-today') {
            s.resultFilter = 'all';
            s.unseenToday = true;
          } else {
            s.unseenToday = s.unseenToday === true;
          }
        }
        if (version < 5) {
          s.resultFilter = RESULT_FILTERS.includes(s.resultFilter as ResultOption)
            ? [s.resultFilter as ResultOption]
            : [];
        }
        if (version < 6) {
          const results = Array.isArray(s.resultFilter)
            ? s.resultFilter.filter((x): x is ResultOption => RESULT_FILTERS.includes(x as ResultOption))
            : [];
          s.resultFilter = results.length > 0 ? results : [...RESULT_FILTERS];
          s.sourceFilter = Array.isArray(s.sourceFilter)
            ? s.sourceFilter.filter((x): x is Origin => ORIGINS.includes(x as Origin))
            : ORIGINS.includes(s.sourceFilter as Origin)
              ? [s.sourceFilter as Origin]
              : [...ORIGINS];
        }
        return s as State;
      },
    },
  ),
);
