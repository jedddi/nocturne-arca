import { Resend } from 'resend';
import { loadEnv } from './env.js';

let _resend = null;

export function getResend() {
  if (_resend) return _resend;
  loadEnv();
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('Missing RESEND_API_KEY env var');
  _resend = new Resend(apiKey);
  return _resend;
}

export const getFrom = () => {
  loadEnv();
  return process.env.RESEND_FROM || 'Maison Nocturne <onboarding@resend.dev>';
};
export const getReplyTo = () => {
  loadEnv();
  return process.env.RESEND_REPLY_TO || null;
};

const escapeHtml = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const firstName = (name = '') => name.trim().split(/\s+/)[0] || 'friend';

const baseShell = ({ eyebrow, heading, body, signoff = 'The Maison' }) => {
  const styles = {
    bg: '#000000',
    text: '#F5F5F7',
    muted: '#86868B',
    dim: '#4A4A4E',
    line: '#181818',
    gold: '#C9A961',
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;background:${styles.bg};color:${styles.text};font-family:'Geist','Helvetica Neue',Arial,sans-serif;font-weight:400;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${styles.bg};">
    <tr>
      <td align="center" style="padding:64px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <tr>
            <td style="padding-bottom:32px;">
              <p style="margin:0;font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${styles.muted};">
                <span style="display:inline-block;width:28px;height:1px;background:${styles.dim};vertical-align:middle;margin-right:14px;"></span>
                ${escapeHtml(eyebrow)}
                <span style="display:inline-block;width:28px;height:1px;background:${styles.dim};vertical-align:middle;margin-left:14px;"></span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:28px;">
              <h1 style="margin:0;font-family:'Instrument Serif','Times New Roman',serif;font-weight:400;font-size:42px;line-height:1.08;letter-spacing:-0.01em;color:${styles.text};">
                ${heading}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:36px;">
              <div style="font-size:15px;line-height:1.65;color:${styles.text};opacity:0.92;">
                ${body}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding-top:24px;border-top:1px solid ${styles.line};">
              <p style="margin:0 0 4px;font-family:'Instrument Serif','Times New Roman',serif;font-style:italic;font-size:18px;color:${styles.gold};">
                ${escapeHtml(signoff)}
              </p>
              <p style="margin:0;font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:${styles.muted};">
                Maison Nocturne
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  return html;
};

function ctaBlock(confirmUrl, hint) {
  if (!confirmUrl) return '';
  const safeUrl = escapeHtml(confirmUrl);
  return `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
        <tr>
          <td style="border:1px solid #C9A961;">
            <a href="${safeUrl}"
               style="display:inline-block;padding:14px 28px;font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#C9A961;text-decoration:none;">
              Affix the seal &nbsp;&rarr;
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 18px;color:#86868B;font-size:13px;">${hint}</p>
    `;
}

export function renderConfirmationEmail({ name, confirmUrl }) {
  const fn = escapeHtml(firstName(name));

  const subject = 'Your note has reached the Maison';

  const html = baseShell({
    eyebrow: 'Correspondence · Received',
    heading: `Thank you, <em style="font-style:italic;color:#C9A961;">${fn}</em>.`,
    body: `
      <p style="margin:0 0 24px;">Your note is safely held. A member of the Maison will read it personally and respond within forty-eight hours &mdash; quietly, as is our habit.</p>
      ${ctaBlock(confirmUrl, 'By affixing the seal, you confirm your correspondence with the Maison and invite our quiet dispatches to find you again.')}
      <p style="margin:0;color:#86868B;font-size:13px;">In the meantime, you may wish to wander the lookbook again at <a href="https://maison-nocturne.com" style="color:#C9A961;text-decoration:none;border-bottom:1px solid #C9A961;">maison-nocturne.com</a>.</p>
    `,
  });

  const text = `Thank you, ${firstName(name)}.

Your note is safely held. A member of the Maison will read it personally and respond within forty-eight hours — quietly, as is our habit.

${confirmUrl ? `Affix the seal — confirm your correspondence and invite our quiet dispatches:\n${confirmUrl}\n\n` : ''}— The Maison
Maison Nocturne`;

  return { subject, html, text };
}

function renderProductValue({ name, confirmUrl }) {
  const fn = escapeHtml(firstName(name));
  const subject = 'On the lens';
  const html = baseShell({
    eyebrow: 'Dispatch · One',
    heading: `On the lens, <em style="font-style:italic;color:#C9A961;">${fn}</em>.`,
    body: `
      <p style="margin:0 0 18px;">The lens of Volta is shaped by a single craftsman over the course of a week. Light entering at dawn is treated differently than light at dusk &mdash; the coating accounts for this, gently.</p>
      <p style="margin:0 0 24px;">Worn long enough, the frame ceases to be jewelry and becomes part of how one looks at the world. We do not advertise this; it simply happens.</p>
      ${ctaBlock(confirmUrl, 'If you would like to hear from the workshop now and then, you may seal your correspondence here.')}
    `,
  });
  const text = `On the lens, ${firstName(name)}.

The lens of Volta is shaped by a single craftsman over the course of a week. Light entering at dawn is treated differently than light at dusk — the coating accounts for this, gently.

Worn long enough, the frame ceases to be jewelry and becomes part of how one looks at the world. We do not advertise this; it simply happens.

${confirmUrl ? `Seal your correspondence: ${confirmUrl}\n\n` : ''}— The Maison
Maison Nocturne`;
  return { subject, html, text };
}

function renderTestimonial({ name, confirmUrl }) {
  const fn = escapeHtml(firstName(name));
  const subject = 'An early wearer wrote';
  const html = baseShell({
    eyebrow: 'Dispatch · Two',
    heading: `An early wearer wrote, <em style="font-style:italic;color:#C9A961;">${fn}</em>.`,
    body: `
      <blockquote style="margin:0 0 22px;padding:0 0 0 18px;border-left:1px solid #C9A961;font-family:'Instrument Serif',serif;font-style:italic;font-size:18px;line-height:1.55;color:#F5F5F7;">
        &ldquo;I forget I am wearing them &mdash; and then someone mentions the gold at the temple, and I remember.&rdquo;
      </blockquote>
      <p style="margin:0 0 24px;color:#86868B;font-size:13px;">&mdash; Aoife M., early wearer</p>
      <p style="margin:0 0 24px;">We share this only because we keep hearing it, in different words, from the people who have one. We thought you might wish to know.</p>
      ${ctaBlock(confirmUrl, 'If you would like the rest of the correspondence to find you, seal it here.')}
    `,
  });
  const text = `An early wearer wrote, ${firstName(name)}.

"I forget I am wearing them — and then someone mentions the gold at the temple, and I remember."
— Aoife M., early wearer

We share this only because we keep hearing it, in different words, from the people who have one. We thought you might wish to know.

${confirmUrl ? `Seal your correspondence: ${confirmUrl}\n\n` : ''}— The Maison
Maison Nocturne`;
  return { subject, html, text };
}

function renderWorkshopUpdate({ name, confirmUrl }) {
  const fn = escapeHtml(firstName(name));
  const subject = 'A note from the bench';
  const html = baseShell({
    eyebrow: 'Dispatch · Three',
    heading: `A note from the bench, <em style="font-style:italic;color:#C9A961;">${fn}</em>.`,
    body: `
      <p style="margin:0 0 18px;">We are coming to the end of the obsidian colorway &mdash; perhaps a dozen more will leave the bench this season. A warm taupe is in trial; we will share something of it when it earns the right to be seen.</p>
      <p style="margin:0 0 24px;">If you ever wished to know how a frame is made, write back. We will send pictures &mdash; the kind you do not see on the lookbook.</p>
      ${ctaBlock(confirmUrl, 'And if you would like the workshop to keep you in mind, seal your correspondence here.')}
    `,
  });
  const text = `A note from the bench, ${firstName(name)}.

We are coming to the end of the obsidian colorway — perhaps a dozen more will leave the bench this season. A warm taupe is in trial; we will share something of it when it earns the right to be seen.

If you ever wished to know how a frame is made, write back. We will send pictures — the kind you do not see on the lookbook.

${confirmUrl ? `Seal your correspondence: ${confirmUrl}\n\n` : ''}— The Maison
Maison Nocturne`;
  return { subject, html, text };
}

export const FOLLOWUP_VARIANTS = ['product-value', 'testimonial', 'workshop-update'];

export function renderFollowupEmail({ variant, name, confirmUrl }) {
  switch (variant) {
    case 0: return renderProductValue({ name, confirmUrl });
    case 1: return renderTestimonial({ name, confirmUrl });
    case 2: return renderWorkshopUpdate({ name, confirmUrl });
    default: throw new Error(`Unknown follow-up variant: ${variant}`);
  }
}
