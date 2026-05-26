#!/usr/bin/env node
import { runFollowups } from './api/cron/followups.js';

const start = Date.now();
runFollowups()
  .then((results) => {
    const ms = Date.now() - start;
    console.log(JSON.stringify({ ok: true, ms, ...results }, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error(JSON.stringify({ ok: false, error: err.message || String(err) }, null, 2));
    process.exit(1);
  });
