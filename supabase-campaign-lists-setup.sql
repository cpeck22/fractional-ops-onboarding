-- ============================================
-- Campaign Lists Feature - Complete Setup
-- ============================================

-- 1. Create campaign_lists table (if not already created)
CREATE TABLE IF NOT EXISTS campaign_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('account', 'prospect')),
  file_type TEXT NOT NULL CHECK (file_type IN ('csv', 'xlsx')),
  file_url TEXT NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
  uploaded_by TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name, type)
);

-- 2. Enable Row Level Security
ALTER TABLE campaign_lists ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own lists" ON campaign_lists;
DROP POLICY IF EXISTS "Users can insert own lists" ON campaign_lists;
DROP POLICY IF EXISTS "Users can update own lists" ON campaign_lists;
DROP POLICY IF EXISTS "Users can delete own lists" ON campaign_lists;

-- 4. Create RLS Policies for campaign_lists table
CREATE POLICY "Users can view own lists"
  ON campaign_lists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lists"
  ON campaign_lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lists"
  ON campaign_lists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own lists"
  ON campaign_lists FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_lists_user_id ON campaign_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_lists_type ON campaign_lists(type);
CREATE INDEX IF NOT EXISTS idx_campaign_lists_status ON campaign_lists(status);

-- 6. Storage bucket policies (Note: Bucket must be created in Dashboard first!)
-- Run these AFTER creating the 'campaign-lists' bucket in Supabase Dashboard:

-- Allow authenticated users to upload files
INSERT INTO storage.policies (name, bucket_id, definition)
VALUES (
  'Users can upload to campaign-lists',
  'campaign-lists',
  'bucket_id = ''campaign-lists'''
)
ON CONFLICT (name, bucket_id) DO NOTHING;

-- Allow users to read their own files
INSERT INTO storage.policies (name, bucket_id, definition)
VALUES (
  'Users can read own files',
  'campaign-lists',
  '(bucket_id = ''campaign-lists'') AND (auth.uid()::text = (storage.foldername(name))[1])'
)
ON CONFLICT (name, bucket_id) DO NOTHING;

-- Allow users to delete their own files
INSERT INTO storage.policies (name, bucket_id, definition)
VALUES (
  'Users can delete own files',
  'campaign-lists',
  '(bucket_id = ''campaign-lists'') AND (auth.uid()::text = (storage.foldername(name))[1])'
)
ON CONFLICT (name, bucket_id) DO NOTHING;

-- ============================================
-- MANUAL STEPS REQUIRED:
-- ============================================
-- 1. Go to Supabase Dashboard → Storage
-- 2. Create a new bucket named: campaign-lists
-- 3. Settings:
--    - Public: NO (keep private)
--    - File size limit: 50 MB
--    - Allowed MIME types: text/csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
-- 4. Then run this SQL file
-- ============================================
