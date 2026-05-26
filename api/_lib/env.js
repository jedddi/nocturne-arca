import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

let loaded = false;

export function loadEnv() {
  if (loaded) return;
  loaded = true;

  if (process.env.VERCEL || process.env.VERCEL_ENV) return;

  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(here, '../../.env.local'),
    resolve(here, '../../.env'),
  ];
  for (const file of candidates) {
    if (existsSync(file)) {
      config({ path: file, override: false });
    }
  }
}
