import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
}

/**
 * Admin client for backend operations
 * Specifically configured for the 'whatsapp' schema
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: 'whatsapp'
  }
});

console.log('✅ Supabase Admin initialized with whatsapp schema');
