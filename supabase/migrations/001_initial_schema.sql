-- ============================================
-- GBP Manager — Initial Database Schema
-- Run this migration in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CLIENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  business_name TEXT NOT NULL,
  google_account_id TEXT,
  google_location_id TEXT,
  google_location_name TEXT, -- Full resource name e.g. accounts/123/locations/456
  category TEXT,
  phone TEXT,
  address JSONB DEFAULT '{}',
  description TEXT,
  website TEXT,
  refresh_token TEXT, -- Encrypted in production via Vault
  token_expires_at TIMESTAMPTZ,
  average_rating NUMERIC(2,1) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'disconnected', 'error')),
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- SCHEDULED POSTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  media_urls TEXT[] DEFAULT '{}',
  topic_type TEXT DEFAULT 'STANDARD' CHECK (topic_type IN ('STANDARD', 'EVENT', 'OFFER', 'ALERT')),
  call_to_action JSONB,
  event_data JSONB,
  offer_data JSONB,
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  google_post_id TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'scheduled', 'published', 'failed', 'cancelled')),
  ai_generated BOOLEAN DEFAULT false,
  ai_prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- REVIEWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  google_review_id TEXT UNIQUE,
  reviewer_name TEXT DEFAULT 'Anônimo',
  reviewer_photo_url TEXT,
  star_rating INTEGER CHECK (star_rating BETWEEN 1 AND 5),
  comment TEXT,
  reply TEXT,
  reply_status TEXT DEFAULT 'pending' CHECK (reply_status IN ('pending', 'approved', 'sent', 'failed')),
  ai_suggested_reply TEXT,
  reviewed_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- PHOTOS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  google_photo_id TEXT,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT DEFAULT 'ADDITIONAL' CHECK (category IN ('COVER', 'PROFILE', 'LOGO', 'EXTERIOR', 'INTERIOR', 'PRODUCT', 'AT_WORK', 'FOOD_AND_DRINK', 'MENU', 'COMMON_AREA', 'ROOMS', 'TEAMS', 'ADDITIONAL')),
  alt_text TEXT,
  file_size INTEGER,
  uploaded_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'uploading', 'uploaded', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ACTIVITY LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- PERFORMANCE METRICS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  metric_date DATE NOT NULL,
  views INTEGER DEFAULT 0,
  searches INTEGER DEFAULT 0,
  actions INTEGER DEFAULT 0,
  direction_requests INTEGER DEFAULT 0,
  phone_calls INTEGER DEFAULT 0,
  website_clicks INTEGER DEFAULT 0,
  photo_views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, metric_date)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_client_id ON public.scheduled_posts(client_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON public.scheduled_posts(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_for ON public.scheduled_posts(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_reviews_client_id ON public.reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reply_status ON public.reviews(reply_status);
CREATE INDEX IF NOT EXISTS idx_photos_client_id ON public.photos(client_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_client_id ON public.activity_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_client_date ON public.performance_metrics(client_id, metric_date DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

-- Clients: Users can only see their own clients
CREATE POLICY "Users can view own clients" ON public.clients
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clients" ON public.clients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients" ON public.clients
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients" ON public.clients
  FOR DELETE USING (auth.uid() = user_id);

-- Scheduled Posts: Users can manage posts for their clients
CREATE POLICY "Users can view own posts" ON public.scheduled_posts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.clients WHERE clients.id = scheduled_posts.client_id AND clients.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own posts" ON public.scheduled_posts
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.clients WHERE clients.id = scheduled_posts.client_id AND clients.user_id = auth.uid())
  );

CREATE POLICY "Users can update own posts" ON public.scheduled_posts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.clients WHERE clients.id = scheduled_posts.client_id AND clients.user_id = auth.uid())
  );

CREATE POLICY "Users can delete own posts" ON public.scheduled_posts
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.clients WHERE clients.id = scheduled_posts.client_id AND clients.user_id = auth.uid())
  );

-- Reviews: Users can view and manage reviews for their clients
CREATE POLICY "Users can view own reviews" ON public.reviews
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.clients WHERE clients.id = reviews.client_id AND clients.user_id = auth.uid())
  );

CREATE POLICY "Users can update own reviews" ON public.reviews
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.clients WHERE clients.id = reviews.client_id AND clients.user_id = auth.uid())
  );

-- Photos: Users can manage photos for their clients
CREATE POLICY "Users can view own photos" ON public.photos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.clients WHERE clients.id = photos.client_id AND clients.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own photos" ON public.photos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.clients WHERE clients.id = photos.client_id AND clients.user_id = auth.uid())
  );

CREATE POLICY "Users can delete own photos" ON public.photos
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.clients WHERE clients.id = photos.client_id AND clients.user_id = auth.uid())
  );

-- Activity Logs: Users can view logs for their clients
CREATE POLICY "Users can view own logs" ON public.activity_logs
  FOR SELECT USING (
    client_id IS NULL OR
    EXISTS (SELECT 1 FROM public.clients WHERE clients.id = activity_logs.client_id AND clients.user_id = auth.uid())
  );

-- Performance Metrics: Users can view metrics for their clients
CREATE POLICY "Users can view own metrics" ON public.performance_metrics
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.clients WHERE clients.id = performance_metrics.client_id AND clients.user_id = auth.uid())
  );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER scheduled_posts_updated_at
  BEFORE UPDATE ON public.scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
