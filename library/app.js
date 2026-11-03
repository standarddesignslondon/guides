
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

  document.querySelectorAll('button.f[data-f]').forEach(function (b) {
    state[b.dataset.f] = state[b.dataset.f] || '';
    b.addEventListener('click', function () {
      state[b.dataset.f] = b.dataset.v;
      b.parentNode.querySelectorAll('button.f[data-f]').forEach(function (o) {
        o.classList.toggle('on', o === b);
      });
      apply();
    });
  });

  var order = rows.slice();
  document.querySelectorAll('button.s').forEach(function (b) {
    b.addEventListener('click', function () {
      var list = order.slice();
      if (b.dataset.s === 'date') {
        // newest first; undated entries go last, keeping their a-z order
        list.sort(function (x, y) {
          var a = x.dataset.date || '', c = y.dataset.date || '';
          return a === c ? 0 : (a < c ? 1 : -1);
        });
      }
      list.forEach(function (r) { grid.appendChild(r); });
      document.querySelectorAll('button.s').forEach(function (o) {
        o.classList.toggle('on', o === b);
      });
    });
  });

  var q = document.getElementById('q');
  if (q) q.addEventListener('input', function (e) {
    state.q = e.target.value.trim().toLowerCase();
    apply();
  });
  apply();
})();
