-- Migration script to update octave_outputs table for new 13-agent structure
-- Run this if you already have the octave_outputs table with the old schema

-- Step 1: Add new columns
ALTER TABLE octave_outputs 
  ADD COLUMN IF NOT EXISTS cold_emails JSONB,
  ADD COLUMN IF NOT EXISTS linkedin_posts JSONB,
  ADD COLUMN IF NOT EXISTS linkedin_dms JSONB,
  ADD COLUMN IF NOT EXISTS newsletters JSONB,
  ADD COLUMN IF NOT EXISTS call_prep JSONB;

-- Step 2: Migrate existing data (if any)
-- Convert email_sequences to cold_emails.personalizedSolutions format
UPDATE octave_outputs
SET cold_emails = jsonb_build_object(
  'personalizedSolutions', COALESCE(email_sequences, '[]'::jsonb),
  'leadMagnetShort', '[]'::jsonb,
  'localCity', '[]'::jsonb,
  'problemSolution', '[]'::jsonb,
  'leadMagnetLong', '[]'::jsonb
)
WHERE cold_emails IS NULL AND email_sequences IS NOT NULL;

-- Convert linkedin_post to linkedin_posts format
UPDATE octave_outputs
SET linkedin_posts = jsonb_build_object(
  'inspiring', COALESCE(linkedin_post, ''),
  'promotional', '',
  'actionable', ''
)
WHERE linkedin_posts IS NULL AND linkedin_post IS NOT NULL;

-- Convert newsletter to newsletters format
UPDATE octave_outputs
SET newsletters = jsonb_build_object(
  'tactical', COALESCE(newsletter, ''),
  'leadership', ''
)
WHERE newsletters IS NULL AND newsletter IS NOT NULL;

-- Convert linkedin_dm to linkedin_dms format
UPDATE octave_outputs
SET linkedin_dms = jsonb_build_object(
  'newsletter', COALESCE(linkedin_dm, ''),
  'leadMagnet', ''
)
WHERE linkedin_dms IS NULL AND linkedin_dm IS NOT NULL;

-- Convert call_prep_example to call_prep format
UPDATE octave_outputs
SET call_prep = call_prep_example
WHERE call_prep IS NULL AND call_prep_example IS NOT NULL;

-- Step 3: (Optional) Drop old columns after verifying data migration
-- Uncomment these lines ONLY after you've verified the migration worked correctly
-- ALTER TABLE octave_outputs DROP COLUMN IF EXISTS email_sequences;
-- ALTER TABLE octave_outputs DROP COLUMN IF EXISTS linkedin_post;
-- ALTER TABLE octave_outputs DROP COLUMN IF EXISTS newsletter;
-- ALTER TABLE octave_outputs DROP COLUMN IF EXISTS linkedin_dm;
-- ALTER TABLE octave_outputs DROP COLUMN IF EXISTS call_prep_example;

-- Add comments for new structure
COMMENT ON COLUMN octave_outputs.cold_emails IS '5 cold email sequence variants (personalizedSolutions, leadMagnetShort, localCity, problemSolution, leadMagnetLong)';
COMMENT ON COLUMN octave_outputs.linkedin_posts IS '3 LinkedIn post variants (inspiring, promotional, actionable)';
COMMENT ON COLUMN octave_outputs.linkedin_dms IS '2 LinkedIn DM variants (newsletter, leadMagnet)';
COMMENT ON COLUMN octave_outputs.newsletters IS '2 newsletter variants (tactical, leadership)';
COMMENT ON COLUMN octave_outputs.call_prep IS 'Call prep materials (discoveryQuestions, callScript, objectionHandling, etc.)';

