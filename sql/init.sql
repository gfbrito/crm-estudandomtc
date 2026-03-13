-- =============================================
-- CRM PostgreSQL Init Script
-- Seed admin user: admin@crm.com / admin123
-- =============================================

-- Enable uuid extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Note: Tables are created by Prisma migration.
-- This script only seeds initial data.

-- Seed admin user
-- Password: admin123 (bcrypt hash)
INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'admin@crm.com',
    '$2a$10$rOzKqYjKFP02z0bAQ0Sxl.YzFQx8EjxXaRK0V3R0oY9GwzD1JK/Iy',
    'Administrador',
    'master',
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Default scoring settings
INSERT INTO settings (key, value, updated_at)
VALUES (
    'pointsSettings',
    '{"tiers":[{"minValue":0,"maxValue":50,"basePoints":10},{"minValue":50,"maxValue":200,"basePoints":25},{"minValue":200,"maxValue":500,"basePoints":50},{"minValue":500,"maxValue":null,"basePoints":100}],"recurringBonus":1.5,"decayRate":0.1,"decayIntervalDays":30}',
    NOW()
), (
    'temperatureSettings',
    '{"hot":{"maxDaysSincePurchase":30,"minPoints":80},"warm":{"maxDaysSincePurchase":90,"minPoints":40},"cold":{"maxDaysSincePurchase":180,"minPoints":10},"inactive":{"minDaysSincePurchase":180,"maxPoints":10}}',
    NOW()
)
ON CONFLICT (key) DO NOTHING;
