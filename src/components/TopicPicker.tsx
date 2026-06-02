import { useMemo } from 'react';
import { QUESTIONS } from '../data/questions/index';
import { useStore } from '../store';
import { TOPIC_LABELS, topicOf, type Topic } from '../types';
import logo from '../assets/logo.webp';

const ALL_TOPICS = Object.keys(TOPIC_LABELS) as Topic[];

export function TopicPicker({ onStart, onStats }: { onStart: () => void; onStats: () => void }) {
  const selected = useStore((s) => s.selectedTopics);
  const setTopics = useStore((s) => s.setTopics);
  const quizSize = useStore((s) => s.quizSize);
  const setQuizSize = useStore((s) => s.setQuizSize);

  const isOn = (t: Topic) => selected === null || selected.includes(t);

  const available = useMemo(() => {
    return QUESTIONS.filter((q) => {
      const t = topicOf(q);
      return t !== undefined && isOn(t);
    }).length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const toggle = (t: Topic) => {
    const current = selected ?? ALL_TOPICS;
    const next = current.includes(t) ? current.filter((x) => x !== t) : [...current, t];
    setTopics(next.length === ALL_TOPICS.length ? null : next);
  };

  const presets = [5, 10, 20];

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <header className="flex items-center gap-4">
        <img src={logo} alt="LPIC-2" className="h-16 w-16 rounded-md object-cover" />
        <div>
          <h1 className="text-3xl font-semibold text-slate-100">LPIC-2 (202) Trainer</h1>
          <p className="text-slate-400 mt-1">Pick the exam objectives to drill, then start.</p>
        </div>
      </header>
      <ul className="space-y-2">
        {ALL_TOPICS.map((t) => (
          <li key={t}>
            <label className="flex items-center gap-3 p-3 rounded-md bg-slate-800/60 border border-slate-700 cursor-pointer hover:bg-slate-800">
              <input
                type="checkbox"
                checked={isOn(t)}
                onChange={() => toggle(t)}
                className="h-4 w-4 accent-emerald-500"
              />
              <span className="text-slate-200">{TOPIC_LABELS[t]}</span>
            </label>
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-300">Questions per quiz</span>
          <span className="text-sm text-slate-500">{available} available</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {presets.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setQuizSize(n)}
              className={`px-4 py-2 rounded-md border text-sm transition-colors ${
                quizSize === n
                  ? 'border-emerald-500 bg-emerald-900/40 text-emerald-100'
                  : 'border-slate-700 bg-slate-800/60 text-slate-200 hover:bg-slate-800'
              }`}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setQuizSize(null)}
            className={`px-4 py-2 rounded-md border text-sm transition-colors ${
              quizSize === null
                ? 'border-emerald-500 bg-emerald-900/40 text-emerald-100'
                : 'border-slate-700 bg-slate-800/60 text-slate-200 hover:bg-slate-800'
            }`}
          >
            All
          </button>
          <input
            type="number"
            min={1}
            value={quizSize ?? ''}
            placeholder="custom"
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              setQuizSize(Number.isFinite(v) && v > 0 ? v : null);
            }}
            className="w-24 px-3 py-2 rounded-md border border-slate-700 bg-slate-800/60 text-slate-200 placeholder-slate-500"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onStart}
        className="w-full py-3 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
      >
        Start quiz
      </button>
      <button
        type="button"
        onClick={onStats}
        className="w-full py-2 rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
      >
        View statistics
      </button>
    </div>
  );
}
