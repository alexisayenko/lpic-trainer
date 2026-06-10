import { useMemo, useState } from 'react';
import { QUESTIONS } from '../data/questions/index';
import { useStore } from '../store';
import { attemptsFor, filterPool, lastByQuestion, orderByWeakness, pickDeck, shuffledIndices } from '../lib/select';
import { masteryOf } from '../lib/mastery';
import { TOPIC_LABELS, UTILITIES, topicOf, type Question } from '../types';
import { QuestionStats } from './QuestionStats';

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

function sameSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const bs = new Set(b);
  return a.every((x) => bs.has(x));
}

export function Quiz({ onExit, onFinish }: { onExit: () => void; onFinish: () => void }) {
  const selectedTopics = useStore((s) => s.selectedTopics);
  const quizSize = useStore((s) => s.quizSize);
  const resultFilter = useStore((s) => s.resultFilter);
  const sourceFilter = useStore((s) => s.sourceFilter);
  const recordAnswer = useStore((s) => s.recordAnswer);
  const history = useStore((s) => s.history);

  // Snapshot history once, when the deck is built, so answering doesn't re-order it mid-quiz.
  const deck = useMemo<Question[]>(() => {
    const topicPool = selectedTopics
      ? QUESTIONS.filter((q) => {
          const t = topicOf(q);
          return t !== undefined && selectedTopics.includes(t);
        })
      : QUESTIONS;
    const last = lastByQuestion(useStore.getState().history);
    const pool = filterPool(topicPool, last, resultFilter, sourceFilter);
    const ordered = orderByWeakness(pool, last);
    return pickDeck(ordered, quizSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTopics, quizSize, resultFilter, sourceFilter]);

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

  if (deck.length === 0) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center space-y-4">
        <p className="text-slate-300">No questions match the selected topics and filters.</p>
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
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={onFinish}
            className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            View statistics
          </button>
          <button
            type="button"
            onClick={onExit}
            className="text-sm text-slate-400 hover:text-slate-200"
          >
            Back to topics
          </button>
        </div>
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

  const choiceClass = (i: number) => {
    const isAnswer =
      q.type === 'multi' ? q.answerIndices.includes(i) : q.type === 'single' ? q.answerIndex === i : false;
    const isPick = q.type === 'multi' ? selected.includes(i) : picked === i;
    if (answered) {
      if (isAnswer) return 'border-emerald-500 bg-emerald-900/40';
      if (isPick) return 'border-rose-500 bg-rose-900/40';
      return 'border-slate-700 bg-slate-800/30 opacity-60';
    }
    if (isPick) return 'border-emerald-600 bg-emerald-900/20';
    return 'border-slate-700 bg-slate-800/60 hover:bg-slate-800';
  };

  return (
    <div className="max-w-xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>
          {UTILITIES[q.tool]?.label ?? q.tool}
          {topicOf(q) ? ` · ${TOPIC_LABELS[topicOf(q)!]}` : ''}
        </span>
      </div>
      <QuestionStats q={q} attempts={attempts} mastery={mastery} />
      <h2 className="text-xl text-slate-100 leading-snug">{q.prompt}</h2>
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
            className="w-full p-3 rounded-md border border-slate-700 bg-slate-800/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-600 disabled:opacity-60"
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
                <span className="text-slate-200">{choices[i]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!answered && q.type === 'multi' && (
        <button
          type="button"
          onClick={submitMulti}
          disabled={selected.length === 0}
          className="w-full py-3 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium"
        >
          Submit answer
        </button>
      )}
      {!answered && q.type === 'fill' && (
        <button
          type="button"
          onClick={submitFill}
          disabled={typed.trim() === ''}
          className="w-full py-3 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium"
        >
          Submit answer
        </button>
      )}

      {answered && (
        <div className="space-y-3">
          <div
            className={`p-3 rounded-md border ${
              lastCorrect ? 'border-emerald-600 bg-emerald-900/30' : 'border-rose-600 bg-rose-900/30'
            }`}
          >
            <p className="font-medium text-slate-100">{lastCorrect ? 'Correct' : 'Incorrect'}</p>
            {q.type === 'fill' && (
              <p className="text-sm text-emerald-300 mt-1">Answer: {q.answer}</p>
            )}
            <p className="text-sm text-slate-300 mt-1">{q.explanation}</p>
          </div>
          <button
            type="button"
            onClick={next}
            className="w-full py-3 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
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
    </div>
  );
}
