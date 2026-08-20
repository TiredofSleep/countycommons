// Participatory budgeting — the allocation gate.
//
// The PB analog of server/vote.js. Every channel converges on one path,
// castAllocation(participant, exercise, allocation, channel); no side doors.
// Chain FIRST, store second — same doctrine as votes: in a civic system the log
// is the product, so if the allocation cannot be recorded, it must not happen.
//
// Advisory only, aggregate-only. Exercises are defined in config/pb-exercises.json
// (git-tracked, options group real budget-tree nodes). Allocations live in a
// gitignored JSON store keyed by the same per-sitting participant token that keys
// votes; individual allocations render to no one. Design: docs/PARTICIPATORY-BUDGETING.md.

const fs = require('fs');
const path = require('path');
const chain = require('./lib/chain');

const STORE = path.join(__dirname, '..', 'data', 'pb-allocations.json');
const EXERCISES = path.join(__dirname, '..', 'config', 'pb-exercises.json');

function loadExercises() {
  try { return JSON.parse(fs.readFileSync(EXERCISES, 'utf8')).exercises || []; }
  catch (e) { return []; }
}
function getExercise(id) { return loadExercises().find(e => e.id === id) || null; }
function exercisesFor(tenant) { return loadExercises().filter(e => e.tenant === tenant); }
function openExerciseFor(tenant) { return exercisesFor(tenant).find(e => e.status === 'open') || null; }

function loadStore() {
  try { return JSON.parse(fs.readFileSync(STORE, 'utf8')); }
  catch (e) { return { allocations: {} }; }
}

// The one allocation gate. Validates the tradeoff constraint (tokens must sum to
// exactly N) identically no matter the channel, then chains, then stores. Last
// write wins until the exercise closes.
function castAllocation(participant, exerciseId, allocation, channel) {
  const ex = getExercise(exerciseId);
  if (!ex || ex.status !== 'open') throw new Error('no open exercise');
  const optionIds = new Set(ex.options.map(o => o.id));
  const clean = {};
  let sum = 0;
  for (const [k, v] of Object.entries(allocation || {})) {
    if (!optionIds.has(k)) continue;
    const n = Math.round(Number(v));
    if (!Number.isInteger(n) || n < 0 || n > ex.tokens) throw new Error('invalid token count');
    if (n > 0) clean[k] = n;
    sum += n;
  }
  // The tradeoff discipline — you cannot fund everything. Overspend/underspend is
  // an error, never silently clamped: fixing someone's numbers puts words in
  // their mouth (docs/PARTICIPATORY-BUDGETING.md).
  if (sum !== ex.tokens) { const e = new Error(`tokens must sum to ${ex.tokens}`); e.code = 'BAD_SUM'; throw e; }

  chain.append('pb-allocation', { exercise: exerciseId, participant, allocation: clean, channel });
  const store = loadStore();
  if (!store.allocations[exerciseId]) store.allocations[exerciseId] = {};
  store.allocations[exerciseId][participant] = { allocation: clean, channel, cast_at: new Date().toISOString() };
  const tmp = STORE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
  fs.renameSync(tmp, STORE);
  return store.allocations[exerciseId][participant];
}

function myAllocation(participant, exerciseId) {
  return (loadStore().allocations[exerciseId] || {})[participant] || null;
}

// Reserved for the verified tiers (M5), same as votes: small counts render as a
// provisional label rather than a precise split that reads as more than it is.
const FLOOR = 20;
function median(arr) {
  if (!arr.length) return 0;
  const s = arr.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Aggregate only. "The people's budget": each option's share of all tokens placed,
// times the pot — so the option dollars sum back to the pot exactly. Median tokens
// per option shown alongside as the typical (outlier-robust) priority.
function tallyPB(exercise) {
  const allocs = loadStore().allocations[exercise.id] || {};
  const parts = Object.values(allocs);
  const n = parts.length;
  const perOption = {};
  for (const o of exercise.options) perOption[o.id] = [];
  for (const p of parts) for (const o of exercise.options) perOption[o.id].push((p.allocation || {})[o.id] || 0);
  let grand = 0;
  const totalTokens = {};
  for (const o of exercise.options) { const t = perOption[o.id].reduce((a, b) => a + b, 0); totalTokens[o.id] = t; grand += t; }
  const results = {};
  for (const o of exercise.options) {
    const share = grand ? totalTokens[o.id] / grand : 0;
    results[o.id] = {
      peoplesDollars: Math.round(share * exercise.pot_amount),
      peoplesShare: share,
      meanTokens: n ? totalTokens[o.id] / n : 0,
      medianTokens: median(perOption[o.id])
    };
  }
  return { participants: n, floor: FLOOR, provisional: n < FLOOR, results };
}

module.exports = { getExercise, exercisesFor, openExerciseFor, castAllocation, myAllocation, tallyPB };
