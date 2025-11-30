-- Fix Row Level Security for Shareable Strategy Links
-- Run this in your Supabase SQL Editor to allow public (non-authenticated) access to shared strategies

-- ============================================
-- 1. DROP EXISTING POLICIES (if they exist)
-- ============================================

-- Drop existing policies on shared_strategies
DROP POLICY IF EXISTS "Anyone can read active shared strategies" ON public.shared_strategies;
DROP POLICY IF EXISTS "Users can create own shares" ON public.shared_strategies;
DROP POLICY IF EXISTS "Users can update own shares" ON public.shared_strategies;

-- Drop existing policy on octave_outputs for shared strategies
DROP POLICY IF EXISTS "Public can read shared strategies" ON public.octave_outputs;

-- ============================================
-- 2. RECREATE POLICIES WITH PUBLIC ACCESS
-- ============================================

-- Policy: Anyone (including anon/non-authenticated users) can read active shares
CREATE POLICY "Anyone can read active shared strategies"
  ON public.shared_strategies FOR SELECT
  TO anon, authenticated  -- Explicitly allow both anonymous and authenticated users
  USING (is_active = true AND expires_at > NOW());

-- Policy: Authenticated users can create their own shares
CREATE POLICY "Users can create own shares"
  ON public.shared_strategies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Authenticated users can update their own shares
CREATE POLICY "Users can update own shares"
  ON public.shared_strategies FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- 3. ADD PUBLIC READ POLICY FOR OCTAVE_OUTPUTS
-- ============================================

-- Policy: Public (anon) can read octave_outputs for users who have active shared strategies
CREATE POLICY "Public can read shared strategies"
  ON public.octave_outputs FOR SELECT
  TO anon, authenticated  -- Explicitly allow both anonymous and authenticated users
  USING (
    user_id IN (
      SELECT user_id 
      FROM public.shared_strategies 
      WHERE is_active = true 
      AND expires_at > NOW()
    )
  );

-- ============================================
-- 4. VERIFY GRANTS FOR ANON ROLE
-- ============================================

-- Ensure anon role has SELECT permission on both tables
GRANT SELECT ON public.shared_strategies TO anon;
GRANT SELECT ON public.octave_outputs TO anon;

-- ============================================
-- 5. VERIFICATION QUERIES (Optional - run to test)
-- ============================================

-- Test 1: Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('shared_strategies', 'octave_outputs');
-- Expected: Both should show rowsecurity = true

-- Test 2: List all policies
SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('shared_strategies', 'octave_outputs');
-- Expected: Should show all 4 policies above

-- Test 3: Check grants for anon role
SELECT table_schema, table_name, privilege_type
FROM information_schema.table_privileges
WHERE grantee = 'anon'
AND table_name IN ('shared_strategies', 'octave_outputs');
-- Expected: Should show SELECT for both tables

-- ============================================
-- TROUBLESHOOTING
-- ============================================

-- If shared links still don't work after running this:
--
-- 1. Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY 
--    are set correctly in your .env.local file
--
-- 2. Check Supabase logs in Dashboard > Logs for specific error messages
--
-- 3. Test the query directly in Supabase SQL Editor as anon user:
--    SET ROLE anon;
--    SELECT * FROM shared_strategies WHERE share_id = 'your-share-id';
--    SELECT * FROM octave_outputs WHERE user_id = 'user-id-from-share';
--    RESET ROLE;
--
-- 4. Verify the share link hasn't expired:
--    SELECT share_id, expires_at, is_active 
--    FROM shared_strategies 
--    WHERE share_id = 'your-share-id';

