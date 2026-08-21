// The delivery threshold — how many residents behind a signal before it's
// formally carried to the body that decides.
//
// This is grounded in real petition law, not a number we made up. In the United
// States, the threshold that actually triggers government action — a ballot
// initiative or referendum — is a PERCENTAGE OF VOTES CAST in the last election,
// not a share of raw population. (Arkansas county measures need signatures equal
// to 15% of the votes for a county office; Texas city charters commonly set 5%;
// the UK Parliament's advisory "we will respond" bar is a flat 10,000.) Ours is
// an ADVISORY "hand it to the officials" bar, so we sit at the low end of that
// range: about 5% of the votes cast last election — real, but reachable.
//
// The rule, in order of preference:
//   1. A real local petition law, if we know it        -> config.delivery_threshold_law
//   2. ~5% of the actual votes cast last election       -> config.last_election_votes
//   3. If we don't have the vote count yet, estimate it -> from population (labeled)
// Every path is clamped to a sane floor/cap and rounded to a clean number, and
// each returns WHY, so the site can show its work instead of asserting a figure.

const PCT = 0.05;            // 5% of turnout — the low, advisory end of real petition law
const TURNOUT_OF_POP = 0.40; // typical general-election turnout as a share of population
const FLOOR = 100, CAP = 5000, STEP = 50;

function clampRound(n) {
  return Math.max(FLOOR, Math.min(CAP, Math.round(n / STEP) * STEP));
}

function fmt(n) { return Number(n).toLocaleString('en-US'); }

// Resolve the full picture for a county, or for a specific target (a city, by
// passing its population and/or its own turnout). Returns { value, basis, note }.
//   basis: 'law' | 'turnout' | 'population-estimate' | 'default'
function deliveryInfo(county, opts) {
  opts = opts || {};
  const pct = (county && Number(county.delivery_threshold_pct)) || PCT;

  // 1) A real local petition law wins, always.
  const law = county && county.delivery_threshold_law;
  if (law != null) {
    const value = (typeof law === 'object') ? Number(law.value) : Number(law);
    const src = (typeof law === 'object') ? law : null;
    return {
      value: clampRound(value) === value ? value : value, // laws are exact, not rounded
      basis: 'law',
      note: (src && src.note) || 'Set by the local petition or referendum rule.',
      source: src && src.source
    };
  }

  // 2) Real turnout on file — the precedent denominator.
  const votes = (opts.votes != null) ? opts.votes : (county && county.last_election_votes);
  if (votes) {
    const when = (opts.votesLabel || (county && county.last_election_label));
    return {
      value: clampRound(pct * votes),
      basis: 'turnout',
      note: `About ${Math.round(pct * 100)}% of the ${fmt(votes)} votes cast ${when ? ('in ' + when) : 'in the last election'} — the level real petitions are measured at.`
    };
  }

  // 3) No vote count yet — estimate from population, and say so plainly.
  const pop = (opts.pop != null && opts.pop !== '') ? opts.pop : (county && county.population);
  if (pop) {
    return {
      value: clampRound(pct * TURNOUT_OF_POP * pop),
      basis: 'population-estimate',
      note: `Estimated at about ${Math.round(pct * 100)}% of a normal turnout for ${fmt(pop)} residents, until we load the real vote count.`
    };
  }

  return { value: 400, basis: 'default', note: 'A starting figure until local vote data is loaded.' };
}

// The number alone (back-compatible with existing callers). popOverride lets a
// city size to its own population when a priority is aimed at that city.
function deliveryThreshold(county, popOverride) {
  return deliveryInfo(county, (popOverride != null && popOverride !== '') ? { pop: popOverride } : {}).value;
}

// A short, plain sentence explaining where a county's number comes from.
function deliveryReason(county, opts) { return deliveryInfo(county, opts).note; }

// Was this threshold set by a real local rule (vs. sized from votes/population)?
function isByLaw(county) { return !!(county && county.delivery_threshold_law != null); }

module.exports = { deliveryThreshold, deliveryInfo, deliveryReason, isByLaw };
