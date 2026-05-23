ALTER TABLE members         ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites         ENABLE ROW LEVEL SECURITY;
ALTER TABLE albums          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags            ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE reveals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists       ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_settings ENABLE ROW LEVEL SECURITY;

-- Helper: is the caller a club member?
CREATE FUNCTION is_member() RETURNS boolean LANGUAGE sql SECURITY DEFINER AS
  $$ SELECT EXISTS (SELECT 1 FROM members WHERE user_id = auth.uid()) $$;

-- Helper: has the given album been revealed by anyone?
CREATE FUNCTION is_revealed(p_album_id text) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS
  $$ SELECT EXISTS (SELECT 1 FROM reveals WHERE album_id = p_album_id) $$;

-- members: own row always visible (so onboarding can detect new users); all members see all rows
CREATE POLICY "members_select" ON members FOR SELECT USING (user_id = auth.uid() OR is_member());
CREATE POLICY "members_insert" ON members FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "members_update" ON members FOR UPDATE USING (user_id = auth.uid());

-- invites: admins create; members read all; unauthenticated can read by token (for acceptance)
CREATE POLICY "invites_admin_insert" ON invites FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM members WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "invites_select" ON invites FOR SELECT
  USING (invited_by = auth.uid() OR is_member());
CREATE POLICY "invites_update" ON invites FOR UPDATE USING (is_member());

-- albums: all members read; any member can insert/update
CREATE POLICY "albums_select" ON albums FOR SELECT USING (is_member());
CREATE POLICY "albums_insert" ON albums FOR INSERT WITH CHECK (is_member());
CREATE POLICY "albums_update" ON albums FOR UPDATE USING (is_member());

-- tags: own row always visible; others' rows only after reveal
CREATE POLICY "tags_select" ON tags FOR SELECT
  USING (user_id = auth.uid() OR is_revealed(album_id));
CREATE POLICY "tags_insert" ON tags FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_member());
CREATE POLICY "tags_update" ON tags FOR UPDATE USING (user_id = auth.uid());

-- notes: same as tags
CREATE POLICY "notes_select" ON notes FOR SELECT
  USING (user_id = auth.uid() OR is_revealed(album_id));
CREATE POLICY "notes_insert" ON notes FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_member());
CREATE POLICY "notes_update" ON notes FOR UPDATE USING (user_id = auth.uid());

-- reveals: all members read (needed to detect that a reveal happened); write own only
CREATE POLICY "reveals_select" ON reveals FOR SELECT USING (is_member());
CREATE POLICY "reveals_insert" ON reveals FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_member());

-- discussions: all members read; any member can insert/update (merger writes it)
CREATE POLICY "discussions_select" ON discussions FOR SELECT USING (is_member());
CREATE POLICY "discussions_insert" ON discussions FOR INSERT WITH CHECK (is_member());
CREATE POLICY "discussions_update" ON discussions FOR UPDATE USING (is_member());

-- wishlists: private, own row only
CREATE POLICY "wishlists_own" ON wishlists FOR ALL USING (user_id = auth.uid());

-- member_settings: private, own row only
CREATE POLICY "member_settings_own" ON member_settings FOR ALL USING (user_id = auth.uid());
