// Minimal markdown → HTML for rendering the charter/strategy documents
// (SECURITY.md, NEVER.md, FIELD.md) as public pages. Headings, bold, italics,
// code, links, lists, blockquotes, hr, GFM tables, paragraphs. Everything
// escaped first; no raw HTML passes.

const { esc } = require('./corpus');

function inline(s) {
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/\*([^*]+)\*/g, '<i>$1</i>')
    .replace(/`([^`]+)`/g, '<span class="code">$1</span>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) =>
      /^(https?:\/\/|\/)/.test(u) ? `<a href="${u}" rel="noopener">${t}</a>` : t);
}

// A GFM table separator row: | --- | :--: | --- |  (dashes required).
function isTableSep(line) {
  return /-/.test(line) && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(line);
}
function tableCells(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map(c => c.trim());
}

function mdToHtml(md) {
  const lines = md.split('\n');
  const out = [];
  let list = false, para = [];
  const flush = () => {
    if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; }
  };
  const closeList = () => { if (list) { out.push('</ul>'); list = false; } };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();

    // GFM table: a header row of cells, then a separator row, then body rows.
    // Wrapped in an overflow-x container so wide tables scroll on phones.
    if (line.includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      flush(); closeList();
      const head = tableCells(line);
      const rows = [];
      let j = i + 2;
      while (j < lines.length && lines[j].includes('|') && lines[j].trim() !== '') {
        rows.push(tableCells(lines[j])); j++;
      }
      out.push('<div style="overflow-x:auto"><table class="plain"><thead><tr>' +
        head.map(h => `<th>${inline(h)}</th>`).join('') + '</tr></thead><tbody>' +
        rows.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('') +
        '</tbody></table></div>');
      i = j - 1;
      continue;
    }

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
