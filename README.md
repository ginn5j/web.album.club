# Album Club

A small-group music listening club app — like a book club, but for albums. Members privately tag songs and write notes while listening, then reveal everyone's choices simultaneously when ready to discuss. Completed discussions can be published to each member's Jekyll-based GitHub Pages site.

Fully static. No server, no database, no OAuth. The app runs entirely in the browser and uses a shared GitHub repository as its backend via the GitHub API.

**Live app:** https://album-club.github.io/web.album.club *(update with your deployment URL)*

---

## How it works

1. Any member picks the current album (searched via MusicBrainz or entered manually)
2. Each member privately tags each song — **Starter** (would open a playlist), **Bench** (solid track), or **Cut** (would skip) — and writes notes
3. When ready to discuss, any member clicks **Reveal** — all choices are unmasked simultaneously for everyone
4. The merged discussion is saved as a permanent record
5. Members can optionally publish any discussion to their own Jekyll blog

---

## Repository setup

The app stores data in a separate GitHub repository (the "club repo", e.g. `album-club`). All club members need read/write access to it.

### Branch layout

| Branch | Contents |
|--------|----------|
| `main` | Shared state: `settings/members.json`, `current-album.json`, `discussions/` |
| `{username}` | Per-member private data: `settings.json`, `tags/`, `notes/`, `wishlist.json`, `reveal.json` |

Member branches are created automatically by the app on first write.

### Shared data (`main` branch)

```
settings/
  members.json          # Club member list
current-album.json      # Currently selected album
discussions/
  {albumId}.json        # One file per completed discussion
```

### Per-member data (`{username}` branch)

```
settings.json           # Display name, optional Jekyll output config
tags/
  {albumId}.json        # Private song tags
notes/
  {albumId}.json        # Private notes
wishlist.json           # Personal future album list
reveal.json             # Written when this member triggers reveal
```

### `settings/members.json`

Add an entry here for each club member. Creating the branch is handled by the app.

```json
{
  "members": [
    { "login": "alice", "name": "Alice Smith", "branch": "alice" },
    { "login": "bob",   "name": "Bob Jones",   "branch": "bob" }
  ]
}
```

---

## Authentication

The app authenticates to GitHub using a Personal Access Token (PAT) entered in Settings and stored in `localStorage`. There are two options depending on how your club repo is hosted.

### Option A — Fine-grained PAT *(recommended, narrower scope)*

Requires the club repo to be owned by a **GitHub organization** that all members belong to. Fine-grained tokens can only be scoped to repos owned by the token creator or an org they're a member of.

1. Create a free GitHub organization and invite all members
2. In the org: Settings → Personal access tokens → Allow fine-grained personal access tokens
3. Each member: GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token
   - Resource owner: **your shared organization**
   - Repository access: Only select repositories → `album-club`
   - Permissions: Contents → Read and write

### Option B — Classic PAT *(simpler setup, broader scope)*

Works when the club repo is owned by an individual user who adds all members as collaborators (repo Settings → Collaborators). The `repo` scope grants access to all repos the user can access, not just the club repo — keep the token safe.

1. Repo owner adds each member as a collaborator
2. Each member: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Select the **`repo`** scope

### Publishing PAT (optional, Option A users only)

If you use a fine-grained org token (Option A) and want to publish discussions to your personal Jekyll site, you need a second fine-grained PAT scoped to your personal blog repo. Configure it in the app's Settings → Blog Output section. Option B (classic PAT) users don't need this — the `repo` scope already covers personal repos.

---

## First-time setup

1. Create the club repo and add `settings/members.json` to `main` (see format above)
2. Each member opens the app, goes to **Settings**, and enters:
   - GitHub PAT
   - Their GitHub login
   - Repo owner (org name or individual username)
   - Repo name (e.g. `album-club`)
3. Click **Test Connection** to verify access — the app reads `settings/members.json` to confirm
4. Optionally configure Blog Output (Jekyll publishing)

---

## Features

### Album picker
- Search MusicBrainz by title/artist; track list and cover art are fetched automatically
- Manual entry for albums not in MusicBrainz
- Any member can pick the current album at any time; other members see a notification within 30 seconds

### Tagging & notes
- Each song can be tagged **Starter / Bench / Cut** (or left untagged)
- Freeform notes with auto-save (2-second debounce)
- All data stored privately on the member's own branch until reveal

### Discussion reveal
- Either member can trigger the reveal from `/discuss`
- Reveal writes `reveal.json` to the triggering member's branch
- All open clients detect the reveal within the poll interval (30s) and unmask simultaneously
- The merged discussion is written to `discussions/{albumId}.json` on `main`

### Past discussions
- Full archive of completed discussions at `/discussions`
- Any entry can be viewed, edited, or published at any time
- Back-entry form to add past discussions without going through the live reveal flow

### Wishlist
- Each member maintains a private list of albums to suggest for future discussion
- Wishlist items can be promoted directly to the current album

### Jekyll publishing
- Generates a Jekyll-compatible Markdown post from any discussion entry
- Writes to the configured output repo; re-publishing updates the existing file rather than creating a duplicate
- Front matter includes title, artist, release year, genre, members, picker, cover art URL, and MusicBrainz ID

---

## Tech stack

| Concern | Library |
|---------|---------|
| UI | React 18 + TypeScript + Tailwind CSS |
| Routing | React Router v6 |
| GitHub reads | `@octokit/rest` (REST, ETag caching) |
| GitHub writes | `@octokit/graphql` — `createCommitOnBranch` mutation (commits are GPG-signed by GitHub → **Verified**) |
| Music metadata | MusicBrainz API (free, no key required) |
| Cover art | Cover Art Archive |
| Hosting | GitHub Pages (GitHub Actions deploy on push to `main`) |

---

## Building and running

Node.js 18+ and npm required.

```sh
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Production build (output to dist/)
npm run build

# Preview production build locally
npm run preview
```

### Deploying to GitHub Pages

Push to `main` — the GitHub Actions workflow in `.github/workflows/deploy.yml` builds and deploys automatically.

Before first deploy, enable Pages in the repo settings: **Settings → Pages → Source: GitHub Actions**.

The build uses `VITE_BASE_URL=/web.album.club` as the base path. Update this in `deploy.yml` if your repo is named differently.

---

## Project structure

```
src/
├── types/               # TypeScript interfaces (album, member, discussion, wishlist)
├── constants/config.ts  # API URLs, poll intervals, file path helpers
├── lib/
│   ├── github/          # Octokit client; branch-aware read (ETag) and write (GraphQL)
│   ├── musicbrainz/     # Rate-limited fetch, search, release lookup
│   ├── storage/         # Per-concern read/write helpers (album, tags, notes, etc.)
│   ├── merge/           # Discussion merger; Jekyll post generator
│   └── settings.ts      # localStorage helpers
├── hooks/               # React hooks for all data-fetching and polling concerns
├── pages/               # Route-level page components
└── components/          # Shared UI components
```

---

## Notes on privacy

Member branches are not access-controlled at the GitHub level — anyone with a PAT for the repo can read any branch. Privacy before reveal is enforced by the app UI, not by GitHub permissions. If strict pre-reveal privacy is a requirement, this architecture is not suitable.
