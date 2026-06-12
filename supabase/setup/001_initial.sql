-- Members (populated during onboarding after first sign-in)
CREATE TABLE members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  role         text NOT NULL DEFAULT 'member',
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Albums (one row per album; is_current marks the active one)
CREATE TABLE albums (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id    text UNIQUE NOT NULL,
  source      text NOT NULL DEFAULT 'musicbrainz',
  album_info  jsonb NOT NULL,
  songs       jsonb NOT NULL DEFAULT '[]',
  selected_at timestamptz NOT NULL DEFAULT now(),
  selected_by uuid REFERENCES auth.users(id),
  is_current  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Only one current album at a time
CREATE UNIQUE INDEX albums_one_current ON albums (is_current) WHERE is_current = true;

-- Per-user per-album song tags (private until reveal)
CREATE TABLE tags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  album_id   text NOT NULL,
  tags       jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, album_id)
);

-- Per-user per-album notes (private until reveal)
CREATE TABLE notes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  album_id   text NOT NULL,
  content    text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, album_id)
);

-- Reveal events
CREATE TABLE reveals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  album_id    text NOT NULL,
  revealed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, album_id)
);

-- Merged discussions (written once after first reveal)
CREATE TABLE discussions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id   text UNIQUE NOT NULL,
  data       jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Per-user wishlist
CREATE TABLE wishlists (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  items      jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Per-user settings (Jekyll publish config)
CREATE TABLE member_settings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  publish_pat       text,
  output_owner      text,
  output_repo       text,
  output_posts_path text DEFAULT '_posts',
  output_branch     text DEFAULT 'main',
  output_template   text,
  updated_at        timestamptz NOT NULL DEFAULT now()
);
