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
    console.error('[dashboard/overview] supabase init failed', err);
    return res.status(500).json({ ok: false, error: 'Server is misconfigured (Supabase)' });
  }

  const { data, error } = await supabase
    .from('form_submissions')
    .select('id, newsletter_opt_in, follow_ups_sent');

  if (error) {
    console.error('[dashboard/overview] query failed', error);
    return res.status(500).json({ ok: false, error: 'Query failed' });
  }

  const rows = data || [];
  const formFills = rows.length;
  const subscribers = rows.filter(r => r.newsletter_opt_in).length;
  const followups = rows.reduce((sum, r) => sum + (r.follow_ups_sent || 0), 0);
  const emailsSent = formFills + followups;

  return res.status(200).json({
    ok: true,
    stats: {
      form_fills: formFills,
      subscribers,
      emails_sent: emailsSent,
      unsubscribes: null,
    },
  });
}
