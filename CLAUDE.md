# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev           # Dev server at http://localhost:5173
npm run build         # tsc + vite build → dist/
npm run lint          # ESLint on src/**/*.{ts,tsx}
npm test              # Vitest (single run, CI mode)
npm run test:watch    # Vitest watch mode
npm run test:coverage # Vitest with v8 coverage (text + lcov)

# Run a single test file:
npx vitest run src/lib/merge/__tests__/merger.test.ts
```

**Node.js is not installed on this machine.** Do not attempt to run `npm install`, `npm run`, `npx`, or `tsc` locally. All CI runs on GitHub Actions.

## Architecture

Album Club is a serverless SPA where small groups listen to music together. Members privately tag songs and write notes; all data is revealed simultaneously.

**Data model:**
- One GitHub repo (`album-club`): `main` branch = shared state, `{username}` branch = private per-member data
- Auth: Fine-grained GitHub PAT per user, stored in `localStorage`
- No backend — all reads/writes go directly to the GitHub API from the browser

**Key data files in the `album-club` repo:**
- `current-album.json` on `main` — active album, single source of truth
- `tags/{albumId}.json` and `notes/{albumId}.json` on user branch — private until reveal
- `reveal.json` on user branch — written when user triggers simultaneous reveal
- `discussions/{albumId}.json` on `main` — permanent post-reveal record

## Key Source Files

| File | Purpose |
|---|---|
| `src/constants/config.ts` | All API URLs, poll intervals, path helpers (e.g. `tagsPath`, `notesPath`) |
| `src/lib/settings.ts` | `localStorage` accessors: `pat`, `myLogin`, `repoOwner`, `repoName` |
| `src/lib/github/client.ts` | Octokit REST + GraphQL singletons keyed by PAT |
| `src/lib/github/files.ts` | `readFile()` with ETag caching; `commitFiles()` via GraphQL |
| `src/lib/merge/merger.ts` | Merges all members' tags+notes into a discussion object |
| `src/lib/merge/jekyll.ts` | Converts discussion → Jekyll Markdown post for the output repo |
| `src/App.tsx` | Root layout, routing, album polling, member loading on startup |

## Write Pattern

All writes use the `createCommitOnBranch` GraphQL mutation (GPG-signed, branch-aware). HEAD OID is cached per branch. On a conflict (stale OID): clear cache and retry once. Multiple files can be committed atomically in a single mutation call.

## Reveal Flow

1. User clicks Reveal → `reveal.json` written to their own branch
2. `useDiscussionState` hook polls every member branch's `reveal.json` via ETag (304s don't count against rate limit)
3. Once all reveals detected: reads all tags+notes, merges via `merger.ts`, writes `discussions/{albumId}.json` to `main`
4. Duplicate guard checks if discussion already exists before writing

## Important Patterns

- **ETag caching:** `readFile(..., useEtag=true)` — returns cached content on 304, skipping rate-limit cost
- **UTF-8 base64:** `btoa(unescape(encodeURIComponent(content)))` for GitHub file encoding
- **MusicBrainz:** 1.1s rate limit enforced; 500ms debounce on search input
- **TypeScript strict mode:** `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` are all on

## Deployment

CI runs on push to `main`: tests → build → copy `dist/` to the GitHub Pages repo (`ginn5j/ginn5j.github.io`, directory `album-club`). The `VITE_BASE_URL=/album-club` env var sets the Vite base path.
