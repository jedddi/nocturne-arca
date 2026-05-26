#!/usr/bin/env node
// Idempotent seed: removes prior seed rows (message LIKE '[seed]%'), then
// inserts 20 varied form_submissions for dashboard demos.
//
// Run:  node scripts/seed-submissions.js   (or `npm run seed`)

import { getSupabase } from '../api/_lib/supabase.js';

const PEOPLE = [
  { name: 'Ada Lovelace',         email: 'ada.lovelace@example.test' },
  { name: 'Grace Hopper',         email: 'grace.hopper@example.test' },
  { name: 'Alan Turing',          email: 'alan.turing@example.test' },
  { name: 'Margaret Hamilton',    email: 'margaret.h@example.test' },
  { name: 'Katherine Johnson',    email: 'katherine.j@example.test' },
  { name: 'Linus Torvalds',       email: 'linus@example.test' },
  { name: 'Barbara Liskov',       email: 'barbara.l@example.test' },
  { name: 'Donald Knuth',         email: 'donald.k@example.test' },
  { name: 'Radia Perlman',        email: 'radia@example.test' },
  { name: 'Tim Berners-Lee',      email: 'tbl@example.test' },
  { name: 'Hedy Lamarr',          email: 'hedy.l@example.test' },
  { name: 'John Carmack',         email: 'carmack@example.test' },
  { name: 'Anita Borg',           email: 'anita.b@example.test' },
  { name: 'Brian Kernighan',      email: 'bwk@example.test' },
  { name: 'Frances Allen',        email: 'frances.a@example.test' },
  { name: 'Dennis Ritchie',       email: 'dmr@example.test' },
  { name: 'Sophie Wilson',        email: 'sophie.w@example.test' },
  { name: 'Vint Cerf',            email: 'vint@example.test' },
  { name: 'Joan Clarke',          email: 'joan.c@example.test' },
  { name: 'Edsger Dijkstra',      email: 'ewd@example.test' },
];

const MESSAGE_TEMPLATES = [
  'Saw the Volta launch reel — would love early access details.',
  'Interested in the smartglass line. Any timeline for the next drop?',
  'Could you share material spec sheets? Researching for an article.',
  'Hoping to inquire about bulk concierge orders for a small team.',
  'Beautiful site. Curious how the optics handle low-light environments.',
  'Is there a press contact? Writing a feature on quiet luxury hardware.',
  'Reaching out about a possible retail partnership in Tokyo.',
  'Would be grateful for an introduction to the atelier team.',
  'Following since the smartwatch teaser. When are pre-orders?',
  'Question about the lens coatings — happy to chat over a call.',
];

// 20 rows. Distribution chosen so every dashboard section has interesting data.
// follow_ups_sent distribution: 10× 0, 4× 1, 4× 2, 2× 3.
const SHAPE = [
  // [follow_ups_sent, replied, newsletter_opt_in, days_ago]
  [0, false, true,  1],
  [0, false, true,  2],
  [0, false, true,  3],
  [0, false, true,  4],
  [0, false, false, 5],
  [0, true,  true,  6],
  [0, true,  true,  7],
  [0, true,  true,  8],
  [0, true,  false, 9],
  [0, true,  false, 10],
  [1, false, true,  12],
  [1, false, true,  14],
  [1, true,  true,  16],
  [1, false, false, 18],
  [2, false, true,  20],
  [2, false, true,  22],
  [2, true,  true,  24],
  [2, true,  false, 26],
  [3, false, true,  28],
  [3, true,  true,  30],
];

function isoDaysAgo(days) {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

function buildRows() {
  return SHAPE.map(([followups, replied, optIn, daysAgo], idx) => {
    const person = PEOPLE[idx % PEOPLE.length];
    const message = `[seed] ${MESSAGE_TEMPLATES[idx % MESSAGE_TEMPLATES.length]}`;
    const created_at = isoDaysAgo(daysAgo);
    const last_follow_up_at = followups > 0 ? isoDaysAgo(Math.max(daysAgo - followups * 2, 0)) : null;
    return {
      name: person.name,
      email: person.email,
      message,
      replied,
      newsletter_opt_in: optIn,
      follow_ups_sent: followups,
      last_follow_up_at,
      created_at,
    };
  });
}

async function main() {
  const supabase = getSupabase();

  const { data: deleted, error: delErr } = await supabase
    .from('form_submissions')
    .delete()
    .like('message', '[seed]%')
    .select('id');
  if (delErr) {
    console.error('Delete failed:', delErr);
    process.exit(1);
  }
  console.log(`Deleted ${deleted?.length ?? 0} prior seed rows`);

  const rows = buildRows();
  const { error: insErr } = await supabase
    .from('form_submissions')
    .insert(rows);
  if (insErr) {
    console.error('Insert failed:', insErr);
    process.exit(1);
  }

  const subs = rows.filter(r => r.newsletter_opt_in).length;
  const replied = rows.filter(r => r.replied).length;
  const followups = rows.reduce((s, r) => s + r.follow_ups_sent, 0);
  console.log(`Inserted ${rows.length} submissions`);
  console.log(`  subscribers (opted in): ${subs}`);
  console.log(`  replied:                ${replied}`);
  console.log(`  follow-up emails total: ${followups}`);
  console.log(`  ⇒ email log entries:    ${rows.length + followups}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
