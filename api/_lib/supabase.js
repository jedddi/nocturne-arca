import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './env.js';

let _client = null;

export function getSupabase() {
  if (_client) return _client;
  loadEnv();
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
  }
  _client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}
