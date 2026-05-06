import { useMemo, useState } from 'react';
import { QUESTIONS } from '../data/questions';
import { useStore } from '../store';
import { TOPIC_LABELS, type Question } from '../types';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function Quiz({ onExit }: { onExit: () => void }) {
  const selectedTopics = useStore((s) => s.selectedTopics);
  const recordAnswer = useStore((s) => s.recordAnswer);

  const deck = useMemo<Question[]>(() => {
    const pool = selectedTopics
      ? QUESTIONS.filter((q) => selectedTopics.includes(q.topic))
      : QUESTIONS;
    return shuffle(pool);
  }, [selectedTopics]);

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  if (deck.length === 0) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center space-y-4">
        <p className="text-slate-300">No questions match the selected topics.</p>
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
    const pct = Math.round((score.correct / score.total) * 100);
    return (
      <div className="max-w-xl mx-auto p-6 space-y-4 text-center">
        <h2 className="text-2xl font-semibold text-slate-100">Done</h2>
        <p className="text-slate-300 text-lg">
          {score.correct} / {score.total} correct ({pct}%)
        </p>
        <button
          type="button"
          onClick={onExit}
          className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white"
        >
          Back to topics
        </button>
      </div>
    );
  }

  const q = deck[index];
  const isAnswered = picked !== null;
  const isCorrect = picked === q.answerIndex;

  const choose = (i: number) => {
    if (isAnswered) return;
    setPicked(i);
    const correct = i === q.answerIndex;
    recordAnswer(q.id, correct);
    setScore((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
  };

  const next = () => {
    setPicked(null);
    setIndex((i) => i + 1);
  };

  return (
    <div className="max-w-xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>{TOPIC_LABELS[q.topic]}</span>
        <span>
          {index + 1} / {deck.length}
        </span>
      </div>
      <h2 className="text-xl text-slate-100 leading-snug">{q.prompt}</h2>
      <ul className="space-y-2">
        {q.choices.map((choice, i) => {
          const isPick = picked === i;
          const isAnswer = q.answerIndex === i;
          let cls = 'border-slate-700 bg-slate-800/60 hover:bg-slate-800';
          if (isAnswered) {
            if (isAnswer) cls = 'border-emerald-500 bg-emerald-900/40';
            else if (isPick) cls = 'border-rose-500 bg-rose-900/40';
            else cls = 'border-slate-700 bg-slate-800/30 opacity-60';
          }
          return (
            <li key={i}>
              <button
                type="button"
                disabled={isAnswered}
                onClick={() => choose(i)}
                className={`w-full text-left p-3 rounded-md border transition-colors ${cls}`}
              >
                <span className="text-slate-200">{choice}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {isAnswered && (
        <div className="space-y-3">
          <div
            className={`p-3 rounded-md border ${
              isCorrect ? 'border-emerald-600 bg-emerald-900/30' : 'border-rose-600 bg-rose-900/30'
            }`}
          >
            <p className="font-medium text-slate-100">{isCorrect ? 'Correct' : 'Incorrect'}</p>
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
      <button
        type="button"
        onClick={onExit}
        className="block mx-auto text-sm text-slate-500 hover:text-slate-300"
      >
        End quiz
      </button>
    </div>
  );
}
