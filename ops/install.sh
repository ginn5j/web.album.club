#!/bin/bash
# Installs the Supabase keep-alive and backup jobs as LaunchAgents for the current user.
# Safe to re-run after changing anything in ops/: it copies the scripts, re-renders the
# plists and reloads both agents. Never touches album-club.env once it exists.
set -euo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)"
D="$HOME/.config/album-club"
AGENTS="$HOME/Library/LaunchAgents"
DOMAIN="gui/$(id -u)"

mkdir -p "$D" "$HOME/Backups/album-club" "$AGENTS"
install -m 755 "$SRC/keepalive.sh" "$SRC/backup.sh" "$D/"
install -m 644 "$SRC/RESTORE.md" "$D/"
if [[ ! -e "$D/album-club.env" ]]; then
  install -m 600 "$SRC/album-club.env.example" "$D/album-club.env"
  echo "Created $D/album-club.env: fill in SUPABASE_URL and SUPABASE_ANON_KEY."
fi

for job in keepalive backup; do
  label="local.album-club.$job"
  sed "s|__HOME__|$HOME|g" "$SRC/launchd/$label.plist" > "$AGENTS/$label.plist"
  plutil -lint -s "$AGENTS/$label.plist"
  launchctl bootout "$DOMAIN/$label" 2>/dev/null || true
  launchctl bootstrap "$DOMAIN" "$AGENTS/$label.plist"
  echo "Loaded $label"
done

[[ -x /opt/homebrew/opt/libpq/bin/pg_dump ]] || echo "Missing pg_dump: brew install libpq"
security find-generic-password -s album-club -a DATABASE_URL >/dev/null 2>&1 \
  || echo "Missing keychain item: security add-generic-password -s album-club -a DATABASE_URL -w"
