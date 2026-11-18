// Progress shown as the next milestone, not a percent of a far-off goal.
// "0 of 2,000 · 0%" tells a first signer nobody else cares; "Be one of the
// first" and "12 signed · next milestone 25" tell the truth and invite the next
// name. The full goal, and how it's set, stays in the fine print.
const STEPS = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
const num = (n) => Number(n || 0).toLocaleString('en-US');

function next(n, goal) { return STEPS.find(s => s > n && s < goal) || goal; }

// Plain html: the line, a bar toward the next milestone, and the fine print.
function block(n, goal, fine) {
  n = Number(n || 0); goal = Number(goal || 100);
  if (n >= goal) return `<p><b>${num(n)}</b> signed. <b>It reached its goal of ${num(goal)}.</b></p>${fine ? `<p class="src">${fine}</p>` : ''}`;
  if (n < 1) return `<p style="font-size:17px"><b>Be one of the first to sign.</b> <span class="src">Early names are what get a petition noticed.</span></p>${fine ? `<p class="src">Goal: ${num(goal)} signatures. ${fine}</p>` : ''}`;
  const m = next(n, goal), pct = Math.max(3, Math.min(100, Math.round(n / m * 100)));
  return `<p style="font-size:17px"><b>${num(n)}</b> signed · next milestone <b>${num(m)}</b></p>
<div style="background:var(--rule);height:11px;border-radius:3px;overflow:hidden" aria-hidden="true"><div style="width:${pct}%;height:100%;background:var(--accent)"></div></div>
${fine ? `<p class="src">Goal: ${num(goal)} signatures. ${fine}</p>` : ''}`;
}

// One short phrase, for lists and cards.
function phrase(n, goal) {
  n = Number(n || 0);
  if (n < 1) return 'Be one of the first to sign';
  if (n >= goal) return `${num(n)} signed · goal reached`;
  return `${num(n)} signed · next milestone ${num(next(n, goal))}`;
}

module.exports = { block, phrase, next };
