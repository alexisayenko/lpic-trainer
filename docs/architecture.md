# Architecture & functionality

Current-state reference for the LPIC-2 (exam 202) trainer. For setup/build/deploy
see [README.md](../README.md); for the sync backend see
[self-hosted-sync.md](self-hosted-sync.md); for the mastery score see
[mastery-formula.md](mastery-formula.md); for the product rationale see
[quizzer-concept.md](quizzer-concept.md); for a glossary of the domain terms see
[terminology.md](terminology.md).

## What it is

A single-player, browser-only quiz app. You tick which exam objectives to drill,
answer questions (single-choice, multiple-response, or fill-in-the-blank), and get
an explanation after each. All progress lives in `localStorage`; an optional
self-hosted backend syncs that progress across devices.

Stack: React 18 + TypeScript, Vite 5, Tailwind 3, Zustand (`persist`). No router —
a one-field state switch picks between two screens. An iOS wrapper exists via
Capacitor (`capacitor.config.ts` + `ios/`); see [mobile/README.md](../mobile/README.md).

## Screens & flow

[`App.tsx`](../src/App.tsx) renders one of two screens:

1. **Dashboard** ([`Dashboard.tsx`](../src/components/Dashboard.tsx)) — the home screen.
2. **Quiz** ([`Quiz.tsx`](../src/components/Quiz.tsx)) — the active session.

There is no login gate: the site is public read-only. Visiting once with
`?token=xxx` stores the token (App strips the param from the URL) and unlocks
quizzing; without a token the **Start quiz** button is hidden and the header
shows "Read-only".

[`CloudSync`](../src/components/CloudSync.tsx) is mounted headlessly at all times and
renders nothing; it reacts to the token and to history changes.

## Data model ([`types.ts`](../src/types.ts))

- **`Question`** is a discriminated union on `type`, normalised at load so the field
  is always concrete:
  - `SingleQuestion` — `choices: string[]`, `answerIndex: number`
  - `MultiQuestion` — `choices: string[]`, `answerIndices: number[]`
  - `FillQuestion` — `answer: string`
  - shared base: `id`, `tool` (utility slug), `prompt`, `explanation`, optional
    `objective` / `difficulty` / `source` / `origin`.
- **`AnswerRecord`** — one answered attempt: `id` (stable, client-generated),
  `questionId`, optional `pickedIndex`, `correct`, `ts`.
- **`Topic`** — the six exam-202 objective codes `207`–`212` (labels in
  [`topics.json`](../src/data/topics.json)).
- **`Origin`** — question provenance; `ORIGINS` / `ORIGIN_LABELS` /
  `RESULT_FILTERS` / `SOURCE_FILTERS` / `ALL_TOPICS` are the single-source constants
  consumed by filters and the store migration.
- **`topicOf(q)`** resolves a question's topic from its `tool` via
  [`utilities.json`](../src/data/utilities.json) (26 utilities → `{topic, label}`).

## Question loading ([`data/questions/index.ts`](../src/data/questions/index.ts))

`import.meta.glob` eagerly pulls every `**/*.json` under `questions/`. A file may be
one question object or an array. At load each question is:

1. normalised — `type` defaults to `single`;
2. **origin-tagged** by `inferOrigin(path, id)` — `lpic-bank/` → `gpt-deep-research`,
   `lpic2book/` → `claude-lpic2book`, the `u`-series ids → `ken-adams`, everything
   else → `linux-direct`;
3. validated by `isQuestion` (per-type shape) and dropped unless its `tool` exists in
   `utilities.json`;
4. **deduped by `id`** (later duplicates are skipped with a warning) and sorted by id.

Result: the exported `QUESTIONS` array (~306 files; banks-as-arrays expand this).

## State ([`store.ts`](../src/store.ts))

Zustand store persisted to `localStorage` key `lpic-trainer-state`:

| Field | Purpose |
|---|---|
| `selectedTopics` | ticked topics, or `null` = all |
| `quizSize` | questions per quiz, or `null` = all matching |
| `resultFilter` | multi-select of `unseen` and/or mastery buckets (`0`/`20`/`40`/`60`/`80`/`100`); empty = matches nothing; default = all selected |
| `sourceFilter` | multi-select of `Origin`s; empty = matches nothing; default = all selected |
| `history` | `AnswerRecord[]` — the full answer log |

`recordAnswer` appends; `setHistory` replaces (after a sync merge).
Persist is **version 6**: `migrate` backfills a fresh `id` on legacy records that
lack one, maps the old result filter (v<3) to the bucket model, splits
`unseen-today` into its own toggle (v<4), converts the single-value result
filter to a multi-selection (v<5), and (v<6) re-bases both filters on the
"empty matches nothing" model — an empty/missing result selection and an
`all`/missing source filter become everything-selected, a single origin
becomes a one-element selection, and existing selections are kept with
invalid entries dropped.

## Deck pipeline ([`lib/select.ts`](../src/lib/select.ts))

Building a quiz deck is three independent stages:

1. **Eligibility** — `filterPool(pool, attempts, resultFilter, sourceFilter, unseenToday, now)`
   decides which questions qualify: by the source multi-selection (the
   question's origin must be selected), by the result multi-selection
   (a question matches any selected option — `unseen` = zero attempts; a
   numeric bucket matches questions whose `masteryOf` score equals it, computed
   against the single `now` snapshot), and — when the `unseenToday` toggle is
   on — only questions whose re-attempt now would start a new QuizDay, i.e.
   no attempt on the current local calendar day **and** none within the last
   `DAY_GAP` (21h) (ANDed with the result filter). An empty selection in either
   row matches nothing.
   The dashboard's "available" count, its per-topic question list, and the quiz
   deck all run the *same* predicate, so they can't diverge.
2. **Order** — `orderByWeakness(pool, last, rng?)` sorts unseen > last-wrong >
   last-correct, with a random tiebreak (injectable RNG for testing).
3. **Take** — `pickDeck(ordered, size)` slices the first N.

`lastByQuestion(history)` builds the latest-record-per-question map shared by all
three stages and by the dashboard.

## Mastery ([`lib/mastery.ts`](../src/lib/mastery.ts))

`masteryOf(attempts, now)` returns a 0–100 score: attempts are collapsed into
**QuizDays** (a new day starts when the gap is ≥21h *and* the local calendar
date changes; any wrong attempt makes the whole day wrong); the last 5 QuizDays in a rolling 21-day window are scored, with missing
slots counted as wrong. Full spec and constants:
[mastery-formula.md](mastery-formula.md). Shown as a pennant-shaped chip of
stacked chevrons (one per 20 points; × at 0%, empty when unseen) in [`QuestionStats`](../src/components/QuestionStats.tsx) and used by the result
filter for pool eligibility; it does **not** yet affect deck ordering. The
dashboard computes one entry per
question in a memoized map ([`useDashboardStats`](../src/components/useDashboardStats.ts))
with a single clock snapshot for consistency.

## Dashboard

- **Header** — logo, the cumulative overall-score line, and a 21-cell strip showing
  the number of *unique* questions answered on each of the last 21 days.
- **Filters** ([`FilterBar`](../src/components/FilterBar.tsx)) — result + source toggles.
  The result filter is unseen / the six mastery buckets, rendered as labelled
  toggle chips. They both filter the displayed rows **and form the quiz pool**.
- **Per-topic progress** — an "asked N/total" count and a stacked mastery bar per
  topic (unseen + the six bucket colours, soft-outlined segments, question
  counts inside the blocks when they fit); derived in `useDashboardStats` (one pass over the
  latest-record map; orphaned ids for removed questions are skipped).
- **Expandable rows** — open a topic to see, first, a read-only per-tool stats
  block (label · seen/total · stacked mastery bar, from `perTool`/`bucketsByTool`),
  then its questions: stats line (21-day strip · mastery chip · source tag · id),
  a `tool · Topic Label (207)` line, the prompt, your answer when the last attempt
  was wrong, and the correct answer — on neutral slate cards.
- **Quiz launcher** — size presets + an "available" count; **Start** is disabled when
  the pool is empty.
- **Logo lightbox** ([`LogoZoom`](../src/components/LogoZoom.tsx)) — accessible modal
  (`role="dialog"`, focus trap/restore, Escape).

## Quiz

Builds its deck once (snapshotting history so answering mid-quiz doesn't reorder it)
and shuffles each question's choice order per session (`shuffledIndices`; stored
answers stay in original indices), then walks the deck one question at a time:

- **single** — click a choice; scored immediately against `answerIndex`.
- **multi** — select all that apply, then submit; correct only on an exact set match.
- **fill** — type an answer; compared case- and whitespace-insensitively.

Each answer is recorded, an explanation is shown, and a running score leads to a
results screen with a single "Back to dashboard" button. The header shows
`tool · Topic Label (207)`; the stats line (21-day strip · mastery · source)
mirrors the dashboard. A footer row holds **Skip question** (unanswered only),
the `1 / N` counter, and **End quiz**.

## Cloud sync ([`lib/api.ts`](../src/lib/api.ts), [`lib/auth.ts`](../src/lib/auth.ts), [`CloudSync`](../src/components/CloudSync.tsx))

Optional, single-user, gated by one shared bearer token (stored in `localStorage`,
sent as `Authorization: Bearer`). Setup/ops: [self-hosted-sync.md](self-hosted-sync.md).

- `api.ts` is pure transport (`fetchAll`, `pushRecords`, `checkToken`)
  plus a pure `mergeHistories(local, remote)` that merges by `id` keeping the newer
  `ts` and returns `{merged, delta}`.
- `CloudSync` orchestrates: on token set (and on the `online` event) it pulls, merges,
  writes back, and pushes the delta; an in-flight guard prevents overlap and an
  apply-guard stops the programmatic write from echoing back as a push. New answers
  push incrementally — the subscription diffs by record `id`, so it pushes exactly the
  records not previously present (survives reorders/inserts).
- The token arrives via the `?token=xxx` URL param, captured once in `App`;
  [`Account`](../src/components/Account.tsx) shows "Read-only" without a token
  and a disconnect button with one.

Server ([`server/index.js`](../server/index.js)): Node + MySQL behind Apache, binds
`127.0.0.1`. Constant-time token compare, parameterised + `ts`-guarded upsert,
per-row validation matching the schema, 2 MB body cap.

## Module map

```
src/
├── App.tsx                      screen switch + ?token capture
├── main.tsx                     Vite entry
├── store.ts                     Zustand store (persist v3 + migrate)
├── types.ts                     Question union, AnswerRecord, Topic/Origin, constants
├── data/
│   ├── topics.json              6 exam topics (207–212)
│   ├── utilities.json           26 utilities → {topic, label}
│   └── questions/
│       ├── index.ts             globs/normalises/dedupes → QUESTIONS[]
│       └── <utility>/           question JSON + notes.md per utility
├── lib/
│   ├── select.ts                filterPool / orderByWeakness / pickDeck / shuffledIndices / lastByQuestion
│   ├── mastery.ts               masteryOf (0–100 score)
│   ├── dates.ts                 startOfLocalDay / daysBack day-math helpers
│   ├── api.ts                   sync transport + mergeHistories
│   └── auth.ts                  token store
└── components/
    ├── Dashboard.tsx            home: filters, per-topic progress, launcher
    ├── useDashboardStats.ts     memoized last/attempts/perTopic/perTool/mastery maps
    ├── FilterBar.tsx            result + source filters
    ├── ToggleChip.tsx           shared on/off filter chip button
    ├── Quiz.tsx                 question card, scoring, results
    ├── QuestionStats.tsx        source tag · mastery chip · history line
    ├── LogoZoom.tsx             accessible image lightbox
    ├── Account.tsx              disconnect button / read-only / local-only notice
    └── CloudSync.tsx            headless two-way sync
```

## Not wired in yet

- **Mastery-driven ordering** — `orderByWeakness` still uses the 3-bucket weight;
  the plan is to order by mastery once confirmed.
- **"Skip questions asked within the last N days"** — a planned pool filter.
- **Difficulty in mastery** — `difficulty` exists on ~⅔ of questions
  (`recall`/`applied`/`scenario`); held until coverage and ordering are confirmed.
