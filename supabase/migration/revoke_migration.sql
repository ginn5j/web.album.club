-- revoke_migration.sql
--
-- Run this in the Supabase SQL Editor AFTER the /migrate page shows all
-- green checks and you have verified the data in Supabase.
--
-- Removes the service_role table grants added by grant_migration.sql.
-- The running app only uses the anon key (authenticated role) so these
-- privileges are not needed during normal operation.

REVOKE ALL ON members         FROM service_role;
REVOKE ALL ON albums          FROM service_role;
REVOKE ALL ON tags            FROM service_role;
REVOKE ALL ON notes           FROM service_role;
REVOKE ALL ON reveals         FROM service_role;
REVOKE ALL ON discussions     FROM service_role;
REVOKE ALL ON wishlists       FROM service_role;
REVOKE ALL ON member_settings FROM service_role;
