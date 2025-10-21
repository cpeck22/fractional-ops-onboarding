-- TEMPORARY: Disable RLS to test if that's the issue
-- You can run this in Supabase SQL Editor

-- Disable RLS temporarily
ALTER TABLE questionnaire_responses DISABLE ROW LEVEL SECURITY;

-- After testing, re-enable it with proper policies:
-- ALTER TABLE questionnaire_responses ENABLE ROW LEVEL SECURITY;

-- Then create better policies:
DROP POLICY IF EXISTS "Users can access own questionnaire data" ON questionnaire_responses;

CREATE POLICY "Users can select own questionnaire data" 
ON questionnaire_responses FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own questionnaire data" 
ON questionnaire_responses FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own questionnaire data" 
ON questionnaire_responses FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own questionnaire data" 
ON questionnaire_responses FOR DELETE 
USING (auth.uid() = user_id);

