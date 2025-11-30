-- Migration: Add unqualified_persons field to questionnaire_responses table
-- Date: 2025-11-30
-- Description: Adds a new field to capture information about who isn't a qualified prospect
-- This corresponds to Question 19 in Section 6 (Your Buyers)

-- Add new column to questionnaire_responses table
ALTER TABLE questionnaire_responses 
ADD COLUMN IF NOT EXISTS unqualified_persons TEXT;

-- Add comment to document the field
COMMENT ON COLUMN questionnaire_responses.unqualified_persons IS 'Question 19: Who isn''t a qualified person for our company to speak to? Helps define ideal customer profile by exclusion.';

-- Update existing records to have empty string (optional - helps with NULL handling)
UPDATE questionnaire_responses 
SET unqualified_persons = '' 
WHERE unqualified_persons IS NULL;

-- Verify the migration
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'questionnaire_responses' 
  AND column_name = 'unqualified_persons';

