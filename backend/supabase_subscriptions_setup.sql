-- Função auxiliar para verificar permissão de Master
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

-- Adicionar colunas em products
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_subscription BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS subscription_period_days INTEGER DEFAULT 365;
ALTER TABLE products ADD COLUMN IF NOT EXISTS renewal_link TEXT;

-- Criar Tabela subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expiring_soon', 'expired', 'renewed', 'cancelled')),
    start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_date TIMESTAMPTZ NOT NULL,
    opted_out BOOLEAN DEFAULT false,
    opted_out_at TIMESTAMPTZ,
    opt_out_token TEXT UNIQUE,
    opt_out_reason TEXT,
    last_notification_step INTEGER,
    last_notification_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(lead_id, product_id)
);

-- Criar Tabela subscription_settings
CREATE TABLE IF NOT EXISTS subscription_settings (
    id TEXT PRIMARY KEY,
    days_before INTEGER NOT NULL,
    message_template TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view subscriptions" ON subscriptions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Masters can insert subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (public.is_master());

CREATE POLICY "Masters can update subscriptions" ON subscriptions
  FOR UPDATE USING (public.is_master());

CREATE POLICY "Masters can delete subscriptions" ON subscriptions
  FOR DELETE USING (public.is_master());

-- RLS para subscription_settings
ALTER TABLE subscription_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view subscription_settings" ON subscription_settings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Masters can manage subscription_settings" ON subscription_settings
  FOR ALL USING (public.is_master());
