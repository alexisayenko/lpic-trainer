import { useEffect, useRef, useState, type ReactNode } from 'react';
import { QUESTIONS } from '../data/questions/index';
import { Modal } from './Modal';

type Panel = 'theory' | 'manual' | 'about';

const ITEMS: ReadonlyArray<{ key: Panel; label: string }> = [
  { key: 'theory', label: 'Theory' },
  { key: 'manual', label: 'User manual' },
  { key: 'about', label: 'About' },
];

const TITLES: Record<Panel, string> = {
  theory: 'Theory',
  manual: 'User manual',
  about: 'About',
};

export function InfoMenu() {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="text-sm text-slate-400 hover:text-slate-200"
      >
        Menu
      </button>
      {open && (
        <ul
          role="menu"
          className="absolute bottom-full left-0 z-40 mb-1 w-40 overflow-hidden rounded-md border border-slate-700 bg-slate-800 py-1 shadow-xl"
        >
          {ITEMS.map((item) => (
            <li key={item.key} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setPanel(item.key);
                  setOpen(false);
                }}
                className="block w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-slate-100"
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {panel && (
        <Modal title={TITLES[panel]} onClose={() => setPanel(null)}>
          {PANELS[panel]}
        </Modal>
      )}
    </div>
  );
}

const WIKI = 'https://en.wikipedia.org/wiki/Forgetting_curve';

function Link({ href, children }: Readonly<{ href: string; children: ReactNode }>) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-sky-400 underline underline-offset-2 hover:text-sky-300"
    >
      {children}
    </a>
  );
}

const PANELS: Record<Panel, ReactNode> = {
  theory: (
    <div className="space-y-3">
      <h3 className="font-semibold text-slate-100">Ebbinghaus Forgetting Curve</h3>
      <p>
        In the 1880s Hermann Ebbinghaus measured how quickly we lose newly learned
        information. His <em>forgetting curve</em> shows that retention drops sharply soon
        after learning — much of it within the first day — and then levels off. Memory decays
        roughly exponentially when no effort is made to retain it.
      </p>
      <p>
        The curve flattens with <strong>spaced repetition</strong>: reviewing material at
        growing intervals, each time just before you would forget it. Every well-timed review
        resets the decay and pushes the knowledge further into long-term memory, so fewer
        reviews are needed over time.
      </p>
      <p>
        This trainer is built around that idea. It can prioritise questions you haven't seen
        recently, tracks a per-question mastery score, and shows a day strip of your recent
        activity — so you can space your reviews instead of cramming.
      </p>
      <p>
        More on the theory: <Link href={WIKI}>Forgetting curve (Wikipedia)</Link>.
      </p>
    </div>
  ),
  manual: (
    <div className="space-y-3">
      <p>How to use the trainer:</p>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>
          <strong>Choose topics.</strong> Tick the exam topics (207–212) you want to drill.
          Expand a topic to see its utilities and individual questions.
        </li>
        <li>
          <strong>Filter the pool.</strong> Narrow by result (correct / wrong / unanswered),
          by source, or to questions <em>unseen today</em>.
        </li>
        <li>
          <strong>Pick a quiz size</strong> (a preset or <em>All</em>), then press{' '}
          <strong>Start quiz</strong>.
        </li>
        <li>
          <strong>Answer questions.</strong> Single-choice, multiple-response, or
          fill-in-the-blank. You get an explanation right after each answer.
        </li>
        <li>
          <strong>Read the markers.</strong> The day strip counts unique questions answered
          per day. The mastery pennant fills one chevron per 20 points (× at 0, empty when a
          question is still unanswered).
        </li>
        <li>
          <strong>Progress is saved</strong> on this device. When cloud sync is configured,
          open the app once with your <code>?token</code> to unlock quizzing and sync answers
          across devices.
        </li>
      </ul>
    </div>
  ),
  about: (
    <div className="space-y-3">
      <p>
        <strong>LPIC-2 (Exam 202-450) Trainer</strong> — a practice quiz for the LPIC-2
        exam 202 (Linux Network Professional).
      </p>
      <p>
        It runs entirely in the browser, covering the exam 202 objectives (Domain Name
        Server, HTTP Services, File Sharing, Network Client Management, E-Mail Services, and
        System Security) across {QUESTIONS.length} questions.
      </p>
      <p className="text-slate-400">
        Questions are derived from LPIC-2 study material for practice — they are not
        reproductions of real LPI exam items.
      </p>
    </div>
  ),
};
