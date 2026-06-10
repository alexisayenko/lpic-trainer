import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SOURCE_FILTERS } from './types';
import type { AnswerRecord, ResultFilter, SourceFilter, Topic } from './types';

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

interface State {
  selectedTopics: Topic[] | null;
  /** Number of questions per quiz; null means "all matching questions". */
  quizSize: number | null;
  /** Restrict the quiz pool (and dashboard view) by last-answer result. */
  resultFilter: ResultFilter;
  /** Restrict the quiz pool (and dashboard view) by question origin; 'all' = no filter. */
  sourceFilter: SourceFilter;
  /** When on, further restrict to questions not attempted today (ANDed with the result filter). */
  unseenToday: boolean;
  history: AnswerRecord[];
  setTopics: (topics: Topic[] | null) => void;
  setQuizSize: (size: number | null) => void;
  setResultFilter: (f: ResultFilter) => void;
  setSourceFilter: (s: SourceFilter) => void;
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
      resultFilter: 'all',
      sourceFilter: 'all',
      unseenToday: false,
      history: [],
      setTopics: (selectedTopics) => set({ selectedTopics }),
      setQuizSize: (quizSize) => set({ quizSize }),
      setResultFilter: (resultFilter) => set({ resultFilter }),
      setSourceFilter: (sourceFilter) => set({ sourceFilter }),
      setUnseenToday: (unseenToday) => set({ unseenToday }),
      recordAnswer: (questionId, pickedIndex, correct) =>
        set((s) => ({
          history: [...s.history, { id: newId(), questionId, pickedIndex, correct, ts: Date.now() }],
        })),
      setHistory: (history) => set({ history }),
    }),
    {
      name: 'lpic-trainer-state',
      version: 4,
      // v0/v1: answer records gained a stable `id`, and the result/source
      // filters were added. v3: the result filter became mastery buckets —
      // 'unseen' carries over, anything else falls back to 'all'. v4:
      // 'unseen-today' split out of the result filter into its own toggle.
      migrate: (state: unknown, version: number) => {
        const s = (state ?? {}) as Partial<State>;
        s.history = Array.isArray(s.history)
          ? s.history.map((r) => (r.id ? r : { ...r, id: newId() }))
          : [];
        if (version < 2) {
          if (!SOURCE_FILTERS.includes(s.sourceFilter as SourceFilter)) s.sourceFilter = 'all';
        }
        if (version < 3) {
          s.resultFilter = s.resultFilter === 'unseen' ? 'unseen' : 'all';
        }
        if (version < 4) {
          if ((s.resultFilter as string) === 'unseen-today') {
            s.resultFilter = 'all';
            s.unseenToday = true;
          } else {
            s.unseenToday = s.unseenToday === true;
          }
        }
        return s as State;
      },
    },
  ),
);
