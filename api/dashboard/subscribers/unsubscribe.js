import { requireSession } from '../../_lib/auth.js';
import { getSupabase } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  if (!requireSession(req, res)) return;

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ ok: false, error: 'Invalid JSON' }); }
  }
  const id = body?.id;
  if (!id) return res.status(400).json({ ok: false, error: 'id is required' });

  let supabase;
  try { supabase = getSupabase(); }
  catch (err) {
    console.error('[dashboard/subscribers/unsubscribe] supabase init failed', err);
    return res.status(500).json({ ok: false, error: 'Server is misconfigured (Supabase)' });
  }

  const { error } = await supabase
    .from('form_submissions')
    .update({ newsletter_opt_in: false })
    .eq('id', id);

  if (error) {
    console.error('[dashboard/subscribers/unsubscribe] update failed', error);
    return res.status(500).json({ ok: false, error: 'Update failed' });
  }

  return res.status(200).json({ ok: true });
}
