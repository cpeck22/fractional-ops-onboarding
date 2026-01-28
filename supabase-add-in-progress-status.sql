-- Add 'in_progress' status to play_executions status check constraint
-- This allows tracking: draft → in_progress (saved) → approved

-- Drop old constraint
ALTER TABLE play_executions DROP CONSTRAINT IF EXISTS play_executions_status_check;

-- Add new constraint with 'in_progress' status
ALTER TABLE play_executions 
ADD CONSTRAINT play_executions_status_check 
CHECK (status IN ('draft', 'in_progress', 'pending_approval', 'approved', 'rejected'));

-- Success message
SELECT 'Added in_progress status to play_executions' as message;
