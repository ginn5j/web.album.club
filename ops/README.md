# Ops: Supabase keep-alive and backups

Two LaunchAgents for an always-on Mac that is logged in. They're LaunchAgents rather than
LaunchDaemons because they need the login keychain.

| Job | Schedule | What it does |
|---|---|---|
| `local.album-club.keepalive` | daily 09:00 | Sends a REST request to Supabase if the last successful one was 6+ days ago, so the free plan's 7-day inactivity pause never triggers |
| `local.album-club.backup` | daily 03:30 | `pg_dump` of the `public` and `auth` schemas to `~/Backups/album-club/`, keeping 30 days |

## Setup

```bash
brew install libpq                       # pg_dump (also brew install postgresql@17 to test restores)
ops/install.sh                           # copies scripts, writes ~/.config/album-club/album-club.env, loads agents
security add-generic-password -s album-club -a DATABASE_URL -w   # prompts; paste the Session pooler URI
```

Then fill in `SUPABASE_URL` (no `/rest/v1/` suffix) and `SUPABASE_ANON_KEY` in
`~/.config/album-club/album-club.env`, and test both jobs:

```bash
~/.config/album-club/keepalive.sh && ~/.config/album-club/backup.sh
```

The Session pooler URI comes from the Supabase dashboard under Connect → Session pooler.
Use it rather than the direct connection, which is IPv6-only. Percent-encode any `@ : / ? # % [ ]`
in the password.

Re-run `ops/install.sh` after changing anything in `ops/`. The jobs run the copies in
`~/.config/album-club/`, not the repo, so switching branches doesn't change what runs.

## Notes

- **The keep-alive expects a 401.** `anon` has no grant on `albums`, so the request comes back
  as a 401 carrying Postgres error `42501`. That response still means the request reached the
  database, so the script counts it as a success. Don't grant `anon` access to make it a 200.
  If that grant ever changes, update the check in `keepalive.sh`.
- **Failures are logged, not alerted.** Logs are `~/.config/album-club/{keepalive,backup}.log`.
- **Backups stay on the Mac.** Copy `~/Backups/album-club/` elsewhere if you need to survive
  losing the machine.
- **Restoring:** see [RESTORE.md](RESTORE.md).
