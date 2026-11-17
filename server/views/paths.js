// Three ways in, for the three kinds of people who come here:
//   research  — look things up: budgets, comparisons, the standard, the data
//   act       — make a change: sign, ask, print a records request, share
//   build     — help build it: correct, add, send documents, host a county, suggest
// Each is one plain page of real links, network-wide (no one county up front).
const { esc } = require('../lib/corpus');

const btn = 'display:inline-block;font-family:var(--mono);font-size:15px;font-weight:600;padding:10px 18px;background:var(--ink);color:var(--paper);text-decoration:none';
const item = (href, h, p) => `<li style="margin:0 0 12px"><a href="${href}" style="font-weight:600;font-size:17px">${h}</a><br><span class="src" style="font-size:15px">${p}</span></li>`;
const list = (rows) => `<ul style="list-style:none;padding:0;margin:8px 0 0">${rows.join('')}</ul>`;

// A county picker that goes to one of that county's pages (the server matches the typed name).
function picker(nv, action, label, suffix) {
  const f = 'font-size:16px;padding:8px;box-sizing:border-box';
  return `<form method="get" action="${action}" style="display:flex;gap:8px;flex-wrap:wrap;align-items:end;margin:8px 0 0">
<label style="display:grid;gap:3px"><b style="font-size:14px">${esc(label)}</b><select name="st" required style="${f}"><option value="">State…</option>${nv.stateList().map(s => `<option value="${esc(s.st.toLowerCase())}">${esc(s.name)}</option>`).join('')}</select></label>
<input name="county" required maxlength="60" placeholder="County, like “Pulaski”" aria-label="County" style="${f};min-width:180px">
${suffix ? `<input type="hidden" name="to" value="${esc(suffix)}">` : ''}
<button type="submit" style="font-family:var(--mono);font-size:15px;font-weight:600;padding:9px 16px;background:var(--ink);color:var(--paper);border:0">Go</button></form>`;
}

function research(nv) {
  const featured = require('../lib/directory').featured().length;
  const body = `
<header class="page"><div class="eyebrow">County Commons · research</div>
<h1>Look things up</h1>
<div class="src" style="font-size:15.5px">Every number here links to the public record it came from. Nothing is a grade or an opinion, and a gap means “not gathered yet,” never “hidden.” Free to use and reuse.</div></header>
<section><h2>Start with a county</h2>
${picker(nv, '/us/go', 'Open a county’s page')}
<p class="src" style="max-width:none">Each of the ${nv.countyCount().toLocaleString('en-US')} county pages has the county government’s money, property tax, audits, the transparency meter, drinking water, the jail, schools, health, disaster risk, bridges, federal grants and voting, each with its source. <a href="/us/tour">Take the tour →</a></p></section>
<section><h2>Go deeper</h2>${list([
    item('/us/research#compare', 'Compare every budget line', 'Pick a county, then open “How it compares”: each budget line beside counties of the same size, its state, the nation and its neighbors. Or download every line: <a href="/us/compare/lines.csv">lines.csv</a>.'),
    item('/us/transparency', 'The transparency standard', '30 facts, from “is the budget online?” to “can you see the receipt behind each payment?”, with the best government we found for each.'),
    item('/us/what-works', 'What has worked elsewhere', 'Approaches other places measured, rated by the strength of the evidence.'),
    item('/us', 'Every state', 'State government budgets and spending, and all the counties in each state.'),
    item('/', `${featured} full sites`, 'Counties and cities with their whole budget traced line by line to the page it came from. Each one offers its budget as a spreadsheet (budget.csv) and data (budget.json).'),
    item('/us/license', 'Data license', 'What you may copy and reuse, and how to cite it.')
  ])}</section>
<section id="compare"><h2>Compare a county</h2>${picker(nv, '/us/go', 'Compare a county’s budget lines', 'compare')}</section>`;
  return nv.page({ title: 'Research: county budgets, comparisons and public records, every number cited · County Commons', description: 'Look up any U.S. county: budgets, property tax, audits, a 30-point transparency check, water, the jail, grants and voting, with every number linked to its source. Compare every budget line and download the data.', canonical: 'https://countycommons.us/us/research', body });
}

function act(nv) {
  const L = require('../lib/requests').states().map(nv.stateName).sort();
  const states = L.length > 1 ? L.slice(0, -1).join(', ') + ' and ' + L[L.length - 1] : L[0];
  const body = `
<header class="page"><div class="eyebrow">County Commons · make a change</div>
<h1>Make a change in your county</h1>
<div class="src" style="font-size:15.5px">Petitions go to your own county’s officials, are counted in your county, and are delivered at their goal, with the answer posted. Names are never shown. County Commons doesn’t take sides on candidates or ballot measures.</div></header>
<section><h2>Start here</h2>
<p><a href="/us/common-ground" style="${btn}">Common ground: four asks people of every party can sign →</a></p>
<p class="src" style="max-width:none">Clean water, every dollar in the open, grants shown start to finish, and the facts before any data center vote.</p></section>
<section><h2>More ways to act</h2>${list([
    item('/us/ask', 'Ask your county to publish what’s missing', 'Each transparency box a county doesn’t meet is a petition asking it to post the record.'),
    item('/us/petitions', 'Every petition', 'Search petitions to counties, states and Congress.'),
    item('/us/ask', 'File one public records request for everyone', `After you sign an information petition in ${esc(states)}, you can print one precise records request, citing the state’s law. It’s filed once per county, everyone else adds support, and the answer is posted.`),
    item('/us/act#share', 'Share it in your county', 'Every county has a printable one-page flyer and a ready-made social media image with a QR code.')
  ])}</section>
<section id="share"><h2>Get your county’s flyer or social media image</h2>
${picker(nv, '/us/go', 'Flyer (print)', 'flyer')}
${picker(nv, '/us/go', 'Social media image', 'post')}</section>`;
  return nv.page({ title: 'Make a change: petitions and records requests for your county · County Commons', description: 'Sign a petition to your own county’s officials, ask it to publish what’s missing, file one precise public records request for everyone, and share your county’s flyer.', canonical: 'https://countycommons.us/us/act', body });
}

function build(nv) {
  const NET = require('../lib/network').net();
  const fb = (k) => `/us/feedback?kind=${k}&from=/us/build`;
  const body = `
<header class="page"><div class="eyebrow">County Commons · help build it</div>
<h1>Help build it</h1>
<div class="src" style="font-size:15.5px">County Commons is small, independent and built in the open. A person reads every note, and every fix is logged in public. Here’s how to make it better for your county and everyone else’s.</div></header>
<section><h2>Fix and add</h2>${list([
    item(fb('correction'), 'Correct something', 'A wrong number, an out-of-date fact, a broken link. Tell us where, and the source if you have it.'),
    item(fb('add'), 'Add information', 'A record, a website or an official page we haven’t linked yet.'),
    item(fb('document'), 'Send a document', 'A budget, audit, contract list or minutes. Documents are what turn a county’s page into a full site.'),
    item(fb('idea'), 'Suggest an idea', 'Something the site should do, show or explain better.')
  ])}</section>
<section><h2>Grow it</h2>${list([
    item(fb('request'), 'Request a full site for your county', 'Requests are counted in public, and the counties with the most go next. <a href="/us/building#requested">See the list →</a>'),
    item(fb('request'), 'Host your county', 'Know your county’s records and want to keep its site current? Say so in a request, and we’ll be in touch.'),
    item('/us/act#share', 'Share your county’s flyer or social media image', 'One page to print, one image to post, each with a QR code to your county.'),
    item('/us/building', 'What’s new, and what readers helped fix', 'The public log of changes and corrections.')
  ])}</section>
<section><h2>For officials, staff and builders</h2>${list([
    item('/us/build#officials', 'Work for a county?', 'Each county page links to a plain list of the transparency boxes not yet met, and the simplest way to meet each one.'),
    item(esc(NET.repo || 'https://github.com/TiredofSleep/countycommons'), 'The code is open', 'Free to copy for any county or city. Read how it works, or send a fix.'),
    item('/us/copy', 'Copy it for your own place', 'How to stand up the same thing where you live.')
  ])}
<div id="officials">${picker(nv, '/us/go', 'Officials’ guide for a county', 'officials')}</div></section>`;
  return nv.page({ title: 'Help build County Commons: correct, add, send documents, host your county · County Commons', description: 'Correct a fact, add a record, send a document, suggest an idea, request or host a full site for your county, or copy the open code.', canonical: 'https://countycommons.us/us/build', body });
}

module.exports = { research, act, build };
