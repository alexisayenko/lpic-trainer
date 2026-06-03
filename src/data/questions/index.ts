import type { Question } from '../../types';
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

const all = Object.values(modules).flatMap((m) => (Array.isArray(m) ? m : [m]));

export const QUESTIONS: Question[] = all
  .filter(isQuestion)
  .filter((q) => q.tool in UTILITIES)
  .sort((a, b) => a.id.localeCompare(b.id));
