# Album Club

A small-group music listening club app — like a book club, but for albums. Members privately tag songs and write notes while listening, then reveal everyone's choices simultaneously when ready to discuss. Completed discussions can optionally be published to a Jekyll-based GitHub Pages blog.

**Backend:** Supabase (Postgres + Auth + Realtime). No GitHub API calls during normal use.

**Live preview (dev branch):** https://ginn5j.github.io/album-club-next  
**Live app (stable):** https://ginn5j.github.io/album-club

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
| Auth | Supabase Auth — GitHub OAuth + email magic link |
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
supabase/migrations/001_initial.sql   # Tables
supabase/migrations/002_rls.sql       # Row-Level Security policies + grants
supabase/migrations/003_realtime.sql  # Enable Realtime on albums + reveals
```

### 3. Enable authentication providers

In the Supabase Dashboard → Authentication → Providers:

**GitHub OAuth**
1. Create a GitHub OAuth App: GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
   - Homepage URL: your app URL (e.g. `https://ginn5j.github.io/album-club-next`)
   - Authorization callback URL: shown in the Supabase GitHub provider config
2. Paste the Client ID and Client Secret into Supabase
3. Add your app URL to Authentication → URL Configuration → Redirect URLs

**Email magic link**  
Enable the Email provider, disable passwords (magic link only).

### 4. Environment variables

| Variable | Where to find it |
|----------|-----------------|
| `VITE_SUPABASE_URL` | Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Project Settings → API → anon / public key |

Add both as GitHub Actions secrets in this repo (Settings → Secrets and variables → Actions).

### 5. Set the first admin

After the first user signs in and completes onboarding, promote them to admin in the SQL editor:

```sql
UPDATE members SET role = 'admin' WHERE display_name = 'Your Name';
```

Admins can create invite tokens for new members from the admin section of the app (not yet exposed in the UI — use Supabase Dashboard → Table Editor → invites for now).

---

## Member onboarding

1. Admin creates an invite token for each new member (or they sign in directly if OAuth is unrestricted)
2. Member opens the app → clicks **Continue with GitHub** (or enters email for a magic link)
3. On first sign-in with no existing record: member chooses a display name
4. Member is now active in the club

Returning members' sessions are restored automatically.

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

### Data migration from GitHub
- If your club previously used the GitHub-backed version of this app, the `/migrate` route (admin only) reads your old `album-club` repo and writes everything to Supabase
- All operations are idempotent — safe to re-run
- Members must have signed in at least once before migration so their Supabase user IDs exist
- See [Data migration from GitHub](#data-migration-from-github-1) below for the full procedure

---

## Data migration from GitHub

If your club was previously running the GitHub-backed version of this app, use the admin-only `/migrate` page to move all data to Supabase. All writes are idempotent — it is safe to re-run.

### Before you start

1. Every member must sign in to the new app at least once and complete onboarding (choose a display name) so their Supabase `user_id` exists.
2. Each member's chosen display name must match the `name` field in `settings/members.json` from the old repo. The `branch` field is used separately to locate their private data and may differ from their display name.
3. Prepare a GitHub PAT with **read** access to the old `album-club` repo and all member branches.
4. Have your Supabase **service role key** ready (Project Settings → API → `service_role`). It is entered directly in the browser and is only sent to your own Supabase project — it is not stored anywhere.

### Migration procedure

**Step 1 — Grant temporary service_role access**

The migration page writes data on behalf of other members, which the normal `authenticated` role cannot do (RLS restricts each user to their own rows). Run this once in the Supabase SQL Editor:

```
supabase/scripts/grant_migration.sql
```

**Step 2 — Run the migration**

Sign in as the admin, navigate to `/#/migrate`, and fill in:
- GitHub PAT (read-only is fine)
- Old repo owner and repo name
- Supabase service role key

Click **Run Migration**. Each step shows ✓ on success or ✗ with the error message on failure. Fix any errors and re-run — everything is idempotent.

**Step 3 — Verify the data**

Check a few tables in the Supabase Dashboard → Table Editor:
- `members` — all members present
- `albums` — current album and history
- `discussions` — all past discussions
- `wishlists` — one row per member with their items
- `tags` / `notes` — rows for each member × album

**Step 4 — Revoke service_role access**

Once you are satisfied the migration is complete, remove the temporary grants:

```
supabase/scripts/revoke_migration.sql
```

The app never uses the service role key during normal operation. Revoking these privileges means a leaked or misused service key cannot read or modify app data through the REST API.

---

## Deployment

### Development branch → `/album-club-next`

Every push to `claude/supabase-cloud-migration-vCHBP` triggers `.github/workflows/deploy-preview.yml`, which:
1. Runs tests
2. Builds with `VITE_BASE_URL=/album-club-next` plus the Supabase env vars
3. Deploys to the `album-club-next` directory of `ginn5j/ginn5j.github.io`

### Stable branch → `/album-club`

The `main` branch and its workflow (`deploy.yml`) are unchanged and continue to serve the GitHub-backed version at `/album-club`.

### Cutover (when the new version is ready)

1. Merge the dev branch to `main`
2. Update `deploy.yml` to add the Supabase env vars
3. Delete `deploy-preview.yml` (or repurpose it)
4. Update the Supabase OAuth redirect URL to the production URL
5. Run the data migration, then remove the `/migrate` route

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
├── constants/config.ts  # MusicBrainz URLs, path helpers; legacy GitHub constants kept for MigrationPage
├── lib/
│   ├── backends/        # BackendProvider interface + Supabase implementation
│   │   ├── types.ts         # StorageProvider, RealtimeProvider, BackendProvider
│   │   ├── index.ts         # Active backend (swap here to change backends)
│   │   └── supabase/        # Supabase implementation (client, storage, realtime)
│   ├── auth/            # Auth provider abstraction
│   │   ├── types.ts         # AuthProviderConfig interface
│   │   ├── AuthContext.tsx  # React context + useAuth hook
│   │   └── providers/       # github.ts, emailMagicLink.ts, index.ts (registry)
│   ├── github/          # Octokit client + file helpers (Jekyll publishing + migration only)
│   ├── musicbrainz/     # Rate-limited MusicBrainz client
│   ├── merge/           # Discussion merger; Jekyll post generator
│   └── settings.ts      # localStorage helpers (kept for legacy settings.test.ts)
├── hooks/               # React hooks
│   ├── useRealtimeAlbum.ts  # Supabase Realtime subscription for current album
│   ├── useRealtimeReveal.ts # Supabase Realtime subscription for reveal events
│   ├── useSongTags.ts       # Read/write tags via backend.storage
│   ├── useNotes.ts          # Read/write notes via backend.storage (2s auto-save)
│   └── useWishlist.ts       # Read/write wishlist via backend.storage
├── pages/               # Route-level page components
│   ├── SignInPage.tsx       # Sign-in with configured auth providers
│   ├── OnboardingPage.tsx   # Display name form on first sign-in
│   ├── MigrationPage.tsx    # Admin-only /migrate route
│   └── ...                  # Album, Discussion, Wishlist, Settings, etc.
└── components/          # Shared UI components
supabase/
├── migrations/
│   ├── 001_initial.sql  # All tables
│   ├── 002_rls.sql      # Row-Level Security policies + authenticated grants
│   └── 003_realtime.sql # Enable Realtime publication for albums + reveals
└── scripts/
    ├── grant_migration.sql   # Run before /migrate — temporary service_role access
    └── revoke_migration.sql  # Run after /migrate — removes service_role access
```

### Adding a new auth provider

1. Create `src/lib/auth/providers/yourprovider.ts` implementing `AuthProviderConfig`
2. Add it to the array in `src/lib/auth/providers/index.ts`

Nothing else changes — `SignInPage` iterates the array automatically.

### Switching the storage backend

Change the one import in `src/lib/backends/index.ts`:

```typescript
import { neonBackend } from './neon'
export const backend: BackendProvider = neonBackend
```

All hooks and pages call `backend.storage.*` and `backend.realtime.*` — none of them import from `./supabase` directly.

---

## Privacy

Tags and notes are private by Postgres Row-Level Security policy — they are unreadable at the database level by other members until a reveal row exists for that album. This is true even if someone queries Supabase directly with the anon key. The anon key is safe to expose; it only unlocks what RLS permits.
