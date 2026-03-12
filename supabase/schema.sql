-- ════════════════════════════════════════════════════════
--  Knowledge Orbit v2 — Full Database Schema
--  Project: iqbsxrxlexplcaqixggy (ap-southeast-1)
--  Run in Supabase SQL Editor → New Query
-- ════════════════════════════════════════════════════════


-- ── Extensions ───────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pg_trgm";


-- ── Enums ────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE post_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('reader', 'writer', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ad_program AS ENUM ('amazon', 'cashkaro', 'cred_upi', 'custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ad_type AS ENUM ('inline', 'banner', 'end_of_post', 'sidebar');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ad_event_type AS ENUM ('impression', 'click');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── Phase 1: Core Tables ─────────────────────────────────

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username     text UNIQUE NOT NULL,
  full_name    text,
  avatar_url   text,
  bio          text,
  website      text,
  role         user_role NOT NULL DEFAULT 'reader',
  created_at   timestamptz DEFAULT now()
);

-- Series
CREATE TABLE IF NOT EXISTS series (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id    uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title        text NOT NULL,
  description  text,
  slug         text UNIQUE NOT NULL,
  created_at   timestamptz DEFAULT now()
);

-- Posts
CREATE TABLE IF NOT EXISTS posts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id          uuid REFERENCES profiles(id) ON DELETE CASCADE,
  series_id          uuid REFERENCES series(id) ON DELETE SET NULL,
  title              text NOT NULL,
  slug               text UNIQUE NOT NULL,
  content            jsonb,
  cover_image_url    text,
  excerpt            text,
  status             post_status NOT NULL DEFAULT 'draft',
  reading_time_mins  int DEFAULT 1,
  published_at       timestamptz,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now(),
  search_vector      tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(excerpt, ''))
  ) STORED
);

CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_search ON posts USING gin(search_vector);

-- Tags
CREATE TABLE IF NOT EXISTS tags (
  id    serial PRIMARY KEY,
  name  text UNIQUE NOT NULL,
  slug  text UNIQUE NOT NULL
);

-- Post Tags (junction)
CREATE TABLE IF NOT EXISTS post_tags (
  post_id  uuid REFERENCES posts(id) ON DELETE CASCADE,
  tag_id   int REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- Likes
CREATE TABLE IF NOT EXISTS likes (
  id         serial PRIMARY KEY,
  post_id    uuid REFERENCES posts(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (post_id, user_id)
);


-- ── Phase 2: Ad System ───────────────────────────────────

CREATE TABLE IF NOT EXISTS ads (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  type             ad_type NOT NULL,
  program          ad_program NOT NULL DEFAULT 'custom',
  image_url        text,
  link_url         text NOT NULL,
  cta_text         text DEFAULT 'Learn More',
  description      text,
  rotation_weight  int NOT NULL DEFAULT 5 CHECK (rotation_weight BETWEEN 1 AND 10),
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ad_events (
  id          bigserial PRIMARY KEY,
  ad_id       uuid REFERENCES ads(id) ON DELETE CASCADE,
  event_type  ad_event_type NOT NULL,
  post_slug   text,
  session_id  text,
  referrer    text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_events_ad_id ON ad_events(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_events_created_at ON ad_events(created_at);


-- ── Phase 3: Analytics ───────────────────────────────────

CREATE TABLE IF NOT EXISTS page_views (
  id               bigserial PRIMARY KEY,
  post_id          uuid REFERENCES posts(id) ON DELETE SET NULL,
  path             text NOT NULL,
  referrer         text,
  referrer_source  text,
  device_type      text,
  session_id       text,
  country          text,
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(path);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_session ON page_views(session_id);


-- ── Trigger: auto-create profile on signup ───────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'preferred_username',
      LOWER(REGEXP_REPLACE(COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), '[^a-z0-9]', '', 'g'))
    ),
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ── Row Level Security ───────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE series ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "public read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Series
CREATE POLICY "public read series" ON series FOR SELECT USING (true);
CREATE POLICY "authors manage own series" ON series FOR ALL USING (auth.uid() = author_id);

-- Posts
CREATE POLICY "public read published posts" ON posts FOR SELECT
  USING (status = 'published' OR auth.uid() = author_id);
CREATE POLICY "authors insert posts" ON posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "authors update own posts" ON posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "authors delete own posts" ON posts FOR DELETE USING (auth.uid() = author_id);
CREATE POLICY "admin all posts" ON posts FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Tags
CREATE POLICY "public read tags" ON tags FOR SELECT USING (true);
CREATE POLICY "authed users insert tags" ON tags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Post Tags
CREATE POLICY "public read post_tags" ON post_tags FOR SELECT USING (true);
CREATE POLICY "authors manage own post_tags" ON post_tags FOR ALL
  USING (EXISTS (SELECT 1 FROM posts WHERE id = post_id AND author_id = auth.uid()));

-- Likes
CREATE POLICY "public read likes" ON likes FOR SELECT USING (true);
CREATE POLICY "authed users insert likes" ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "authed users delete own likes" ON likes FOR DELETE USING (auth.uid() = user_id);

-- Ads
CREATE POLICY "public read active ads" ON ads FOR SELECT USING (is_active = true);
CREATE POLICY "admin all ads" ON ads FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Ad Events
CREATE POLICY "anon insert ad events" ON ad_events FOR INSERT WITH CHECK (true);
CREATE POLICY "admin read ad events" ON ad_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Page Views
CREATE POLICY "anon insert page views" ON page_views FOR INSERT WITH CHECK (true);
CREATE POLICY "admin read page views" ON page_views FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));


-- ── Analytics Views ──────────────────────────────────────

CREATE OR REPLACE VIEW daily_views AS
SELECT
  date_trunc('day', created_at) AS day,
  COUNT(*) AS views,
  COUNT(DISTINCT session_id) AS unique_visitors
FROM page_views
WHERE created_at > now() - interval '90 days'
GROUP BY 1
ORDER BY 1;

CREATE OR REPLACE VIEW top_posts_by_views AS
SELECT
  path,
  COUNT(*) AS views,
  COUNT(DISTINCT session_id) AS unique_visitors
FROM page_views
WHERE path LIKE '/posts/%'
GROUP BY path
ORDER BY views DESC
LIMIT 50;

CREATE OR REPLACE VIEW ad_performance AS
SELECT
  a.id,
  a.name,
  a.type,
  a.program,
  COUNT(*) FILTER (WHERE e.event_type = 'impression') AS impressions,
  COUNT(*) FILTER (WHERE e.event_type = 'click') AS clicks,
  ROUND(
    COUNT(*) FILTER (WHERE e.event_type = 'click')::numeric /
    NULLIF(COUNT(*) FILTER (WHERE e.event_type = 'impression'), 0) * 100, 2
  ) AS ctr_percent
FROM ads a
LEFT JOIN ad_events e ON e.ad_id = a.id
GROUP BY a.id, a.name, a.type, a.program;
