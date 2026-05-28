-- Enable Supabase Realtime for the tables that the app subscribes to.
--
-- By default new tables are not added to the supabase_realtime publication.
-- Without this, postgres_changes subscriptions in the browser receive no
-- events even though the channel connects successfully.
--
--   albums  → useRealtimeAlbum  (new album picked notification)
--   reveals → useRealtimeReveal (simultaneous reveal for all members)

ALTER PUBLICATION supabase_realtime ADD TABLE albums;
ALTER PUBLICATION supabase_realtime ADD TABLE reveals;
