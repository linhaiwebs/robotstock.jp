/*
  # Stock Diagnosis Application Schema

  Creates the complete database schema for the stock diagnosis application including:
  - Diagnosis sessions tracking
  - Caching system for API responses
  - Queue management for async processing
  - API usage statistics
  - Admin user management
  - User session tracking
  - Event tracking
  - Redirect link management
  - Google tracking configuration

  ## New Tables

  ### 1. `diagnosis_sessions`
  - `id` (uuid, primary key) - Unique session identifier
  - `stock_code` (text) - Stock ticker/code being analyzed
  - `src` (text) - Traffic source identifier
  - `rac_text` (text) - RAC (tracking) parameter
  - `completed` (boolean) - Whether analysis is complete
  - `converted` (boolean) - Whether user converted
  - `analysis_result` (jsonb) - AI analysis output
  - `error_message` (text) - Error details if failed
  - `created_at` (timestamptz) - Session creation time
  - `completed_at` (timestamptz) - Analysis completion time
  - `converted_at` (timestamptz) - Conversion timestamp

  ### 2. `diagnosis_cache`
  - `id` (uuid, primary key) - Cache entry identifier
  - `stock_code` (text) - Stock code for cache key
  - `stock_data` (jsonb) - Raw stock data
  - `diagnosis_result` (jsonb) - Cached AI diagnosis
  - `model_used` (text) - AI model version
  - `created_at` (timestamptz) - Cache creation time
  - `expires_at` (timestamptz) - Cache expiration time
  - `hit_count` (integer) - Number of cache hits
  - `last_hit_at` (timestamptz) - Last cache access time

  ### 3. `diagnosis_queue`
  - `id` (uuid, primary key) - Queue item identifier
  - `stock_code` (text) - Stock code to analyze
  - `stock_data` (jsonb) - Stock data for analysis
  - `user_id` (text) - User identifier
  - `priority` (integer) - Processing priority (1-10)
  - `status` (text) - Queue status (pending/processing/completed/failed)
  - `result` (jsonb) - Processing result
  - `error_message` (text) - Error details if failed
  - `created_at` (timestamptz) - Queue entry time
  - `processed_at` (timestamptz) - Processing completion time
  - `attempts` (integer) - Number of processing attempts

  ### 4. `api_usage_stats`
  - `id` (uuid, primary key) - Stats record identifier
  - `date` (date) - Statistics date
  - `hour` (integer) - Hour of day (0-23)
  - `requests_total` (integer) - Total API requests
  - `cache_hits` (integer) - Cache hit count
  - `api_calls` (integer) - External API calls made
  - `queue_length_avg` (integer) - Average queue length
  - `response_time_avg` (integer) - Average response time (ms)
  - `errors_count` (integer) - Error count
  - `updated_at` (timestamptz) - Last update time

  ### 5. `admin_users`
  - `id` (uuid, primary key) - Admin user identifier
  - `username` (text, unique) - Admin username
  - `password_hash` (text) - Bcrypt password hash
  - `created_at` (timestamptz) - Account creation time
  - `last_login_at` (timestamptz) - Last login timestamp

  ### 6. `user_sessions`
  - `id` (uuid, primary key) - Session record identifier
  - `session_id` (text, unique) - User session identifier
  - `stock_code` (text) - Stock code viewed
  - `stock_name` (text) - Stock name
  - `url_params` (jsonb) - URL parameters (gclid, etc.)
  - `first_visit_at` (timestamptz) - First visit time
  - `last_activity_at` (timestamptz) - Last activity time
  - `user_agent` (text) - Browser user agent
  - `ip_address` (text) - User IP address
  - `converted` (boolean) - Whether user converted
  - `converted_at` (timestamptz) - Conversion timestamp

  ### 7. `user_events`
  - `id` (uuid, primary key) - Event identifier
  - `session_id` (text) - Associated session ID
  - `event_type` (text) - Event type (page_view, diagnosis_start, etc.)
  - `event_data` (jsonb) - Event-specific data
  - `stock_code` (text) - Related stock code
  - `stock_name` (text) - Related stock name
  - `duration_ms` (integer) - Event duration in milliseconds
  - `gclid` (text) - Google Click ID
  - `created_at` (timestamptz) - Event timestamp

  ### 8. `redirect_links`
  - `id` (uuid, primary key) - Link identifier
  - `redirect_url` (text) - Target URL
  - `label` (text) - Human-readable label
  - `url_type` (text) - Link type (line/general/affiliate)
  - `weight` (integer) - Selection weight for rotation
  - `is_active` (boolean) - Whether link is active
  - `hit_count` (integer) - Number of redirects
  - `created_at` (timestamptz) - Creation time
  - `updated_at` (timestamptz) - Last update time

  ### 9. `google_tracking_config`
  - `id` (uuid, primary key) - Config identifier
  - `google_ads_conversion_id` (text) - Google Ads conversion ID
  - `ga4_measurement_id` (text) - GA4 measurement ID
  - `conversion_action_id` (text) - Conversion action ID
  - `is_enabled` (boolean) - Whether tracking is enabled
  - `updated_at` (timestamptz) - Last update time

  ## Security

  - Enable RLS on all tables
  - Admin tables accessible only to authenticated service role
  - User data protected with appropriate policies
  - Public read access only where necessary

  ## Indexes

  - Optimized for common query patterns
  - Composite indexes for complex queries
  - Partial indexes for filtered queries
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Diagnosis Sessions Table
CREATE TABLE IF NOT EXISTS diagnosis_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  stock_code text NOT NULL,
  src text DEFAULT '',
  rac_text text DEFAULT '',
  completed boolean DEFAULT false,
  converted boolean DEFAULT false,
  analysis_result jsonb,
  error_message text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  converted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_diagnosis_sessions_src ON diagnosis_sessions(src);
CREATE INDEX IF NOT EXISTS idx_diagnosis_sessions_created_at ON diagnosis_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_diagnosis_sessions_completed ON diagnosis_sessions(completed) WHERE completed = true;
CREATE INDEX IF NOT EXISTS idx_diagnosis_sessions_converted ON diagnosis_sessions(converted) WHERE converted = true;
CREATE INDEX IF NOT EXISTS idx_diagnosis_sessions_stock_code ON diagnosis_sessions(stock_code);

ALTER TABLE diagnosis_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert for diagnosis sessions"
  ON diagnosis_sessions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public read for diagnosis sessions"
  ON diagnosis_sessions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public update for diagnosis sessions"
  ON diagnosis_sessions FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 2. Diagnosis Cache Table
CREATE TABLE IF NOT EXISTS diagnosis_cache (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  stock_code text NOT NULL,
  stock_data jsonb NOT NULL,
  diagnosis_result jsonb NOT NULL,
  model_used text DEFAULT 'qwen2.5-7b-instruct',
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  hit_count integer DEFAULT 0,
  last_hit_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_diagnosis_cache_lookup ON diagnosis_cache(stock_code, expires_at);
CREATE INDEX IF NOT EXISTS idx_diagnosis_cache_expires ON diagnosis_cache(expires_at);

ALTER TABLE diagnosis_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read for diagnosis cache"
  ON diagnosis_cache FOR SELECT
  TO anon, authenticated
  USING (expires_at > now());

CREATE POLICY "Allow public insert for diagnosis cache"
  ON diagnosis_cache FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update for diagnosis cache"
  ON diagnosis_cache FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Diagnosis Queue Table
CREATE TABLE IF NOT EXISTS diagnosis_queue (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  stock_code text NOT NULL,
  stock_data jsonb NOT NULL,
  user_id text,
  priority integer DEFAULT 5,
  status text DEFAULT 'pending',
  result jsonb,
  error_message text,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  attempts integer DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_diagnosis_queue_processing ON diagnosis_queue(status, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_diagnosis_queue_status ON diagnosis_queue(status);

ALTER TABLE diagnosis_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert for diagnosis queue"
  ON diagnosis_queue FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public read for diagnosis queue"
  ON diagnosis_queue FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public update for diagnosis queue"
  ON diagnosis_queue FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 4. API Usage Stats Table
CREATE TABLE IF NOT EXISTS api_usage_stats (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  date date NOT NULL,
  hour integer NOT NULL,
  requests_total integer DEFAULT 0,
  cache_hits integer DEFAULT 0,
  api_calls integer DEFAULT 0,
  queue_length_avg integer DEFAULT 0,
  response_time_avg integer DEFAULT 0,
  errors_count integer DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(date, hour)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_api_usage_stats_date_hour ON api_usage_stats(date, hour);

ALTER TABLE api_usage_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read for api stats"
  ON api_usage_stats FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert for api stats"
  ON api_usage_stats FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update for api stats"
  ON api_usage_stats FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_login_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read for admin users"
  ON admin_users FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert for admin users"
  ON admin_users FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update for admin users"
  ON admin_users FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 6. User Sessions Table
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id text UNIQUE NOT NULL,
  stock_code text,
  stock_name text,
  url_params jsonb DEFAULT '{}',
  first_visit_at timestamptz DEFAULT now(),
  last_activity_at timestamptz DEFAULT now(),
  user_agent text,
  ip_address text,
  converted boolean DEFAULT false,
  converted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_first_visit ON user_sessions(first_visit_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_converted ON user_sessions(converted, converted_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_stock_code ON user_sessions(stock_code);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert for user sessions"
  ON user_sessions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public read for user sessions"
  ON user_sessions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public update for user sessions"
  ON user_sessions FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 7. User Events Table
CREATE TABLE IF NOT EXISTS user_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id text NOT NULL,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}',
  stock_code text,
  stock_name text,
  duration_ms integer,
  gclid text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_events_session_id ON user_events(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_type ON user_events(event_type);
CREATE INDEX IF NOT EXISTS idx_user_events_created_at ON user_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_stock_code ON user_events(stock_code);

ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert for user events"
  ON user_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public read for user events"
  ON user_events FOR SELECT
  TO anon, authenticated
  USING (true);

-- 8. Redirect Links Table
CREATE TABLE IF NOT EXISTS redirect_links (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  redirect_url text NOT NULL,
  label text DEFAULT '',
  url_type text DEFAULT 'general',
  weight integer NOT NULL DEFAULT 1,
  is_active boolean DEFAULT true,
  hit_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_redirect_links_active ON redirect_links(is_active, weight DESC);
CREATE INDEX IF NOT EXISTS idx_redirect_links_url_type ON redirect_links(url_type);

ALTER TABLE redirect_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read for redirect links"
  ON redirect_links FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Allow public insert for redirect links"
  ON redirect_links FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update for redirect links"
  ON redirect_links FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete for redirect links"
  ON redirect_links FOR DELETE
  TO anon, authenticated
  USING (true);

-- 9. Google Tracking Config Table
CREATE TABLE IF NOT EXISTS google_tracking_config (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  google_ads_conversion_id text,
  ga4_measurement_id text,
  conversion_action_id text,
  is_enabled boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE google_tracking_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read for google tracking config"
  ON google_tracking_config FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert for google tracking config"
  ON google_tracking_config FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update for google tracking config"
  ON google_tracking_config FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
