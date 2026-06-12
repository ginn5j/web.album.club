-- Hardening fixes from the June 2026 code review.
--
-- For existing deployments this must be applied manually in the Supabase SQL
-- editor (the app works without it, but the fixes below won't be in effect).

-- Pin search_path on the SECURITY DEFINER helpers so a malicious object in
-- another schema can't shadow the tables they read (Supabase linter 0011).
ALTER FUNCTION is_member() SET search_path = public, pg_temp;
ALTER FUNCTION is_revealed(text) SET search_path = public, pg_temp;

-- is_revealed() is called per-row by the tags/notes SELECT policies, and the
-- only existing index on reveals is (user_id, album_id) — unusable for an
-- album_id-only lookup.
CREATE INDEX IF NOT EXISTS reveals_album_id_idx ON reveals (album_id);

-- Discussions key each member's tags/notes by display name, so two members
-- with the same name would silently merge into one entry in the permanent
-- snapshot. The app maps the 23505 error to a friendly onboarding message.
CREATE UNIQUE INDEX IF NOT EXISTS members_display_name_unique
  ON members (lower(display_name));

-- tags/notes/reveals rows key on albums.album_id with no FK, so deleting an
-- abandoned album (album swap without a discussion) left its per-user rows
-- behind forever. Clean them up via trigger; SECURITY DEFINER because members
-- have no DELETE grant on these tables.
CREATE FUNCTION cleanup_album_rows() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  DELETE FROM tags    WHERE album_id = OLD.album_id;
  DELETE FROM notes   WHERE album_id = OLD.album_id;
  DELETE FROM reveals WHERE album_id = OLD.album_id;
  RETURN OLD;
END $$;

CREATE TRIGGER albums_cleanup
  AFTER DELETE ON albums
  FOR EACH ROW EXECUTE FUNCTION cleanup_album_rows();
