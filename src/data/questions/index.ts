import type { Origin, Question } from '../../types';
import { UTILITIES } from '../../types';

// Each JSON file is either a single question object or an array of them.
const modules = import.meta.glob('./**/*.json', { eager: true, import: 'default' });

function isQuestion(value: unknown): value is Question {
  if (typeof value !== 'object' || value === null) return false;
  const q = value as Record<string, unknown>;
  if (
    typeof q.id !== 'string' ||
    typeof q.tool !== 'string' ||
    typeof q.prompt !== 'string' ||
    typeof q.explanation !== 'string'
  ) {
    return false;
  }
  const type = (q.type as string) ?? 'single';
  if (type === 'fill') return typeof q.answer === 'string';
  if (type === 'multi') return Array.isArray(q.choices) && Array.isArray(q.answerIndices);
  return Array.isArray(q.choices) && typeof q.answerIndex === 'number';
}

/**
 * Provenance of a question, inferred from its file path and id series.
 * Generated banks live in their own folders; the original Udemy-sourced
 * questions are split by id series: the comprehensive a–g clusters come from
 * Linux Direct, the scattered "u" series from Ken Adams.
 */
function inferOrigin(path: string, id: string): Origin {
  if (path.includes('/lpic-bank/')) return 'gpt-deep-research';
  if (path.includes('/lpic2book/')) return 'claude-lpic2book';
  const series = id.match(/-([a-z]+)\d+$/)?.[1];
  return series === 'u' ? 'ken-adams' : 'linux-direct';
}

const all = Object.entries(modules).flatMap(([path, m]) => {
  const items = Array.isArray(m) ? m : [m];
  return items.map((raw) => {
    if (!raw || typeof raw !== 'object') return raw;
    const q = raw as Record<string, unknown>;
    return {
      ...q,
      type: q.type ?? 'single',
      origin: 'origin' in q ? q.origin : inferOrigin(path, (q.id as string) ?? ''),
    };
  });
});

const seen = new Set<string>();
export const QUESTIONS: Question[] = all
  .filter(isQuestion)
  .filter((q) => q.tool in UTILITIES)
  .filter((q) => {
    if (seen.has(q.id)) {
      console.warn(`Duplicate question id skipped: ${q.id}`);
      return false;
    }
    seen.add(q.id);
    return true;
  })
  .sort((a, b) => a.id.localeCompare(b.id));
