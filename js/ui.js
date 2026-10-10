/* =====================================================================
   ui.js — toast, modal, konfirmasi, cincin progres, grafik SVG
   ===================================================================== */
(function () {
  const UI = {};
  const ic = window.icon;

  // ---------- toast ----------
  UI.toast = function (msg, type, ms) {
    type = type || 'success';
    const ik = { success: 'checkCircle', error: 'xCircle', warning: 'alert', info: 'info' }[type] || 'info';
    const el = U.h('<div class="toast ' + type + '" role="status">' + ic(ik) + '<div>' + U.esc(msg) + '</div></div>');
    document.getElementById('toasts').appendChild(el);
    setTimeout(function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 320); }, ms || 3600);
  };

  // ---------- modal ----------
  const stack = [];
  UI.modal = function (o) {
    const el = U.h(
      '<div class="overlay" role="dialog" aria-modal="true">' +
      '<div class="modal ' + (o.size || '') + '">' +
      (o.title ? '<div class="m-head">' + (o.icon ? '<span class="ic-tile ' + (o.tone || 't-navy') + '">' + ic(o.icon) + '</span>' : '') +
        '<div><h2>' + U.esc(o.title) + '</h2>' + (o.sub ? '<div class="small muted">' + o.sub + '</div>' : '') + '</div>' +
        '<button class="close" data-close aria-label="Tutup">' + ic('x') + '</button></div>' : '') +
      '<div class="m-body">' + (o.body || '') + '</div>' +
      (o.foot ? '<div class="m-foot">' + o.foot + '</div>' : '') +
      '</div></div>');
    document.body.appendChild(el);
    document.body.style.overflow = 'hidden';
    const close = function (val) {
      if (!el.isConnected) return;
      el.remove();
      const i = stack.indexOf(api); if (i >= 0) stack.splice(i, 1);
      if (!stack.length) document.body.style.overflow = '';
      if (o.onClose) o.onClose(val);
    };
    const api = { el: el, close: close, $: function (s) { return el.querySelector(s); }, $$: function (s) { return U.$$(s, el); } };
    stack.push(api);
    el.addEventListener('click', function (e) {
      if (e.target === el && o.dismiss !== false) close();
      if (e.target.closest('[data-close]')) close();
    });
    setTimeout(function () { const f = el.querySelector('[autofocus]'); if (f && window.innerWidth > 767) f.focus(); }, 60);
    return api;
  };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && stack.length) stack[stack.length - 1].close(); });

  UI.confirm = function (o) {
    return new Promise(function (resolve) {
      const m = UI.modal({
        size: 'narrow', dismiss: true,
        body: '<div class="center" style="padding-top:18px"><div class="dialog-ic ' + (o.tone || 't-coral') + '">' + ic(o.icon || 'alert', 'lg') + '</div>' +
          '<h2 style="margin:0 0 8px;font-size:19px">' + U.esc(o.title) + '</h2><div class="muted">' + (o.html || U.esc(o.text || '')) + '</div></div>',
        foot: '<button class="btn btn-sec" data-no>' + U.esc(o.cancel || 'Batal') + '</button><button class="btn ' + (o.btn || 'btn-danger') + '" data-yes>' + U.esc(o.ok || 'Ya') + '</button>',
        onClose: function (v) { resolve(!!v); }
      });
      m.$('[data-no]').onclick = function () { m.close(false); };
      m.$('[data-yes]').onclick = function () { m.close(true); };
    });
  };

  UI.busy = function (btn, on, label) {
    if (!btn) return;
    if (on) { btn.dataset.html = btn.innerHTML; btn.disabled = true; btn.innerHTML = ic('loader', 'spin') + '<span>' + (label || 'Memproses…') + '</span>'; }
    else { btn.disabled = false; if (btn.dataset.html) btn.innerHTML = btn.dataset.html; }
  };

  // ---------- status & warna ----------
  UI.statusInfo = function (s) {
    return {
      'Aman': { cls: 'p-aman', ik: 'checkCircle', color: '#10B981' },
      'Hampir penuh': { cls: 'p-hampir', ik: 'alert', color: '#FFB700' },
      'Penuh': { cls: 'p-penuh', ik: 'alertCircle', color: '#F08C00' },
      'Melebihi batas': { cls: 'p-lewat', ik: 'xCircle', color: '#F26B5B' },
      'Tercapai': { cls: 'p-capai', ik: 'sparkles', color: '#FFB700' },
      'Berjalan': { cls: 'p-info', ik: 'trendUp', color: '#003D79' }
    }[s] || { cls: 'p-mute', ik: 'info', color: '#5B6B82' };
  };
  UI.pill = function (s, label) { const i = UI.statusInfo(s); return '<span class="pill ' + i.cls + '">' + ic(i.ik) + U.esc(label || s) + '</span>'; };
  UI.wallet = function (d) { return '<span class="pill w-' + d + '">' + U.esc(U.DOMPET_LABEL[d] || d) + '</span>'; };

  // ---------- cincin progres ----------
  UI.ring = function (pct, o) {
    o = o || {};
    const size = o.size || 84, sw = o.stroke || 9, r = (size - sw) / 2, c = 2 * Math.PI * r;
    const shown = Math.max(0, Math.min(100, pct));
    const id = 'g' + Math.random().toString(36).slice(2, 7);
    const color = o.color || '#FFB700';
    const grad = o.gradient !== false ? '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + color + '"/><stop offset="1" stop-color="' + (o.color2 || color) + '"/></linearGradient></defs>' : '';
    return '<div class="ring" style="width:' + size + 'px;height:' + size + 'px">' +
      '<svg width="' + size + '" height="' + size + '">' + grad +
      '<circle class="track" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke-width="' + sw + '"/>' +
      '<circle class="arc" data-off="' + (c * (1 - shown / 100)) + '" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + (grad ? 'url(#' + id + ')' : color) +
      '" stroke-width="' + sw + '" stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + c + '"/></svg>' +
      '<div class="lbl"><b class="num" style="font-size:' + (o.font || 18) + 'px">' + (o.label != null ? o.label : Math.round(pct) + '%') + '</b>' + (o.sub ? '<small>' + o.sub + '</small>' : '') + '</div></div>';
  };
  UI.animate = function (root) {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        U.$$('.ring .arc', root).forEach(function (a) { a.style.strokeDashoffset = a.dataset.off; });
        U.$$('.bar > i[data-w]', root).forEach(function (b) { b.style.width = b.dataset.w; });
        U.$$('[data-count]', root).forEach(function (el) { U.countUp(el, Number(el.dataset.count), 700); el.removeAttribute('data-count'); });
      });
    });
  };
  UI.rangeFill = function (el) { el.style.setProperty('--v', (Number(el.value) - Number(el.min || 0)) / ((Number(el.max) || 100) - Number(el.min || 0)) * 100 + '%'); };
  UI.bar = function (pct, tone) { return '<div class="bar ' + (tone || '') + '"><i data-w="' + Math.max(0, Math.min(100, pct)) + '%"></i></div>'; };

  // ---------- tooltip ----------
  const tip = function () { return document.getElementById('tip'); };
  document.addEventListener('mouseover', function (e) {
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (!t) { tip().classList.remove('show'); return; }
    tip().textContent = t.getAttribute('data-tip'); tip().classList.add('show');
  });
  document.addEventListener('mousemove', function (e) {
    const el = tip(); if (!el.classList.contains('show')) return;
    const x = Math.min(window.innerWidth - el.offsetWidth - 10, e.clientX + 14);
    el.style.left = x + 'px'; el.style.top = (e.clientY + 16) + 'px';
  });
  document.addEventListener('touchstart', function (e) {
    const t = e.target.closest && e.target.closest('[data-tip]');
    const el = tip();
    if (!t) { el.classList.remove('show'); return; }
    el.textContent = t.getAttribute('data-tip'); el.classList.add('show');
    const r = t.getBoundingClientRect();
    el.style.left = Math.max(10, Math.min(window.innerWidth - 250, r.left)) + 'px'; el.style.top = (r.top - 50) + 'px';
    setTimeout(function () { el.classList.remove('show'); }, 2200);
  }, { passive: true });

  // ---------- grafik SVG (tanpa library) ----------
  UI.donut = function (data, o) {
    o = o || {};
    const total = data.reduce(function (a, d) { return a + d.value; }, 0);
    const size = 200, r = 78, sw = 26, c = 2 * Math.PI * r;
    let acc = 0;
    const segs = total > 0 ? data.filter(function (d) { return d.value > 0; }).map(function (d, i) {
      const len = c * d.value / total;
      const gap = data.length > 1 ? Math.min(3, len / 3) : 0;
      const s = '<circle class="seg-r" cx="100" cy="100" r="' + r + '" fill="none" stroke="' + d.color + '" stroke-width="' + sw + '" stroke-dasharray="' + Math.max(0, len - gap) + ' ' + c +
        '" stroke-dashoffset="' + (-acc) + '" style="animation:fadeIn .6s ' + (i * 0.12) + 's both" data-tip="' + U.esc(d.label + '\n' + U.rp(d.value) + ' · ' + U.pct(d.value / total * 100)) + '"/>';
      acc += len; return s;
    }).join('') : '<circle cx="100" cy="100" r="' + r + '" fill="none" stroke="#E3E8F0" stroke-width="' + sw + '"/>';
    const legend = data.map(function (d) {
      return '<div><i style="background:' + d.color + '"></i>' + U.esc(d.label) + '<b class="num">' + U.rp(d.value) + '</b></div>';
    }).join('');
    return '<div class="donut-wrap"><svg class="chart" viewBox="0 0 ' + size + ' ' + size + '" style="width:190px;flex:none"><g transform="rotate(-90 100 100)">' + segs + '</g>' +
      '<text x="100" y="94" text-anchor="middle" style="font-size:11px;font-weight:700;letter-spacing:.05em">' + U.esc(o.title || 'TOTAL') + '</text>' +
      '<text x="100" y="116" text-anchor="middle" style="font-size:17px;font-weight:800;fill:#0B1F3A">' + U.esc(U.rpShort(total)) + '</text></svg>' +
      '<div class="legend">' + legend + '</div></div>';
  };

  function lbl(s, gw) { s = String(s); return gw < 64 && s.length > 7 ? s.slice(0, 6) + '.' : s; }
  UI.hbars = function (data, o) {
    const W = Math.max(280, (o && o.w) || 560), rowH = 46, H = data.length * rowH + 10, left = W < 420 ? 78 : 120, right = 52;
    const maxV = Math.max(1, Math.max.apply(null, data.map(function (d) { return Math.max(d.value, d.max || 0); })) * 1.08);
    const sx = function (v) { return left + (W - left - right) * v / maxV; };
    const rows = data.map(function (d, i) {
      const y = i * rowH + 10;
      const lim = d.max ? '<line x1="' + sx(d.max) + '" x2="' + sx(d.max) + '" y1="' + (y - 4) + '" y2="' + (y + 26) + '" stroke="#0B1F3A" stroke-width="1.5" stroke-dasharray="4 3" opacity=".55"/>' : '';
      return '<text x="0" y="' + (y + 16) + '" style="font-weight:600;fill:#0B1F3A">' + U.esc(d.label) + '</text>' +
        '<rect x="' + left + '" y="' + (y + 2) + '" width="' + (W - left - right) + '" height="18" rx="9" fill="#EEF2F7"/>' +
        '<rect class="bar-r growx" style="animation-delay:' + (i * 0.08) + 's" x="' + left + '" y="' + (y + 2) + '" width="' + Math.max(0, sx(d.value) - left) + '" height="18" rx="9" fill="' + d.color + '" data-tip="' + U.esc(d.label + '\nTerpakai ' + U.rp(d.value) + (d.max ? '\nBatas ' + U.rp(d.max) : '')) + '"/>' +
        lim + '<text x="' + (W - right + 8) + '" y="' + (y + 16) + '" style="font-weight:700;fill:#0B1F3A">' + (d.max ? Math.round(d.value / d.max * 100) + '%' : U.rpShort(d.value)) + '</text>';
    }).join('');
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '">' + rows + '</svg>';
  };

  function niceMax(v) { if (v <= 0) return 1000; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }
  function axes(W, H, pad, maxV) {
    let g = '';
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (H - pad.t - pad.b) * i / 4;
      g += '<line x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + y + '" y2="' + y + '" stroke="#E3E8F0"/>' +
        '<text x="' + (pad.l - 8) + '" y="' + (y + 4) + '" text-anchor="end">' + U.rpShort(maxV * (1 - i / 4)) + '</text>';
    }
    return g;
  }
  UI.groupBars = function (labels, series, o) {
    const W = Math.max(280, (o && o.w) || 640), H = 260, pad = { l: 48, r: 6, t: 12, b: 34 };
    const maxV = niceMax(Math.max.apply(null, [1].concat.apply([], series.map(function (s) { return s.values; }))));
    const gw = (W - pad.l - pad.r) / Math.max(1, labels.length), bw = Math.min(26, gw / (series.length + 1.2));
    let bars = '';
    labels.forEach(function (lb, i) {
      const x0 = pad.l + gw * i + (gw - bw * series.length - 6 * (series.length - 1)) / 2;
      series.forEach(function (s, j) {
        const v = s.values[i] || 0, h = (H - pad.t - pad.b) * v / maxV;
        bars += '<rect class="bar-r grow" style="animation-delay:' + (i * 0.06 + j * 0.03) + 's" x="' + (x0 + j * (bw + 6)) + '" y="' + (H - pad.b - h) + '" width="' + bw + '" height="' + Math.max(0, h) + '" rx="6" fill="' + s.color + '" data-tip="' + U.esc(lb + '\n' + s.name + ': ' + U.rp(v)) + '"/>';
      });
      bars += '<text x="' + (pad.l + gw * i + gw / 2) + '" y="' + (H - 10) + '" text-anchor="middle">' + U.esc(lbl(lb, gw)) + '</text>';
    });
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '">' + axes(W, H, pad, maxV) + bars + '</svg>' +
      '<div class="legend">' + series.map(function (s) { return '<span><i style="background:' + s.color + '"></i>' + U.esc(s.name) + '</span>'; }).join('') + '</div>';
  };
  UI.area = function (labels, series, o) {
    const W = Math.max(280, (o && o.w) || 640), H = 240, pad = { l: 48, r: 18, t: 14, b: 34 };
    const all = [].concat.apply([], series.map(function (s) { return s.values; }));
    const maxV = niceMax(Math.max.apply(null, [1].concat(all)));
    const minV = Math.min(0, Math.min.apply(null, all.concat([0])));
    const sx = function (i) { return pad.l + (labels.length < 2 ? (W - pad.l - pad.r) / 2 : (W - pad.l - pad.r) * i / (labels.length - 1)); };
    const sy = function (v) { return pad.t + (H - pad.t - pad.b) * (1 - (v - minV) / (maxV - minV)); };
    let out = '<defs>';
    series.forEach(function (s, k) { out += '<linearGradient id="ag' + k + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + s.fill + '" stop-opacity=".35"/><stop offset="1" stop-color="' + s.fill + '" stop-opacity="0"/></linearGradient>'; });
    out += '</defs>' + axes(W, H, pad, maxV);
    series.forEach(function (s, k) {
      const pts = s.values.map(function (v, i) { return [sx(i), sy(v)]; });
      if (!pts.length) return;
      let d = 'M' + pts[0][0] + ' ' + pts[0][1];
      for (let i = 1; i < pts.length; i++) { const cx = (pts[i - 1][0] + pts[i][0]) / 2; d += ' C' + cx + ' ' + pts[i - 1][1] + ' ' + cx + ' ' + pts[i][1] + ' ' + pts[i][0] + ' ' + pts[i][1]; }
      out += '<path class="fadein" d="' + d + ' L' + pts[pts.length - 1][0] + ' ' + (H - pad.b) + ' L' + pts[0][0] + ' ' + (H - pad.b) + 'Z" fill="url(#ag' + k + ')"/>';
      out += '<path class="draw" d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="3" stroke-linecap="round"/>';
      pts.forEach(function (p, i) { out += '<circle class="fadein" cx="' + p[0] + '" cy="' + p[1] + '" r="5" fill="#fff" stroke="' + s.color + '" stroke-width="2.5" data-tip="' + U.esc(labels[i] + '\n' + s.name + ': ' + U.rp(s.values[i])) + '"/>'; });
    });
    const gwA = (W - pad.l - pad.r) / Math.max(1, labels.length);
    labels.forEach(function (lb, i) { out += '<text x="' + sx(i) + '" y="' + (H - 10) + '" text-anchor="' + (i === 0 && labels.length > 1 ? 'start' : i === labels.length - 1 && labels.length > 1 ? 'end' : 'middle') + '">' + U.esc(lbl(lb, gwA)) + '</text>'; });
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '">' + out + '</svg>' +
      '<div class="legend">' + series.map(function (s) { return '<span><i style="background:' + s.color + '"></i>' + U.esc(s.name) + '</span>'; }).join('') + '</div>';
  };

  // ---------- bantuan tampilan ----------
  UI.empty = function (ik, judul, teks, cta) {
    return '<div class="empty"><div class="em-ic">' + ic(ik, 'xl') + '</div><b>' + U.esc(judul) + '</b><div>' + U.esc(teks || '') + '</div>' + (cta || '') + '</div>';
  };
  UI.skeleton = function () {
    return '<div class="stack"><div class="skel" style="height:120px"></div><div class="grid g-12"><div class="skel span-7" style="height:230px"></div><div class="skel span-5" style="height:230px"></div></div>' +
      '<div class="skel" style="height:200px"></div><div class="grid g-3"><div class="skel" style="height:150px"></div><div class="skel" style="height:150px"></div><div class="skel" style="height:150px"></div></div></div>';
  };
  UI.confetti = function () {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const wrap = U.h('<div class="confetti"></div>');
    const col = ['#FFB700', '#FFD15C', '#003D79', '#10B981', '#F26B5B'];
    for (let i = 0; i < 70; i++) {
      const p = document.createElement('i');
      p.style.left = Math.random() * 100 + '%'; p.style.background = col[i % col.length];
      p.style.animationDelay = Math.random() * 0.8 + 's'; p.style.animationDuration = 2 + Math.random() * 1.4 + 's';
      wrap.appendChild(p);
    }
    document.body.appendChild(wrap); setTimeout(function () { wrap.remove(); }, 4200);
  };
  UI.trxIcon = function (t) {
    if (t.jenis === 'Pemasukan') return { ik: t.dompet === 'Terop' ? 'tent' : t.dompet === 'Pondok' ? 'landmark' : 'banknote', tone: 't-em' };
    if (t.refTipe === 'hutang') return { ik: 'handCoins', tone: 't-coral' };
    if (t.dompet === 'Pribadi') return { ik: U.POS_IKON[t.kategori] || 'list', tone: t.kategori === 'Tabungan' ? 't-gold' : 't-coral' };
    return { ik: t.dompet === 'Terop' ? 'truck' : 'package', tone: 't-coral' };
  };

  window.UI = UI;
})();
