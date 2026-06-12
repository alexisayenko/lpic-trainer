import topics from './data/topics.json';
import utilities from './data/utilities.json';

export type Topic = '207' | '208' | '209' | '210' | '211' | '212';

export type QuestionType = 'single' | 'multi' | 'fill';

interface QuestionBase {
  id: string;
  tool: string;
  prompt: string;
  explanation: string;
  /** Optional metadata carried from generated banks. */
  objective?: string;
  difficulty?: string;
  /** Authoritative reference URL for the answer. */
  source?: string;
  /** Provenance of the question set (auto-tagged at load from the file path). */
  origin?: Origin;
}

/** `type` is normalised to a concrete value at load (older files default to 'single'). */
export interface SingleQuestion extends QuestionBase {
  type: 'single';
  choices: string[];
  answerIndex: number;
}
export interface MultiQuestion extends QuestionBase {
  type: 'multi';
  choices: string[];
  answerIndices: number[];
}
export interface FillQuestion extends QuestionBase {
  type: 'fill';
  answer: string;
}
export type Question = SingleQuestion | MultiQuestion | FillQuestion;

/** Provenance of a question set (auto-tagged at load from the file path). */
export type Origin = 'linux-direct' | 'ken-adams' | 'gpt-deep-research' | 'claude-lpic2book';

/** All origins, in display order — the single source for filter lists and migrations. */
export const ORIGINS: Origin[] = ['linux-direct', 'ken-adams', 'gpt-deep-research', 'claude-lpic2book'];

/** Human labels for each origin (used by the source filter and per-question tag). */
export const ORIGIN_LABELS: Record<Origin, string> = {
  'linux-direct': 'Linux Direct',
  'ken-adams': 'Ken Adams',
  'gpt-deep-research': 'GPT',
  'claude-lpic2book': 'Claude',
};

/** The six possible mastery scores (see lib/mastery.ts). */
export const MASTERY_BUCKETS = [0, 20, 40, 60, 80, 100] as const;
export type MasteryBucket = (typeof MASTERY_BUCKETS)[number];

/** One red→green ramp per bucket (hand-tuned, not a uniform Tailwind ladder):
 *  solid bar/pill background + tinted chip + plain text + on-colour text classes. */
export const MASTERY_TINTS: Record<MasteryBucket, { bar: string; chip: string; text: string; on: string }> = {
  0: { bar: 'bg-[#a4434b]', chip: 'bg-red-500/15 text-red-300 border-red-500/30', text: 'text-red-300', on: 'text-slate-200' },
  20: { bar: 'bg-orange-600', chip: 'bg-orange-500/15 text-orange-600 border-orange-500/30', text: 'text-orange-600', on: 'text-slate-100' },
  40: { bar: 'bg-amber-500', chip: 'bg-amber-500/15 text-amber-500 border-amber-500/30', text: 'text-amber-500', on: 'text-slate-900' },
  60: { bar: 'bg-yellow-400', chip: 'bg-yellow-400/15 text-yellow-400 border-yellow-400/30', text: 'text-yellow-400', on: 'text-slate-900' },
  80: { bar: 'bg-[#c4db00]', chip: 'bg-lime-400/15 text-[#c4db00] border-lime-400/30', text: 'text-[#c4db00]', on: 'text-slate-900' },
  100: { bar: 'bg-green-700', chip: 'bg-green-700/15 text-green-700 border-green-700/30', text: 'text-green-700', on: 'text-slate-100' },
};

/** Quiz pool / dashboard filters. */
export type ResultOption = 'unseen' | MasteryBucket;
/** Selected result options; empty array matches nothing. */
export type ResultSelection = ResultOption[];
/** Selected origins; empty array matches nothing. */
export type SourceSelection = Origin[];

export const RESULT_FILTERS: ResultOption[] = ['unseen', ...MASTERY_BUCKETS];
export const SOURCE_FILTERS: Origin[] = ORIGINS;

export interface AnswerRecord {
  /** Stable client-generated id; used to dedupe when syncing across devices. */
  id: string;
  questionId: string;
  /** Index of the choice the user picked. Optional for records saved before this was tracked. */
  pickedIndex?: number;
  correct: boolean;
  ts: number;
}

export interface UtilityInfo {
  topic: Topic;
  label: string;
}

export const TOPIC_LABELS: Record<Topic, string> = topics as Record<Topic, string>;

export const ALL_TOPICS = Object.keys(TOPIC_LABELS) as Topic[];

export const UTILITIES: Record<string, UtilityInfo> = utilities as Record<string, UtilityInfo>;

/** Resolve a question's topic from its tool slug via utilities.json. */
export function topicOf(question: Question): Topic | undefined {
  return UTILITIES[question.tool]?.topic;
}
