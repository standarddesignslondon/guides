
(function () {
  var grid = document.getElementById('grid');
  if (!grid) return;
  var rows = Array.prototype.slice.call(grid.querySelectorAll('.cat-row'));
  var empty = document.getElementById('empty');
  var count = document.getElementById('count');
  var state = { q: '' };

  function apply() {
    var shown = 0;
    rows.forEach(function (c) {
      var ok = true;
      Object.keys(state).forEach(function (k) {
        if (k === 'q') return;
        if (state[k] && c.dataset[k] !== state[k]) ok = false;
      });
      if (state.q) {
        var terms = state.q.split(/\s+/);
        for (var i = 0; i < terms.length; i++) {
          if (c.dataset.text.indexOf(terms[i]) === -1) { ok = false; break; }
        }
      }
      c.hidden = !ok;
      if (ok) shown++;
    });
    if (empty) empty.hidden = shown > 0;
    if (count) count.textContent = shown + ' of ' + rows.length + ' shown';
  }

  document.querySelectorAll('button.f').forEach(function (b) {
    state[b.dataset.f] = state[b.dataset.f] || '';
    b.addEventListener('click', function () {
      state[b.dataset.f] = b.dataset.v;
      b.parentNode.querySelectorAll('button.f').forEach(function (o) {
        o.classList.toggle('on', o === b);
      });
      apply();
    });
  });

  var q = document.getElementById('q');
  if (q) q.addEventListener('input', function (e) {
    state.q = e.target.value.trim().toLowerCase();
    apply();
  });
  apply();
})();
