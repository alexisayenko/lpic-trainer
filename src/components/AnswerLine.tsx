import { MASTERY_TINTS, type AnswerRecord, type Question } from '../types';
import { QuestionCardHeader } from './QuestionCardHeader';

function correctAnswerText(q: Question): string {
  switch (q.type) {
    case 'fill':
      return q.answer;
    case 'multi':
      return q.answerIndices.map((i) => q.choices[i]).join(', ');
    case 'single':
      return q.choices[q.answerIndex];
  }
}

/** One question card in an expanded topic: header, prompt, last answer when wrong, correct answer. */
export function AnswerLine({
  q,
  rec,
  attempts,
  mastery,
}: Readonly<{
  q: Question;
  rec?: AnswerRecord;
  attempts?: AnswerRecord[];
  mastery?: number | null;
}>) {
  const correctText = correctAnswerText(q);
  const yours =
    q.type === 'single' && rec?.pickedIndex != null ? q.choices[rec.pickedIndex] : undefined;
  return (
    <div className="p-3 rounded-md border border-slate-700 bg-slate-800/20">
      <QuestionCardHeader
        q={q}
        attempts={attempts}
        mastery={mastery}
        titleClassName="text-xs text-slate-500"
      />
      <p className="mt-2 text-sm text-slate-200 leading-snug">{q.prompt}</p>
      {rec && !rec.correct && yours !== undefined && (
        <p className={`mt-2 text-xs ${MASTERY_TINTS[0].text}`}>You answered: {yours}</p>
      )}
      {correctText && <p className="mt-1 text-xs text-emerald-300">Correct: {correctText}</p>}
    </div>
  );
}
