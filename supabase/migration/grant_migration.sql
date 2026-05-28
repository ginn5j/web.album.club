-- grant_migration.sql
--
-- Run this in the Supabase SQL Editor BEFORE using the /migrate admin page.
-- It gives the service_role key write access to all tables so the migration
-- can insert data on behalf of any member (bypassing the per-user RLS policies).
--
-- After the migration completes, run revoke_migration.sql to remove these
-- privileges — the app itself never uses the service_role key.

GRANT SELECT, INSERT, UPDATE          ON members         TO service_role;
GRANT SELECT, INSERT, UPDATE          ON invites         TO service_role;
GRANT SELECT, INSERT, UPDATE          ON albums          TO service_role;
GRANT SELECT, INSERT, UPDATE          ON tags            TO service_role;
GRANT SELECT, INSERT, UPDATE          ON notes           TO service_role;
GRANT SELECT, INSERT                  ON reveals         TO service_role;
GRANT SELECT, INSERT, UPDATE          ON discussions     TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE  ON wishlists       TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE  ON member_settings TO service_role;
