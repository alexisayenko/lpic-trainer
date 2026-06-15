# Question mastery

A 0–100 **mastery** score per question — high means "you know it well, and recently."
Computed from your attempt history in [`src/lib/mastery.ts`](../src/lib/mastery.ts) and
shown as a `★ NN` chip in the per-question stats line (dashboard rows and the quiz).

> **Status: partially wired in.** Mastery drives the result filter (the quiz
> pool can be narrowed to one bucket) but does **not** yet affect quiz ordering.
> See *Not wired in yet*.

## Model

Mastery is the share of your **last 5 QuizDays** (within the 21-day window) that
were clean. Missing slots count as wrong, so you have to actually show up across
five separate days to reach 100.

### Inputs

Only the local answer log is used (`AnswerRecord[]` per question): each attempt's
`correct` flag and timestamp `ts`. Never-asked questions are **unrated** (no chip).

### QuizDay buckets

Attempts are grouped into **QuizDays**. A new QuizDay starts only when **both**
hold: the gap since the previous attempt is **≥21h** *and* the attempt falls on a
**different local calendar date** than the previous one. A QuizDay is **clean**
if every attempt in it was correct, **wrong** if *any* attempt in it was wrong.

Questions are not blocked from being re-asked within a QuizDay — you can drill
the same one ten times in a sitting. One slip turns the whole QuizDay wrong.

### Forgetting window

Only QuizDays **within the last 21 days from today** are considered. Older days
drop out, so mastery **decays on its own** — a question you aced weeks ago slides
back toward 0 unless you revisit it.

### Score

Take the last 5 QuizDays in the window. If there are fewer than 5, pad the
missing slots as wrong.

```text
score = (clean QuizDays in last 5) / 5 × 100
```

So 1 clean QuizDay and nothing else = 20. Five clean QuizDays (≥21h apart on
different dates, no wrong answers in any of them) = 100.

### Recent-wrong cap

A bare `(clean / 5)` count treats a **wrong** QuizDay exactly like a **missing**
one — both contribute 0 — so a slip on a question you've only practiced a few
times doesn't lower its score at all. To give recent failures teeth, if the
**most recent QuizDay in the window was wrong**, the score is capped at
`RECENT_WRONG_CAP` (40): a question you just got wrong reads as "in progress" at
best, no matter how many older days were clean.

The cap lifts as soon as your latest practiced day is clean again. It only ever
lowers the score, and 40 is a bucket value, so results stay on the
0/20/40/60/80/100 ramp. Independently, a wrong QuizDay still drops out of the
count once five newer QuizDays push it past the 5-slot window.

## Constants (tunable, top of `mastery.ts`)

- `DAY_GAP = 21h` — minimum spacing for two attempts to count as different
  QuizDays (the attempts must also fall on different local calendar dates)
- `WINDOW_MS = 21 days` — forgetting window
- `SLOTS = 5` — QuizDays scored; missing slots count as wrong
- `RECENT_WRONG_CAP = 40` — score ceiling when the most recent QuizDay was wrong

## Chip colours

One tint per bucket — a hand-tuned red→green ramp in `MASTERY_TINTS`
(`src/types.ts`), shared by bar segments, chevron stacks, and chips; each
bucket also carries an `on` class for text rendered on top of its colour.

## Not wired in yet

- **Mastery-driven ordering** — the quiz deck is a balanced-by-topic random sample
  of the filtered pool (`balancedSample` in `select.ts`), so selection and order
  depend only on the user's filters. Mastery narrows the pool through the
  result-bucket filter but does not bias ordering; an earlier `orderByWeakness`
  (unseen > wrong > correct) was removed because it skewed the deck independently
  of the user's settings.
- **Difficulty** — `Question.difficulty` (`recall`/`applied`/`scenario`) is only on
  ~⅔ of questions; held until coverage is complete.
- **Answer latency** — not tracked; explicitly out of scope.
