import { useStore } from '../store';
import { TOPIC_LABELS, type Topic } from '../types';

const ALL_TOPICS = Object.keys(TOPIC_LABELS) as Topic[];

export function TopicPicker({ onStart }: { onStart: () => void }) {
  const selected = useStore((s) => s.selectedTopics);
  const setTopics = useStore((s) => s.setTopics);

  const isOn = (t: Topic) => selected === null || selected.includes(t);

  const toggle = (t: Topic) => {
    const current = selected ?? ALL_TOPICS;
    const next = current.includes(t) ? current.filter((x) => x !== t) : [...current, t];
    setTopics(next.length === ALL_TOPICS.length ? null : next);
  };

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-slate-100">LPIC-2 (202) Trainer</h1>
        <p className="text-slate-400 mt-1">Pick the exam objectives to drill, then start.</p>
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
      <button
        type="button"
        onClick={onStart}
        className="w-full py-3 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
      >
        Start quiz
      </button>
    </div>
  );
}
