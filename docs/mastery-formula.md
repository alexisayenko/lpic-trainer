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
different dates, no wrong answers in any of them) = 100. A wrong QuizDay only
drops out of the score when five newer QuizDays push it past the 5-slot window.

## Constants (tunable, top of `mastery.ts`)

- `DAY_GAP = 21h` — minimum spacing for two attempts to count as different
  QuizDays (the attempts must also fall on different local calendar dates)
- `WINDOW_MS = 21 days` — forgetting window
- `SLOTS = 5` — QuizDays scored; missing slots count as wrong

## Chip colours

`≥80` green · `≥50` amber · `<50` red.

## Not wired in yet

- **Ordering** — the quiz still uses the 3-bucket `orderByWeakness` (unseen > wrong
  > correct, random tiebreak). The plan is to drive ordering by `100 − score`.
- **Difficulty** — `Question.difficulty` (`recall`/`applied`/`scenario`) is only on
  ~⅔ of questions; held until coverage is complete.
- **Answer latency** — not tracked; explicitly out of scope.
