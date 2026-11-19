#!/bin/bash
# Runs daily; only hits Supabase when the last successful hit is >= 6 days old,
# so the 7-day free-plan pause never triggers even if a run or two is missed.
set -euo pipefail
D="$HOME/.config/album-club"
source "$D/album-club.env"
STATE="$D/keepalive.last"
MAX_AGE=$((6 * 86400))
now=$(date +%s)
last=$(cat "$STATE" 2>/dev/null || echo 0)
if (( now - last < MAX_AGE )); then
  echo "$(date -Iseconds) skip: last hit $(( (now - last) / 3600 ))h ago"
  exit 0
fi
resp=$(/usr/bin/curl -sS -w '\n%{http_code}' --retry 5 --retry-delay 30 --retry-all-errors \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  "$SUPABASE_URL/rest/v1/albums?select=id&limit=1")
code=${resp##*$'\n'}
# anon has no grant on albums, so a 401 with Postgres error 42501 means the
# request reached the database, which is all the keep-alive needs.
if [[ "$code" == 2* || ( "$code" == 401 && "$resp" == *\"42501\"* ) ]]; then
  echo "$now" > "$STATE"
  echo "$(date -Iseconds) hit ok ($code)"
else
  echo "$(date -Iseconds) hit FAILED ($code)" >&2
  exit 1
fi
