# Quizzer — concept & design notes

> Status: **idea / not started.** This is a vision doc, not a spec. Nothing here
> is built yet. lpic-trainer is the prototype that proves most of the engine.

## The idea

Quizzer is a generalization of lpic-trainer into a **bring-your-own-questions**
quiz app. Instead of one hardcoded LPIC-2 question set, any user can configure
the exact quiz they want from their own material.

- **What the user provides:** a long list of questions with correct answers.
- **What we provide:** a ready-made AI prompt that turns that raw list into a
  structured file Quizzer can import.
- **What the user gets back:**
  - a pool of questions to drill,
  - automatic division into topics,
  - statistics on their answers and overall progress,
  - AI-generated distractor (wrong) answers for each question.

lpic-trainer becomes just *one imported quiz pack* — the first sample.

## Core principle: AI runs once, offline, at import time

The single most important design decision. The AI step happens **outside**
Quizzer: the user pastes our prompt + their raw Q&A into their own ChatGPT /
Claude, gets back a `quiz-pack.json`, and imports that.

Consequences:

- Quizzer stays a **pure static SPA** — no API keys, no runtime AI cost, no
  generation backend, works fully offline.
- The only backend is the existing **stats sync** service (optional).
- The "intelligence" (topic inference, distractor writing, difficulty tagging)
  is captured in *a prompt*, which is the product's core IP and is trivial to
  iterate on without shipping code.

```
user's raw Q&A ──paste into──▶ [our prompt] ──▶ quiz-pack.json ──import──▶ Quizzer
                               (their AI)        topics + distractors       quiz + stats
```

## What already exists (reuse from lpic-trainer, ≈70%)

| Capability | Where it lives today | Reuse |
|---|---|---|
| Question schema + quiz flow | `src/components/Quiz.tsx`, `src/types.ts` | direct, after generalizing the data source |
| Pool filtering + balanced-by-topic sampling | `src/lib/select.ts` (`filterPool`, `balancedSample`) | as-is (pure TS) |
| Topic grouping + stats UI (stacked bars) | `src/components/Dashboard.tsx`, `useDashboardStats.ts` | direct |
| Mini-quizzes by size | `store.ts` (`quizSize`), `select.ts` (`balancedSample`) | as-is |
| Local-first persistence | `store.ts` (Zustand + persist) | as-is |
| Cross-device stats sync | `src/lib/{api,auth}.ts`, `server/` | as-is (already live) |

## What is genuinely new

1. **The generation prompt** — turns raw Q&A → schema: infers topics, writes
   plausible distractors, optionally tags difficulty. The product's core asset.
2. **Import UI** — paste or upload JSON, validate against the schema, store as a
   named pack; surface clear errors when the AI output is slightly off.
3. **Multi-pack model** — a *library* of quizzes instead of one hardcoded set.
   Stats are scoped per pack. Switch/manage packs.
4. **Schema + validator** — versioned, with friendly error messages so a
   not-quite-valid AI output is easy to fix and re-import.

## Open design decisions

### A. Where does Quizzer's code come from?

1. **Fresh repo, port the engine** (recommended) — new `quizzer` repo; copy the
   proven quiz/stats/select code; generalize the data layer to multi-pack; LPIC
   ships as a sample pack. Clean slate, no legacy baggage.
2. **Evolve lpic-trainer in place** — rename/refactor this repo into Quizzer,
   move LPIC content into a pack. Keeps git history, live deploy, and backend
   wiring, but mixes the pivot into the existing branch and domain.

### B. Where do distractors get created?

1. **Baked at import** (the original idea, recommended) — the offline prompt
   writes distractors into the JSON; Quizzer never calls AI. Zero keys/cost,
   offline-capable. Distractors are fixed unless re-imported.
2. **Optional runtime regeneration** — baked by default, but a "Regenerate"
   action can call an AI to refresh distractors on demand. Needs an API key + a
   backend proxy + per-call cost. More power, more infra. Defer unless wanted.

### C. What format does the user provide raw questions in?

1. **Anything — AI normalizes** — user pastes messy text however they have it;
   the prompt parses and structures it. Lowest friction, least reliable.
2. **A light template** — user fills a simple `Q: … / A: …` format; more
   reliable AI output, a bit more upfront work. Could support both: template
   preferred, freeform tolerated.

## Draft import schema (sketch, not final)

```jsonc
{
  "schemaVersion": 1,
  "pack": {
    "id": "lpic-202",                  // stable id for stats scoping
    "title": "LPIC-2 Exam 202",
    "description": "Linux Network Professional",
    "createdWith": "quizzer-prompt v1" // provenance of the AI generation
  },
  "topics": [
    { "id": "207", "label": "Domain Name Server" }
  ],
  "questions": [
    {
      "id": "q-0001",                  // stable; used by stats/sync
      "topicId": "207",
      "prompt": "Which record maps a hostname to an IPv6 address?",
      "answer": "AAAA",
      "distractors": ["A", "MX", "CNAME"],
      "difficulty": "medium",          // optional
      "explanation": "…"               // optional, shown after answering
    }
  ]
}
```

Notes:
- `id`s must be stable across re-imports so a user's history survives an update.
- Validator should reject duplicate ids, missing correct answers, topics with no
  questions, and distractors that equal the correct answer.

## The generation prompt (responsibilities)

The prompt is the product. It must reliably:

- Parse the user's raw input (freeform or templated) into discrete Q/A pairs.
- Cluster questions into a small number of sensible **topics** with short labels.
- Generate 3 (configurable) **plausible but wrong** distractors per question —
  same category/length/register as the correct answer, not obviously wrong, no
  duplicates, never equal to the correct answer.
- Optionally tag **difficulty** and write a one-line **explanation**.
- Emit **only** valid JSON matching the schema (no prose), with stable ids.

Iterating on this prompt (few-shot examples, guardrails against "all of the
above" distractors, etc.) is most of the quality work — and needs no code ship.

## Future ideas (parked)

- **Pack sharing / marketplace** — export a pack, share a link, public library
  of community packs (LPIC, AWS, language vocab, trivia…).
- **Spaced repetition (SRS)** — schedule reviews by forgetting curve, beyond the
  current weakness-weighting.
- **Multiple question types** — multi-select, true/false, fill-in-the-blank,
  image prompts, free-text graded by AI.
- **Per-pack themes / branding** — logo + colors per pack (lpic-trainer already
  has a start-screen logo).
- **Mobile app** — React Native / Expo shell sharing the engine (earlier idea in
  this session); store + sync + select logic port directly.
- **In-app generation** — paste raw Q&A in the app and have it call the AI for
  you (collapses the offline step), gated behind the user's own API key.
- **Analytics over time** — streaks, time-per-question, topic mastery trends,
  exportable progress reports.
- **Import from other formats** — Anki decks, CSV, Quizlet exports.
- **Collaborative / classroom mode** — a teacher publishes a pack, students'
  stats roll up to the teacher's dashboard.
