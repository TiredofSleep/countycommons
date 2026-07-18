// Progressive enhancement only — the site works fully without this file.
document.querySelectorAll('.bar button[data-act]').forEach(function (b) {
  b.addEventListener('click', function () {
    var open = b.dataset.act === 'open';
    document.querySelectorAll('details.node').forEach(function (d) { d.open = open; });
  });
});
