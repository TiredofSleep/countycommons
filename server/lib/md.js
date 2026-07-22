// Minimal markdown → HTML for rendering the charter documents (SECURITY.md,
// NEVER.md) as public pages. Headings, bold, italics, links, lists,
// blockquotes, hr, paragraphs. Everything escaped first; no raw HTML passes.

const { esc } = require('./corpus');

function inline(s) {
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/\*([^*]+)\*/g, '<i>$1</i>')
    .replace(/`([^`]+)`/g, '<span class="code">$1</span>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) =>
      /^(https?:\/\/|\/)/.test(u) ? `<a href="${u}" rel="noopener">${t}</a>` : t);
}

function mdToHtml(md) {
  const out = [];
  let list = false, para = [];
  const flush = () => {
    if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; }
  };
  const closeList = () => { if (list) { out.push('</ul>'); list = false; } };

  for (const raw of md.split('\n')) {
    const line = raw.trimEnd();
    if (/^---+$/.test(line.trim())) { flush(); closeList(); out.push('<hr style="border:none;border-top:1.5px solid var(--rule);margin:18px 0">'); continue; }
    const h = line.match(/^(#{1,4})\s+(.*)/);
    if (h) {
      flush(); closeList();
      const lvl = h[1].length;
      if (lvl === 1) out.push(`<h1>${inline(h[2])}</h1>`);
      else if (lvl === 2) out.push(`<h2>${inline(h[2])}</h2>`);
      else out.push(`<h3>${inline(h[2])}</h3>`);
      continue;
    }
    const li = line.match(/^\s*[-*]\s+(.*)/);
    if (li) { flush(); if (!list) { out.push('<ul style="max-width:70ch;padding-left:22px">'); list = true; } out.push(`<li style="margin:5px 0">${inline(li[1])}</li>`); continue; }
    const bq = line.match(/^>\s?(.*)/);
    if (bq) { flush(); closeList(); out.push(`<p class="src" style="border-left:3px solid var(--rule);padding-left:10px">${inline(bq[1])}</p>`); continue; }
    if (line.trim() === '') { flush(); closeList(); continue; }
    para.push(line.trim());
  }
  flush(); closeList();
  return out.join('\n');
}

module.exports = { mdToHtml };
