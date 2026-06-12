-- drop_invites.sql
--
-- One-time cleanup for deployments created before the invites table was
-- removed from the schema. The in-app invite flow was never wired up;
-- new-member admission is handled by the Supabase Auth "Disable new user
-- signups" setting plus admin-console invites instead.
--
-- Fresh installs don't need this — setup/001_initial.sql no longer creates
-- the table.

DROP TABLE IF EXISTS invites;
