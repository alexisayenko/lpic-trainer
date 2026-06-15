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

/** Bucket ramp from slate (low mastery) to green (mastered); red is reserved for wrong (0).
 *  `bar` = soft-outlined segment/box, `text` = the solid hue, `on` = text rendered on the tint. */
export const MASTERY_TINTS: Record<MasteryBucket, { bar: string; text: string; on: string }> = {
  0: { bar: 'border border-[#a4434b] bg-[#a4434b]/25', text: 'text-[#a4434b]', on: 'text-red-300' },
  20: { bar: 'border border-[#54767b] bg-[#54767b]/20', text: 'text-[#54767b]', on: 'text-green-300' },
  40: { bar: 'border border-[#44796c] bg-[#44796c]/40', text: 'text-[#44796c]', on: 'text-green-300' },
  60: { bar: 'border border-[#357b5c] bg-[#357b5c]/60', text: 'text-[#357b5c]', on: 'text-green-300' },
  80: { bar: 'border border-[#257e4d] bg-[#257e4d]/80', text: 'text-[#257e4d]', on: 'text-green-300' },
  100: { bar: 'border border-green-700 bg-green-700', text: 'text-green-700', on: 'text-green-300' },
};

/** Quiz pool / dashboard filters. */
export type ResultOption = 'unseen' | MasteryBucket;
/** Selected result options; empty array matches nothing. */
export type ResultSelection = ResultOption[];
/** Selected origins; empty array matches nothing. */
export type SourceSelection = Origin[];

/** "Not practiced" window: exclude questions attempted within this elapsed time. */
export type NotPracticedWindow = '1h' | '8h' | '1d' | '2d' | '3d' | '1w';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Windows in display order — single source for the filter chips and ms lookup. */
export const NOT_PRACTICED_WINDOWS: { key: NotPracticedWindow; label: string; ms: number }[] = [
  { key: '1h', label: '1 hour', ms: HOUR },
  { key: '8h', label: '8 hours', ms: 8 * HOUR },
  { key: '1d', label: '1 day', ms: DAY },
  { key: '2d', label: '2 days', ms: 2 * DAY },
  { key: '3d', label: '3 days', ms: 3 * DAY },
  { key: '1w', label: '1 week', ms: 7 * DAY },
];

/** Elapsed milliseconds for each window. */
export const NOT_PRACTICED_MS: Record<NotPracticedWindow, number> = Object.fromEntries(
  NOT_PRACTICED_WINDOWS.map((w) => [w.key, w.ms]),
) as Record<NotPracticedWindow, number>;

// Failing (0) before unanswered, then the rest of the ramp — order used for the
// filter chips and progress bars (the mastery-bar segment order matches).
export const RESULT_FILTERS: ResultOption[] = [MASTERY_BUCKETS[0], 'unseen', ...MASTERY_BUCKETS.slice(1)];

/** Display labels for result options ('unseen' is the persisted value, "unanswered" the UI word). */
export const RESULT_OPTION_LABELS: Record<ResultOption, string> = {
  unseen: 'unanswered',
  0: 'failing',
  20: '20',
  40: '40',
  60: '60',
  80: '80',
  100: '100',
};

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

/** Compact topic names for tight spots (e.g. the tool-filter headers). */
export const TOPIC_SHORT_LABELS: Record<Topic, string> = {
  '207': 'DNS',
  '208': 'HTTP',
  '209': 'Files',
  '210': 'Clients',
  '211': 'E-Mail',
  '212': 'Security',
};

export const ALL_TOPICS = Object.keys(TOPIC_LABELS) as Topic[];

export const UTILITIES: Record<string, UtilityInfo> = utilities as Record<string, UtilityInfo>;

/** Selected tool slugs; empty array matches nothing. */
export type ToolSelection = string[];

/** Every tool slug, in declaration order — the source for the tool filter and migrations. */
export const ALL_TOOLS: string[] = Object.keys(UTILITIES);

/** Tools grouped under their topic, in topic display order — drives the tool filter rows. */
export const TOOLS_BY_TOPIC: { topic: Topic; tools: string[] }[] = ALL_TOPICS.map((topic) => ({
  topic,
  tools: ALL_TOOLS.filter((tool) => UTILITIES[tool].topic === topic),
}));

/** Resolve a question's topic from its tool slug via utilities.json. */
export function topicOf(question: Question): Topic | undefined {
  return UTILITIES[question.tool]?.topic;
}

/** "207 Domain Name Server · BIND 9" context line shown on question cards. */
export function questionContext(question: Question): string {
  const topic = topicOf(question);
  const tool = UTILITIES[question.tool]?.label ?? question.tool;
  return topic ? `${topic} ${TOPIC_LABELS[topic]} · ${tool}` : tool;
}
