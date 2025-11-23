-- Create table for storing Octave agent outputs
CREATE TABLE IF NOT EXISTS octave_outputs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  workspace_oid TEXT,
  company_name TEXT,
  company_domain TEXT,
  
  -- Campaign ideas (from playbooks)
  campaign_ideas JSONB,
  
  -- Agent outputs (nested JSONB structure for multiple variants)
  prospect_list JSONB,
  
  -- Cold Email Sequences (5 variants)
  cold_emails JSONB,  -- { personalizedSolutions: [], leadMagnetShort: [], localCity: [], problemSolution: [], leadMagnetLong: [] }
  
  -- LinkedIn Posts (3 variants)
  linkedin_posts JSONB,  -- { inspiring: '', promotional: '', actionable: '' }
  
  -- LinkedIn DMs (2 variants)
  linkedin_dms JSONB,  -- { newsletter: '', leadMagnet: '' }
  
  -- Newsletters (2 variants)
  newsletters JSONB,  -- { tactical: '', leadership: '' }
  
  -- Call Prep
  call_prep JSONB,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE octave_outputs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own outputs
CREATE POLICY "Users can read own outputs"
  ON octave_outputs FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own outputs
CREATE POLICY "Users can insert own outputs"
  ON octave_outputs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own outputs
CREATE POLICY "Users can update own outputs"
  ON octave_outputs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_octave_outputs_user_id ON octave_outputs(user_id);
CREATE INDEX IF NOT EXISTS idx_octave_outputs_created_at ON octave_outputs(created_at DESC);

-- Add comment
COMMENT ON TABLE octave_outputs IS 'Stores AI-generated strategy outputs from Octave agents for each user';


