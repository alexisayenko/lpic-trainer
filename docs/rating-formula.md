# Question mastery rating

A 0–100 **mastery** score per question — high means "you know it well." Computed
from your attempt history in [`src/lib/rating.ts`](../src/lib/rating.ts) and shown
as a `★ NN` chip in the per-question stats line (dashboard rows and the quiz).

> **Status: display-only.** The rating does **not** yet affect quiz ordering or
> the question pool. Those are deferred (see *Not wired in yet* below).

## Inputs

Only the local answer log is used (`AnswerRecord[]` per question): each attempt's
`correct` flag and timestamp `ts`. Never-asked questions are **unrated** (no chip).

## Factors

Each factor is normalised to `0..1`.

| Factor | Meaning | Definition |
|---|---|---|
| **Accuracy** (recency-weighted) | How consistently correct, recent attempts counting most | geometric decay: newest attempt weight `1`, each older `×0.7`. `accuracy = Σ wᵢ·correctᵢ / Σ wᵢ` |
| **Recency** | How fresh the knowledge is (forgetting) | `max(0, 1 − daysSinceLast / 30)` — full at today, `0` after 30 days |
| **Exposure** | How well-tested the result is | `min(attempts, 5) / 5` — low counts are less trustworthy |
| **Streak** (bonus) | Consecutive recent corrects | `min(currentStreak, 5) / 5`, applied as a capped bonus |

## Formula

```
raw    = 0.5·accuracy + 0.3·recency + 0.2·exposure + 0.1·streak
score  = round(100 · min(1, raw))
```

Weights: accuracy **50%**, recency **30%**, exposure **20%**, plus up to **+10%**
streak bonus (clamped so `score ≤ 100`).

### Constants (tunable, top of `rating.ts`)

- `DECAY = 0.7` — older-attempt weighting
- `ENOUGH = 5` — attempts for full exposure
- `FRESH_DAYS = 30` — recency decay window
- `STREAK_CAP = 5`, `STREAK_BONUS = 0.1`

## Examples

- **Answered right once, today:** acc 1, recency 1, exposure 0.2, streak 0.2 → `raw 0.86` → **86**.
- **5× correct but last attempt 40 days ago:** acc ~1, recency 0, exposure 1, streak 1 → `raw 0.80` → **80** (decayed by staleness).
- **Recently flipped to correct after misses:** recency-weighted accuracy rewards the recent corrects, so the score climbs as you improve.

## Chip colours

`≥80` green · `≥50` amber · `<50` red.

## Not wired in yet

- **Ordering** — the quiz still uses the 3-bucket `orderByWeakness` (unseen > wrong
  > correct, random tiebreak). The plan is to drive ordering by `100 − score`.
- **Skip recently asked** — a "skip questions asked within the last N days" pool
  filter (days, presets `0/1/3/7/14`) is planned but not built.
- **Difficulty** — `Question.difficulty` (`recall`/`applied`/`scenario`) is only
  on ~⅔ of questions; held until coverage is complete and the ordinal weighting
  (recall < applied < scenario) is confirmed.
- **Answer latency** — not tracked; explicitly out of scope for now.
