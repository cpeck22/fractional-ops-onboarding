-- ============================================
-- ADD AGENT METADATA TO CAMPAIGNS TABLE
-- ============================================
-- Migration to add agent_oid and agent_type columns
-- Allows storing Octave agent metadata during campaign creation
-- Run this if you already have the campaigns table created
-- ============================================

-- Add agent metadata columns
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS agent_oid TEXT,
ADD COLUMN IF NOT EXISTS agent_type TEXT;

-- Add index for agent lookups
CREATE INDEX IF NOT EXISTS idx_campaigns_agent_oid ON campaigns(agent_oid);

-- Success message
SELECT 'Agent metadata columns added successfully!' as message;
