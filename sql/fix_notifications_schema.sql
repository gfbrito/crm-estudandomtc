-- COMPLETE FIX for notifications table
-- Run this ENTIRE script in Supabase Dashboard → SQL Editor

-- ============================================
-- 1. ADD MISSING COLUMNS (safe to re-run)
-- ============================================
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- ============================================
-- 2. Grant column access to all roles
-- ============================================
GRANT ALL ON notifications TO authenticated;
GRANT SELECT ON notifications TO anon;

-- ============================================
-- 3. FIX RLS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Masters full access on notifications" ON notifications;
DROP POLICY IF EXISTS "Viewers read access on notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated can view notifications" ON notifications;
DROP POLICY IF EXISTS "Masters can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Masters can update notifications" ON notifications;
DROP POLICY IF EXISTS "Masters can delete notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can all notifications" ON notifications;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Masters full access on notifications" ON notifications
  FOR ALL
  USING ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'master' )
  WITH CHECK ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'master' );

CREATE POLICY "Viewers read access on notifications" ON notifications
  FOR SELECT
  USING ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'viewer' );

-- ============================================
-- 4. RELOAD PostgREST schema cache (CRITICAL!)
-- Without this, PostgREST doesn't see new columns
-- ============================================
NOTIFY pgrst, 'reload schema';
