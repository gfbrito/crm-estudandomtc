-- Enable RLS on all tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mass_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE recoveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

-- Helper to check if user is master
-- Note: This assumes 'profiles' table has 'id' matching auth.uid() and 'role' column.
-- Performance: This performs a subquery. For high limits, claim-based RLS is better.

-- 1. PROFILES POLICIES
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Masters can view all profiles
CREATE POLICY "Masters can view all profiles" ON profiles
  FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'master'
  );

-- Masters can update all profiles
CREATE POLICY "Masters can update all profiles" ON profiles
  FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'master'
  );

-- 2. MASTER ACCESS (Full Access for 'master' role)
-- We'll create a generic policy for each table for MASTERS.
-- Regrettably, supabase doesn't support "ALL TABLES" policy, so we repeat for each.

-- Leads
CREATE POLICY "Masters full access on leads" ON leads
  FOR ALL
  USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'master' )
  WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'master' );

-- Products
CREATE POLICY "Masters full access on products" ON products
  FOR ALL
  USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'master' )
  WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'master' );

-- Sales
CREATE POLICY "Masters full access on sales" ON sales
  FOR ALL
  USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'master' )
  WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'master' );

-- Timeline
CREATE POLICY "Masters full access on timeline" ON timeline
  FOR ALL
  USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'master' )
  WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'master' );

-- Mass Messages
CREATE POLICY "Masters full access on mass_messages" ON mass_messages
  FOR ALL
  USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'master' )
  WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'master' );

-- Settings
CREATE POLICY "Masters full access on settings" ON settings
  FOR ALL
  USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'master' )
  WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'master' );

-- Recoveries
CREATE POLICY "Masters full access on recoveries" ON recoveries
  FOR ALL
  USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'master' )
  WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'master' );

-- Notifications
CREATE POLICY "Masters full access on notifications" ON notifications
  FOR ALL
  USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'master' )
  WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'master' );

-- Webhook Mappings
CREATE POLICY "Masters full access on webhook_mappings" ON webhook_mappings
  FOR ALL
  USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'master' )
  WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'master' );

-- CSV Mappings
CREATE POLICY "Masters full access on csv_mappings" ON csv_mappings
  FOR ALL
  USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'master' )
  WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'master' );

-- Import History
CREATE POLICY "Masters full access on import_history" ON import_history
  FOR ALL
  USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'master' )
  WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'master' );


-- 3. VIEWER ACCESS (Read Only for 'viewer' role)

-- Leads
CREATE POLICY "Viewers read access on leads" ON leads
  FOR SELECT
  USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'viewer' );

-- Products
CREATE POLICY "Viewers read access on products" ON products
  FOR SELECT
  USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'viewer' );

-- Sales
CREATE POLICY "Viewers read access on sales" ON sales
  FOR SELECT
  USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'viewer' );

-- Timeline
CREATE POLICY "Viewers read access on timeline" ON timeline
  FOR SELECT
  USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'viewer' );

-- Mass Messages
CREATE POLICY "Viewers read access on mass_messages" ON mass_messages
  FOR SELECT
  USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'viewer' );

-- Settings
CREATE POLICY "Viewers read access on settings" ON settings
  FOR SELECT
  USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'viewer' );

-- Recoveries
CREATE POLICY "Viewers read access on recoveries" ON recoveries
  FOR SELECT
  USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'viewer' );

-- Notifications
CREATE POLICY "Viewers read access on notifications" ON notifications
  FOR SELECT
  USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'viewer' );

-- Webhook Mappings
CREATE POLICY "Viewers read access on webhook_mappings" ON webhook_mappings
  FOR SELECT
  USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'viewer' );

-- CSV Mappings
CREATE POLICY "Viewers read access on csv_mappings" ON csv_mappings
  FOR SELECT
  USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'viewer' );

-- Import History
CREATE POLICY "Viewers read access on import_history" ON import_history
  FOR SELECT
  USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'viewer' );
