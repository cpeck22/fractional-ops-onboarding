-- ============================================
-- Add campaign_name field to play_executions
-- ============================================
-- This allows users to name their campaigns instead of just "Play 0002"

ALTER TABLE play_executions 
ADD COLUMN IF NOT EXISTS campaign_name TEXT;

-- Add index for faster searching/filtering by campaign name
CREATE INDEX IF NOT EXISTS idx_play_executions_campaign_name ON play_executions(campaign_name);

-- Optional: Add a comment to document the field
COMMENT ON COLUMN play_executions.campaign_name IS 'User-provided name for the campaign/play execution (e.g., "Q1 Enterprise Outreach")';
