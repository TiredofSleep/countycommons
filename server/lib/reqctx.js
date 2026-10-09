// Per-request context (host + path) so shared views can print canonical URLs
// without threading req through every page function.
const { AsyncLocalStorage } = require('async_hooks');
const als = new AsyncLocalStorage();
const middleware = (req, res, next) => als.run({ host: String(req.headers.host || 'countycommons.us').split(':')[0], path: req.path }, next);
const current = () => als.getStore() || { host: 'countycommons.us', path: '/' };
// Canonical origin: production hosts as-is; *.localhost previews keep their host.
const url = (p) => { const c = current(); return `https://${c.host}${p === undefined ? c.path : p}`; };
module.exports = { middleware, current, url };
