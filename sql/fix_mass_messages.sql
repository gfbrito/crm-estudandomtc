-- Fix: add missing recipient_count column to mass_messages table
ALTER TABLE mass_messages ADD COLUMN IF NOT EXISTS recipient_count integer DEFAULT 0;
