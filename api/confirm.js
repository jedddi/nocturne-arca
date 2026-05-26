import { getSupabase } from './_lib/supabase.js';
import { loadEnv } from './_lib/env.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const escapeHtml = (s = '') =>
  String(s).replace(/[<>&"']/g, c => ({ '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;' }[c]));

const PAGE_HEAD = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Correspondence sealed — Maison Nocturne</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@300;400;500&display=swap" rel="stylesheet" />
<style>
  :root {
    --bg:#000; --text:#F5F5F7; --muted:#86868B; --dim:#4A4A4E; --line:#181818; --gold:#C9A961;
    --serif:'Instrument Serif','Times New Roman',serif;
    --sans:'Geist',system-ui,-apple-system,sans-serif;
    --mono:'Geist Mono',ui-monospace,monospace;
    --ease:cubic-bezier(.22,.61,.36,1);
  }
  *,*::before,*::after{box-sizing:border-box;}
  body{margin:0;background:var(--bg);color:var(--text);font-family:var(--sans);font-weight:400;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:48px;position:relative;overflow-x:hidden;}
  body::before{content:'';position:fixed;inset:0;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/></svg>");opacity:.035;mix-blend-mode:overlay;pointer-events:none;z-index:1;}
  .wrap{max-width:640px;text-align:center;position:relative;z-index:2;animation:fade-up 1.2s var(--ease) both;}
  @keyframes fade-up{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
  .eyebrow{font-family:var(--mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--muted);margin:0 0 32px;display:inline-flex;align-items:center;gap:16px;}
  .eyebrow::before,.eyebrow::after{content:'';width:28px;height:1px;background:var(--dim);}
  h1{font-family:var(--serif);font-weight:400;font-size:clamp(2.5rem,6vw,4.5rem);line-height:1.05;letter-spacing:-.01em;margin:0 0 32px;}
  h1 em{font-style:italic;color:var(--gold);}
  .lede{font-size:1.05rem;line-height:1.6;color:var(--muted);max-width:460px;margin:0 auto 64px;}
  .return{display:inline-flex;align-items:center;gap:12px;font-family:var(--mono);font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--text);text-decoration:none;padding-bottom:6px;border-bottom:1px solid var(--line);transition:gap .5s var(--ease),color .5s var(--ease),border-color .5s var(--ease);}
  .return:hover{gap:18px;color:var(--gold);border-bottom-color:var(--gold);}
  .invalid h1 em{color:#86868B;}
</style>
</head>`;

function renderPage({ eyebrow, heading, lede, klass = '' }) {
  return `${PAGE_HEAD}
<body${klass ? ` class="${klass}"` : ''}>
  <main class="wrap">
    <p class="eyebrow">${eyebrow}</p>
    <h1>${heading}</h1>
    <p class="lede">${lede}</p>
    <a href="/" class="return">Return home <span>→</span></a>
  </main>
</body>
</html>`;
}

const INVALID = renderPage({
  eyebrow: 'Correspondence · Untraceable',
  heading: `This <em>seal is unfamiliar</em>.`,
  lede: 'The link no longer leads anywhere. If you intended to confirm your correspondence, write to us again from the home page.',
  klass: 'invalid',
});

const PAUSED = renderPage({
  eyebrow: 'Correspondence · Held',
  heading: `A brief <em>pause</em>.`,
  lede: 'We could not reach the archive at this moment. Please try the link again in a few minutes.',
  klass: 'invalid',
});

function sendHtml(res, status, html) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).send(html);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).send('Method not allowed');
    return;
  }

  loadEnv();

  const id = (req.query?.id || '').toString().trim();
  if (!id || !UUID_RE.test(id)) return sendHtml(res, 400, INVALID);

  let supabase;
  try { supabase = getSupabase(); }
  catch (err) {
    console.error('[confirm] supabase init failed', err);
    return sendHtml(res, 500, PAUSED);
  }

  const { data, error } = await supabase
    .from('form_submissions')
    .update({ replied: true, newsletter_opt_in: true })
    .eq('id', id)
    .select('id, name')
    .maybeSingle();

  if (error) {
    console.error('[confirm] supabase update failed', error);
    return sendHtml(res, 500, PAUSED);
  }

  if (!data) return sendHtml(res, 404, INVALID);

  const first = escapeHtml((data.name || '').trim().split(/\s+/)[0] || 'friend');
  const success = renderPage({
    eyebrow: 'Correspondence · Sealed',
    heading: `Welcome, <em>${first}</em>.`,
    lede: 'Your correspondence is now part of the Maison. Quiet dispatches from the workshop will find you when there is something worth saying.',
  });

  return sendHtml(res, 200, success);
}
