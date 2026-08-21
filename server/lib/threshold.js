// The delivery threshold — how many residents behind a signal before it's
// formally carried to the body that decides.
//
// Brayden's rule: size it by LOCAL LAW where a real one is known, otherwise by
// POPULATION. A county whose statute or charter sets a petition/response count
// puts that number in its config as `delivery_threshold_law` (with a source);
// everyone else is sized from population on a sub-linear (square-root) curve, so
// a 100,000-person county doesn't need five times the signal of a 20,000-person
// one to be credible. The curve is anchored so a ~21,000-person county lands
// near 400, then rounded to a clean number and clamped to a sane range.

const K = 2.732; // 400 / sqrt(21446) — anchors Clark County (~21k) at ~400

function fromPop(pop) {
  pop = Number(pop);
  if (!pop || pop < 1) return 400; // no population on file — safe default
  const rounded = Math.round((K * Math.sqrt(pop)) / 50) * 50;
  return Math.max(100, Math.min(5000, rounded));
}

// Resolve the threshold for a county, or for a specific target population
// (e.g. a city's population when a priority is aimed at that city).
function deliveryThreshold(county, popOverride) {
  // A known local rule wins, always.
  if (county && county.delivery_threshold_law) return county.delivery_threshold_law;
  const pop = (popOverride != null && popOverride !== '') ? popOverride : (county && county.population);
  return fromPop(pop);
}

// Was this county's threshold set by a real local rule (vs. sized by population)?
function isByLaw(county) { return !!(county && county.delivery_threshold_law); }

module.exports = { deliveryThreshold, fromPop, isByLaw };
