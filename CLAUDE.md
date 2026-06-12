# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev           # Dev server at http://localhost:5173
npm run build         # tsc + vite build → dist/
npm run lint          # ESLint on src (.eslintrc.cjs)
npm test              # Vitest (single run, CI mode)
npm run test:watch    # Vitest watch mode
npm run test:coverage # Vitest with v8 coverage (text + lcov)

# Run a single test file:
npx vitest run src/lib/merge/__tests__/merger.test.ts
```

**Node.js is not installed on this machine.** Do not attempt to run `npm install`, `npm run`, `npx`, or `tsc` locally. All CI (lint → test → build → deploy) runs on GitHub Actions.

## Architecture

Album Club is a SPA where small groups listen to music together. Members privately tag songs (Starter/Bench/Cut) and write notes; all data is revealed simultaneously.

**Backend: Supabase** (Postgres + Auth + Realtime). The browser talks to Supabase with the anon key; Row-Level Security enforces all access rules. There is no app server.

- **Auth:** email magic link only (`src/lib/auth/AuthContext.tsx`). A row in the `members` table = club membership, created during in-app onboarding. New-user admission is controlled by the Supabase "Disable sign ups" dashboard setting (invite-only via admin console when on) — the app itself does not gate membership.
- **Storage:** all reads/writes go through the `StorageProvider` interface (`src/lib/backends/types.ts`); `src/lib/backends/supabase/` is the only implementation. Components never import the Supabase client directly (except AuthContext for auth).
- **Realtime:** `postgres_changes` subscriptions on `albums` and `reveals` (no polling).
- **GitHub API:** used only for optional Jekyll blog publishing (`PublishButton.tsx` → `src/lib/github/files.ts`, `createCommitOnBranch` GraphQL mutation). Each member's publish PAT is stored in `member_settings`.

**Database tables** (schema in `supabase/setup/001_initial.sql`, RLS in `002_rls.sql`, realtime publication in `003_realtime.sql`):

| Table | Purpose | Access (RLS) |
|---|---|---|
| `members` | club roster | all members read; own row insert/update |
| `albums` | one row per album, `is_current` flags the active one | members read/write/delete |
| `tags`, `notes` | per-user per-album, private until reveal | own rows always; others' rows only once `is_revealed(album_id)` |
| `reveals` | reveal events | members read; insert own only |
| `discussions` | merged post-reveal snapshot, permanent record | members read; insert/update |
| `wishlists`, `member_settings` | per-user | own row only |

## Reveal Flow

1. Any member clicks Reveal → row inserted into `reveals` (this unmasks everyone — first reveal wins)
2. Other clients learn of it via the realtime subscription (`useRealtimeReveal`)
3. Each client checks for an existing discussion; if none, reads all members' tags+notes (readable now via `is_revealed`), merges via `merger.ts`, and writes the snapshot with `createDiscussion` (insert-if-absent, first writer wins — see `DiscussionPage.tsx`)
4. A merge aborts if any member fetch fails, so a flaky client can't persist a partial snapshot

## Key Source Files

| File | Purpose |
|---|---|
| `src/lib/backends/types.ts` | `StorageProvider` / `RealtimeProvider` interfaces |
| `src/lib/backends/supabase/storage.ts` | All Supabase table access |
| `src/lib/backends/supabase/realtime.ts` | `postgres_changes` subscriptions |
| `src/lib/auth/AuthContext.tsx` | Session + member state, sign out |
| `src/lib/merge/merger.ts` | Merges all members' tags+notes into a discussion object |
| `src/lib/merge/jekyll.ts` | Discussion → Jekyll Markdown post (templates, YAML escaping) |
| `src/lib/github/files.ts` | `commitFiles()` via GraphQL — Jekyll publishing only |
| `src/lib/musicbrainz/` | Album/artist search + release lookup |
| `src/constants/config.ts` | API URLs, MusicBrainz rate-limit/debounce constants |
| `src/App.tsx` | Root layout, routing, auth gating, member roster loading |

## Important Patterns

- **MusicBrainz:** 1.1s rate limit enforced in `musicbrainz/client.ts`; 500ms debounce on search input
- **Album swap:** `setCurrentAlbum` deletes the previous current album unless it has a discussion (prevents abandoned albums accumulating)
- **TypeScript strict mode:** `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` are all on
- **ESLint:** classic config (`.eslintrc.cjs`), ESLint 8 + typescript-eslint 7 + react-hooks; runs in CI before tests

## Deployment

CI (`.github/workflows/deploy.yml`) runs on push to `main`: lint → tests → build → copy `dist/` to the GitHub Pages repo (`ginn5j/ginn5j.github.io`, directory `album-club`). `VITE_BASE_URL=/album-club` sets the Vite base path; `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` come from repo secrets.
