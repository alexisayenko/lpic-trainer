import type { Question } from '../../types';
import { UTILITIES } from '../../types';

const modules = import.meta.glob<Question>('./**/*.json', { eager: true, import: 'default' });

function isQuestion(value: unknown): value is Question {
  if (typeof value !== 'object' || value === null) return false;
  const q = value as Record<string, unknown>;
  return (
    typeof q.id === 'string' &&
    typeof q.tool === 'string' &&
    typeof q.prompt === 'string' &&
    Array.isArray(q.choices) &&
    typeof q.answerIndex === 'number' &&
    typeof q.explanation === 'string'
  );
}

export const QUESTIONS: Question[] = Object.values(modules)
  .filter(isQuestion)
  .filter((q) => q.tool in UTILITIES)
  .sort((a, b) => a.id.localeCompare(b.id));
