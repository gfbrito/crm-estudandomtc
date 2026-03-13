-- OPTIMIZATION: Use JWT Custom Claims for 0-latency RLS checks
-- This replaces the previous slow policies with instant checks against the user's token.

-- 1. Create Function to Sync Role to JWT Metadata
-- This ensures that whenever a role is updated in 'profiles', it's copied to the hidden 'app_metadata' field in 'auth.users'.
CREATE OR REPLACE FUNCTION public.sync_role_to_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the auth.users table
  UPDATE auth.users
  SET raw_app_meta_data = 
    coalesce(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- 2. Create Trigger
-- Automatically runs the sync function on insert or update.
DROP TRIGGER IF EXISTS on_profile_role_change ON profiles;
CREATE TRIGGER on_profile_role_change
  AFTER INSERT OR UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_role_to_metadata();

-- 3. MIGRATION: Sync all existing users immediately
-- This loops through your current profiles and updates their metadata.
DO $$
DECLARE
  user_record record;
BEGIN
  FOR user_record IN SELECT * FROM profiles LOOP
    UPDATE auth.users
    SET raw_app_meta_data = 
      coalesce(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object('role', user_record.role)
    WHERE id = user_record.id;
  END LOOP;
END;
$$;

-- 4. REWRITE POLICIES to use JWT Metadata
-- We check 'auth.jwt() -> app_metadata -> role' instead of querying the database.

-- LEADS
DROP POLICY IF EXISTS "Masters full access on leads" ON leads;
CREATE POLICY "Masters full access on leads" ON leads
  FOR ALL
  USING ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'master' )
  WITH CHECK ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'master' );

DROP POLICY IF EXISTS "Viewers read access on leads" ON leads;
CREATE POLICY "Viewers read access on leads" ON leads
  FOR SELECT
  USING ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'viewer' );

-- PRODUCTS
DROP POLICY IF EXISTS "Masters full access on products" ON products;
CREATE POLICY "Masters full access on products" ON products
  FOR ALL
  USING ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'master' )
  WITH CHECK ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'master' );

DROP POLICY IF EXISTS "Viewers read access on products" ON products;
CREATE POLICY "Viewers read access on products" ON products
  FOR SELECT
  USING ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'viewer' );

-- SALES
DROP POLICY IF EXISTS "Masters full access on sales" ON sales;
CREATE POLICY "Masters full access on sales" ON sales
  FOR ALL
  USING ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'master' )
  WITH CHECK ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'master' );

DROP POLICY IF EXISTS "Viewers read access on sales" ON sales;
CREATE POLICY "Viewers read access on sales" ON sales
  FOR SELECT
  USING ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'viewer' );

-- TIMELINE
DROP POLICY IF EXISTS "Masters full access on timeline" ON timeline;
CREATE POLICY "Masters full access on timeline" ON timeline
  FOR ALL
  USING ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'master' )
  WITH CHECK ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'master' );

-- MASS MESSAGES
DROP POLICY IF EXISTS "Masters full access on mass_messages" ON mass_messages;
CREATE POLICY "Masters full access on mass_messages" ON mass_messages
  FOR ALL
  USING ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'master' )
  WITH CHECK ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'master' );

-- SETTINGS
DROP POLICY IF EXISTS "Masters full access on settings" ON settings;
CREATE POLICY "Masters full access on settings" ON settings
  FOR ALL
  USING ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'master' )
  WITH CHECK ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'master' );

-- RECOVERIES
DROP POLICY IF EXISTS "Masters full access on recoveries" ON recoveries;
CREATE POLICY "Masters full access on recoveries" ON recoveries
  FOR ALL
  USING ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'master' )
  WITH CHECK ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'master' );

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Masters full access on notifications" ON notifications;
CREATE POLICY "Masters full access on notifications" ON notifications
  FOR ALL
  USING ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'master' )
  WITH CHECK ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'master' );

-- WEBHOOK MAPPINGS
DROP POLICY IF EXISTS "Masters full access on webhook_mappings" ON webhook_mappings;
CREATE POLICY "Masters full access on webhook_mappings" ON webhook_mappings
  FOR ALL
  USING ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'master' )
  WITH CHECK ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'master' );
