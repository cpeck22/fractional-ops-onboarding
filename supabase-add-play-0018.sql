-- ============================================
-- ADD PLAY 0018: Founder Content Engagement
-- ============================================
-- This play targets people who engaged with founder's content
-- Category: allbound (intent-based trigger)
-- Created: 2026-01-25

-- Insert Play 0018 into claire_plays table
INSERT INTO claire_plays (
  code,
  name,
  category,
  description,
  documentation_status,
  content_agent_status,
  is_active,
  agent_name_pattern
) VALUES (
  '0018',
  'Founder Content Engagement → Practical Resource',
  'allbound',
  'Reach out to people who engaged with our founder''s content and continue that topic privately with a practical resource and a light path into a deeper conversation.',
  'Completed',
  'Completed',
  true,
  '0018'
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  documentation_status = EXCLUDED.documentation_status,
  content_agent_status = EXCLUDED.content_agent_status,
  is_active = EXCLUDED.is_active,
  agent_name_pattern = EXCLUDED.agent_name_pattern,
  updated_at = NOW();

-- Verify the insert
SELECT code, name, category, documentation_status, content_agent_status, is_active
FROM claire_plays
WHERE code = '0018';

-- ============================================
-- NOTES
-- ============================================
-- Play 0018 is now available in:
-- - /client/allbound page (Signal Based - Always On)
-- - Users can click on the play card
-- - Select persona, use cases, client references
-- - Generate content using the 0018 agent in Octave
--
-- The agent must be named "0018_*" in the Octave workspace
-- for the play execution to find it.
-- ============================================
