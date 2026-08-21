// The tenant's own governing body, for prose that must not hardcode Clark's
// "quorum court" / "justices of the peace". Reads governing_body from the
// county jurisdiction in config; falls back to a neutral phrase.
function govBodyName(county) {
  const juris = (county && county.jurisdictions) || [];
  const j = juris.find(x => x.kind === 'county') || juris[0];
  return (j && j.governing_body) || 'the county governing body';
}

module.exports = { govBodyName };
