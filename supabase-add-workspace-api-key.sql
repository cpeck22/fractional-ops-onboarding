-- Migration to add workspace API key storage and agent generation timestamp
-- Run this in your Supabase SQL Editor

ALTER TABLE octave_outputs 
  ADD COLUMN IF NOT EXISTS workspace_api_key TEXT,
  ADD COLUMN IF NOT EXISTS agents_generated_at TIMESTAMP;

-- Add index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_octave_outputs_user_id ON octave_outputs(user_id);

-- Comment the columns
COMMENT ON COLUMN octave_outputs.workspace_api_key IS 'API key for the newly created Octave workspace, used to run agents';
COMMENT ON COLUMN octave_outputs.agents_generated_at IS 'Timestamp when agents were last executed and outputs generated';

