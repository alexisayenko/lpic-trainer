import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ALL_TOOLS, MASTERY_BUCKETS, ORIGINS, RESULT_FILTERS } from './types';
import type {
  AnswerRecord,
  CardView,
  NotPracticedWindow,
  Origin,
  ResultOption,
  ResultSelection,
  SourceSelection,
  ToolSelection,
} from './types';

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isResultOption(x: unknown): x is ResultOption {
  return RESULT_FILTERS.includes(x as ResultOption);
}

function isOrigin(x: unknown): x is Origin {
  return ORIGINS.includes(x as Origin);
}

function isTool(x: unknown): x is string {
  return typeof x === 'string' && ALL_TOOLS.includes(x);
}

function isCardView(x: unknown): x is CardView {
  return x === 'full' || x === 'badges' || x === 'none';
}

/** v6: empty/legacy selections mean "everything"; keep valid entries otherwise. */
function toResultSelection(value: unknown): ResultSelection {
  const results = Array.isArray(value) ? value.filter(isResultOption) : [];
  return results.length > 0 ? results : [...RESULT_FILTERS];
}

/** v6: a single origin becomes a one-element selection; anything else means "everything". */
function toSourceSelection(value: unknown): SourceSelection {
  if (Array.isArray(value)) return value.filter(isOrigin);
  if (isOrigin(value)) return [value];
  return [...ORIGINS];
}

/** v7: keep known tool slugs; a missing/legacy value means "everything". */
function toToolSelection(value: unknown): ToolSelection {
  if (Array.isArray(value)) return value.filter(isTool);
  return [...ALL_TOOLS];
}

interface State {
  /** Number of questions per quiz; null means "all matching questions". */
  quizSize: number | null;
  /** Restrict the quiz pool (and dashboard view) by mastery result; empty = match nothing. */
  resultFilter: ResultSelection;
  /** Restrict the quiz pool (and dashboard view) by question origin; empty = match nothing. */
  sourceFilter: SourceSelection;
  /** Restrict the quiz pool (and dashboard view) by tool; empty = match nothing. */
  toolFilter: ToolSelection;
  /** Exclude questions practiced within this window; null = no such restriction. */
  notPracticed: NotPracticedWindow | null;
  /** How expanded topic cards render their matching questions. */
  cardView: CardView;
  /** Whether the "LPIC-2 Topics" tool-filter region is expanded. */
  topicsExpanded: boolean;
  history: AnswerRecord[];
  setQuizSize: (size: number | null) => void;
  toggleResultFilter: (f: ResultOption) => void;
  toggleSourceFilter: (o: Origin) => void;
  toggleToolFilter: (tool: string) => void;
  setResultFilter: (sel: ResultSelection) => void;
  setSourceFilter: (sel: SourceSelection) => void;
  setToolFilter: (sel: ToolSelection) => void;
  setNotPracticed: (w: NotPracticedWindow | null) => void;
  setCardView: (v: CardView) => void;
  setTopicsExpanded: (v: boolean) => void;
  recordAnswer: (questionId: string, pickedIndex: number | undefined, correct: boolean) => void;
  /** Replace the whole answer log (used after a cloud sync/merge). */
  setHistory: (history: AnswerRecord[]) => void;
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      quizSize: null,
      resultFilter: ['unseen', ...MASTERY_BUCKETS],
      sourceFilter: [...ORIGINS],
      toolFilter: [...ALL_TOOLS],
      notPracticed: null,
      cardView: 'full',
      topicsExpanded: true,
      history: [],
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
      toggleToolFilter: (tool) =>
        set((s) => ({
          toolFilter: s.toolFilter.includes(tool)
            ? s.toolFilter.filter((x) => x !== tool)
            : [...s.toolFilter, tool],
        })),
      setResultFilter: (resultFilter) => set({ resultFilter }),
      setSourceFilter: (sourceFilter) => set({ sourceFilter }),
      setToolFilter: (toolFilter) => set({ toolFilter }),
      setNotPracticed: (notPracticed) => set({ notPracticed }),
      setCardView: (cardView) => set({ cardView }),
      setTopicsExpanded: (topicsExpanded) => set({ topicsExpanded }),
      recordAnswer: (questionId, pickedIndex, correct) =>
        set((s) => ({
          history: [...s.history, { id: newId(), questionId, pickedIndex, correct, ts: Date.now() }],
        })),
      setHistory: (history) => set({ history }),
    }),
    {
      name: 'lpic-trainer-state',
      version: 10,
      // v0/v1: answer records gained a stable `id`, and the result/source
      // filters were added. v3: the result filter became mastery buckets —
      // 'unseen' carries over, anything else falls back to 'all'. v4:
      // 'unseen-today' split out of the result filter into its own toggle.
      // v5: the result filter became multi-select — 'all' maps to [] (no
      // filtering), any single value maps to a one-element selection.
      // v6: empty selections now match nothing, so [] / 'all' / missing map
      // to everything selected; the source filter became multi-select too.
      // v7: added the per-tool filter — missing/legacy maps to every tool.
      // v8: the `unseenToday` boolean became the `notPracticed` window — true
      // maps to '1 day' (closest to the old ~21h), false/missing to null.
      // v9: added the `cardView` switcher — missing/invalid maps to 'full'.
      // v10: added `topicsExpanded` for the tool-filter region — missing maps to true.
      // When adding new persisted fields or filter values, bump `version` and
      // append a `if (version < N)` block — earlier blocks must keep working
      // on data shaped by every prior version.
      migrate: (state: unknown, version: number) => {
        const s = (state ?? {}) as Omit<
          Partial<State>,
          'resultFilter' | 'sourceFilter' | 'toolFilter' | 'notPracticed' | 'cardView'
        > & {
          resultFilter?: unknown;
          sourceFilter?: unknown;
          toolFilter?: unknown;
          notPracticed?: unknown;
          unseenToday?: unknown;
          cardView?: unknown;
          topicsExpanded?: unknown;
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
          s.resultFilter = isResultOption(s.resultFilter) ? [s.resultFilter] : [];
        }
        if (version < 6) {
          s.resultFilter = toResultSelection(s.resultFilter);
          s.sourceFilter = toSourceSelection(s.sourceFilter);
        }
        if (version < 7) {
          s.toolFilter = toToolSelection(s.toolFilter);
        }
        if (version < 8) {
          s.notPracticed = s.unseenToday === true ? '1d' : null;
          delete s.unseenToday;
        }
        if (version < 9) {
          s.cardView = isCardView(s.cardView) ? s.cardView : 'full';
        }
        if (version < 10) {
          s.topicsExpanded = typeof s.topicsExpanded === 'boolean' ? s.topicsExpanded : true;
        }
        return s as State;
      },
    },
  ),
);
