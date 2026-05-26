import { Webhook } from 'svix';
import { getSupabase } from '../_lib/supabase.js';
import { loadEnv } from '../_lib/env.js';

const ANGLE_EMAIL_RE = /<([^>]+)>/;
const BARE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseSenderEmail(from) {
  if (!from || typeof from !== 'string') return null;
  const angle = from.match(ANGLE_EMAIL_RE);
  const candidate = (angle ? angle[1] : from).trim().toLowerCase();
  return BARE_EMAIL_RE.test(candidate) ? candidate : null;
}

async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (typeof req.body === 'string') return req.body;
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body);
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  loadEnv();

  let raw;
  try { raw = await readRawBody(req); }
  catch (err) {
    console.error('[email-reply] failed to read body', err);
    return res.status(400).json({ ok: false, error: 'Could not read body' });
  }

  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (secret) {
    try {
      const wh = new Webhook(secret);
      wh.verify(raw, {
        'svix-id': req.headers['svix-id'],
        'svix-timestamp': req.headers['svix-timestamp'],
        'svix-signature': req.headers['svix-signature'],
      });
    } catch (err) {
      console.warn('[email-reply] signature verification failed', err.message);
      return res.status(401).json({ ok: false, error: 'Invalid signature' });
    }
  } else if (process.env.VERCEL_ENV === 'production') {
    console.error('[email-reply] RESEND_WEBHOOK_SECRET missing in production');
    return res.status(500).json({ ok: false, error: 'Webhook not configured' });
  } else {
    console.warn('[email-reply] DEV: skipping signature verification (no RESEND_WEBHOOK_SECRET)');
  }

  let event;
  try { event = JSON.parse(raw); }
  catch { return res.status(400).json({ ok: false, error: 'Invalid JSON' }); }

  if (event?.type !== 'email.received') {
    return res.status(200).json({ ok: true, ignored: true, type: event?.type ?? null });
  }

  const sender = parseSenderEmail(event?.data?.from);
  if (!sender) {
    console.warn('[email-reply] could not parse sender from', event?.data?.from);
    return res.status(200).json({ ok: true, ignored: true, reason: 'unparseable_sender' });
  }

  let supabase;
  try { supabase = getSupabase(); }
  catch (err) {
    console.error('[email-reply] supabase init failed', err);
    return res.status(500).json({ ok: false, error: 'Server misconfigured' });
  }

  const { data: updated, error: updateErr } = await supabase
    .from('form_submissions')
    .update({ replied: true, newsletter_opt_in: true })
    .ilike('email', sender)
    .select('id, email, replied, replied_at, newsletter_opt_in');

  if (updateErr) {
    console.error('[email-reply] supabase update failed', updateErr);
    return res.status(500).json({ ok: false, error: 'Update failed' });
  }

  console.log(`[email-reply] matched ${updated?.length ?? 0} row(s) for sender ${sender}`);

  return res.status(200).json({ ok: true, sender, rows_updated: updated?.length ?? 0 });
}
