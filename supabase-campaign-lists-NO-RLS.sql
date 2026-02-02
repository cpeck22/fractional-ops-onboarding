-- ============================================
-- Campaign Lists Table - NO RLS (SIMPLE)
-- ============================================

-- Drop and recreate
DROP TABLE IF EXISTS campaign_lists CASCADE;

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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- NO RLS - service role handles security
ALTER TABLE campaign_lists DISABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_campaign_lists_user_id ON campaign_lists(user_id);
CREATE INDEX idx_campaign_lists_type ON campaign_lists(type);

-- DONE - Try upload now
