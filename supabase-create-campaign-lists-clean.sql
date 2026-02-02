-- ============================================
-- Create campaign_lists table - SIMPLE & CLEAN
-- ============================================
-- Run this in Supabase SQL Editor to create the table

-- Drop existing table if needed (WARNING: deletes data!)
DROP TABLE IF EXISTS campaign_lists CASCADE;

-- Create the table with correct schema (no uploaded_by!)
CREATE TABLE campaign_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('account', 'prospect')),
  file_type TEXT NOT NULL CHECK (file_type IN ('csv', 'xlsx')),
  file_url TEXT NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name, type)
);

-- Enable Row Level Security
ALTER TABLE campaign_lists ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow users to access their own lists)
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

-- Create indexes for performance
CREATE INDEX idx_campaign_lists_user_id ON campaign_lists(user_id);
CREATE INDEX idx_campaign_lists_type ON campaign_lists(type);
CREATE INDEX idx_campaign_lists_status ON campaign_lists(status);

-- ============================================
-- DONE! Table is ready for list uploads
-- ============================================
-- Now try uploading a CSV file and it should work!
