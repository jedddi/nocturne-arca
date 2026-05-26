import { checkPassword, issueSessionCookie, clearSessionCookie } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ ok: false, error: 'Invalid JSON' }); }
  }

  if (body?.action === 'logout') {
    res.setHeader('Set-Cookie', clearSessionCookie());
    return res.status(200).json({ ok: true });
  }

  const password = body?.password;
  if (!password) {
    return res.status(400).json({ ok: false, error: 'Password is required' });
  }

  try {
    if (!checkPassword(password)) {
      return res.status(401).json({ ok: false, error: 'Invalid password' });
    }
    res.setHeader('Set-Cookie', issueSessionCookie());
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[dashboard/login] config error', err);
    return res.status(500).json({ ok: false, error: 'Server is misconfigured' });
  }
}
