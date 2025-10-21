-- Create the function that the trigger calls
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verify the trigger exists
SELECT tgname, tgrelid::regclass, tgtype, tgenabled 
FROM pg_trigger 
WHERE tgname = 'update_questionnaire_responses_updated_at';

