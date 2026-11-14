-- Cover art capture: publishing commits the album cover into the blog repo
-- next to the post, under this per-member folder ({{variable}} templates as in
-- output_posts_path). An empty string turns capture off and the post keeps
-- linking to the remote cover URL.
--
-- For existing deployments this must be applied manually in the Supabase SQL
-- editor. Until it is, publishing still works (the app falls back to the
-- default path below), but saving Settings fails because the upsert names a
-- column that does not exist yet.

ALTER TABLE member_settings
  ADD COLUMN IF NOT EXISTS output_assets_path text DEFAULT 'assets/{{year}}/album-club';
