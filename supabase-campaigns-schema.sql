-- ============================================
-- Universal Campaign Creation & Approval Schema
-- ============================================
-- This schema replaces the outbound_campaigns flow and extends it to ALL plays.
-- Enables self-serve campaign creation with production-ready copy on first try.
-- Includes 3-stage approval process: List → Copy → Launch

-- ============================================
-- TABLE: campaigns
-- ============================================
-- Universal campaign table for all plays (replaces outbound_campaigns)
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  play_code TEXT NOT NULL, -- Links to claire_plays (e.g., '0002', '1009', '2001', '2009')
  
  -- Campaign metadata
  campaign_name TEXT NOT NULL,
  campaign_type TEXT, -- Auto-populated from play name (e.g., 'Web Visitor Warm Outreach', 'Pre-Conference Outreach')
  
  -- Step 1: Campaign Brief (required)
  campaign_brief JSONB DEFAULT '{}', -- { meeting_transcript, written_strategy, documents[], blog_posts[] }
  
  -- Step 2: Additional Briefing (optional)
  additional_brief TEXT,
  additional_constraints JSONB DEFAULT '{}', -- { tie_to_event, only_proof_points, avoid_claims, sender_name }
  
  -- Step 3: Intermediary Outputs (generated)
  intermediary_outputs JSONB DEFAULT '{}', -- { list_building_instructions, hook, attraction_offer, asset, case_studies[], client_references[] }
  
  -- Runtime context for agent execution
  runtime_context JSONB DEFAULT '{}', -- { personas[], use_cases[], problems[] }
  
  -- Final outputs from agent
  final_outputs JSONB DEFAULT '{}', -- { campaign_copy, highlighted_html, validation_report }
  
  -- List management
  list_status TEXT DEFAULT 'pending_questions' CHECK (list_status IN ('pending_questions', 'not_required', 'pending_upload', 'uploaded', 'client_reviewed')),
  list_data JSONB DEFAULT '{}', -- { has_account_list, has_prospect_list, account_list_file, prospect_list_file, list_preview[] }
  
  -- Approval workflow
  approval_status TEXT DEFAULT 'draft' CHECK (approval_status IN ('draft', 'pending_list', 'pending_copy', 'launch_approved')),
  approved_copy TEXT, -- Final edited copy after client approval
  
  -- Workspace context
  workspace_api_key TEXT,
  workspace_oid TEXT,
  
  -- Agent metadata (from Octave API lookup)
  agent_oid TEXT, -- Octave agent oId found by play code
  agent_type TEXT, -- Agent type from Octave (EMAIL, CONTENT, etc.)
  
  -- Status tracking
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'intermediary_generated', 'assets_generated', 'pending_approval', 'launch_approved')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_play_code ON campaigns(play_code);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_approval_status ON campaigns(approval_status);
CREATE INDEX IF NOT EXISTS idx_campaigns_list_status ON campaigns(list_status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_status ON campaigns(user_id, status);

-- ============================================
-- TABLE: campaign_approvals
-- ============================================
-- Tracks individual approval stages (List → Copy → Launch)
CREATE TABLE IF NOT EXISTS campaign_approvals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  
  -- Approval stage
  approval_stage TEXT NOT NULL CHECK (approval_stage IN ('list', 'copy', 'launch')),
  
  -- Approval details
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id),
  approver_email TEXT,
  
  -- Comments/feedback
  comments TEXT,
  rejection_reason TEXT,
  
  -- Audit log
  audit_log JSONB DEFAULT '[]', -- Array of { action, timestamp, actor, details }
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for campaign_approvals
CREATE INDEX IF NOT EXISTS idx_campaign_approvals_campaign_id ON campaign_approvals(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_approvals_stage ON campaign_approvals(approval_stage);
CREATE INDEX IF NOT EXISTS idx_campaign_approvals_status ON campaign_approvals(status);

-- ============================================
-- TABLE: campaign_notifications
-- ============================================
-- Tracks email notifications for campaign workflow
CREATE TABLE IF NOT EXISTS campaign_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  
  -- Notification details
  notification_type TEXT NOT NULL CHECK (notification_type IN ('list_building_required', 'list_ready_for_review', 'copy_ready_for_approval', 'launch_approved')),
  recipient_email TEXT NOT NULL,
  
  -- Notification status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  
  -- Notification metadata
  metadata JSONB DEFAULT '{}', -- Additional context for email template
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for campaign_notifications
CREATE INDEX IF NOT EXISTS idx_campaign_notifications_campaign_id ON campaign_notifications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_notifications_type ON campaign_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_campaign_notifications_status ON campaign_notifications(status);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_notifications ENABLE ROW LEVEL SECURITY;

-- campaigns: Users can only see their own campaigns
CREATE POLICY "Users can view own campaigns"
  ON campaigns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own campaigns"
  ON campaigns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own campaigns"
  ON campaigns FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own campaigns"
  ON campaigns FOR DELETE
  USING (auth.uid() = user_id);

-- campaign_approvals: Users can only see approvals for their campaigns
CREATE POLICY "Users can view approvals for own campaigns"
  ON campaign_approvals FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create approvals for own campaigns"
  ON campaign_approvals FOR INSERT
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update approvals for own campaigns"
  ON campaign_approvals FOR UPDATE
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

-- campaign_notifications: Users can only see notifications for their campaigns
CREATE POLICY "Users can view notifications for own campaigns"
  ON campaign_notifications FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_campaigns_updated_at();

-- Auto-create audit log entry on campaign approval status change
CREATE OR REPLACE FUNCTION log_campaign_approval_action()
RETURNS TRIGGER AS $$
BEGIN
  -- Log significant status changes
  IF (TG_OP = 'UPDATE' AND NEW.approval_status IS DISTINCT FROM OLD.approval_status) THEN
    -- Create notification based on status change
    IF NEW.approval_status = 'pending_list' THEN
      -- Check if list is required
      IF NEW.list_status = 'pending_upload' THEN
        INSERT INTO campaign_notifications (campaign_id, notification_type, recipient_email, metadata)
        VALUES (
          NEW.id,
          'list_building_required',
          'sharifali1000@gmail.com',
          jsonb_build_object(
            'campaign_name', NEW.campaign_name,
            'play_code', NEW.play_code,
            'list_building_instructions', NEW.intermediary_outputs->'list_building_instructions'
          )
        );
      END IF;
    ELSIF NEW.approval_status = 'pending_copy' THEN
      -- Notification for copy ready (optional, can be implemented later)
      NULL;
    ELSIF NEW.approval_status = 'launch_approved' THEN
      -- Notify solution architect
      INSERT INTO campaign_notifications (campaign_id, notification_type, recipient_email, metadata)
      VALUES (
        NEW.id,
        'launch_approved',
        'sharifali1000@gmail.com',
        jsonb_build_object(
          'campaign_name', NEW.campaign_name,
          'play_code', NEW.play_code,
          'approved_by', auth.uid()
        )
      );
    END IF;
  END IF;
  
  -- Log list upload
  IF (TG_OP = 'UPDATE' AND NEW.list_status = 'uploaded' AND OLD.list_status != 'uploaded') THEN
    -- Get user email for notification
    INSERT INTO campaign_notifications (campaign_id, notification_type, recipient_email, metadata)
    SELECT
      NEW.id,
      'list_ready_for_review',
      u.email,
      jsonb_build_object(
        'campaign_name', NEW.campaign_name,
        'play_code', NEW.play_code
      )
    FROM auth.users u
    WHERE u.id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_campaign_approval_changes
  AFTER INSERT OR UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION log_campaign_approval_action();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE campaigns IS 'Universal campaign creation table for all plays with self-serve workflow';
COMMENT ON TABLE campaign_approvals IS 'Tracks 3-stage approval process: List → Copy → Launch';
COMMENT ON TABLE campaign_notifications IS 'Email notification queue for campaign workflow events';
