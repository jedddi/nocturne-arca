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
    console.error('[dashboard/email-log] supabase init failed', err);
    return res.status(500).json({ ok: false, error: 'Server is misconfigured (Supabase)' });
  }

  const { data, error } = await supabase
    .from('form_submissions')
    .select('id, name, email, created_at, follow_ups_sent, last_follow_up_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('[dashboard/email-log] query failed', error);
    return res.status(500).json({ ok: false, error: 'Query failed' });
  }

  const events = [];
  for (const row of data || []) {
    events.push({
      submission_id: row.id,
      name: row.name,
      email: row.email,
      type: 'confirmation',
      timestamp: row.created_at,
    });
    const followups = Number(row.follow_ups_sent) || 0;
    if (followups > 0) {
      const last = row.last_follow_up_at || row.created_at;
      for (let i = 1; i <= followups; i++) {
        events.push({
          submission_id: row.id,
          name: row.name,
          email: row.email,
          type: `followup-${i}`,
          timestamp: last,
        });
      }
    }
  }

  events.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

  return res.status(200).json({ ok: true, events: events.slice(0, 500) });
}
