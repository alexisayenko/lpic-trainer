import { useEffect, useMemo, useRef, useState } from 'react';
import { QUESTIONS } from '../data/questions/index';
import { useStore } from '../store';
import { attemptsByQuestion, attemptsFor, balancedSample, filterPool, shuffledIndices } from '../lib/select';
import { masteryOf } from '../lib/mastery';
import { NOT_PRACTICED_MS, topicOf, type Question } from '../types';
import { QuestionCardHeader } from './QuestionCardHeader';
import { CodeText, Code } from './CodeText';

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

function sameSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const bs = new Set(b);
  return a.every((x) => bs.has(x));
}

export function Quiz({ onExit }: Readonly<{ onExit: () => void }>) {
  const quizSize = useStore((s) => s.quizSize);
  const resultFilter = useStore((s) => s.resultFilter);
  const sourceFilter = useStore((s) => s.sourceFilter);
  const toolFilter = useStore((s) => s.toolFilter);
  const notPracticed = useStore((s) => s.notPracticed);
  const recordAnswer = useStore((s) => s.recordAnswer);
  const history = useStore((s) => s.history);

  // Snapshot history once, when the deck is built, so answering doesn't re-order it mid-quiz.
  const deck = useMemo<Question[]>(() => {
    const snapshot = useStore.getState().history;
    const pool = filterPool(
      QUESTIONS,
      attemptsByQuestion(snapshot),
      resultFilter,
      sourceFilter,
      toolFilter,
      notPracticed ? NOT_PRACTICED_MS[notPracticed] : null,
      Date.now(),
    );
    return balancedSample(pool, quizSize, (q) => topicOf(q) ?? '?');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizSize, resultFilter, sourceFilter, toolFilter, notPracticed]);

  // Display order of choices per question, in original-index space. Built once
  // per deck so stored pickedIndex/answerIndices stay in original indices.
  const choiceOrders = useMemo<number[][]>(
    () => deck.map((q) => (q.type === 'fill' ? [] : shuffledIndices(q.choices.length))),
    [deck],
  );

  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [picked, setPicked] = useState<number | null>(null); // single
  const [selected, setSelected] = useState<number[]>([]); // multi
  const [typed, setTyped] = useState(''); // fill
  const [score, setScore] = useState({ correct: 0, total: 0 });

  // Float a ">" FAB whenever the primary blue action button isn't fully on screen.
  const primaryBtnRef = useRef<HTMLButtonElement | null>(null);
  const [fabVisible, setFabVisible] = useState(false);
  useEffect(() => {
    const el = primaryBtnRef.current;
    if (!el) {
      setFabVisible(false);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => setFabVisible(entry.intersectionRatio < 1),
      { threshold: [0, 1] },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [index, answered]);

  // Right arrow advances/skips the question (desktop); ignored while typing a fill answer.
  const advanceRef = useRef<() => void>(() => {});
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowRight') return;
      const el = document.activeElement;
      if (el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return;
      advanceRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (deck.length === 0) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center space-y-4">
        <p className="text-slate-300">No questions match the current filters.</p>
        <button
          type="button"
          onClick={onExit}
          className="px-4 py-2 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-100"
        >
          Back
        </button>
      </div>
    );
  }

  if (index >= deck.length) {
    const pct = score.total ? Math.round((score.correct / score.total) * 100) : 0;
    return (
      <div className="max-w-xl mx-auto p-6 space-y-4 text-center">
        <h2 className="text-2xl font-semibold text-slate-100">Done</h2>
        <p className="text-slate-300 text-lg">
          {score.correct} / {score.total} correct ({pct}%)
        </p>
        <button
          type="button"
          onClick={onExit}
          className="px-4 py-2 rounded-md bg-sky-600 hover:bg-sky-500 text-white"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  const q = deck[index];
  const choices = q.type === 'fill' ? [] : q.choices;
  const order = choiceOrders[index];
  const attempts = attemptsFor(history, q.id);
  const mastery = masteryOf(attempts, Date.now());

  const commit = (correct: boolean, pickedIndex?: number) => {
    setAnswered(true);
    setLastCorrect(correct);
    recordAnswer(q.id, pickedIndex, correct);
    setScore((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
  };

  const chooseSingle = (i: number) => {
    if (answered || q.type !== 'single') return;
    setPicked(i);
    commit(i === q.answerIndex, i);
  };

  const toggleMulti = (i: number) => {
    if (answered) return;
    setSelected((sel) => (sel.includes(i) ? sel.filter((x) => x !== i) : [...sel, i]));
  };

  const submitMulti = () => {
    if (answered || q.type !== 'multi' || selected.length === 0) return;
    commit(sameSet(selected, q.answerIndices));
  };

  const submitFill = () => {
    if (answered || q.type !== 'fill' || typed.trim() === '') return;
    commit(norm(typed) === norm(q.answer));
  };

  const next = () => {
    setAnswered(false);
    setPicked(null);
    setSelected([]);
    setTyped('');
    setIndex((i) => i + 1);
  };
  advanceRef.current = next;

  const isCorrectChoice = (i: number) => {
    if (q.type === 'multi') return q.answerIndices.includes(i);
    if (q.type === 'single') return q.answerIndex === i;
    return false;
  };

  const choiceClass = (i: number) => {
    const isAnswer = isCorrectChoice(i);
    const isPick = q.type === 'multi' ? selected.includes(i) : picked === i;
    if (answered) {
      if (isAnswer) return 'border-emerald-500 bg-emerald-900/40';
      if (isPick) return 'border-red-500 bg-red-900/40';
      return 'border-slate-700 bg-slate-800/30 opacity-60';
    }
    if (isPick) return 'border-sky-600 bg-sky-900/20';
    return 'border-slate-700 bg-slate-800/60 hover:bg-slate-800';
  };

  const primary = answered
    ? { run: next, disabled: false }
    : q.type === 'multi'
      ? { run: submitMulti, disabled: selected.length === 0 }
      : q.type === 'fill'
        ? { run: submitFill, disabled: typed.trim() === '' }
        : null;

  return (
    <div className="max-w-xl mx-auto p-6 space-y-5">
      <QuestionCardHeader
        q={q}
        attempts={attempts}
        mastery={mastery}
        titleClassName="text-sm text-slate-400"
      />
      <h2 className="text-xl text-slate-300 leading-snug"><CodeText text={q.prompt} /></h2>
      {q.type === 'multi' && !answered && (
        <p className="text-xs text-slate-500 -mt-2">Select all that apply, then submit.</p>
      )}

      {q.type === 'fill' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitFill();
          }}
        >
          <input
            type="text"
            autoFocus
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={typed}
            disabled={answered}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Type your answer…"
            className="w-full p-3 rounded-md border border-slate-700 bg-slate-800/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-600 disabled:opacity-60"
          />
        </form>
      ) : (
        <ul className="space-y-2">
          {order.map((i) => (
            <li key={i}>
              <button
                type="button"
                disabled={answered}
                onClick={() => (q.type === 'multi' ? toggleMulti(i) : chooseSingle(i))}
                className={`w-full text-left p-3 rounded-md border transition-colors ${choiceClass(i)}`}
              >
                <span className="text-slate-300"><CodeText text={choices[i]} /></span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!answered && q.type === 'multi' && (
        <button
          ref={primaryBtnRef}
          type="button"
          onClick={submitMulti}
          disabled={selected.length === 0}
          className="w-full py-3 rounded-md bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-medium"
        >
          Submit answer
        </button>
      )}
      {!answered && q.type === 'fill' && (
        <button
          ref={primaryBtnRef}
          type="button"
          onClick={submitFill}
          disabled={typed.trim() === ''}
          className="w-full py-3 rounded-md bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-medium"
        >
          Submit answer
        </button>
      )}

      {answered && (
        <div className="space-y-3">
          <div
            className={`p-3 rounded-md border ${
              lastCorrect ? 'border-emerald-600 bg-emerald-900/30' : 'border-red-600 bg-red-900/30'
            }`}
          >
            <p className="font-medium text-slate-100">{lastCorrect ? 'Correct' : 'Incorrect'}</p>
            {q.type === 'fill' && (
              <p className="text-sm text-emerald-300 mt-1">Answer: <Code>{q.answer}</Code></p>
            )}
            <p className="text-sm text-slate-300 mt-1"><CodeText text={q.explanation} /></p>
          </div>
          <button
            ref={primaryBtnRef}
            type="button"
            onClick={next}
            className="w-full py-3 rounded-md bg-sky-600 hover:bg-sky-500 text-white font-medium"
          >
            {index + 1 === deck.length ? 'See results' : 'Next question'}
          </button>
        </div>
      )}
      <div className="flex items-center justify-center gap-4 text-sm text-slate-500">
        {!answered && (
          <button type="button" onClick={next} className="hover:text-slate-300">
            Skip question
          </button>
        )}
        <span>
          {index + 1} / {deck.length}
        </span>
        <button type="button" onClick={onExit} className="hover:text-slate-300">
          End quiz
        </button>
      </div>
      {primary && fabVisible && (
        <button
          type="button"
          onClick={primary.run}
          disabled={primary.disabled}
          aria-label="Continue"
          className="fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-sky-600 text-white shadow-lg hover:bg-sky-500 disabled:opacity-50 sm:hidden"
        >
          <span className="text-3xl leading-none">›</span>
        </button>
      )}
    </div>
  );
}
