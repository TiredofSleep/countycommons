// Progressive enhancement only — the site works fully without this file.
document.querySelectorAll('.bar button[data-act]').forEach(function (b) {
  b.addEventListener('click', function () {
    var open = b.dataset.act === 'open';
    document.querySelectorAll('details.node').forEach(function (d) { d.open = open; });
  });
});

// Share helpers: copy-link and the phone-native share sheet.
document.querySelectorAll('button[data-copy]').forEach(function (b) {
  b.addEventListener('click', function () {
    navigator.clipboard.writeText(b.dataset.copy).then(function () {
      var was = b.textContent; b.textContent = 'Copied ✓';
      setTimeout(function () { b.textContent = was; }, 1600);
    });
  });
});
document.querySelectorAll('button[data-share-url]').forEach(function (b) {
  if (!navigator.share) { b.style.display = 'none'; return; }
  b.addEventListener('click', function () {
    navigator.share({ title: b.dataset.shareTitle, url: b.dataset.shareUrl }).catch(function () {});
  });
});
