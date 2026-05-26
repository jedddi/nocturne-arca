import crypto from 'node:crypto';
import { loadEnv } from './env.js';

const COOKIE_NAME = 'dash_session';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function secret() {
  loadEnv();
  const s = process.env.DASHBOARD_SESSION_SECRET;
  if (!s) throw new Error('Missing DASHBOARD_SESSION_SECRET');
  return s;
}

function expectedPassword() {
  loadEnv();
  const p = process.env.DASHBOARD_PASSWORD;
  if (!p) throw new Error('Missing DASHBOARD_PASSWORD');
  return p;
}

export function checkPassword(submitted) {
  const a = Buffer.from(String(submitted || ''), 'utf8');
  const b = Buffer.from(expectedPassword(), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function sign(payload) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('hex');
}

export function issueSessionCookie() {
  const expiry = Date.now() + SESSION_TTL_MS;
  const sig = sign(String(expiry));
  const value = `${expiry}.${sig}`;
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  return `${COOKIE_NAME}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

export function verifySession(req) {
  const cookies = parseCookies(req.headers?.cookie);
  const raw = cookies[COOKIE_NAME];
  if (!raw) return false;
  const dot = raw.indexOf('.');
  if (dot === -1) return false;
  const expiry = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = sign(expiry);
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length) return false;
  if (!crypto.timingSafeEqual(a, b)) return false;
  const ts = Number(expiry);
  if (!Number.isFinite(ts) || ts < Date.now()) return false;
  return true;
}

export function requireSession(req, res) {
  if (verifySession(req)) return true;
  res.status(401).json({ ok: false, error: 'Unauthorized' });
  return false;
}
