import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Topic } from './types';

export interface AnswerRecord {
  /** Stable client-generated id; used to dedupe when syncing across devices. */
  id: string;
  questionId: string;
  /** Index of the choice the user picked. Optional for records saved before this was tracked. */
  pickedIndex?: number;
  correct: boolean;
  ts: number;
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export type ResultFilter = 'all' | 'correct' | 'wrong' | 'unseen';

interface State {
  selectedTopics: Topic[] | null;
  /** Number of questions per quiz; null means "all matching questions". */
  quizSize: number | null;
  /** Restrict the quiz pool (and dashboard view) by last-answer result. */
  resultFilter: ResultFilter;
  /** Restrict the quiz pool (and dashboard view) by question origin; 'all' = no filter. */
  sourceFilter: string;
  history: AnswerRecord[];
  setTopics: (topics: Topic[] | null) => void;
  setQuizSize: (size: number | null) => void;
  setResultFilter: (f: ResultFilter) => void;
  setSourceFilter: (s: string) => void;
  recordAnswer: (questionId: string, pickedIndex: number | undefined, correct: boolean) => void;
  /** Replace the whole answer log (used after a cloud sync/merge). */
  setHistory: (history: AnswerRecord[]) => void;
  reset: () => void;
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      selectedTopics: null,
      quizSize: null,
      resultFilter: 'all',
      sourceFilter: 'all',
      history: [],
      setTopics: (selectedTopics) => set({ selectedTopics }),
      setQuizSize: (quizSize) => set({ quizSize }),
      setResultFilter: (resultFilter) => set({ resultFilter }),
      setSourceFilter: (sourceFilter) => set({ sourceFilter }),
      recordAnswer: (questionId, pickedIndex, correct) =>
        set((s) => ({
          history: [...s.history, { id: newId(), questionId, pickedIndex, correct, ts: Date.now() }],
        })),
      setHistory: (history) => set({ history }),
      reset: () => set({ history: [] }),
    }),
    {
      name: 'lpic-trainer-state',
      version: 1,
      // Backfill ids on answer records persisted before id existed.
      migrate: (state: unknown) => {
        const s = state as State;
        if (s?.history) {
          s.history = s.history.map((r) =>
            r.id ? r : { ...r, id: `${r.questionId}-${r.ts}` },
          );
        }
        return s;
      },
    },
  ),
);
