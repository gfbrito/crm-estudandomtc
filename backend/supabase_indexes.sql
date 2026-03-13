-- Indexes for Subscriptions Dashboard
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_end_date ON subscriptions(status, end_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_lead_id ON subscriptions(lead_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_product_id ON subscriptions(product_id);

-- Indexes for Dashboard Page
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_created_at_status ON sales(created_at, status);
CREATE INDEX IF NOT EXISTS idx_sales_status_amount ON sales(status, amount); -- For revenue sum if composite
