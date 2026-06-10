# Lpic-trainer

Practice quiz for the **LPIC-2 exam 202** (Linux Network Professional, second of the two LPIC-2 exams).

Web app, single-player, runs entirely in the browser. Pick which exam objectives to drill, answer questions (single-choice, multiple-response, or fill-in-the-blank), get an immediate explanation after each one. Progress is kept in `localStorage`. When cloud sync is configured, a valid sync token is required to enter (a login gate); without it, the app is not usable.

## Stack

- React 18 + TypeScript
- Vite 5 (dev server + build)
- Tailwind CSS 3
- Zustand (state, with `persist` middleware → `localStorage`)

## Run locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually <http://localhost:5173>).

## Build

```bash
npm run build      # type-checks then bundles into dist/
npm run preview    # serve the production build locally
```

The Vite build serves assets from `/` so the bundle works under the custom domain. To preview under the GitHub Pages project URL instead, build with `VITE_BASE=/lpic-trainer/ npm run build`.

## Deploy (GitHub Pages)

`.github/workflows/deploy.yml` handles deploys: every push to `main` builds the project and publishes `dist/` to GitHub Pages. There is no manual upload step.

One-time setup after the repo exists on GitHub:

1. Push this repo (the workflow file and `package-lock.json` must be on `main`).
2. Repo **Settings → Pages → Build and deployment → Source**: select **GitHub Actions**.
3. Push any commit (or click **Run workflow** on the *Deploy to GitHub Pages* action). The first run does the initial deploy.

Live URL: <https://lpic.isayenko.org/>

The site is served from the custom domain `lpic.isayenko.org`. `public/CNAME` carries the domain into every build; GitHub Pages reads it and serves from the apex path. DNS requires a `CNAME` record: `lpic` → `alexisayenko.github.io`.

## Layout

```
src/
├── App.tsx                    Screen switch (login gate → dashboard → quiz)
├── main.tsx                   Vite entry
├── index.css                  Tailwind directives + base styles
├── store.ts                   Zustand store (topics, filters, quizSize, answer history)
├── types.ts                   Question union, AnswerRecord, Topic/Origin, shared constants
├── data/
│   ├── topics.json            6 exam topics (207–212)
│   ├── utilities.json         26 utilities → {topic, label}
│   └── questions/
│       ├── index.ts           globs/normalises/dedupes question JSON into QUESTIONS[]
│       └── <utility>/         one folder per utility: q JSON files + notes.md
├── lib/
│   ├── select.ts              deck pipeline: filterPool / orderByWeakness / pickDeck
│   ├── mastery.ts             mastery score (display-only)
│   ├── api.ts                 sync transport + mergeHistories
│   ├── auth.ts                token store
│   └── useTokenConnect.ts     shared token entry/validation hook
└── components/
    ├── Dashboard.tsx          home: filters, per-topic progress, launcher
    ├── useDashboardStats.ts   memoized last/attempts/perTopic/mastery maps
    ├── FilterBar.tsx          result + source filters
    ├── Quiz.tsx               question card, scoring, results screen
    ├── QuestionStats.tsx      source tag · mastery chip · attempt history
    ├── LogoZoom.tsx           accessible image lightbox
    ├── Account.tsx            connect/disconnect panel
    ├── Login.tsx              full-screen token gate
    └── CloudSync.tsx          headless two-way sync
```

See [docs/architecture.md](docs/architecture.md) for how these fit together and
[docs/terminology.md](docs/terminology.md) for a glossary of the domain terms.

## Coverage

The exam 202 objectives, as published by LPI:

| Code | Topic |
| --- | --- |
| 207 | Domain Name Server (BIND) |
| 208 | HTTP Services (Apache, nginx) |
| 209 | File Sharing (Samba, NFS) |
| 210 | Network Client Management (DHCP, PAM, LDAP) |
| 211 | E-Mail Services (Postfix, Dovecot) |
| 212 | System Security (firewall, OpenSSH, OpenVPN) |

Questions live as JSON under `src/data/questions/`, grouped by the utility they cover (`bind9`, `apache2`, `samba`, …). `utilities.json` maps each utility to its exam topic. `src/data/questions/index.ts` globs every file into `QUESTIONS[]` at build time; a file may hold a single question object **or an array** of them (objective-mapped banks live as arrays under `lpic-bank/` and `lpic2book/`). Every question needs a unique `id`, the `tool` (utility slug), a `prompt`, and an `explanation`, plus fields by `type`:

- `single` (default if `type` omitted): `choices` + `answerIndex`.
- `multi`: `choices` + `answerIndices` (correct only when the selected set matches exactly).
- `fill`: `answer` (compared case- and whitespace-insensitively).

Each question also gets an `origin` (auto-tagged at load from its path/id): `linux-direct` and `ken-adams` for the original by-topic and `u`-series sets, `gpt-deep-research` for `lpic-bank/`, and `claude-lpic2book` for `lpic2book/` (original questions distilled from the CC-licensed lpic2book).

Per-utility `notes.md` files hold reference/study material.

The bank holds ~500 questions: the original two sets plus the objective-mapped `lpic-bank/` (GPT) and `lpic2book/` (original, from the open book) sets. Source/reference material under `docs/refs/` is git-ignored — copyrighted course PDFs are kept local, not published.

## Scope notes

- Only exam 202 is in scope right now. Exam 201 would be a sibling topic group; if added later, extend the `Topic` union in `types.ts`.
- Questions are derived from LPIC-2 study material for practice — they are **not** reproductions of real LPI exam items. Correct answers come from the source docs; the wrong choices are synthesized distractors.
