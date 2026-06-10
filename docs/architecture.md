# Architecture & functionality

Current-state reference for the LPIC-2 (exam 202) trainer. For setup/build/deploy
see [README.md](../README.md); for the sync backend see
[self-hosted-sync.md](self-hosted-sync.md); for the mastery score see
[mastery-formula.md](mastery-formula.md); for the product rationale see
[quizzer-concept.md](quizzer-concept.md).

## What it is

A single-player, browser-only quiz app. You tick which exam objectives to drill,
answer questions (single-choice, multiple-response, or fill-in-the-blank), and get
an explanation after each. All progress lives in `localStorage`; an optional
self-hosted backend syncs that progress across devices.

Stack: React 18 + TypeScript, Vite 5, Tailwind 3, Zustand (`persist`). No router —
a one-field state switch picks between two screens.

## Screens & flow

[`App.tsx`](../src/App.tsx) renders one of three things:

1. **Login gate** ([`Login.tsx`](../src/components/Login.tsx)) — shown only when cloud
   sync is configured (`VITE_API_URL` baked in) **and** no valid token is stored.
   Without a token the app is unusable in that build.
2. **Dashboard** ([`Dashboard.tsx`](../src/components/Dashboard.tsx)) — the home screen.
3. **Quiz** ([`Quiz.tsx`](../src/components/Quiz.tsx)) — the active session.

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
| `resultFilter` | `all` / `correct` / `wrong` / `unseen` |
| `sourceFilter` | `all` or an `Origin` |
| `history` | `AnswerRecord[]` — the full answer log |

`recordAnswer` appends; `setHistory` replaces (after a sync merge).
Persist is **version 2**: `migrate` backfills a fresh `id` on legacy records that
lack one and defaults/sanitises the filter fields for v0/v1.

## Deck pipeline ([`lib/select.ts`](../src/lib/select.ts))

Building a quiz deck is three independent stages:

1. **Eligibility** — `filterPool(pool, last, resultFilter, sourceFilter)` decides
   which questions qualify. The dashboard's "available" count, its per-topic question
   list, and the quiz deck all run the *same* predicate, so they can't diverge.
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
[mastery-formula.md](mastery-formula.md). **Display-only** — shown as a star chip
in [`QuestionStats`](../src/components/QuestionStats.tsx); it does **not** yet
affect deck ordering or eligibility. The dashboard computes one entry per
question in a memoized map ([`useDashboardStats`](../src/components/useDashboardStats.ts))
with a single clock snapshot for consistency.

## Dashboard

- **Filters** ([`FilterBar`](../src/components/FilterBar.tsx)) — result + source toggles.
  They both filter the displayed rows **and form the quiz pool**.
- **Per-topic progress** — a stacked correct/wrong/unseen bar and counts per topic,
  derived in `useDashboardStats` (one pass over the latest-record map; orphaned ids
  for removed questions are skipped).
- **Expandable rows** — open a topic to see its questions with source tag, mastery
  chip, attempt history (`[ ✗✓ ]`), accuracy, your answer, and the correct answer.
- **Quiz launcher** — size presets + an "available" count; **Start** is disabled when
  the pool is empty.
- **Logo lightbox** ([`LogoZoom`](../src/components/LogoZoom.tsx)) — accessible modal
  (`role="dialog"`, focus trap/restore, Escape).

## Quiz

Builds its deck once (snapshotting history so answering mid-quiz doesn't reorder it),
then walks it one question at a time:

- **single** — click a choice; scored immediately against `answerIndex`.
- **multi** — select all that apply, then submit; correct only on an exact set match.
- **fill** — type an answer; compared case- and whitespace-insensitively.

Each answer is recorded, an explanation is shown, and a running score leads to a
results screen (→ dashboard or restart). The current question's stats line (source ·
mastery · history) mirrors the dashboard.

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
- Token entry/validation is the shared [`useTokenConnect`](../src/lib/useTokenConnect.ts)
  hook used by both Login and [`Account`](../src/components/Account.tsx).

Server ([`server/index.js`](../server/index.js)): Node + MySQL behind Apache, binds
`127.0.0.1`. Constant-time token compare, parameterised + `ts`-guarded upsert,
per-row validation matching the schema, 2 MB body cap.

## Module map

```
src/
├── App.tsx                      screen switch + login gate
├── main.tsx                     Vite entry
├── store.ts                     Zustand store (persist v2 + migrate)
├── types.ts                     Question union, AnswerRecord, Topic/Origin, constants
├── data/
│   ├── topics.json              6 exam topics (207–212)
│   ├── utilities.json           26 utilities → {topic, label}
│   └── questions/
│       ├── index.ts             globs/normalises/dedupes → QUESTIONS[]
│       └── <utility>/           question JSON + notes.md per utility
├── lib/
│   ├── select.ts                filterPool / orderByWeakness / pickDeck / lastByQuestion
│   ├── mastery.ts               masteryOf (0–100 score)
│   ├── api.ts                   sync transport + mergeHistories
│   ├── auth.ts                  token store
│   └── useTokenConnect.ts       shared token entry/validation hook
└── components/
    ├── Dashboard.tsx            home: filters, per-topic progress, launcher
    ├── useDashboardStats.ts     memoized last/attempts/perTopic/mastery maps
    ├── FilterBar.tsx            result + source filters
    ├── Quiz.tsx                 question card, scoring, results
    ├── QuestionStats.tsx        source tag · mastery chip · history line
    ├── LogoZoom.tsx             accessible image lightbox
    ├── Account.tsx              connect/disconnect panel
    ├── Login.tsx                full-screen token gate
    └── CloudSync.tsx            headless two-way sync
```

## Not wired in yet

- **Mastery-driven ordering** — `orderByWeakness` still uses the 3-bucket weight;
  the plan is to order by mastery once confirmed.
- **"Skip questions asked within the last N days"** — a planned pool filter.
- **Difficulty in mastery** — `difficulty` exists on ~⅔ of questions
  (`recall`/`applied`/`scenario`); held until coverage and ordering are confirmed.
