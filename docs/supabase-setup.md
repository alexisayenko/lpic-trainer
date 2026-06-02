# Supabase setup (cloud stats sync)

The app works fully offline using `localStorage`. To sync stats across devices,
point it at a Supabase project. This is a **single-user** setup (just you), using
passwordless magic-link email auth.

## 1. Create the project

1. Sign in at https://supabase.com and create a new project.
2. Note the **Project URL** and **anon public key** (Project Settings → API).

## 2. Create the table + security policy

Open **SQL Editor** and run:

```sql
create table public.answers (
  id           uuid        primary key,
  user_id      uuid        not null references auth.users (id) on delete cascade,
  question_id  text        not null,
  picked_index int,
  correct      boolean     not null,
  ts           bigint      not null,
  created_at   timestamptz not null default now()
);

alter table public.answers enable row level security;

-- A user can only see and write their own rows.
create policy "own answers" on public.answers
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

`id` is generated client-side (UUID), so re-uploading the same answer from any
device is an idempotent upsert — no duplicates.

## 3. Lock it down to just you

Because it's only for you:

1. **Authentication → Providers → Email**: keep enabled (magic link works out of
   the box; no SMTP needed for low volume — Supabase sends the email).
2. **Authentication → Sign Ups**: turn **Allow new users to sign up** OFF after
   you've signed in once, so nobody else can create an account.
   - First sign in once with your email to create your user, *then* disable signups.
   - Or pre-create your user under **Authentication → Users → Add user**.

## 4. Configure redirect URLs

**Authentication → URL Configuration**:

- **Site URL**: `https://lpic.isayenko.org`
- **Redirect URLs**: add both
  - `https://lpic.isayenko.org`
  - `http://localhost:5173` (for local dev)

The magic-link email returns the user to this origin, where the session is
established and a full two-way sync runs automatically.

## 5. Wire the keys

- **Local dev**: copy `.env.example` to `.env.local` and fill in the URL + anon key.
- **GitHub Pages**: add repo secrets `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY` (Settings → Secrets and variables → Actions). The
  deploy workflow injects them at build time.

The anon key is safe to ship in the client bundle — row-level security is what
protects the data, and only your authenticated user can read/write rows.
