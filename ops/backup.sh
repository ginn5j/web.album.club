#!/bin/bash
# Nightly pg_dump of the public and auth schemas; keeps 30 days of dumps.
set -euo pipefail
D="$HOME/.config/album-club"
OUT="$HOME/Backups/album-club"
source "$D/album-club.env"
DATABASE_URL=$(/usr/bin/security find-generic-password -s album-club -a DATABASE_URL -w)
file="$OUT/album-club-$(date +%Y-%m-%d).dump"
/opt/homebrew/opt/libpq/bin/pg_dump "$DATABASE_URL" -Fc --no-owner --no-privileges \
  -n public -n auth -f "$file.partial"
mv "$file.partial" "$file"
echo "$(date -Iseconds) wrote $file ($(du -h "$file" | cut -f1))"
/usr/bin/find "$OUT" -name 'album-club-*.dump' -mtime +30 -delete
