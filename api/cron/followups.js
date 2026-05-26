import { getSupabase } from '../_lib/supabase.js';
import { getResend, getFrom, getReplyTo, renderFollowupEmail, FOLLOWUP_VARIANTS } from '../_lib/resend.js';
import { loadEnv } from '../_lib/env.js';

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
const MAX_VARIANTS = FOLLOWUP_VARIANTS.length;
const BATCH_LIMIT = 50;

export async function runFollowups({ now = new Date() } = {}) {
  loadEnv();

  const supabase = getSupabase();
  const resend = getResend();
  const from = getFrom();
  const replyTo = getReplyTo();

  const fiveDaysAgoIso = new Date(now.getTime() - FIVE_DAYS_MS).toISOString();
  const baseUrl = (process.env.PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

  const { data: candidates, error: queryErr } = await supabase
    .from('form_submissions')
    .select('id, name, email, follow_ups_sent, last_follow_up_at, created_at')
    .eq('replied', false)
    .lt('follow_ups_sent', MAX_VARIANTS)
    .lte('created_at', fiveDaysAgoIso)
    .or(`last_follow_up_at.is.null,last_follow_up_at.lte.${fiveDaysAgoIso}`)
    .order('created_at', { ascending: true })
    .limit(BATCH_LIMIT);

  if (queryErr) throw new Error(`candidate query failed: ${queryErr.message}`);

  const results = { considered: candidates.length, sent: 0, skipped: 0, errors: [] };

  for (const lead of candidates) {
    const variant = lead.follow_ups_sent;
    const variantName = FOLLOWUP_VARIANTS[variant];
    try {
      const confirmUrl = `${baseUrl}/api/confirm?id=${encodeURIComponent(lead.id)}`;
      const { subject, html, text } = renderFollowupEmail({ variant, name: lead.name, confirmUrl });

      const sendArgs = { from, to: lead.email, subject, html, text };
      if (replyTo) sendArgs.replyTo = replyTo;

      const sendResult = await resend.emails.send(sendArgs);
      if (sendResult.error) {
        results.errors.push({ id: lead.id, variant: variantName, error: sendResult.error.message || String(sendResult.error) });
        results.skipped += 1;
        continue;
      }

      const { error: updateErr } = await supabase
        .from('form_submissions')
        .update({
          follow_ups_sent: variant + 1,
          last_follow_up_at: now.toISOString(),
        })
        .eq('id', lead.id);

      if (updateErr) {
        results.errors.push({ id: lead.id, variant: variantName, error: `update failed: ${updateErr.message}` });
        results.skipped += 1;
        continue;
      }

      results.sent += 1;
      console.log(`[followups] sent variant=${variantName} to ${lead.email} (id ${lead.id})`);
    } catch (err) {
      results.errors.push({ id: lead.id, variant: variantName, error: err.message || String(err) });
      results.skipped += 1;
    }
  }

  return results;
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  loadEnv();

  if (process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview') {
    const auth = req.headers.authorization || '';
    const expected = `Bearer ${process.env.CRON_SECRET || ''}`;
    if (!process.env.CRON_SECRET || auth !== expected) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }
  }

  try {
    const results = await runFollowups();
    return res.status(200).json({ ok: true, ...results });
  } catch (err) {
    console.error('[followups] handler failed', err);
    return res.status(500).json({ ok: false, error: err.message || 'Run failed' });
  }
}
