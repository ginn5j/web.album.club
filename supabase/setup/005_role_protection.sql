-- Role-escalation fix from the July 2026 code review.
--
-- For existing deployments this must be applied manually in the Supabase SQL
-- editor (the app works without it, but the fix below won't be in effect).
--
-- The members RLS policies restrict which ROWS a user can insert/update
-- (their own), but not which COLUMNS — so any authenticated user could set
-- role = 'admin' on their own row with a direct PostgREST call, both during
-- onboarding (INSERT) and afterwards (UPDATE). Nothing in the app gates on
-- role yet, but the column is meant to be trusted (admins are promoted via
-- SQL, see README).
--
-- Restrict the grants to the columns onboarding actually writes; role then
-- always comes from the table default ('member'). The app's upsertMember was
-- updated to stop sending role explicitly.

REVOKE INSERT, UPDATE ON members FROM authenticated;
GRANT INSERT (user_id, display_name), UPDATE (display_name) ON members TO authenticated;
