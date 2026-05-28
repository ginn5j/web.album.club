# Album Club

A small-group music listening club app — like a book club, but for albums. Members privately tag songs and write notes while listening, then reveal everyone's choices simultaneously when ready to discuss. Completed discussions can optionally be published to a Jekyll-based GitHub Pages blog.

**Backend:** Supabase (Postgres + Auth + Realtime). No GitHub API calls during normal use.

**Live app:** https://ginn5j.github.io/album-club

---

## How it works

1. Any member picks the current album (searched via MusicBrainz or entered manually)
2. Each member privately tags each song — **Starter** (would open a playlist), **Bench** (solid track), or **Cut** (would skip) — and writes notes
3. When ready to discuss, any member clicks **Reveal** — all choices are unmasked simultaneously for everyone
4. The merged discussion is saved to Supabase and visible to all club members
5. Members can optionally publish any discussion to their own Jekyll blog via a GitHub PAT

---

## Tech stack

| Concern | Library / Service |
|---------|-------------------|
| UI | React 18 + TypeScript + Tailwind CSS |
| Routing | React Router v6 |
| Auth | Supabase Auth — email magic link |
| Database | Supabase Postgres with Row-Level Security |
| Real-time | Supabase Realtime (postgres_changes subscriptions) |
| Music metadata | MusicBrainz API (free, no key required) |
| Cover art | Cover Art Archive |
| Jekyll publishing | `@octokit/graphql` — `createCommitOnBranch` mutation |
| Hosting | GitHub Pages (GitHub Actions deploy) |

---

## Supabase project setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note the **Project URL** and **anon public key** from Project Settings → API

### 2. Apply the database schema

Run the migration files against your project (Dashboard → SQL Editor, or Supabase CLI):

```
supabase/setup/001_initial.sql   # Tables
supabase/setup/002_rls.sql       # Row-Level Security policies + grants
supabase/setup/003_realtime.sql  # Enable Realtime on albums + reveals
```

### 3. Enable email authentication

In the Supabase Dashboard → Authentication → Providers → Email:
- Enable the Email provider
- Disable passwords (magic link / OTP only)
- Add your app URL to Authentication → URL Configuration → Site URL and Redirect URLs

### 4. Disable public sign-ups

In the Supabase Dashboard → Authentication → Settings:
- Set **Disable sign ups** to **on**

With sign-ups disabled, only users the admin creates in the Supabase Dashboard → Authentication → Users can sign in. Anyone who attempts to sign in with an unrecognised email will receive no link.

### 5. Environment variables

| Variable | Where to find it |
|----------|-----------------|
| `VITE_SUPABASE_URL` | Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Project Settings → API → anon / public key |

Add both as GitHub Actions secrets in this repo (Settings → Secrets and variables → Actions).

### 6. Set the first admin

After the first user signs in and completes onboarding, promote them to admin in the SQL editor:

```sql
UPDATE members SET role = 'admin' WHERE display_name = 'Your Name';
```

---

## Member onboarding

1. Admin creates the new member's account in the Supabase Dashboard → Authentication → Users (click **Add user** → **Create new user**, enter their email)
2. Member opens the app, enters their email, and clicks **Send sign-in link**
3. Member clicks the link in their email to authenticate
4. On first sign-in with no existing record: member chooses a display name
5. Member is now active in the club

Returning members' sessions are restored automatically. Users not created by the admin cannot sign in (public sign-ups are disabled).

---

## Jekyll publishing (optional)

Any member who wants to publish discussions to a Jekyll blog configures it in **Settings → Blog Output**:

| Field | Description |
|-------|-------------|
| Blog repo owner | GitHub username or org that owns the blog repo |
| Blog repo name | Repo name (e.g. `alice.github.io`) |
| Posts path | Directory for posts (e.g. `_posts/albums`) |
| Branch | Target branch (usually `main`) |
| Publish PAT | GitHub PAT with `Contents: Read and write` on the blog repo |

The Publish PAT is the only GitHub credential in the new version. It is stored in Supabase (RLS-protected, only visible to the owning member) and is only sent to the GitHub API when the member explicitly clicks **Publish to Blog**.

---

## Features

### Album picker
- Search MusicBrainz by title/artist with optional country, year, and format filters; track list and cover art are fetched automatically
- Manual entry for albums not in MusicBrainz
- Any member can pick the current album; all other members see a real-time notification immediately (no polling)
- A confirmation is required before replacing an undiscussed current album

### Tagging & notes
- Each song can be tagged **Starter / Bench / Cut** (or left untagged)
- Freeform notes with 2-second auto-save
- Tags and notes are private in Postgres (RLS enforces this — they are literally unreadable by other members until reveal, not just hidden in the UI)

### Discussion reveal
- Any member triggers the reveal from `/discuss`
- A row is inserted into the `reveals` table; Supabase Realtime delivers the event to all connected clients instantly
- All clients unmask simultaneously without polling
- The merged discussion is written to the `discussions` table (idempotent — safe if multiple clients race)

### Past discussions
- Full archive at `/discussions`
- Any entry can be viewed, edited, or published at any time
- Back-entry form to add past discussions without going through the live reveal flow

### Wishlist
- Each member maintains a private wishlist of albums to suggest
- Items can have personal notes, be reordered by drag-and-drop, and be promoted to the current album

---

## Deployment

Every push to `main` triggers `.github/workflows/deploy.yml`, which:
1. Runs tests
2. Builds with `VITE_BASE_URL=/album-club` and the Supabase env vars (secrets `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`)
3. Deploys to the `album-club` directory of `ginn5j/ginn5j.github.io`

---

## Building locally

Node.js 18+ required. Create a `.env.local` file with the Supabase variables:

```sh
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
npm test           # run test suite
```

---

## Project structure

```
src/
├── types/               # TypeScript interfaces (album, member, discussion, wishlist)
├── data/                # Static content (changelog)
├── constants/config.ts  # MusicBrainz URLs and timing constants; legacy GitHub path helpers (used by github/ lib)
├── lib/
│   ├── backends/        # BackendProvider interface + Supabase implementation
│   │   ├── types.ts         # StorageProvider, RealtimeProvider, BackendProvider
│   │   ├── index.ts         # Active backend (swap here to change backends)
│   │   └── supabase/        # Supabase implementation (client, storage, realtime)
│   ├── auth/            # Auth abstraction
│   │   ├── types.ts         # AuthProviderConfig interface
│   │   ├── AuthContext.tsx  # React context + useAuth hook
│   │   └── providers/       # emailMagicLink.ts, index.ts
│   ├── github/          # Octokit client + file helpers (Jekyll publishing only)
│   ├── musicbrainz/     # Rate-limited MusicBrainz client
│   ├── merge/           # Discussion merger; Jekyll post generator
│   └── settings.ts      # localStorage helpers (kept for legacy settings.test.ts)
├── hooks/               # React hooks
│   ├── useRealtimeAlbum.ts  # Supabase Realtime subscription for current album
│   ├── useRealtimeReveal.ts # Supabase Realtime subscription for reveal events
│   ├── useMusicBrainz.ts    # Debounced MusicBrainz search with 500ms delay
│   ├── useSongTags.ts       # Read/write tags via backend.storage
│   ├── useNotes.ts          # Read/write notes via backend.storage (2s auto-save)
│   └── useWishlist.ts       # Read/write wishlist via backend.storage
├── pages/               # Route-level page components
│   ├── SignInPage.tsx       # Email magic link sign-in form
│   ├── OnboardingPage.tsx   # Display name form on first sign-in
│   └── ...                  # Album, Discussion, Wishlist, Settings, etc.
└── components/          # Shared UI components
supabase/
├── setup/
│   ├── 001_initial.sql  # All tables
│   ├── 002_rls.sql      # Row-Level Security policies + authenticated grants
│   └── 003_realtime.sql # Enable Realtime publication for albums + reveals
└── migration/
    ├── grant_migration.sql   # Run before /migrate — temporary service_role access
    └── revoke_migration.sql  # Run after /migrate — removes service_role access
```

---

## Privacy

Tags and notes are private by Postgres Row-Level Security policy — they are unreadable at the database level by other members until a reveal row exists for that album. This is true even if someone queries Supabase directly with the anon key. The anon key is safe to expose; it only unlocks what RLS permits.
