# Restoring an Album Club backup

Dumps are in `~/Backups/album-club/` (pg_dump custom format, `public` + `auth` schemas,
`--no-owner --no-privileges`). Restore was tested on 2026-11-19 into a local Postgres 17
cluster: row counts matched live, along with all 20 RLS policies, RLS enabled on all 8
tables, and the `albums_cleanup` trigger.

## Scratch restore (for inspection)

```bash
B=/opt/homebrew/opt/postgresql@17/bin; P=/opt/homebrew/opt/libpq/bin
export PGHOST=127.0.0.1 PGPORT=55432 PGUSER=postgres
$B/initdb -D /tmp/ac-pg -U postgres -A trust
$B/pg_ctl -D /tmp/ac-pg -o "-c listen_addresses=127.0.0.1 -c port=55432 -c unix_socket_directories=''" -l /tmp/ac-pg.log -w start
$B/psql -c "create database scratch" -c "create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;"
$B/psql -d scratch -c "drop schema public"   # the dump recreates it
$P/pg_restore -d scratch --no-owner --no-privileges --exit-on-error ~/Backups/album-club/<file>.dump
# ...inspect...
$B/pg_ctl -D /tmp/ac-pg -m fast stop && rm -rf /tmp/ac-pg /tmp/ac-pg.log
```

## Gotchas

- `drop schema public` first, or the restore fails on `CREATE SCHEMA public`.
- The `anon` / `authenticated` / `service_role` roles must exist (RLS policies reference them).
- The dump has no grants (`--no-privileges`). Restoring onto a *new Supabase project* means
  restoring data into a project whose roles and grants Supabase already manages, so
  re-apply `supabase/setup/*.sql` grants (e.g. `005_role_protection.sql`) and check access.
  That path has not been tested.
