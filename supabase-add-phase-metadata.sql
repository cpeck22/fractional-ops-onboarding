-- ============================================
-- TWO-PHASE STRATEGY GENERATION METADATA
-- ============================================
-- This migration adds columns to store Phase 1 metadata
-- for the two-phase strategy generation workflow.
--
-- Phase 1: Prospecting + Enrichment
-- Phase 2: Content Generation
--
-- These columns allow Phase 2 to retrieve the data from Phase 1.
-- ============================================

-- Add Phase 1 metadata columns to octave_outputs table
ALTER TABLE public.octave_outputs
ADD COLUMN IF NOT EXISTS _agent_ids JSONB,
ADD COLUMN IF NOT EXISTS _company_domain TEXT,
ADD COLUMN IF NOT EXISTS _company_name TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.octave_outputs._agent_ids IS 'Stores agent IDs from Phase 1 for Phase 2 content generation';
COMMENT ON COLUMN public.octave_outputs._company_domain IS 'Company domain for Phase 2 content generation fallback';
COMMENT ON COLUMN public.octave_outputs._company_name IS 'Company name for Phase 2 content generation fallback';

-- Create index for faster Phase 2 lookups
CREATE INDEX IF NOT EXISTS idx_octave_outputs_phase_metadata 
ON public.octave_outputs (user_id, created_at DESC)
WHERE _agent_ids IS NOT NULL;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Run this in Supabase SQL Editor
-- This enables the two-phase strategy generation workflow
-- to avoid Vercel 5-minute timeout
-- ============================================

