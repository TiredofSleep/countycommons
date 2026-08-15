// A small in-memory, per-IP write throttle — no dependency, no store.
//
// The Tier 0 count is anonymous by design (one voice per sitting, session
// cookie), so a scripted client that rotates its cookie can otherwise stuff
// votes and flood the public signature list. This does not make the count
// verified — that waits for the tiers — but it raises the cost of automated
// abuse from "a for-loop" to "a botnet," which is the honest bar for a
// soft-launched civic tool. Fixed-window counter, cleaned lazily.
//
// Behind Caddy the real client IP arrives via X-Forwarded-For; app.js sets
// 'trust proxy' so req.ip reflects it. If a shared NAT trips the limit, the
// window is short and the message is plain — a real person just retries.

const hits = new Map(); // ip -> { count, resetAt }

function throttle({ windowMs = 60000, max = 20 } = {}) {
  return function (req, res, next) {
    const now = Date.now();
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    let rec = hits.get(ip);
    if (!rec || now > rec.resetAt) { rec = { count: 0, resetAt: now + windowMs }; hits.set(ip, rec); }
    rec.count++;
    // Opportunistic cleanup so the map can't grow without bound.
    if (hits.size > 5000) for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
    if (rec.count > max) {
      res.set('Retry-After', String(Math.ceil((rec.resetAt - now) / 1000)));
      return res.status(429).type('html').send(
        '<!DOCTYPE html><meta charset="UTF-8"><link rel="stylesheet" href="/style.css">' +
        '<div class="wrap"><header class="page"><h1>One moment</h1>' +
        '<div class="src">That came in a little fast. Wait a few seconds and try again — ' +
        'this limit only exists to keep automated abuse off the count. <a href="/">Back home</a>.</div>' +
        '</header></div>');
    }
    next();
  };
}

module.exports = { throttle };
