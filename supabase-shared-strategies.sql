-- Create shared_strategies table for shareable strategy links
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.shared_strategies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  share_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_oid TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id) -- Only one share link per user
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_shared_strategies_share_id ON public.shared_strategies(share_id);
CREATE INDEX IF NOT EXISTS idx_shared_strategies_user_id ON public.shared_strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_strategies_expires_at ON public.shared_strategies(expires_at);

-- Enable Row Level Security
ALTER TABLE public.shared_strategies ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read active shares (no auth required for public links)
CREATE POLICY "Anyone can read active shared strategies"
  ON public.shared_strategies FOR SELECT
  USING (is_active = true AND expires_at > NOW());

-- Policy: Users can create their own shares
CREATE POLICY "Users can create own shares"
  ON public.shared_strategies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update own shares
CREATE POLICY "Users can update own shares"
  ON public.shared_strategies FOR UPDATE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.shared_strategies TO anon, authenticated;

-- Add policy to allow public read access to octave_outputs for shared strategies
CREATE POLICY "Public can read shared strategies"
  ON public.octave_outputs FOR SELECT
  USING (
    user_id IN (
      SELECT user_id 
      FROM public.shared_strategies 
      WHERE is_active = true 
      AND expires_at > NOW()
    )
  );

-- Comments for documentation
COMMENT ON TABLE public.shared_strategies IS 'Stores shareable strategy links with 14-day expiration';
COMMENT ON COLUMN public.shared_strategies.share_id IS 'Unique identifier for the shareable URL';
COMMENT ON COLUMN public.shared_strategies.expires_at IS 'Strategy expires 14 days after creation';
COMMENT ON COLUMN public.shared_strategies.is_active IS 'Soft delete flag - false means strategy is disabled';

