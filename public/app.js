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

// Rules-of-engagement popup: upgrade the :target fallback to a real modal.
document.querySelectorAll('[data-dialog]').forEach(function (b) {
  b.addEventListener('click', function (e) {
    var d = document.getElementById(b.dataset.dialog);
    if (d && d.showModal) { e.preventDefault(); if (!d.open) d.showModal(); }
  });
});

// Click-through tour: one slide at a time with Back / dots / Next. Pure
// enhancement — with JS off, every slide is visible as a readable scroll.
(function () {
  var tour = document.querySelector('.tour');
  if (!tour) return;
  var slides = [].slice.call(tour.querySelectorAll('.tour-slide'));
  if (slides.length < 2) return;
  tour.classList.add('js');
  var i = 0;
  var back = tour.querySelector('[data-tour="back"]');
  var next = tour.querySelector('[data-tour="next"]');
  var dotsWrap = tour.querySelector('.tour-dots');
  var dots = slides.map(function (_, k) {
    var d = document.createElement('button');
    d.type = 'button'; d.className = 'tour-dot';
    d.setAttribute('aria-label', 'Go to step ' + (k + 1));
    d.addEventListener('click', function () { go(k); });
    if (dotsWrap) dotsWrap.appendChild(d);
    return d;
  });
  function go(n) {
    i = Math.max(0, Math.min(slides.length - 1, n));
    slides.forEach(function (s, k) { s.classList.toggle('active', k === i); });
    dots.forEach(function (d, k) { d.classList.toggle('on', k === i); });
    if (back) back.style.visibility = i === 0 ? 'hidden' : 'visible';
    if (next) next.textContent = i === slides.length - 1 ? (next.dataset.last || 'Start') : 'Next →';
  }
  if (back) back.addEventListener('click', function () { go(i - 1); });
  if (next) next.addEventListener('click', function () {
    if (i === slides.length - 1) { window.location.href = next.dataset.href || '/'; }
    else go(i + 1);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') go(i + 1);
    else if (e.key === 'ArrowLeft') go(i - 1);
  });
  go(0);
})();

// Participatory budgeting: live "tokens left" counter + submit guard. Pure
// enhancement — the server enforces the sum regardless, so this works with JS
// off (you just find out on submit instead of live).
(function () {
  var form = document.querySelector('form[data-pb]');
  if (!form) return;
  var total = parseInt(form.dataset.pb, 10) || 10;
  var left = document.getElementById('tokens-left');
  var submit = form.querySelector('button[type=submit]');
  var inputs = form.querySelectorAll('input[data-token]');
  function step(input, delta) {
    var v = (parseInt(input.value, 10) || 0) + delta;
    if (v < 0) v = 0; if (v > total) v = total;
    input.value = v; sync();
  }
  form.querySelectorAll('button[data-step]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault();
      var input = document.getElementById(b.dataset.for);
      if (input) step(input, parseInt(b.dataset.step, 10));
    });
  });
  function sync() {
    var sum = 0;
    inputs.forEach(function (i) { sum += (parseInt(i.value, 10) || 0); });
    var rem = total - sum;
    if (left) {
      left.textContent = rem;
      left.parentElement.style.color = rem === 0 ? 'var(--sourced)' : (rem < 0 ? 'var(--dead)' : 'var(--ink)');
    }
    if (submit) {
      submit.disabled = sum !== total;
      submit.style.opacity = sum === total ? '1' : '0.5';
    }
  }
  inputs.forEach(function (i) { i.addEventListener('input', sync); });
  sync();
})();
