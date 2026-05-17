# Lpic-trainer

Practice quiz for the **LPIC-2 exam 202** (Linux Network Professional, second of the two LPIC-2 exams).

Web app, single-player, runs entirely in the browser. Pick which exam objectives to drill, answer multiple-choice questions, get an immediate explanation after each one. Progress is kept in `localStorage`.

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
├── App.tsx                    Top-level screen switcher (pick → quiz)
├── main.tsx                   Vite entry
├── index.css                  Tailwind directives + base styles
├── store.ts                   Zustand store (selected topics, answer history)
├── types.ts                   Topic/Utility types, Question type, topicOf() helper
├── data/
│   ├── topics.json            6 exam topics (207–212)
│   ├── utilities.json         ~24 utilities → {topic, label}
│   └── questions/
│       ├── index.ts           globs all question JSON into QUESTIONS[]
│       └── <utility>/         one folder per utility: q JSON files + notes.md
└── components/
    ├── TopicPicker.tsx        Topic checkboxes + "Start quiz" button
    └── Quiz.tsx               Question card, scoring, results screen
```

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

Questions live as individual JSON files under `src/data/questions/<utility>/`, one file per question, grouped by the utility they cover (`bind9`, `apache2`, `samba`, …). `utilities.json` maps each utility to its exam topic. `src/data/questions/index.ts` globs every file into `QUESTIONS[]` at build time. Each file needs a unique `id`, the `tool` (utility slug), the `prompt`, four `choices`, the `answerIndex` of the correct one, and an `explanation`. Per-utility `notes.md` files hold reference/study material.

The bank currently holds ~294 questions derived from LPIC-2 study material.

## Scope notes

- Only exam 202 is in scope right now. Exam 201 would be a sibling topic group; if added later, extend the `Topic` union in `types.ts`.
- Questions are derived from LPIC-2 study material for practice — they are **not** reproductions of real LPI exam items. Correct answers come from the source docs; the wrong choices are synthesized distractors.
