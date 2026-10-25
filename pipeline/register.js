// Registers a county's documents: re-hashes every document already listed in
// its documents.json, and lists any new PDF in its inbox for a person to
// describe. It never removes a document and never invents a title.
//
// Usage: node pipeline/register.js [county-key]      (default: the default county)
//
//   - Listed documents: SHA-256 and size are refreshed from the stored file. A
//     changed hash is reported, because a public record we cite should not change.
//   - New PDFs in the county's inbox: written to data/review/<key>-new-documents.json
//     as stubs (hash, size, file). Fill in title, jurisdiction, year and
//     source_url, then copy them into documents.json by hand.
//
// The county's inbox is `inboxDir` in config/tenants.json, else inbox/<key>/.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const T = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'tenants.json'), 'utf8'));
const key = process.argv[2] || T.default;
const t = T.tenants[key];
if (!t) { console.error(`No county "${key}" in config/tenants.json.`); process.exit(1); }

const OUT = path.join(ROOT, t.corpusDir, 'documents.json');
const INBOX = path.join(ROOT, t.inboxDir || path.join('inbox', key));
const STORED = 'Downloaded and hashed; not yet ingested into the money trail.';

const hash = (fp) => { const buf = fs.readFileSync(fp); return { sha256: crypto.createHash('sha256').update(buf).digest('hex'), size_bytes: buf.length }; };

let doc = { documents: [] }, indent = 2;
try { const raw = fs.readFileSync(OUT, 'utf8'); doc = JSON.parse(raw); indent = ((raw.match(/\n( +)\S/) || [])[1] || '  ').length; } catch (e) { /* first run for this county */ }

let refreshed = 0; const changed = [], missing = [];
for (const d of doc.documents) {
  if (!d.local_file) continue;
  const fp = path.join(ROOT, d.local_file);
  if (!fs.existsSync(fp)) { missing.push(d.local_file); continue; }
  const h = hash(fp);
  if (d.sha256 && d.sha256 !== h.sha256) changed.push(d.id);
  Object.assign(d, h); refreshed++;
}
fs.writeFileSync(OUT, JSON.stringify(doc, null, indent) + '\n');

// Older counties share the top-level inbox, so a file any county lists isn't new.
const listed = new Set(doc.documents.map(d => d.local_file).filter(Boolean).map(f => path.normalize(f)));
for (const o of Object.values(T.tenants)) {
  try { for (const d of JSON.parse(fs.readFileSync(path.join(ROOT, o.corpusDir, 'documents.json'), 'utf8')).documents) if (d.local_file) listed.add(path.normalize(d.local_file)); } catch (e) { /* no documents yet */ }
}
const fresh = (fs.existsSync(INBOX) ? fs.readdirSync(INBOX) : [])
  .filter(f => /\.pdf$/i.test(f))
  .map(f => path.relative(ROOT, path.join(INBOX, f)).split(path.sep).join('/'))
  .filter(f => !listed.has(path.normalize(f)))
  .map(f => ({
    id: path.basename(f, path.extname(f)).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    title: null, jurisdiction: null, year: null, source_url: null, layer: 'reference',
    status: 'stored', status_note: STORED, retrieved_at: new Date().toISOString().slice(0, 10),
    ...hash(path.join(ROOT, f)), local_file: f
  }));

console.log(`${key}: re-hashed ${refreshed} listed document${refreshed === 1 ? '' : 's'} → ${path.relative(ROOT, OUT)}`);
if (changed.length) console.log(`  HASH CHANGED (the stored file differs from what was registered): ${changed.join(', ')}`);
if (missing.length) console.log(`  listed but not on disk: ${missing.join(', ')}`);
if (fresh.length) {
  const rv = path.join(ROOT, 'data', 'review', `${key}-new-documents.json`);
  fs.mkdirSync(path.dirname(rv), { recursive: true });
  fs.writeFileSync(rv, JSON.stringify({ documents: fresh }, null, 2));
  console.log(`  ${fresh.length} new PDF${fresh.length === 1 ? '' : 's'} in ${path.relative(ROOT, INBOX) || 'inbox'} → ${path.relative(ROOT, rv)} — describe them, then add them to documents.json`);
}
