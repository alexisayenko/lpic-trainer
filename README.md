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

## Layout

```
src/
├── App.tsx                    Top-level screen switcher (pick → quiz)
├── main.tsx                   Vite entry
├── index.css                  Tailwind directives + base styles
├── store.ts                   Zustand store (selected topics, answer history)
├── types.ts                   Topic enum + Question type + topic labels
├── data/
│   └── questions.ts           Seed question bank
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

Each topic ships with 3 seed questions in `src/data/questions.ts`. Add more by appending to the same array — every entry needs a unique `id`, a `topic` from the enum in `types.ts`, the `prompt`, an array of `choices`, the index of the correct one, and a short `explanation` shown after answering.

## Scope notes

- Only exam 202 is in scope right now. Exam 201 would be a sibling topic group; if added later, extend the `Topic` union in `types.ts`.
- The seed questions are hand-written for practice — they are **not** reproductions of real LPI exam items.
