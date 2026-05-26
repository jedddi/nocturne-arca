import { getSupabase } from './_lib/supabase.js';
import { getResend, getFrom, getReplyTo, renderConfirmationEmail } from './_lib/resend.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME = 200;
const MAX_EMAIL = 320;
const MAX_MESSAGE = 4000;

const bad = (res, status, message) =>
  res.status(status).json({ ok: false, error: message });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return bad(res, 405, 'Method not allowed');
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return bad(res, 400, 'Invalid JSON'); }
  }
  if (!body || typeof body !== 'object') return bad(res, 400, 'Missing body');

  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const message = String(body.message || '').trim();

  if (!name) return bad(res, 400, 'Name is required');
  if (name.length > MAX_NAME) return bad(res, 400, 'Name is too long');
  if (!email) return bad(res, 400, 'Email is required');
  if (email.length > MAX_EMAIL || !EMAIL_RE.test(email)) return bad(res, 400, 'Email looks invalid');
  if (!message) return bad(res, 400, 'Message is required');
  if (message.length > MAX_MESSAGE) return bad(res, 400, 'Message is too long');

  let supabase;
  try {
    supabase = getSupabase();
  } catch (err) {
    console.error('[submit] supabase init failed', err);
    return bad(res, 500, 'Server is misconfigured (Supabase)');
  }

  const { data: inserted, error: insertErr } = await supabase
    .from('form_submissions')
    .insert({ name, email, message })
    .select('id')
    .single();

  if (insertErr) {
    console.error('[submit] supabase insert failed', insertErr);
    return bad(res, 500, 'Could not record submission');
  }

  try {
    const resend = getResend();
    const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
    const confirmUrl = `${baseUrl.replace(/\/$/, '')}/api/confirm?id=${encodeURIComponent(inserted.id)}`;

    const rendered = renderConfirmationEmail({ name, confirmUrl });
    const sendArgs = {
      from: getFrom(),
      to: email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    };

    const replyTo = getReplyTo();
    if (replyTo) sendArgs.replyTo = replyTo;

    const sendResult = await resend.emails.send(sendArgs);
    if (sendResult.error) {
      console.error('[submit] resend send returned error', sendResult.error);
    }
  } catch (err) {
    console.error('[submit] resend send threw', err);
  }

  return res.status(200).json({ ok: true, id: inserted.id });
}
