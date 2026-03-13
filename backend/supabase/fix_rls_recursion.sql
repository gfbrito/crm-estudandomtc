-- FIX: Resolve infinite recursion in RLS policies
-- usage: Run this in Supabase SQL Editor

-- 1. Drop the problematic policies causing recursion
DROP POLICY IF EXISTS "Masters can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Masters can update all profiles" ON profiles;

-- 2. Create a helper function to get role without RLS recursion
-- SECURITY DEFINER: Runs with privileges of the creator (postgres/superuser), bypassing RLS.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- 3. Re-create Profiles policies using the safe function

-- Masters can view all profiles
CREATE POLICY "Masters can view all profiles" ON profiles
  FOR SELECT
  USING ( get_my_role() = 'master' );

-- Masters can update all profiles
CREATE POLICY "Masters can update all profiles" ON profiles
  FOR UPDATE
  USING ( get_my_role() = 'master' );

-- 4. Optimizing other tables
-- Applying the safe function to all confirmed tables.

-- LEADs
DROP POLICY IF EXISTS "Masters full access on leads" ON leads;
CREATE POLICY "Masters full access on leads" ON leads
  FOR ALL
  USING ( get_my_role() = 'master' )
  WITH CHECK ( get_my_role() = 'master' );

-- SALES
DROP POLICY IF EXISTS "Masters full access on sales" ON sales;
CREATE POLICY "Masters full access on sales" ON sales
  FOR ALL
  USING ( get_my_role() = 'master' )
  WITH CHECK ( get_my_role() = 'master' );

-- PRODUCTS
DROP POLICY IF EXISTS "Masters full access on products" ON products;
CREATE POLICY "Masters full access on products" ON products
  FOR ALL
  USING ( get_my_role() = 'master' )
  WITH CHECK ( get_my_role() = 'master' );

-- TIMELINE
DROP POLICY IF EXISTS "Masters full access on timeline" ON timeline;
CREATE POLICY "Masters full access on timeline" ON timeline
  FOR ALL
  USING ( get_my_role() = 'master' )
  WITH CHECK ( get_my_role() = 'master' );

-- MASS MESSAGES
DROP POLICY IF EXISTS "Masters full access on mass_messages" ON mass_messages;
CREATE POLICY "Masters full access on mass_messages" ON mass_messages
  FOR ALL
  USING ( get_my_role() = 'master' )
  WITH CHECK ( get_my_role() = 'master' );

-- SETTINGS
DROP POLICY IF EXISTS "Masters full access on settings" ON settings;
CREATE POLICY "Masters full access on settings" ON settings
  FOR ALL
  USING ( get_my_role() = 'master' )
  WITH CHECK ( get_my_role() = 'master' );

-- RECOVERIES
DROP POLICY IF EXISTS "Masters full access on recoveries" ON recoveries;
CREATE POLICY "Masters full access on recoveries" ON recoveries
  FOR ALL
  USING ( get_my_role() = 'master' )
  WITH CHECK ( get_my_role() = 'master' );

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Masters full access on notifications" ON notifications;
CREATE POLICY "Masters full access on notifications" ON notifications
  FOR ALL
  USING ( get_my_role() = 'master' )
  WITH CHECK ( get_my_role() = 'master' );

-- WEBHOOK MAPPINGS
DROP POLICY IF EXISTS "Masters full access on webhook_mappings" ON webhook_mappings;
CREATE POLICY "Masters full access on webhook_mappings" ON webhook_mappings
  FOR ALL
  USING ( get_my_role() = 'master' )
  WITH CHECK ( get_my_role() = 'master' );

-- 5. Viewers - Update policies to use get_my_role()

DROP POLICY IF EXISTS "Viewers read access on leads" ON leads;
CREATE POLICY "Viewers read access on leads" ON leads FOR SELECT USING ( get_my_role() = 'viewer' );

DROP POLICY IF EXISTS "Viewers read access on sales" ON sales;
CREATE POLICY "Viewers read access on sales" ON sales FOR SELECT USING ( get_my_role() = 'viewer' );

DROP POLICY IF EXISTS "Viewers read access on products" ON products;
CREATE POLICY "Viewers read access on products" ON products FOR SELECT USING ( get_my_role() = 'viewer' );
