-- Migration: 01_initial_schema
-- Description: Create whatsapp schema, profiles, applications, and messages tables.

-- 1. Create the Schema
CREATE SCHEMA IF NOT EXISTS whatsapp;

-- 2. Profiles Table (Extends Supabase Auth)
CREATE TABLE IF NOT EXISTS whatsapp.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Applications Table
CREATE TABLE IF NOT EXISTS whatsapp.applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES whatsapp.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  
  -- API Security
  api_key TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'base64'),
  
  -- WhatsApp State
  status TEXT DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'connecting', 'connected')),
  phone_number TEXT,
  session_data JSONB, -- For storing Baileys auth tokens in DB
  
  -- Webhook for the user to receive incoming messages
  webhook_url TEXT,
  
  -- Usage Tracking
  api_usage_count BIGINT DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Messages Table
CREATE TABLE IF NOT EXISTS whatsapp.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES whatsapp.applications(id) ON DELETE CASCADE NOT NULL,
  
  phone TEXT NOT NULL,
  content TEXT,
  type TEXT NOT NULL CHECK (type IN ('incoming', 'outgoing')),
  
  whatsapp_msg_id TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. API Logs
CREATE TABLE IF NOT EXISTS whatsapp.api_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES whatsapp.applications(id) ON DELETE CASCADE NOT NULL,
  endpoint TEXT NOT NULL,
  status_code INTEGER,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_apps_user_id ON whatsapp.applications(user_id);
CREATE INDEX IF NOT EXISTS idx_apps_api_key ON whatsapp.applications(api_key);
CREATE INDEX IF NOT EXISTS idx_messages_app_id ON whatsapp.messages(application_id);
CREATE INDEX IF NOT EXISTS idx_messages_phone ON whatsapp.messages(phone);

-- 7. Automatic updated_at trigger function
CREATE OR REPLACE FUNCTION whatsapp.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON whatsapp.profiles FOR EACH ROW EXECUTE PROCEDURE whatsapp.update_updated_at_column();
CREATE TRIGGER update_apps_updated_at BEFORE UPDATE ON whatsapp.applications FOR EACH ROW EXECUTE PROCEDURE whatsapp.update_updated_at_column();
