-- ============================================
-- CLAIRE CLIENT PORTAL - DATABASE SCHEMA
-- ============================================
-- This schema supports the CEO Frontend Portal feature
-- where clients can execute Claire plays, review outputs,
-- and manage approval workflows.
--
-- Created: 2025-01-XX
-- Feature: CEO Frontend for Claire (Allbound/Outbound/Nurture)
-- ============================================

-- ============================================
-- TABLE: claire_plays
-- ============================================
-- Stores play definitions (catalog of all available plays)
-- Plays are organized by category: allbound, outbound, nurture
CREATE TABLE IF NOT EXISTS claire_plays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL, -- e.g., "0001", "2001", "1003"
  name TEXT NOT NULL, -- e.g., "Activities_Post-Call → Email Draft"
  category TEXT NOT NULL CHECK (category IN ('allbound', 'outbound', 'nurture')),
  description TEXT,
  
  -- Agent mapping: We search agents by name matching the code
  -- e.g., code "0002" searches for agent named "0002_*" in workspace
  agent_name_pattern TEXT, -- Pattern to match agent name (usually same as code)
  
  -- Play configuration
  questions JSONB, -- Static questions config for runtime context collection
  -- Example structure:
  -- {
  --   "personas": { "required": true, "multiSelect": false },
  --   "useCases": { "required": true, "multiSelect": true },
  --   "clientReferences": { "required": false, "multiSelect": true }
  -- }
  -- Note: customInput removed - not used in play execution
  
  -- Status tracking
  is_active BOOLEAN DEFAULT true,
  documentation_status TEXT CHECK (documentation_status IN ('Completed', 'In Progress', 'Not Started', 'Blocked')),
  content_agent_status TEXT CHECK (content_agent_status IN ('Completed', 'In Progress', 'Not Required', 'REQUIRED', 'Placeholder For Review')),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for claire_plays
CREATE INDEX IF NOT EXISTS idx_claire_plays_code ON claire_plays(code);
CREATE INDEX IF NOT EXISTS idx_claire_plays_category ON claire_plays(category);
CREATE INDEX IF NOT EXISTS idx_claire_plays_active ON claire_plays(is_active);

-- ============================================
-- TABLE: play_executions
-- ============================================
-- Stores execution history for each play run
CREATE TABLE IF NOT EXISTS play_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  play_id UUID REFERENCES claire_plays(id) ON DELETE RESTRICT NOT NULL,
  
  -- Workspace connection
  workspace_api_key TEXT NOT NULL, -- From octave_outputs table
  workspace_oid TEXT, -- For reference
  
  -- Runtime context collected from user
  runtime_context JSONB NOT NULL,
  -- Structure:
  -- {
  --   "personas": [{ "oId": "...", "name": "..." }],
  --   "useCases": [{ "oId": "...", "name": "..." }],
  --   "clientReferences": [{ "oId": "...", "name": "..." }]
  -- }
  -- Note: customInput removed - refinement uses separate refinementPrompt parameter
  
  -- Agent execution details
  agent_o_id TEXT, -- The actual agent ID found in workspace (by name matching)
  agent_name TEXT, -- Agent name for reference
  
  -- Output from Octave agent
  output JSONB,
  -- Structure varies by play type:
  -- - Email sequences: { "subject": "...", "body": "...", "steps": [...] }
  -- - LinkedIn content: { "content": "..." }
  -- - Call scripts: { "script": "...", "talkingPoints": [...] }
  
  -- Edited output (user modifications)
  edited_output JSONB, -- Same structure as output, but with user edits
  
  -- Status workflow
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected')),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  executed_at TIMESTAMP WITH TIME ZONE, -- When agent was run
  approved_at TIMESTAMP WITH TIME ZONE -- When approved
);

-- Indexes for play_executions
CREATE INDEX IF NOT EXISTS idx_play_executions_user_id ON play_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_play_executions_play_id ON play_executions(play_id);
CREATE INDEX IF NOT EXISTS idx_play_executions_status ON play_executions(status);
CREATE INDEX IF NOT EXISTS idx_play_executions_created_at ON play_executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_play_executions_user_status ON play_executions(user_id, status);

-- ============================================
-- TABLE: play_approvals
-- ============================================
-- Manages approval workflow and shareable links
CREATE TABLE IF NOT EXISTS play_approvals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID REFERENCES play_executions(id) ON DELETE CASCADE NOT NULL,
  
  -- Shareable link (token-based, requires login)
  shareable_token TEXT UNIQUE NOT NULL, -- UUID token for shareable link
  
  -- Approval details
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approver_email TEXT, -- Email of person who approved/rejected
  approver_user_id UUID REFERENCES auth.users(id), -- If approver is a user
  
  -- Comments/feedback
  comments TEXT,
  rejection_reason TEXT, -- If rejected
  
  -- Due date for approval
  due_date TIMESTAMP WITH TIME ZONE, -- Auto-set to 7 days from creation, user-configurable
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  
  -- Expiration (optional, for future use)
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for play_approvals
CREATE INDEX IF NOT EXISTS idx_play_approvals_execution_id ON play_approvals(execution_id);
CREATE INDEX IF NOT EXISTS idx_play_approvals_token ON play_approvals(shareable_token);
CREATE INDEX IF NOT EXISTS idx_play_approvals_status ON play_approvals(status);
CREATE INDEX IF NOT EXISTS idx_play_approvals_due_date ON play_approvals(due_date);

-- ============================================
-- TABLE: approval_audit_log
-- ============================================
-- Complete audit trail of all approval actions
CREATE TABLE IF NOT EXISTS approval_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID REFERENCES play_executions(id) ON DELETE CASCADE NOT NULL,
  approval_id UUID REFERENCES play_approvals(id) ON DELETE CASCADE,
  
  -- Action details
  action TEXT NOT NULL CHECK (action IN ('created', 'submitted', 'viewed', 'edited', 'approved', 'rejected', 'commented', 'reminder_sent')),
  actor_user_id UUID REFERENCES auth.users(id), -- Who performed the action
  actor_email TEXT, -- Email of actor (for non-user actors)
  
  -- Action metadata
  metadata JSONB, -- Additional context (e.g., IP address, user agent, etc.)
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for approval_audit_log
CREATE INDEX IF NOT EXISTS idx_approval_audit_execution_id ON approval_audit_log(execution_id);
CREATE INDEX IF NOT EXISTS idx_approval_audit_created_at ON approval_audit_log(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE claire_plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE play_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE play_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_audit_log ENABLE ROW LEVEL SECURITY;

-- claire_plays: Public read (all authenticated users can see plays)
CREATE POLICY "Anyone can view active plays"
  ON claire_plays FOR SELECT
  USING (is_active = true);

-- play_executions: Users can only see their own executions
CREATE POLICY "Users can view own executions"
  ON play_executions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own executions"
  ON play_executions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own executions"
  ON play_executions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- play_approvals: Users can view approvals for their executions
CREATE POLICY "Users can view own approvals"
  ON play_approvals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM play_executions 
      WHERE play_executions.id = play_approvals.execution_id 
      AND play_executions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create approvals for own executions"
  ON play_approvals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM play_executions 
      WHERE play_executions.id = play_approvals.execution_id 
      AND play_executions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own approvals"
  ON play_approvals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM play_executions 
      WHERE play_executions.id = play_approvals.execution_id 
      AND play_executions.user_id = auth.uid()
    )
  );

-- approval_audit_log: Users can view audit logs for their executions
CREATE POLICY "Users can view own audit logs"
  ON approval_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM play_executions 
      WHERE play_executions.id = approval_audit_log.execution_id 
      AND play_executions.user_id = auth.uid()
    )
  );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_claire_plays_updated_at
  BEFORE UPDATE ON claire_plays
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_play_executions_updated_at
  BEFORE UPDATE ON play_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-create audit log entry on approval status change
CREATE OR REPLACE FUNCTION log_approval_action()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if this is an INSERT, or if status changed on UPDATE
  IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND (NEW.status IS DISTINCT FROM OLD.status)) THEN
    INSERT INTO approval_audit_log (execution_id, approval_id, action, actor_user_id, metadata)
    VALUES (
      NEW.execution_id,
      NEW.id,
      CASE 
        WHEN NEW.status = 'approved' THEN 'approved'
        WHEN NEW.status = 'rejected' THEN 'rejected'
        ELSE 'created'
      END,
      auth.uid(),
      jsonb_build_object('status', NEW.status, 'comments', NEW.comments)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_approval_changes
  AFTER INSERT OR UPDATE ON play_approvals
  FOR EACH ROW
  EXECUTE FUNCTION log_approval_action();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE claire_plays IS 'Catalog of all Claire plays available in the client portal';
COMMENT ON TABLE play_executions IS 'Execution history for each play run by a user';
COMMENT ON TABLE play_approvals IS 'Approval workflow management with shareable links';
COMMENT ON TABLE approval_audit_log IS 'Complete audit trail of all approval-related actions';

