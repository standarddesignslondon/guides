
(function () {
  var grid = document.getElementById('grid');
  if (!grid) return;
  var rows = Array.prototype.slice.call(grid.querySelectorAll('.row'));
  var empty = document.getElementById('empty');
  var state = { q: '' };

  function apply() {
    var shown = 0;
    rows.forEach(function (c) {
      var ok = true;
      Object.keys(state).forEach(function (k) {
        if (k === 'q') return;
        if (state[k] && c.dataset[k] !== state[k]) ok = false;
      });
      if (state.q && c.dataset.text.indexOf(state.q) === -1) ok = false;
      c.hidden = !ok;
      if (ok) shown++;
    });
    if (empty) empty.hidden = shown > 0;
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
})();
