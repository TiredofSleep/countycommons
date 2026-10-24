#!/usr/bin/env node
// Read the drop-box, and log fixes in public. Run on the server box:
//   ssh -i ~/.ssh/countycommons root@134.209.120.2 'cd /opt/countycommons && node pipeline/feedback.js'
//   node pipeline/feedback.js                         every note, oldest first
//   node pipeline/feedback.js --new                   only notes not yet marked handled
//   node pipeline/feedback.js --fixed <id> "what changed"
//        logs the fix on /building (page and site from the note; credit only if
//        the sender asked) and marks the note handled
//   node pipeline/feedback.js --handled <id>          mark handled without a public fix (spam, duplicate, not a change)
//   node pipeline/feedback.js --log <site|all> <page> "what changed"
//        logs a fix that came from an email or a conversation
// Attached files live in data/feedback/ — scp them down to view.

const fs = require('fs');
const path = require('path');
const { CORRECTIONS, FEEDBACK: dir } = require('../server/lib/building');

const args = process.argv.slice(2);
const today = new Date().toISOString().slice(0, 10);
const readNote = (id) => { try { return JSON.parse(fs.readFileSync(path.join(dir, id + '.json'), 'utf8')); } catch (e) { return null; } };
const writeNote = (r) => fs.writeFileSync(path.join(dir, r.id + '.json'), JSON.stringify(r, null, 2));
function logFix(entry) {
  let s = { corrections: [] };
  try { s = JSON.parse(fs.readFileSync(CORRECTIONS, 'utf8')); } catch (e) { /* first one */ }
  s.corrections.push(entry);
  fs.writeFileSync(CORRECTIONS + '.tmp', JSON.stringify(s, null, 2));
  fs.renameSync(CORRECTIONS + '.tmp', CORRECTIONS);
  console.log(`Logged on /building: ${entry.date} · ${entry.site || 'all sites'} · ${entry.page || ''} · ${entry.what}`);
}

if (args[0] === '--fixed' || args[0] === '--handled') {
  const r = readNote(args[1]);
  if (!r) { console.log('No note with that id.'); process.exit(1); }
  if (args[0] === '--fixed') {
    if (!args[2]) { console.log('Say what changed: --fixed <id> "what changed"'); process.exit(1); }
    logFix({ date: today, site: r.site || null, page: r.page || null, what: args[2], credit: r.credit || null, from_note: r.id });
  }
  r.handled = today; writeNote(r);
  console.log(`Marked ${r.id} handled.`);
  process.exit(0);
}
if (args[0] === '--log') {
  if (args.length < 4) { console.log('Usage: --log <site|all> <page> "what changed"'); process.exit(1); }
  logFix({ date: today, site: args[1] === 'all' ? null : args[1], page: args[2], what: args[3], credit: null });
  process.exit(0);
}

if (!fs.existsSync(dir)) { console.log('No feedback directory yet — no messages.'); process.exit(0); }
let files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
const notes = files.map(f => { try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { return { id: f, message: '(unreadable)' }; } })
  .filter(r => args[0] !== '--new' || !r.handled);
if (!notes.length) { console.log(args[0] === '--new' ? 'No new notes.' : 'No messages.'); process.exit(0); }
console.log(`${notes.length} note(s), oldest first:\n`);
for (const r of notes) {
  console.log(`— ${r.id}  [${r.kind || 'problem'}]${r.handled ? `  (handled ${r.handled})` : ''}`);
  console.log(`  ${r.site || ''}${r.page ? `  ·  ${r.page}` : ''}`);
  if (r.source) console.log(`  source: ${r.source}`);
  if (r.contact) console.log(`  reach them: ${r.contact}`);
  if (r.credit) console.log(`  credit as: ${r.credit}`);
  if (r.screenshot) console.log(`  file: data/feedback/${r.screenshot}`);
  console.log(`  ${String(r.message || '').replace(/\n/g, '\n  ')}\n`);
}
