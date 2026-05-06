import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Topic } from './types';

interface AnswerRecord {
  questionId: string;
  correct: boolean;
  ts: number;
}

interface State {
  selectedTopics: Topic[] | null;
  history: AnswerRecord[];
  setTopics: (topics: Topic[] | null) => void;
  recordAnswer: (questionId: string, correct: boolean) => void;
  reset: () => void;
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      selectedTopics: null,
      history: [],
      setTopics: (selectedTopics) => set({ selectedTopics }),
      recordAnswer: (questionId, correct) =>
        set((s) => ({
          history: [...s.history, { questionId, correct, ts: Date.now() }],
        })),
      reset: () => set({ history: [] }),
    }),
    { name: 'lpic-trainer-state' },
  ),
);
