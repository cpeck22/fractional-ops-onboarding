-- =====================================================
-- SUPABASE QUESTIONNAIRE DATA PERSISTENCE SETUP
-- =====================================================
-- Run this script in your Supabase SQL Editor
-- Dashboard: https://supabase.com/dashboard/project/wmvccwxvtwhtlrltbnej

-- 1. Create the questionnaire_responses table
CREATE TABLE IF NOT EXISTS questionnaire_responses (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  field_key TEXT NOT NULL,
  field_value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, section, field_key)
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE questionnaire_responses ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policy for users to access their own data
CREATE POLICY "Users can access own questionnaire data" ON questionnaire_responses
  FOR ALL USING (auth.uid() = user_id);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_user_id ON questionnaire_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_section ON questionnaire_responses(section);
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_updated_at ON questionnaire_responses(updated_at);

-- 5. Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Create trigger to automatically update updated_at on row changes
CREATE TRIGGER update_questionnaire_responses_updated_at 
    BEFORE UPDATE ON questionnaire_responses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFICATION QUERIES (Optional - run these to test)
-- =====================================================

-- Check if table was created successfully
-- SELECT table_name, column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'questionnaire_responses';

-- Check if RLS is enabled
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename = 'questionnaire_responses';

-- Check if policies exist
-- SELECT policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'questionnaire_responses';
