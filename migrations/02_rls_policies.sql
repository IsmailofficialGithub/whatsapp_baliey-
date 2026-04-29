-- Migration: 02_rls_policies
-- Description: Enable RLS and set up basic security policies.

-- Enable RLS on all tables
ALTER TABLE whatsapp.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp.api_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only view/edit their own profile
CREATE POLICY "Users can view own profile" ON whatsapp.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON whatsapp.profiles FOR UPDATE USING (auth.uid() = id);

-- Applications: Users can only view/manage their own applications
CREATE POLICY "Users can view own applications" ON whatsapp.applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own applications" ON whatsapp.applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own applications" ON whatsapp.applications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own applications" ON whatsapp.applications FOR DELETE USING (auth.uid() = user_id);

-- Messages: Users can only view messages belonging to their applications
CREATE POLICY "Users can view messages from own apps" ON whatsapp.messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM whatsapp.applications 
    WHERE whatsapp.applications.id = whatsapp.messages.application_id 
    AND whatsapp.applications.user_id = auth.uid()
  )
);
