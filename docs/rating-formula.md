# Question mastery rating

A 0–100 **mastery** score per question — high means "you know it well, and recently."
Computed from your attempt history in [`src/lib/rating.ts`](../src/lib/rating.ts) and
shown as a `★ NN` chip in the per-question stats line (dashboard rows and the quiz).

> **Status: display-only.** The rating does **not** yet affect quiz ordering or the
> question pool. The 4/day time-block (below) is also not yet wired in. See
> *Not wired in yet*.

## Model

Mastery is built **per day**, then summed over a rolling window. The idea is
spaced repetition: getting a question right on five separate days earns full
mastery; cramming, wrong answers, and letting it go stale all pull it back down.

### Inputs

Only the local answer log is used (`AnswerRecord[]` per question): each attempt's
`correct` flag and timestamp `ts`. Never-asked questions are **unrated** (no chip).

### Day buckets

Attempts are grouped into "days." Two attempts **less than 20h apart** belong to
the same day; a gap of ≥20h starts a new day. So several attempts in one study
session count as a single day, even across a late-night/early-morning boundary.

### Per-day contribution

For one day with `v` correct and `x` wrong attempts:

```
contribution = 20 · sign(v − x) · max(v, x) / (v + x)
```

It's the **majority side's share of the day, signed**, scaled to ±20:

- All correct → **+20** (regardless of how many)
- Majority correct → positive, toward +20 as it gets cleaner
- Exact tie (`v == x`) → **0**
- Majority wrong → negative, toward −20
- All wrong → **−20**

| Day (✓ / ✗) | Contribution |
|---|---|
| 1+ / 0 | **+20** |
| 3 / 1 | **+15** |
| 2 / 1 | **+13.3** |
| 1 / 1, 2 / 2 | **0** |
| 1 / 2 | **−13.3** |
| 1 / 3 | **−15** |
| 0 / 1+ | **−20** |

A day contributes a clean ±20 only when it's all-right or all-wrong; a single
answer flipping the majority moves the day across 0 (e.g. 1✓1✗ = 0 → 2✓1✗ = +13.3).

### Forgetting window

Only days **within the last 21 days from today** are counted. Older days drop out,
so mastery **decays on its own** — a question you aced weeks ago slides back toward
0 unless you revisit it. The window is measured from *now*, so the score can fall
with no new activity.

### Score

```
score = clamp(0, 100, Σ day contributions within window)
```

Five clean days = `5 × 20 = 100`. Bad days subtract and can erase earned mastery,
but the total never drops below 0.

## Constants (tunable, top of `rating.ts`)

- `DAY_GAP = 20h` — minimum spacing for two attempts to count as different days
- `WINDOW_DAYS = 21` — forgetting window
- `DAY_VALUE = 20` — full value of one clean day (⇒ 5 clean days = 100)

## Quiz selection (separate layer)

These shape which questions appear; they are **not** part of the score above.

- **Time-block** — once a question has been answered **4 times in a calendar day**,
  it's removed from the pool until the next day. (All 4 attempts still count toward
  that day's contribution.) This caps `v + x ≤ 4` per day, so e.g. `3✓2✗` can't occur.

## Chip colours

`≥80` green · `≥50` amber · `<50` red.

## Not wired in yet

- **Ordering** — the quiz still uses the 3-bucket `orderByWeakness` (unseen > wrong
  > correct, random tiebreak). The plan is to drive ordering by `100 − score`.
- **Time-block** — the 4/day cap is specified above but not yet enforced in the pool.
- **Difficulty** — `Question.difficulty` (`recall`/`applied`/`scenario`) is only on
  ~⅔ of questions; held until coverage is complete.
- **Answer latency** — not tracked; explicitly out of scope.
