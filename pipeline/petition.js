#!/usr/bin/env node
// Run ON THE SERVER (data/priorities.json and the identity files live there).
// County Commons has no sign-in: the steps a host once did in a web admin are
// done here by the operator. Every outcome is cited and lands in the public
// activity log, exactly as before.
//
//   node pipeline/petition.js find "<words>"            # search open petitions by title or id
//   node pipeline/petition.js show <id>                  # count, goal, timeline
//   node pipeline/petition.js packet <id> > packet.html  # printable copy for delivery (the only place names appear)
//   node pipeline/petition.js outcome <id> <delivered|answered|acted> <YYYY-MM-DD> "<what happened>" [source-url] ["source label"]
//   node pipeline/petition.js undo <id>                  # remove the most recent outcome (a mis-entry)
//   node pipeline/petition.js remove <id>                # take a petition down (spam, a bright-line problem)
const P = require('../server/priorities');
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const [cmd, id, ...rest] = process.argv.slice(2);
const need = (p) => { if (!p) { console.error('No petition with id ' + id); process.exit(1); } return p; };

if (cmd === 'find') {
  const q = [id, ...rest].join(' ').toLowerCase();
  const hits = P.allPublic().filter(p => (p.title + ' ' + p.id).toLowerCase().includes(q)).sort((a, b) => b.support - a.support).slice(0, 30);
  for (const p of hits) console.log(`${p.support}\t${p.tenant}\t${p.id}\t${p.title.slice(0, 80)}`);
  if (!hits.length) console.log('No match.');
} else if (cmd === 'show') {
  const p = need(P.getPublic(id));
  console.log(`${p.title}\nTo: ${p.to || '(the governing body)'}\nWhere: ${p.tenant} · level ${p.level}\nSigned: ${p.support}${p.goal ? ' of ' + p.goal : ''} · phase ${p.phase}`);
  for (const e of p.timeline) console.log(`  ${e.at} ${e.stage}: ${e.note}${e.source ? ' (' + (e.source.url || e.source.label) + ')' : ''}`);
} else if (cmd === 'packet') {
  const p = need(P.getPublic(id));
  const k = require('../server/tally').petitionPacket(id);
  const today = new Date().toISOString().slice(0, 10);
  process.stdout.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Petition for delivery — ${esc(p.title)}</title>
<style>body{font-family:Georgia,serif;max-width:7.5in;margin:0 auto;padding:.5in .4in;color:#111}h1{font-size:26px}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ccc;padding:4px 6px;text-align:left;font-size:14px}.small{font-size:12.5px;color:#333}</style></head><body>
<p class="small">PETITION · prepared ${today}</p><h1>${esc(p.title)}</h1>
<p><b>To:</b> ${esc(p.to || 'the governing body')}</p>
<p><b>From:</b> ${k.total} people who signed at County Commons, started ${esc(String(p.created_at).slice(0, 10))}.</p>
<p style="white-space:pre-line">${esc(p.why)}</p>
<h2 style="font-size:18px">Signatures by town</h2><table><tbody>${k.by_town.map(([t, n]) => `<tr><td>${esc(t)}</td><td style="text-align:right">${n}</td></tr>`).join('')}</tbody></table>
<h2 style="font-size:18px">Signers who asked to be named (${k.names.length})</h2>
${k.names.length ? `<table><thead><tr><th>Name</th><th>Town</th></tr></thead><tbody>${k.names.map(x => `<tr><td>${esc(x.name)}</td><td>${esc(x.town)}</td></tr>`).join('')}</tbody></table>` : '<p class="small">None asked to be named; all are counted by town above.</p>'}
<p class="small" style="margin-top:.3in">How it was counted: one signature per browser, as typed by each signer, not verified against voter rolls. ${k.duplicates_removed} duplicate${k.duplicates_removed === 1 ? '' : 's'} (same email, phone, or name and town) removed. Names appear only for signers who checked the box to be named.</p>
</body></html>\n`);
} else if (cmd === 'outcome') {
  need(P.getPublic(id));
  const [stage, at, note, url, label] = rest;
  const r = P.addOutcome(id, { stage, at, note, source: { url, label }, by: 'County Commons' });
  console.log(r.ok ? `Recorded: ${stage} on ${at}.` : `Not recorded: ${r.error} (stage must be delivered, answered or acted).`);
} else if (cmd === 'undo') {
  need(P.get(id)); const r = P.undoOutcome(id); console.log(r.ok ? 'Removed the most recent outcome.' : 'Nothing to undo.');
} else if (cmd === 'remove') {
  need(P.get(id)); P.remove(id); try { require('../server/lib/chain').append('owner-action', { by: 'operator', what: `removed petition ${id}` }); } catch (e) { /* log optional */ }
  console.log('Removed.');
} else {
  console.log(require('fs').readFileSync(__filename, 'utf8').split('\n').slice(1, 13).join('\n'));
}
