import { requireSession } from '../_lib/auth.js';
import { getSupabase } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  if (!requireSession(req, res)) return;

  let supabase;
  try { supabase = getSupabase(); }
  catch (err) {
    console.error('[dashboard/subscribers] supabase init failed', err);
    return res.status(500).json({ ok: false, error: 'Server is misconfigured (Supabase)' });
  }

  const { data, error } = await supabase
    .from('form_submissions')
    .select('id, name, email, created_at')
    .eq('newsletter_opt_in', true)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('[dashboard/subscribers] query failed', error);
    return res.status(500).json({ ok: false, error: 'Query failed' });
  }

  return res.status(200).json({ ok: true, subscribers: data || [] });
}
