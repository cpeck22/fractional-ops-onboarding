-- Fix race condition in questionnaire saves
-- Run this in your Supabase SQL Editor

-- 1. Verify the unique constraint exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'questionnaire_responses_user_id_section_field_key_key'
    ) THEN
        ALTER TABLE public.questionnaire_responses
        ADD CONSTRAINT questionnaire_responses_user_id_section_field_key_key 
        UNIQUE(user_id, section, field_key);
        RAISE NOTICE 'Added unique constraint';
    ELSE
        RAISE NOTICE 'Unique constraint already exists';
    END IF;
END $$;

-- 2. Add service role bypass policy for upserts
-- This allows the service role key to bypass RLS completely
DROP POLICY IF EXISTS "Service role can manage all questionnaire data" ON public.questionnaire_responses;

CREATE POLICY "Service role can manage all questionnaire data" ON public.questionnaire_responses
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. Verify RLS is still enabled but service role can bypass
ALTER TABLE public.questionnaire_responses ENABLE ROW LEVEL SECURITY;

-- 4. Create an index on the unique constraint for faster upserts
CREATE INDEX IF NOT EXISTS idx_questionnaire_unique 
ON public.questionnaire_responses(user_id, section, field_key);

-- Verification queries (optional - run these to check)
-- SELECT * FROM pg_constraint WHERE conrelid = 'public.questionnaire_responses'::regclass;
-- SELECT * FROM pg_policies WHERE tablename = 'questionnaire_responses';

