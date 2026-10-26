-- ============================================
-- ADD GOOGLE PLACE ID & MAPS URI TO CLIENTS
-- ============================================
-- The Google Business Profile API returns metadata.placeId, metadata.mapsUri
-- and metadata.newReviewUri. We store these for generating correct review links
-- and Google Maps URLs.

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS google_place_id TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS google_maps_uri TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS google_new_review_uri TEXT;
