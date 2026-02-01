-- ============================================
-- ADD campaign_name COLUMN TO play_executions
-- ============================================
-- This column stores user-defined campaign names for play executions
-- Created: 2026-01-25
-- Feature: Campaign Naming for Plays

-- Add campaign_name column to play_executions table
ALTER TABLE play_executions 
ADD COLUMN IF NOT EXISTS campaign_name TEXT;

-- Add index for faster searches on campaign name
CREATE INDEX IF NOT EXISTS idx_play_executions_campaign_name ON play_executions(campaign_name);

-- Add comment
COMMENT ON COLUMN play_executions.campaign_name IS 'User-defined name for the campaign (optional, displayed instead of "Play XXXX" in UI)';

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'play_executions' 
  AND column_name = 'campaign_name';

-- ============================================
-- NOTES
-- ============================================
-- The campaign_name field is optional.
-- When present, it will be displayed in:
-- - Campaign Status Hub (/client/outbound-campaigns)
-- - Play execution pages
-- - Email notifications
--
-- When null/empty, the UI will fallback to:
-- - "Play [code] ([play_name])" format
-- ============================================
