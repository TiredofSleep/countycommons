// A tenant's record in the national base data (data/national/counties.json):
// EPA public water systems and Vera jail figures, shown on its own /water and
// /justice pages beside whatever local research it has.
const fs = require('fs');
const path = require('path');
const { esc } = require('./corpus');

let NAT = null;
const norm = (s) => String(s || '').toLowerCase().replace(/\b(county|parish|borough|census area|city and borough|municipality)\b/g, '').replace(/^st\.? /, 'saint ').replace(/[^a-z]/g, '');
function forCounty(county) {
  if (!NAT) { try { NAT = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'national', 'counties.json'), 'utf8')); } catch (e) { NAT = { states: {}, counties: [] }; } }
  const st = Object.keys(NAT.states).find(a => NAT.states[a].name === county.state);
  if (!st) return null;
  const want = norm(county.turnout_county || county.name);
  const c = NAT.counties.find(x => x.st === st && norm(x.name) === want);
  return c ? Object.assign({ sources: NAT.sources, url: `https://countycommons.us/us/${st.toLowerCase()}/${c.slug}` }, c) : null;
}

const num = (x) => Math.round(x).toLocaleString('en-US');
function waterBlock(n) {
  if (!n || !n.water) return '';
  const w = n.water;
  return `
<section id="systems">
<h2>Public water systems serving ${esc(n.name)} <span class="sub">— from EPA's national records</span></h2>
<p><b>${num(w.systems)}</b> active community water system${w.systems === 1 ? '' : 's'} list ${esc(n.name)} in the area they serve.</p>
<table class="plain"><tbody>${w.top.map(s => `<tr><td>${esc(s.name)}<br><span class="soft" style="font-size:12px">${esc(s.source || '')} · EPA ID ${esc(s.pwsid)}</span></td><td class="num">${num(s.pop)} served</td></tr>`).join('')}</tbody></table>
<p class="src">Source: <a href="https://www.epa.gov/enviro/sdwis-search" rel="noopener">U.S. EPA Safe Drinking Water Information System</a> (${esc(n.sources.sdwis)}). Search a system's ID there for its violations and test results. A system that crosses county lines counts its whole population.</p>
</section>`;
}
function jailBlock(n) {
  if (!n || !n.jail) return '';
  const j = n.jail;
  return `
<section id="jail-count">
<h2>How many people are in the jail <span class="sub">— from national data</span></h2>
<p>About <b>${num(j.pop)}</b> people were held in ${esc(n.name)}'s jail in the Vera Institute's latest figure (${esc(j.year)})${j.rate ? `, or ${num(j.rate)} per 100,000 residents ages 15–64` : ''}.${j.prev ? ` In ${esc(j.prev.year)} it was about ${num(j.prev.pop)}.` : ''}</p>
<p class="src">Source: <a href="https://github.com/vera-institute/incarceration-trends" rel="noopener">Vera Institute of Justice, Incarceration Trends</a>, built from federal Bureau of Justice Statistics jail surveys and jail records.</p>
</section>`;
}
// The whole national file (for blocks that need state comparisons and the open-grants list).
function meta() { forCounty({ state: '' }); return NAT; }
module.exports = { forCounty, waterBlock, jailBlock, meta };
