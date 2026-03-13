-- Subscription Management System Migration

-- 1. Add Subscription fields to Products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_subscription BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS subscription_period_days INTEGER DEFAULT 365;
ALTER TABLE products ADD COLUMN IF NOT EXISTS renewal_link TEXT;

-- 2. Create Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('active', 'expiring_soon', 'expired', 'renewed', 'cancelled')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    opted_out BOOLEAN DEFAULT FALSE,
    opted_out_at TIMESTAMP WITH TIME ZONE,
    opt_out_token TEXT UNIQUE DEFAULT uuid_generate_v4(),
    opt_out_reason TEXT,
    last_notification_step INTEGER DEFAULT 0,
    last_notification_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(lead_id, product_id)
);

-- 3. Create Subscription Settings table (Follow-up Rules)
CREATE TABLE IF NOT EXISTS subscription_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    days_before INTEGER NOT NULL,
    message_template TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Default Settings
INSERT INTO subscription_settings (days_before, message_template, sort_order) VALUES
(30, 'Olá {{lead_name}}, sua assinatura do {{product_name}} vence em 30 dias. Renove agora: {{renewal_link}}', 1),
(15, '{{lead_name}}, faltam 15 dias para sua assinatura expirar. Garanta seu acesso: {{renewal_link}}', 2),
(7, 'URGENTE: Sua assinatura do {{product_name}} vence em 1 semana. Evite perder acesso!', 3),
(1, 'Último aviso: Sua assinatura expira amanhã. Renove aqui: {{renewal_link}}', 4)
ON CONFLICT DO NOTHING;

-- 4. Create Subscription Notifications table (History)
CREATE TABLE IF NOT EXISTS subscription_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    setting_id UUID REFERENCES subscription_settings(id) ON DELETE SET NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    message_sent TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_lead_id ON subscriptions(lead_id);

-- 6. Trigger for Updated At
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. RLS Policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_notifications ENABLE ROW LEVEL SECURITY;

-- Allow read/write for authenticated users (assuming basic auth for now, refine as needed)
CREATE POLICY "Enable all access for authenticated users" ON subscriptions
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON subscription_settings
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON subscription_notifications
    FOR ALL USING (auth.role() = 'authenticated');
