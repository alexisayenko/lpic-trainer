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
  `RESULT_FILTERS` / `ALL_TOPICS` are the single-source constants
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

Result: the exported `QUESTIONS` array (~414 JSON files expanding to ~607 questions).

## State ([`store.ts`](../src/store.ts))

Zustand store persisted to `localStorage` key `lpic-trainer-state`:

| Field | Purpose |
|---|---|
| `quizSize` | questions per quiz, or `null` = all matching |
| `resultFilter` | multi-select of `unseen` and/or mastery buckets (`0`/`20`/`40`/`60`/`80`/`100`); empty = matches nothing; default = all selected |
| `sourceFilter` | multi-select of `Origin`s; empty = matches nothing; default = all selected |
| `toolFilter` | multi-select of tool slugs (grouped by topic in the UI); empty = matches nothing; default = all selected |
| `notPracticed` | single `NotPracticedWindow` (`1h`/`8h`/`1d`/`2d`/`3d`/`1w`) or `null` = no restriction |
| `cardView` | how expanded topic cards render questions: `full` cards / `badges` only / `none` |
| `topicsExpanded` | whether the "LPIC-2 Topics" tool-filter region is expanded; default `true` |
| `history` | `AnswerRecord[]` — the full answer log |

`recordAnswer` appends; `setHistory` replaces (after a sync merge).
Persist is **version 10**: `migrate` backfills a fresh `id` on legacy records that
lack one, maps the old result filter (v<3) to the bucket model, splits
`unseen-today` into its own toggle (v<4), converts the single-value result
filter to a multi-selection (v<5), re-bases the result/source filters on the
"empty matches nothing" model (v<6), adds the tool filter defaulting to every
tool (v<7), and converts the old `unseenToday` boolean to the `notPracticed`
window — `true` → `1d` (closest to the old ~21h), `false`/missing → `null` (v<8),
adds the `cardView` switcher defaulting to `full` (v<9), and adds
`topicsExpanded` defaulting to `true` (v<10).
The topic-selection field (`selectedTopics`) was dropped once the tool filter
subsumed it; older persisted values are simply ignored.

## Deck pipeline ([`lib/select.ts`](../src/lib/select.ts))

Building a quiz deck is two stages:

1. **Eligibility** — `filterPool(pool, attempts, result, source, tools, notPracticedMs, now)`
   decides which questions qualify: by the source multi-selection (the
   question's origin must be selected), by the tool multi-selection (the
   question's tool must be selected), by the result multi-selection
   (a question matches any selected option — `unseen` = zero attempts; a
   numeric bucket matches questions whose `masteryOf` score equals it, computed
   against the single `now` snapshot), and — when `notPracticedMs` is non-null —
   only questions with no attempt within the last `notPracticedMs` milliseconds
   (ANDed with the rest). An empty selection in the source/tool/result rows
   matches nothing.
   The dashboard's "available" count, its per-topic question list, and the quiz
   deck all run the *same* predicate, so they can't diverge. Topic-level
   narrowing is expressed entirely through the tool filter (tools are grouped by
   topic in the UI); there is no separate topic-selection step.
2. **Sample & shuffle** — `balancedSample(pool, quizSize, groupOf)` draws up to
   `quizSize` questions balanced across topics (round-robin over shuffled topic
   groups, redistributing slots from exhausted groups), then returns them in
   random order. `quizSize` null (or ≥ pool size) takes every eligible question.
   There is no mastery- or weakness-based ordering.

`lastByQuestion(history)` builds the latest-record-per-question map used by the
dashboard; `attemptsByQuestion` groups all attempts per id for `filterPool`.

## Mastery ([`lib/mastery.ts`](../src/lib/mastery.ts))

`masteryOf(attempts, now)` returns a 0–100 score: attempts are collapsed into
**QuizDays** (a new day starts when the gap is ≥21h *and* the local calendar
date changes; any wrong attempt makes the whole day wrong); the last 5 QuizDays in a rolling 21-day window are scored, with missing
slots counted as wrong. Full spec and constants:
[mastery-formula.md](mastery-formula.md). Shown as a pennant-shaped chip of
stacked chevrons (one per 20 points; × at 0%, empty when unseen) in [`QuestionCardHeader`](../src/components/QuestionCardHeader.tsx) and used by the result
filter for pool eligibility; it does **not** yet affect deck ordering. The
dashboard computes one entry per
question in a memoized map ([`useDashboardStats`](../src/components/useDashboardStats.ts))
with a single clock snapshot for consistency.

## Dashboard

- **Header** — logo; a 21-cell strip (unique questions answered per day, last
  21 days) above the title; "answered N/total" for the whole exam at the right;
  and a full-width overall mastery bar (all topics combined, same segment style
  as the topic bars) directly below. The Account panel lives bottom-right in
  the footer.
- **Filters** ([`FilterBar`](../src/components/FilterBar.tsx)) — result, source,
  tool (grouped by topic), and a single-select "Not practiced" window, all rendered
  as labelled toggle chips. The result filter is unanswered (internal value
  `unseen`) / the six mastery buckets. The filters both narrow the displayed rows
  **and form the quiz pool**. The "LPIC-2 Topics" tool block is collapsible, its
  open/closed state persisted in `topicsExpanded`.
- **Tool boxes** — below the filters, a round-robin masonry of one bordered box
  per tool (always shown; collapsed to its header when empty). The masonry is
  responsive: 2 columns with a 7-wide badge grid on phones, 3 columns with a
  9-wide grid from the `sm` breakpoint up (the column count comes from a
  `matchMedia` hook so the round-robin distribution stays left-to-right). Each
  box's header is a tool-filter toggle chip (clicking it toggles that tool, kept
  in sync with the FilterBar tool chips) labelled `Tool N` where the coloured
  `N` is the count of badges currently shown (after filtering); the body is a
  grid of mastery chips for
  the questions matching the **result/source/not-practiced** filters (the tool
  filter itself is excluded so every box still populates). The quiz-size presets
  and Start button sit directly beneath this region.
- **Per-topic progress** — an "answered N/total" count and a stacked mastery bar per
  topic. Segments ramp slate (unseen) → red (all-wrong, bucket 0) → slate-to-green for
  buckets 20–100, and each correct block's fill opacity is scaled to its mastery (100% =
  fully filled); question counts sit inside the blocks when they fit, in a green digit so a
  faint low-mastery block still reads as answered. Derived in `useDashboardStats` (one pass
  over the latest-record map; orphaned ids for removed questions are skipped).
- **Expandable rows** — open a topic to see, first, a read-only per-tool stats
  block (label · seen/total · stacked mastery bar, from `perTool`/`bucketsByTool`),
  then its questions: stats line (21-day strip · mastery chip · source tag · id),
  a `tool · Topic Label (207)` line, the prompt, your answer when the last attempt
  was wrong, and the correct answer — on borderless filled cards. Command/config text
  in prompts, choices, and answers renders as inline code (see **Info menu / inline code**).
- **Quiz launcher** — size presets + an "available" count; **Start** is disabled when
  the pool is empty.
- **Logo lightbox** ([`LogoZoom`](../src/components/LogoZoom.tsx)) — accessible modal
  (`role="dialog"`, focus trap/restore, Escape).
- **Info menu / inline code** — a footer link ([`InfoMenu`](../src/components/InfoMenu.tsx))
  opens Theory (Ebbinghaus forgetting curve), User manual, and About panels in a shared
  [`Modal`](../src/components/Modal.tsx). [`CodeText`](../src/components/CodeText.tsx) renders
  backtick-marked command/config spans in question text as monospace inline code, used by both
  the dashboard cards and the quiz.

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
├── store.ts                     Zustand store (persist v9 + migrate)
├── types.ts                     Question union, AnswerRecord, Topic/Origin, constants
├── data/
│   ├── topics.json              6 exam topics (207–212)
│   ├── utilities.json           26 utilities → {topic, label}
│   └── questions/
│       ├── index.ts             globs/normalises/dedupes → QUESTIONS[]
│       └── <utility>/           question JSON + notes.md per utility
├── lib/
│   ├── select.ts                filterPool / balancedSample / shuffle / shuffledIndices / lastByQuestion / attemptsByQuestion
│   ├── mastery.ts               masteryOf (0–100 score)
│   ├── dates.ts                 startOfLocalDay / daysBack day-math helpers
│   ├── api.ts                   sync transport + mergeHistories
│   └── auth.ts                  token store
└── components/
    ├── Dashboard.tsx            home: header, filters, per-tool badge boxes, quiz size, card-view switcher, topic list, launcher
    ├── TopicCard.tsx            expandable topic row + mastery bar
    ├── MasteryBar.tsx           stacked mastery bar (+ thin per-tool variant)
    ├── AnswerLine.tsx           question card in an expanded topic
    ├── useDashboardStats.ts     memoized last/attempts/perTopic/perTool/mastery maps
    ├── FilterBar.tsx            result, source, tool (per topic) & not-practiced filters
    ├── ToggleChip.tsx           shared on/off filter chip button
    ├── Quiz.tsx                 question card, scoring, results
    ├── QuestionCardHeader.tsx   question-card header: context · source · day strip · chip
    ├── LogoZoom.tsx             accessible image lightbox
    ├── Account.tsx              disconnect button / read-only / local-only notice
    ├── CloudSync.tsx            headless two-way sync
    ├── CodeText.tsx             renders backtick-marked commands/config as inline code
    ├── InfoMenu.tsx             footer menu: Theory / User manual / About
    ├── PalettePanel.tsx         mastery-tint colour picker (gradient + chip preview)
    └── Modal.tsx                accessible dialog used by the menu panels
```

## Not wired in yet

- **Mastery-driven ordering** — the deck is sampled balanced-by-topic and then
  shuffled (`balancedSample`); ordering by mastery/weakness is not implemented.
- **Difficulty in mastery** — `difficulty` exists on ~⅔ of questions
  (`recall`/`applied`/`scenario`); held until coverage and ordering are confirmed.
