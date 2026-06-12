# Terminology

Glossary of the app's domain terms, for reading the code and docs. Everything here
reflects the current source; deeper detail lives in
[architecture.md](architecture.md) and [mastery-formula.md](mastery-formula.md).

## Screens

- **Login gate** — the full-screen token prompt ([`Login.tsx`](../src/components/Login.tsx))
  shown by [`App.tsx`](../src/App.tsx) when cloud sync is configured but no valid
  token is stored. Until a token is entered, the rest of the app is unreachable.
- **Dashboard** — the home screen ([`Dashboard.tsx`](../src/components/Dashboard.tsx)):
  filters, per-topic progress, expandable question rows, and the quiz launcher.
- **Quiz mode** — the active session ([`Quiz.tsx`](../src/components/Quiz.tsx)),
  one question at a time. `App.tsx` holds a single `'home' | 'quiz'` state field;
  there is no router.
- **Results view** — the "Done" screen rendered *inside* `Quiz.tsx` once the deck
  index runs past the last question. Shows the session score and a single
  "Back to dashboard" button.

## Questions & content

- **Question** — one quiz item, a discriminated union on `type` in
  [`types.ts`](../src/types.ts). Shared fields: `id`, `tool`, `prompt`,
  `explanation`, plus optional `objective` / `difficulty` / `source` / `origin`.
- **Question types** — `single` (one choice, scored against `answerIndex`),
  `multi` (select-all-that-apply, correct only on an exact set match against
  `answerIndices`), `fill` (typed answer, compared case- and
  whitespace-insensitively). Older files without a `type` are normalised to
  `single` at load.
- **Utility / tool** — the program or subsystem a question covers (`bind9`,
  `apache2`, `samba`, …). `Question.tool` is the slug;
  [`utilities.json`](../src/data/utilities.json) maps each of the 26 utilities to
  `{topic, label}`.
- **Topic** — one of the six exam-202 objective codes `207`–`212` (labels in
  [`topics.json`](../src/data/topics.json)). A question has no topic field of its
  own; `topicOf(q)` resolves it through the question's `tool`.
- **Origin** — provenance of a question set (`linux-direct`, `ken-adams`,
  `gpt-deep-research`, `claude-lpic2book`), auto-tagged at load from the file
  path/id. This is what the **source filter** (a multi-select over origins — a
  question matches if its origin is selected; an empty selection matches
  nothing) and **source chip** show. Distinct from `Question.source`, which is
  an authoritative reference *URL* for the answer.

## Sessions & history

- **Deck** — the per-session question list, built once in `Quiz.tsx` from a
  snapshot of history (so answering mid-quiz doesn't reorder it). Pipeline in
  [`select.ts`](../src/lib/select.ts): filter by selected topics, then
  `filterPool` (result + source filters), then `orderByWeakness`
  (unseen > last-wrong > last-correct, random tiebreak), then `pickDeck` slices
  the first `quizSize` questions (`null` = all matching).
- **Answer / attempt** — one answered question, stored as an `AnswerRecord`
  ([`types.ts`](../src/types.ts)): stable client-generated `id`, `questionId`,
  optional `pickedIndex`, `correct`, timestamp `ts`. "Attempt" is the usual term
  in stats/mastery code.
- **History** — the full append-only answer log, `history: AnswerRecord[]` in the
  Zustand store ([`store.ts`](../src/store.ts)). `recordAnswer` appends;
  `setHistory` replaces it wholesale after a sync merge.

## Statistics

- **Seen / asked** — a question is *seen* once it has at least one record in
  history; the dashboard's per-topic "asked N/total" counts seen questions
  ([`useDashboardStats`](../src/components/useDashboardStats.ts)).
- **Correct / wrong "now"** — last-attempt semantics: `correctNow` / `wrongNow`
  classify each seen question by its *latest* record only
  (`lastByQuestion`), not by cumulative attempts. Still computed in
  `useDashboardStats` but no longer rendered — the per-topic bar shows mastery
  buckets instead.
- **Result filter** — the dashboard/quiz-pool multi-select over **unseen**
  (zero attempts) and the six mastery buckets — a question matches if it falls
  in *any* selected option; an empty selection matches nothing. A bucket
  matches questions whose current `masteryOf` score equals it, computed at one
  shared `now` per filtering pass (`filterPool` in
  [`select.ts`](../src/lib/select.ts)).
  **Unseen today** (no attempts on the current local calendar day — the
  daily-drill view) is a separate standalone toggle ANDed with the result
  filter, so e.g. "mastery 40 AND not practiced today" is expressible.
- **Overall score** — the dashboard header line; *cumulative* over every record
  in history (`totalCorrect/totalAttempts`), unlike the per-topic "now" numbers.
- **Accuracy** — per-topic `askedAccuracy`: `correctNow / seen`, i.e. the share
  of seen questions whose latest answer was correct (also computed but no longer
  rendered). The quiz results view shows the session's own correct/total instead.

## Mastery

- **Mastery** — a 0–100 per-question score ("you know it well, and recently"),
  computed by `masteryOf` in [`mastery.ts`](../src/lib/mastery.ts). Drives the
  result filter's bucket matching; it does not yet affect deck ordering. Full
  spec: [mastery-formula.md](mastery-formula.md).
- **QuizDay** — a bucket of attempts treated as one study day. A new QuizDay
  starts only when the gap since the previous attempt is **≥21h** *and* the
  attempt falls on a different local calendar date. *Clean* if every attempt in it
  was correct; one wrong attempt makes the whole QuizDay wrong.
- **Slots** — the last 5 QuizDays scored (`SLOTS = 5`); fewer than 5 pads the
  missing slots as wrong. Score = clean slots / 5 × 100, so the only possible
  values are the multiples of 20.
- **21-day window** — `WINDOW_MS`: only QuizDays within the last 21 days count,
  so mastery decays on its own as old days drop out.
- **Mastery ramp / buckets** — the six possible scores `0/20/40/60/80/100`, each
  with a fixed colour (red → emerald): `MASTERY_RAMP` in
  [`QuestionStats.tsx`](../src/components/QuestionStats.tsx) for the chip,
  `MASTERY_COLORS` in `Dashboard.tsx` for the per-topic mastery bar.
  `bucketsByTopic` in `useDashboardStats` counts questions per score per topic.
- **Unseen** — never-asked questions; they are *unrated* (no mastery chip,
  `masteryOf` returns `null`) and fill the grey remainder of the mastery bar.

## UI elements

- **21-day strip** — the per-question bullet line (`DayStrip` in
  [`QuestionStats.tsx`](../src/components/QuestionStats.tsx)): one **day cell**
  per local calendar day, oldest → newest, from `dayCells`, drawn as SVG
  bullets. A day with any wrong attempt shows a red bullet (the 0%-bucket
  colour); only-correct a green bullet; no attempts `·`. Note: cells are plain
  calendar days, not QuizDays.
- **Daily-count strip** — the 21-cell row in the dashboard header: per calendar
  day, the number of *unique* questions answered (`·` for none); not to be
  confused with the per-question 21-day strip.
- **Mastery chip** — the indicator next to the strip (`MasteryChip`): a vertical
  stack of downward chevrons tinted by bucket, one per 20 points (score/20 =
  one chevron per remembered QuizDay slot); 0% shows a single faint chevron.
- **Source chip** — the small origin badge (`SourceTag`) on each question row and
  on the quiz card.
- **In-bar counters** — each topic-bar segment shows its question count inside
  the block (hidden when the segment is too narrow; the hover tooltip always
  has it). Replaces the former portion-badge legend row.

## Sync

- **Token** — the single shared bearer secret gating the app and the API; stored
  in `localStorage` by [`auth.ts`](../src/lib/auth.ts).
- **Push / pull** — `pushRecords` uploads answer records, `fetchAll` downloads
  the server's full log ([`api.ts`](../src/lib/api.ts)). New answers push
  incrementally, diffed by record `id`.
- **Merge** — `mergeHistories(local, remote)` unions both logs by record `id`,
  keeping the newer `ts` on conflict; returns `{merged, delta}` so only the delta
  is pushed back. Details: [architecture.md](architecture.md#cloud-sync-libapits-libauthts-cloudsync)
  and [self-hosted-sync.md](self-hosted-sync.md).
