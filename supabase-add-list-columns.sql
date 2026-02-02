-- ============================================
-- Add List Management Columns to outbound_campaigns
-- ============================================
-- This adds the necessary columns for list upload and selection feature

-- 1. Add list-related columns
ALTER TABLE outbound_campaigns
  ADD COLUMN IF NOT EXISTS list_id UUID REFERENCES campaign_lists(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS list_name TEXT,
  ADD COLUMN IF NOT EXISTS list_status TEXT DEFAULT 'not_started' CHECK (list_status IN ('not_started', 'in_progress', 'approved')),
  ADD COLUMN IF NOT EXISTS copy_status TEXT DEFAULT 'in_progress' CHECK (copy_status IN ('in_progress', 'changes_required', 'approved')),
  ADD COLUMN IF NOT EXISTS launch_status TEXT DEFAULT 'not_started' CHECK (launch_status IN ('not_started', 'in_progress', 'live'));

-- 2. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_outbound_campaigns_list_id ON outbound_campaigns(list_id);
CREATE INDEX IF NOT EXISTS idx_outbound_campaigns_list_status ON outbound_campaigns(list_status);
CREATE INDEX IF NOT EXISTS idx_outbound_campaigns_copy_status ON outbound_campaigns(copy_status);
CREATE INDEX IF NOT EXISTS idx_outbound_campaigns_launch_status ON outbound_campaigns(launch_status);

-- 3. Update existing campaigns to have default statuses
UPDATE outbound_campaigns
SET 
  list_status = COALESCE(list_status, 'not_started'),
  copy_status = COALESCE(copy_status, 'in_progress'),
  launch_status = COALESCE(launch_status, 'not_started')
WHERE 
  list_status IS NULL 
  OR copy_status IS NULL 
  OR launch_status IS NULL;

-- ============================================
-- NOTES:
-- ============================================
-- - list_id: Foreign key to campaign_lists table
-- - list_name: Denormalized list name for quick display
-- - list_status: Tracks approval status of the list (not_started → in_progress → approved)
-- - copy_status: Tracks approval status of campaign copy (in_progress → changes_required → approved)
-- - launch_status: Tracks launch readiness (not_started → in_progress → live)
-- 
-- Workflow:
-- 1. Campaign created → copy_status: in_progress, list_status: not_started
-- 2. User selects/creates list → list_status: approved (if pre-approved list selected)
-- 3. User approves copy → copy_status: approved
-- 4. Both copy & list approved → launch_status: in_progress (unlocked)
-- 5. User clicks launch → launch_status: live, triggers Zapier webhook
-- ============================================
