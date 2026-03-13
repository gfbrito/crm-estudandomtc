-- ===========================================
-- RLS POLICIES COM CONTROLE DE ROLE (master/viewer)
-- ===========================================

-- 1. FUNÇÃO HELPER: Verifica se o usuário é master
CREATE OR REPLACE FUNCTION public.is_master()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'master'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. REMOVER POLICIES ANTIGAS
-- Leads
DROP POLICY IF EXISTS "Authenticated users can all leads" ON leads;
-- Products
DROP POLICY IF EXISTS "Authenticated users can all products" ON products;
-- Sales
DROP POLICY IF EXISTS "Authenticated users can all sales" ON sales;
-- Timeline
DROP POLICY IF EXISTS "Authenticated users can all timeline" ON timeline;
-- Settings
DROP POLICY IF EXISTS "Authenticated users can all settings" ON settings;
-- Product Mappings
DROP POLICY IF EXISTS "Authenticated users can all mappings" ON product_mappings;
-- Recoveries
DROP POLICY IF EXISTS "Authenticated users can all recoveries" ON recoveries;
-- Webhook Mappings
DROP POLICY IF EXISTS "Authenticated users can all webhook_mappings" ON webhook_mappings;
-- Pending Webhooks
DROP POLICY IF EXISTS "Authenticated users can all pending_webhooks" ON pending_webhooks;
-- Mass Messages
DROP POLICY IF EXISTS "Authenticated users can all mass_messages" ON mass_messages;
-- Notifications
DROP POLICY IF EXISTS "Authenticated users can all notifications" ON notifications;

-- 3. NOVAS POLICIES

-- ========== LEADS ==========
CREATE POLICY "Authenticated can view leads"
  ON leads FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Masters can insert leads"
  ON leads FOR INSERT
  WITH CHECK (public.is_master());

CREATE POLICY "Masters can update leads"
  ON leads FOR UPDATE
  USING (public.is_master());

CREATE POLICY "Masters can delete leads"
  ON leads FOR DELETE
  USING (public.is_master());

-- ========== PRODUCTS ==========
CREATE POLICY "Authenticated can view products"
  ON products FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Masters can insert products"
  ON products FOR INSERT
  WITH CHECK (public.is_master());

CREATE POLICY "Masters can update products"
  ON products FOR UPDATE
  USING (public.is_master());

CREATE POLICY "Masters can delete products"
  ON products FOR DELETE
  USING (public.is_master());

-- ========== SALES ==========
CREATE POLICY "Authenticated can view sales"
  ON sales FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Masters can insert sales"
  ON sales FOR INSERT
  WITH CHECK (public.is_master());

CREATE POLICY "Masters can update sales"
  ON sales FOR UPDATE
  USING (public.is_master());

CREATE POLICY "Masters can delete sales"
  ON sales FOR DELETE
  USING (public.is_master());

-- ========== TIMELINE ==========
CREATE POLICY "Authenticated can view timeline"
  ON timeline FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Masters can insert timeline"
  ON timeline FOR INSERT
  WITH CHECK (public.is_master());

CREATE POLICY "Masters can update timeline"
  ON timeline FOR UPDATE
  USING (public.is_master());

CREATE POLICY "Masters can delete timeline"
  ON timeline FOR DELETE
  USING (public.is_master());

-- ========== SETTINGS ==========
CREATE POLICY "Authenticated can view settings"
  ON settings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Masters can insert settings"
  ON settings FOR INSERT
  WITH CHECK (public.is_master());

CREATE POLICY "Masters can update settings"
  ON settings FOR UPDATE
  USING (public.is_master());

CREATE POLICY "Masters can delete settings"
  ON settings FOR DELETE
  USING (public.is_master());

-- ========== PRODUCT MAPPINGS ==========
CREATE POLICY "Authenticated can view product_mappings"
  ON product_mappings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Masters can insert product_mappings"
  ON product_mappings FOR INSERT
  WITH CHECK (public.is_master());

CREATE POLICY "Masters can update product_mappings"
  ON product_mappings FOR UPDATE
  USING (public.is_master());

CREATE POLICY "Masters can delete product_mappings"
  ON product_mappings FOR DELETE
  USING (public.is_master());

-- ========== RECOVERIES ==========
CREATE POLICY "Authenticated can view recoveries"
  ON recoveries FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Masters can insert recoveries"
  ON recoveries FOR INSERT
  WITH CHECK (public.is_master());

CREATE POLICY "Masters can update recoveries"
  ON recoveries FOR UPDATE
  USING (public.is_master());

CREATE POLICY "Masters can delete recoveries"
  ON recoveries FOR DELETE
  USING (public.is_master());

-- ========== WEBHOOK MAPPINGS ==========
CREATE POLICY "Authenticated can view webhook_mappings"
  ON webhook_mappings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Masters can insert webhook_mappings"
  ON webhook_mappings FOR INSERT
  WITH CHECK (public.is_master());

CREATE POLICY "Masters can update webhook_mappings"
  ON webhook_mappings FOR UPDATE
  USING (public.is_master());

CREATE POLICY "Masters can delete webhook_mappings"
  ON webhook_mappings FOR DELETE
  USING (public.is_master());

-- ========== PENDING WEBHOOKS ==========
CREATE POLICY "Authenticated can view pending_webhooks"
  ON pending_webhooks FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Masters can insert pending_webhooks"
  ON pending_webhooks FOR INSERT
  WITH CHECK (public.is_master());

CREATE POLICY "Masters can update pending_webhooks"
  ON pending_webhooks FOR UPDATE
  USING (public.is_master());

CREATE POLICY "Masters can delete pending_webhooks"
  ON pending_webhooks FOR DELETE
  USING (public.is_master());

-- ========== MASS MESSAGES ==========
CREATE POLICY "Authenticated can view mass_messages"
  ON mass_messages FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Masters can insert mass_messages"
  ON mass_messages FOR INSERT
  WITH CHECK (public.is_master());

CREATE POLICY "Masters can update mass_messages"
  ON mass_messages FOR UPDATE
  USING (public.is_master());

CREATE POLICY "Masters can delete mass_messages"
  ON mass_messages FOR DELETE
  USING (public.is_master());

-- ========== NOTIFICATIONS ==========
CREATE POLICY "Authenticated can view notifications"
  ON notifications FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Masters can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (public.is_master());

CREATE POLICY "Masters can update notifications"
  ON notifications FOR UPDATE
  USING (public.is_master());

CREATE POLICY "Masters can delete notifications"
  ON notifications FOR DELETE
  USING (public.is_master());

-- ========== PROFILES (casos especiais) ==========
-- Manter policies existentes para profiles que já devem existir ou recriar se necessário
-- Assumindo que o básico já existe, vamos garantir:

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_master());

-- Masters podem inserir novos perfis (criar usuários se necessário via App, mas Auth.user é via Auth API)
-- OBS: Geralmente profiles são criados via Trigger on auth.users.
-- Mas se um Master criar um user manualmente no banco, precisa dessa permissão.
CREATE POLICY "Masters can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (public.is_master());

-- Masters podem deletar perfis
CREATE POLICY "Masters can delete profiles"
  ON profiles FOR DELETE
  USING (public.is_master());
