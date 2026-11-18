// Make it official: the paperwork a resident can print, sign and deliver to
// change something in their county. Petitions, letters and records requests
// already exist; this adds a draft ordinance for each common ground ask, a cover
// letter asking a member of the governing body to sponsor it, and a request for
// time on the meeting agenda — with plain steps for where each one goes.
// Drafts are starting points, not legal advice; the founder's asks, attributed.
const { esc } = require('../lib/corpus');
const A = require('../lib/asks');
const R = require('../lib/requests');
const RV = require('./requests');

// What a member of the governing body is called, by state.
const MEMBER = { AR: 'Justice of the Peace', TX: 'County Commissioner', KY: 'Magistrate', LA: 'Parish Council member or Police Juror', TN: 'County Commissioner', MS: 'Supervisor', CA: 'Supervisor', AZ: 'Supervisor', IA: 'Supervisor', VA: 'Supervisor', WI: 'Supervisor' };
const member = (st) => MEMBER[st] || 'member';
// Who sets or presides over the agenda, where that is the county judge.
const chair = (st) => st === 'AR' || st === 'TX' ? 'County Judge' : 'chair';
const body = (c) => A.addressee(c).replace(/^the /, '').replace(new RegExp('^' + c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' '), '');
const withOrdinance = () => A.campaigns().campaigns.filter(x => x.ordinance && !x.hold);
const fill = (t, c) => String(t).replace(/\{county\}/g, c.name).replace(/\{body\}/g, body(c));
const blank = '<span class="blank"></span>';
const btn = 'display:inline-block;font-family:var(--mono);font-size:14px;font-weight:600;padding:8px 14px;border:1.5px solid var(--ink);color:var(--ink);text-decoration:none;background:var(--card)';
const DISCLAIM = 'A draft for discussion, prepared by County Commons as a starting point. It is not legal advice. What a county can require depends on state law, so a sponsor should ask the county attorney to review it. Blanks are for the sponsor to fill in.';

// The hub: every piece of paperwork for this county, in the order it's used.
function hub(c, nv) {
  const base = `/us/${c.st.toLowerCase()}/${c.slug}`;
  const law = R.law(c.st);
  const common = require('../lib/common').THEMES.map(t => A.byId(t.camp)).filter(Boolean);
  const reqs = A.campaigns().campaigns.filter(x => x.meter && !x.hold && R.recordFor(x.id, c.st));
  const li = (href, h, p) => `<li style="margin:0 0 10px"><a href="${href}" style="font-weight:600">${h}</a>${p ? `<br><span class="src">${p}</span>` : ''}</li>`;
  const step = (n, h, lead, inner) => `<section><h2 style="text-transform:none;letter-spacing:0;font-family:var(--sans)">${n}. ${h}</h2><p class="src" style="max-width:none;font-size:15px">${lead}</p>${inner}</section>`;
  const html = `
<header class="page"><div class="eyebrow">${esc(c.name)}, ${esc(nv.stateName(c.st))} · make it official</div>
<h1>Paperwork for change in ${esc(c.name)}</h1>
<div class="src" style="font-size:15.5px">Everything here prints on plain paper. Sign it, keep a copy, and deliver it to the people named. Most change in a county starts with one of these. County Commons doesn’t file anything for you, and never takes sides on candidates or ballot measures.</div></header>
${step(1, 'Show how many agree', 'A petition shows officials how many residents want something. One form signs all four common ground petitions.',
  `<p><a href="${base}/common-ground" style="${btn};background:var(--ink);color:var(--paper)">Sign all four for ${esc(c.name)} →</a></p>`)}
${step(2, 'Write your officials', `A short signed letter to ${esc(RV.officialsTo(c))}, with the facts County Commons found.`,
  `<ul style="list-style:none;padding:0">${common.map(x => li(`${base}/ask/${esc(x.id)}/letter`, esc(fill(x.title, c)), '')).join('')}</ul>`)}
${step(3, 'Propose a law', `A draft ordinance and a cover letter asking your ${esc(member(c.st))} to sponsor it. Members of the ${esc(body(c))} are the ones who introduce ordinances.`,
  `<ul style="list-style:none;padding:0">${withOrdinance().map(x => li(`${base}/paperwork/ordinance/${esc(x.id)}`, esc(x.ordinance.title), (x.best || []).length ? 'Already done in ' + esc(x.best.slice(0, 2).map(b => b.name).join('; ')) + '.' : '')).join('')}</ul>`)}
${step(4, 'Get on the agenda', `A request to the ${esc(chair(c.st))} for time at a meeting of the ${esc(body(c))}, to present a petition or a draft ordinance in person.`,
  `<p><a href="${base}/paperwork/agenda" style="${btn}">Agenda request letter →</a></p>`)}
${law ? step(5, 'Ask for the records', `One precise public records request under the ${esc(law.law)}, filed once for everyone, with the answer posted.`,
  `<ul style="list-style:none;padding:0">${reqs.map(x => li(`${base}/ask/${esc(x.id)}/request`, esc(fill(x.title, c)), '')).join('')}</ul>`) : ''}
<section><h2 style="text-transform:none;letter-spacing:0;font-family:var(--sans)">How to deliver it</h2>
<ol style="line-height:1.6">
<li>Print it, fill in the blanks, and sign it.</li>
<li>Make a copy for yourself, and write the date you deliver it.</li>
<li>Deliver it in person, by mail or by email to the person it’s addressed to. In person at the county courthouse or clerk’s office is often best: ask for it to be date-stamped.</li>
<li>Follow up in two weeks if you haven’t heard back.</li>
<li><a href="/us/feedback?kind=add&amp;from=${encodeURIComponent(base + '/paperwork')}">Tell us what you delivered and to whom</a>. We’ll note it on the petition so others can see it’s moving.</li>
</ol></section>`;
  return nv.page({ title: `Paperwork for change in ${c.name}, ${nv.stateName(c.st)}: petitions, letters, draft ordinances, agenda requests · County Commons`, description: `Print, sign and deliver: petitions, letters to ${c.name} officials, draft ordinances with a sponsor letter, an agenda request and public records requests.`, canonical: `https://countycommons.us${base}/paperwork`, body: html });
}

// A draft ordinance with its cover letter to a sponsor. Prints as one packet.
function ordinance(c, nv, campId) {
  const x = withOrdinance().find(y => y.id === campId); if (!x) return null;
  const base = `/us/${c.st.toLowerCase()}/${c.slug}`;
  const o = x.ordinance;
  const p = A.byId(x.id) ? A.existing(c, x.id) : null;
  const n = p ? require('../priorities').getPublic(p.id).support : 0;
  const best = (x.best || []).slice(0, 2);
  const html = `${RV.PRINT_CSS}<style>@media print{.letter{position:static}.pb{page-break-before:always}}</style>
<header class="page"><div class="eyebrow">${esc(c.name)} · propose a law</div>
<h1>${esc(o.title)}</h1>
<div class="src" style="font-size:15px">A cover letter asking a ${esc(member(c.st))} to sponsor it, then the draft ordinance. Use your browser’s Print command; only the letter and the draft print. ${esc(DISCLAIM)}</div>
<p style="margin-top:10px"><a href="${base}/paperwork" style="${btn}">← All paperwork for ${esc(c.name)}</a></p></header>
<section>
<div class="letter">
<p>Date: ${blank}</p>
<p>To ${blank}, ${esc(member(c.st))}<br>${esc(c.name)} ${esc(body(c))}<br>${esc(c.name)}, ${esc(nv.stateName(c.st))}</p>
<p><b>Re: Request to sponsor “${esc(o.title)}”</b></p>
<p>I live in ${blank}, in ${esc(c.name)}, and I ask you to sponsor the attached draft ordinance and introduce it at an upcoming meeting of the ${esc(body(c))}.</p>
<p>${esc(fill(x.why, c))}</p>
${best.length ? `<p>Other governments already do this. ${best.map(b => `<b>${esc(b.name)}:</b> ${esc(b.rule)}`).join(' ')}</p>` : ''}
${n ? `<p>${n.toLocaleString('en-US')} residents have signed the petition asking for this, at countycommons.us${esc(base)}/common-ground.</p>` : ''}
<p>The draft is a starting point. Please ask the county attorney to review it, and change whatever is needed to fit state law. If you can’t sponsor it, would you tell me what would need to change?</p>
<p>Thank you,</p>
<p>Signature: ${blank}<br>Printed name: ${blank}<br>Address: ${blank}<br>Phone or email: ${blank}</p>
</div>
<div class="letter pb" style="margin-top:18px">
<p style="text-align:center"><b>${esc(c.name.toUpperCase())}, ${esc(nv.stateName(c.st).toUpperCase())}</b><br>ORDINANCE NO. ${blank}</p>
<p style="text-align:center"><b>${esc(o.title.toUpperCase())}</b></p>
<p>Be it ordained by the ${esc(body(c))} of ${esc(c.name)}, ${esc(nv.stateName(c.st))}:</p>
${o.sections.map(([h, t], i) => `<p><b>Section ${i + 1}. ${esc(h)}.</b> ${esc(fill(t, c)).replace(/_{6,}/g, blank)}</p>`).join('')}
<p>Sponsored by: ${blank}</p>
<p>Adopted: ${blank} &nbsp; Attest: ${blank}</p>
<p style="font-size:12px;color:#444">${esc(DISCLAIM)} Model text from County Commons, countycommons.us.</p>
</div>
</section>
<section><p class="src" style="max-width:none"><b>Next:</b> deliver the letter and draft to your ${esc(member(c.st))}, keep a copy, and <a href="${base}/paperwork/agenda">ask for time on the agenda</a> if you want to speak for it. <a href="/us/feedback?kind=add&amp;from=${encodeURIComponent(base + '/paperwork')}">Tell us you delivered it →</a></p></section>`;
  return nv.page({ title: `Draft ordinance for ${c.name}: ${o.title} · County Commons`, description: `A printable draft ordinance for ${c.name}, ${nv.stateName(c.st)}, with a letter asking a ${member(c.st)} to sponsor it. A starting point for the county attorney to review.`, canonical: `https://countycommons.us${base}/paperwork/ordinance/${x.id}`, body: html });
}

// A request for time on the governing body's agenda.
function agenda(c, nv) {
  const base = `/us/${c.st.toLowerCase()}/${c.slug}`;
  const judge = (() => { if (c.st !== 'AR') return ''; try { const O = require('../../data/corpus/officials-arkansas.json'); const o = (O.counties || {})[c.name.replace(/ County$/, '')]; const j = o && (o.officials || []).find(y => y.office === 'Judge'); return j ? j.name : ''; } catch (e) { return ''; } })();
  const html = `${RV.PRINT_CSS}
<header class="page"><div class="eyebrow">${esc(c.name)} · get on the agenda</div>
<h1>Ask for time at a ${esc(body(c))} meeting</h1>
<div class="src" style="font-size:15px">Many governing bodies set aside time for residents, or let them ask to be on the agenda. Send this a week or more before the meeting. Use your browser’s Print command; only the letter prints.</div>
<p style="margin-top:10px"><a href="${base}/paperwork" style="${btn}">← All paperwork for ${esc(c.name)}</a></p></header>
<section>
<div class="letter">
<p>Date: ${blank}</p>
<p>To the ${esc(chair(c.st))}${judge ? ' ' + esc(judge) : ''}${c.st === 'AR' || c.st === 'TX' ? '' : ` of the ${esc(body(c))}`}<br>${esc(c.name)}, ${esc(nv.stateName(c.st))}</p>
<p><b>Re: Request for time on the agenda</b></p>
<p>I live in ${blank}, in ${esc(c.name)}. I respectfully ask for ______ minutes on the agenda of the ${esc(body(c))}’s regular meeting on ${blank} (or the next regular meeting) to present:</p>
<p>${blank}${blank}</p>
<p>(For example: a petition signed by residents, or a draft ordinance for the ${esc(body(c))} to consider.)</p>
<p>If there is a form or a deadline for agenda requests, please let me know and I will follow it.</p>
<p>Thank you,</p>
<p>Signature: ${blank}<br>Printed name: ${blank}<br>Address: ${blank}<br>Phone or email: ${blank}</p>
</div>
</section>
<section><p class="src" style="max-width:none">Bring copies of whatever you present, one for each member and one for the clerk. <a href="/us/feedback?kind=add&amp;from=${encodeURIComponent(base + '/paperwork')}">Tell us when you’re on the agenda →</a></p></section>`;
  return nv.page({ title: `Request time on the ${body(c)} agenda, ${c.name} · County Commons`, description: `A printable letter asking for time at a ${c.name} ${body(c)} meeting to present a petition or a draft ordinance.`, canonical: `https://countycommons.us${base}/paperwork/agenda`, body: html });
}

module.exports = { hub, ordinance, agenda };
