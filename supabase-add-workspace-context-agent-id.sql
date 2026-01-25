-- Migration to add workspace_context_agent_id column to octave_outputs table
-- This stores the workspace-specific Context Agent ID (duplicated from template)
-- Run this in your Supabase SQL Editor

ALTER TABLE octave_outputs 
  ADD COLUMN IF NOT EXISTS workspace_context_agent_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_octave_outputs_context_agent_id ON octave_outputs(workspace_context_agent_id) WHERE workspace_context_agent_id IS NOT NULL;

-- Comment the column
COMMENT ON COLUMN octave_outputs.workspace_context_agent_id IS 'Workspace-specific Context Agent ID (duplicated from template agent ca_z4M5gc4srgrZ4NrhOCBFA)';
