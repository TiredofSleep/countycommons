// Solutions — cited proposals filed under a topic question.
//
// A question asks "what should we do about X?" A solution is one person's
// answer: a clear, concise, CITED proposal for how to move forward. Anyone can
// file one; everyone else clicks yes or no on it — no comment threads, no
// debate, just the proposal, its sources, and the count. Ideas compete on the
// strength of their citations and how many people back them, not on rhetoric.
//
// Like priorities, the solution TEXT is public advocacy (meant to be read), but
// who voted yes/no is a private count keyed by the per-sitting participant token,
// never a name. Same charter bright lines: no candidates, no active ballot
// measures, no named-individual conduct — screened in code before it publishes.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const chain = require('./lib/chain');

const STORE = path.join(__dirname, '..', 'data', 'solutions.json');

function load() {
  try { return JSON.parse(fs.readFileSync(STORE, 'utf8')); }
  catch (e) { return { solutions: {} }; }
}
function save(s) {
  const tmp = STORE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(s, null, 2));
  fs.renameSync(tmp, STORE);
}

// Parse the sources box: one citation per line. A line that looks like a URL
// becomes a link; anything else is kept as a plain-text reference. This is how
// "cited" is enforced — at least one non-empty source is required.
function parseCitations(raw) {
  return String(raw || '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .slice(0, 12)
    .map(line => {
      const m = line.match(/https?:\/\/[^\s]+/);
      if (m) {
        const url = m[0].slice(0, 300);
        const label = line.replace(url, '').replace(/[\s|—:-]+$/, '').replace(/^[\s|—:-]+/, '').trim().slice(0, 140);
        return { url, label: label || url.replace(/^https?:\/\/(www\.)?/, '') };
      }
      return { label: line.slice(0, 200) };
    });
}

function namesAnOfficial(text, county) {
  const t = ' ' + String(text || '').toLowerCase() + ' ';
  const roster = [];
  for (const o of (county && county.officials) || []) if (o.name) roster.push(o.name);
  for (const j of (((county && county.quorum_court) || {}).justices) || []) if (j.name) roster.push(j.name);
  return roster.some(full => {
    const name = full.toLowerCase().replace(/["'".]/g, '').trim();
    return name.split(/\s+/).length >= 2 && t.includes(name);
  });
}

// File a solution under a question. Returns { id } or { error, flags? }.
// Publishes immediately (like priorities) — bright-line hit is a hard stop.
function file({ tenant, question_id, title, summary, citations, participant, county }) {
  title = String(title || '').trim().slice(0, 160);
  summary = String(summary || '').trim().slice(0, 1200);
  const cites = parseCitations(citations);
  if (!title || !summary) return { error: 'missing' };
  if (!cites.length) return { error: 'uncited' };

  const text = title + ' ' + summary;
  const flags = require('./submissions').screen(text);
  if (namesAnOfficial(text, county)) flags.push('names-an-official');
  if (flags.length) return { error: 'bright-line', flags };

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'solution';
  const id = `${slug}-${crypto.randomBytes(2).toString('hex')}`;
  const now = new Date().toISOString();
  const s = load();
  s.solutions[id] = {
    id, tenant, question_id: String(question_id || '').slice(0, 80),
    title, summary, citations: cites,
    created_at: now,
    // Votes are a map of token -> 'yes' | 'no'. The filer is not auto-counted;
    // filing a proposal isn't the same as voting for it.
    votes: {},
    status: 'open'
  };
  chain.append('solution-filed', { id, question_id });
  save(s);
  return { id };
}

// Click yes or no on a solution. One per participant, changeable (last wins).
// Works for resident-filed solutions AND for the platform's own founding
// solutions (curated in the corpus): if the id isn't a filed record, we create a
// vote-only stub so a curated solution's yes/no count lives in the same store.
function vote(participant, id, value) {
  if (!participant || !['yes', 'no'].includes(value)) return null;
  id = String(id || '').slice(0, 80);
  const s = load();
  let sol = s.solutions[id];
  if (!sol) sol = s.solutions[id] = { id, curated: true, status: 'open', votes: {} };
  if (sol.status !== 'open') return null;
  sol.votes = sol.votes || {};
  sol.votes[participant] = value;
  chain.append('solution-vote', { id, value });
  save(s);
  return tallyOf(sol);
}

// Tally for any id (a filed solution or a curated founding one).
function tallyFor(id) {
  const sol = load().solutions[id];
  return sol ? tallyOf(sol) : { yes: 0, no: 0, net: 0, total: 0 };
}
// How this participant voted on one id, or null.
function myVoteOn(participant, id) {
  if (!participant) return null;
  const sol = load().solutions[id];
  return (sol && sol.votes && sol.votes[participant]) || null;
}

function tallyOf(sol) {
  const vals = Object.values(sol.votes || {});
  const yes = vals.filter(v => v === 'yes').length;
  const no = vals.filter(v => v === 'no').length;
  return { yes, no, net: yes - no, total: yes + no };
}

// Every open solution filed under one question, best-backed first (net yes,
// then yes count, then newest). Each carries its tally and its citations.
function listFor(tenant, question_id) {
  return Object.values(load().solutions)
    .filter(s => s.status === 'open' && !s.curated && s.tenant === tenant && s.question_id === question_id)
    .map(s => {
      const t = tallyOf(s);
      return {
        id: s.id, title: s.title, summary: s.summary, citations: s.citations || [],
        created_at: s.created_at, yes: t.yes, no: t.no, net: t.net, total: t.total
      };
    })
    .sort((a, b) => b.net - a.net || b.yes - a.yes || String(b.created_at).localeCompare(String(a.created_at)));
}

// How this participant has voted on the solutions under a question: id -> yes/no.
function myVotesFor(participant, tenant, question_id) {
  const out = {};
  if (!participant) return out;
  for (const s of Object.values(load().solutions)) {
    if (s.tenant === tenant && s.question_id === question_id && s.votes && s.votes[participant]) {
      out[s.id] = s.votes[participant];
    }
  }
  return out;
}

function get(id) { return load().solutions[id] || null; }
function remove(id) { const s = load(); if (s.solutions[id]) { delete s.solutions[id]; chain.append('solution-removed', { id }); save(s); } }
function listAll() {
  return Object.values(load().solutions)
    .filter(s => s.status === 'open')
    .map(s => ({ id: s.id, tenant: s.tenant, question_id: s.question_id, title: s.title, ...tallyOf(s), created_at: s.created_at }))
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

module.exports = { file, vote, tallyFor, myVoteOn, listFor, myVotesFor, get, remove, listAll, parseCitations };
