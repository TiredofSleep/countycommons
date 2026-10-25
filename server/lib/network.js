// The network this copy runs as: its name, domain, flagship county and contact,
// from config/network.json. A copy on another domain changes that one file.
//
// The domain is written into many links across the views. Rather than thread a
// variable through each one, a copy on a different domain rewrites
// "countycommons.us" to its own domain as pages are sent. On countycommons.us
// itself the rewrite is off and nothing changes.

const fs = require('fs');
const path = require('path');

const ORIGINAL = 'countycommons.us';
const DEFAULTS = { name: 'County Commons', domain: ORIGINAL, flagship: null, flagship_name: null, contact: null, repo: null };

let NET = null;
function net() {
  if (!NET) {
    try { NET = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'config', 'network.json'), 'utf8')) }; }
    catch (e) { NET = { ...DEFAULTS }; }
  }
  return NET;
}

const apex = () => 'https://' + net().domain;
const siteUrl = (key) => `https://${key}.${net().domain}`;

// "built out furthest for <a>Clark County, Arkansas</a>" — or nothing, if no flagship is set.
function flagshipLink() {
  const n = net();
  return n.flagship && n.flagship_name ? `<a href="${siteUrl(n.flagship)}/">${n.flagship_name}</a>` : '';
}

function rehostMiddleware(req, res, next) {
  const domain = net().domain;
  if (domain === ORIGINAL) return next();
  const send = res.send.bind(res);
  res.send = (body) => send(typeof body === 'string' ? body.split(ORIGINAL).join(domain) : body);
  next();
}

module.exports = { net, apex, siteUrl, flagshipLink, rehostMiddleware };
