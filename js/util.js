/* =====================================================================
   util.js — format angka, tanggal Masehi/Hijriah, DOM, kompres gambar
   ===================================================================== */
(function () {
  const U = {};
  const BULAN_H = ['Muharram', 'Safar', 'Rabiul Awal', 'Rabiul Akhir', 'Jumadil Awal', 'Jumadil Akhir',
    'Rajab', "Sya'ban", 'Ramadhan', 'Syawal', "Dzulqa'dah", 'Dzulhijjah'];
  const BULAN_M = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const BULAN_M_PANJANG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  U.BULAN_H = BULAN_H;
  U.POS = ['Kebutuhan Primer', 'Investasi Otak/Tubuh', 'Jajanan', 'Tabungan'];
  U.POS_SINGKAT = { 'Kebutuhan Primer': 'Primer', 'Investasi Otak/Tubuh': 'Investasi', 'Jajanan': 'Jajanan', 'Tabungan': 'Tabungan' };
  U.POS_IKON = { 'Kebutuhan Primer': 'shirt', 'Investasi Otak/Tubuh': 'book', 'Jajanan': 'coffee', 'Tabungan': 'piggy' };
  U.POS_INFO = {
    'Kebutuhan Primer': 'Laundry, paket data, iuran',
    'Investasi Otak/Tubuh': 'Kelas, e-book, suplemen',
    'Jajanan': 'Kopi, camilan, jajan',
    'Tabungan': 'Target & dana darurat'
  };
  U.SUBKAT = {
    'Kebutuhan Primer': ['Laundry', 'Paket Data', 'Iuran Subuh Berkah', 'Sabun & Mandi', 'Transportasi'],
    'Investasi Otak/Tubuh': ['Kelas Online', 'E-book / Buku', 'Suplemen Olahraga', 'Telur'],
    'Jajanan': ['Kopi & Snack', 'Gorengan', 'Makan Luar', 'Air Minum'],
    'Tabungan': ['Setoran Tabungan', 'Dana Darurat']
  };
  U.DOMPET_LABEL = { Pribadi: 'Pribadi', Pondok: 'Dana Pondok', Terop: 'Dana Terop' };
  U.DOMPET_IKON = { Pribadi: 'wallet', Pondok: 'building', Terop: 'tent' };

  // ---------- angka ----------
  U.rp = function (n, opt) {
    const v = Math.round(Number(n) || 0);
    const s = Math.abs(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (v < 0 ? '−' : '') + (opt === 'no' ? '' : 'Rp ') + s;
  };
  U.rpSigned = function (t) { return (t.jenis === 'Pemasukan' ? '+ ' : '− ') + U.rp(t.nominal); };
  U.rpShort = function (n) {
    const v = Math.abs(n);
    if (v >= 1e9) return (n / 1e9).toFixed(1).replace('.0', '').replace('.', ',') + ' M';
    if (v >= 1e6) return (n / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace('.0', '').replace('.', ',') + ' jt';
    if (v >= 1e3) return Math.round(n / 1e3) + ' rb';
    return String(Math.round(n));
  };
  U.parseNum = function (s) { return Number(String(s || '').replace(/[^\d]/g, '')) || 0; };
  U.fmtInput = function (s) { const n = U.parseNum(s); return n ? n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''; };
  U.pct = function (n) { return (Math.round(n * 10) / 10).toString().replace('.', ',') + '%'; };

  const SATUAN = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  function terbilang(n) {
    n = Math.floor(n);
    if (n < 12) return SATUAN[n];
    if (n < 20) return terbilang(n - 10) + ' belas';
    if (n < 100) return terbilang(Math.floor(n / 10)) + ' puluh' + (n % 10 ? ' ' + terbilang(n % 10) : '');
    if (n < 200) return 'seratus' + (n - 100 ? ' ' + terbilang(n - 100) : '');
    if (n < 1000) return terbilang(Math.floor(n / 100)) + ' ratus' + (n % 100 ? ' ' + terbilang(n % 100) : '');
    if (n < 2000) return 'seribu' + (n - 1000 ? ' ' + terbilang(n - 1000) : '');
    if (n < 1e6) return terbilang(Math.floor(n / 1000)) + ' ribu' + (n % 1000 ? ' ' + terbilang(n % 1000) : '');
    if (n < 1e9) return terbilang(Math.floor(n / 1e6)) + ' juta' + (n % 1e6 ? ' ' + terbilang(n % 1e6) : '');
    if (n < 1e12) return terbilang(Math.floor(n / 1e9)) + ' miliar' + (n % 1e9 ? ' ' + terbilang(n % 1e9) : '');
    return '';
  }
  U.terbilang = function (n) { if (!n) return ''; const t = terbilang(n); return t.charAt(0).toUpperCase() + t.slice(1) + ' rupiah'; };

  // ---------- tanggal ----------
  U.today = function () {
    const d = new Date(Date.now() + 7 * 3600000); // WIB
    return d.toISOString().slice(0, 10);
  };
  U.nowTime = function () { const d = new Date(Date.now() + 7 * 3600000); return d.toISOString().slice(11, 16); };
  U.toDate = function (s) { const p = String(s).split('-').map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2])); };
  U.addDays = function (s, n) { const d = U.toDate(s); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  U.diffDays = function (a, b) { return Math.round((U.toDate(b) - U.toDate(a)) / 86400000); };
  U.masehi = function (s, panjang) {
    if (!s) return '-';
    const p = String(s).split('-');
    return Number(p[2]) + ' ' + (panjang ? BULAN_M_PANJANG : BULAN_M)[Number(p[1]) - 1] + ' ' + p[0];
  };
  U.masehiPendek = function (s) { if (!s) return '-'; const p = String(s).split('-'); return Number(p[2]) + ' ' + BULAN_M[Number(p[1]) - 1]; };

  // Kalender Hijriah via Intl (Umm al-Qura) + cadangan aritmetika
  let fmtH = null;
  try {
    fmtH = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { timeZone: 'UTC', day: 'numeric', month: 'numeric', year: 'numeric' });
    const t = fmtH.formatToParts(new Date(Date.UTC(2026, 9, 12)));
    if (!t.some(function (x) { return x.type === 'year' && Number(x.value) > 1400; })) fmtH = null;
  } catch (e) { fmtH = null; }
  function hijriArit(s) {
    const EPOCH = 1948439.5;
    const isl2jd = function (y, m, d) { return d + Math.ceil(29.5 * (m - 1)) + (y - 1) * 354 + Math.floor((3 + 11 * y) / 30) + EPOCH - 1; };
    const jd = Math.floor(U.toDate(s).getTime() / 86400000 + 2440587.5) + 0.5;
    const y = Math.floor((30 * (jd - EPOCH) + 10646) / 10631);
    const m = Math.min(12, Math.ceil((jd - (29 + isl2jd(y, 1, 1))) / 29.5) + 1);
    return { y: y, m: m, d: Math.round(jd - isl2jd(y, m, 1) + 1) };
  }
  U.hijriIntl = function (s) {
    if (!fmtH) return hijriArit(s);
    const p = {};
    fmtH.formatToParts(U.toDate(s)).forEach(function (x) { p[x.type] = x.value; });
    return { y: Number(p.year), m: Number(p.month), d: Number(p.day) };
  };
  /** Petunjuk batas bulan Hijriah (±14 bulan) untuk dikirim ke server. */
  U.periodHints = function () {
    const out = []; let cur = null;
    const start = U.addDays(U.today(), -420), end = U.addDays(U.today(), 420);
    for (let s = start; s <= end; s = U.addDays(s, 1)) {
      const h = U.hijriIntl(s);
      const key = h.y + '-' + h.m;
      if (!cur || cur.key !== key) { if (cur) out.push(cur); cur = { key: key, y: h.y, m: h.m, mulai: s, akhir: s }; }
      else cur.akhir = s;
    }
    if (cur) out.push(cur);
    return out.slice(1, -1).map(function (c) { return { y: c.y, m: c.m, mulai: c.mulai, akhir: c.akhir }; });
  };
  let periods = [];
  U.setPeriods = function (list) { periods = list || []; };
  U.periodOf = function (s) {
    for (let i = 0; i < periods.length; i++) if (s >= periods[i].mulai && s <= periods[i].akhir) return periods[i];
    return null;
  };
  U.hijri = function (s) {
    const p = U.periodOf(s);
    if (p) return { y: p.y, m: p.m, d: U.diffDays(p.mulai, s) + 1 };
    return U.hijriIntl(s);
  };
  U.hijriLabel = function (s, opt) {
    if (!s) return '-';
    const h = U.hijri(s);
    return h.d + ' ' + BULAN_H[h.m - 1] + (opt === 'noYear' ? '' : ' ' + h.y + (opt === 'H' ? ' H' : ''));
  };
  U.bulanH = function (y, m) { return BULAN_H[m - 1] + ' ' + y + ' H'; };
  U.namaKelompok = function (id) {
    if (!id) return '';
    const list = (window.S && S.boot && S.boot.kelompokDana) || [];
    for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i].nama;
    return '';
  };
  /** Teks kolom "kategori" untuk tabel: pos (Pribadi), anggaran·kategori (Pondok), kepanitiaan (Terop). */
  U.labelKategori = function (t) {
    if (t.dompet === 'Pribadi') return t.jenis === 'Pemasukan' ? 'Pemasukan' : (t.kategori || '-');
    const k = U.namaKelompok(t.idKelompok) || (t.dompet === 'Pondok' ? 'Tanpa anggaran' : 'Tanpa kepanitiaan');
    if (t.dompet === 'Terop') return k;
    return k + ' · ' + (t.jenis === 'Pemasukan' ? 'Dana masuk' : (t.kategori || '-'));
  };

  // ---------- DOM ----------
  U.$ = function (sel, root) { return (root || document).querySelector(sel); };
  U.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  U.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  };
  U.h = function (html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  U.debounce = function (fn, ms) { let t; return function () { const a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); }; };
  U.inisial = function (nama) { return String(nama || 'S').trim().split(/\s+/).slice(0, 2).map(function (x) { return x[0]; }).join('').toUpperCase(); };
  U.uid = function () { return 'tmp-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };
  U.countUp = function (el, to, ms) {
    if (!el) return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { el.textContent = U.rp(to); return; }
    const t0 = performance.now(), from = 0;
    function step(t) {
      const k = Math.min(1, (t - t0) / (ms || 700));
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = U.rp(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  };

  // ---------- storage aman ----------
  U.store = {
    get: function (k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { /* abaikan */ } }
  };
  U.session = {
    get: function (k, d) { try { const v = sessionStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* abaikan */ } },
    del: function (k) { try { sessionStorage.removeItem(k); } catch (e) { /* abaikan */ } }
  };

  // ---------- berkas: kompres gambar ≤ ~1 MB ----------
  U.bacaBukti = function (file) {
    return new Promise(function (resolve, reject) {
      if (!file) return resolve(null);
      if (file.type === 'application/pdf') {
        if (file.size > 6 * 1024 * 1024) return reject(new Error('PDF maksimal 6 MB.'));
        const r = new FileReader();
        r.onload = function () { resolve({ mime: 'application/pdf', data: String(r.result).split(',')[1], nama: file.name, preview: '' }); };
        r.onerror = function () { reject(new Error('Gagal membaca berkas.')); };
        return r.readAsDataURL(file);
      }
      if (!/^image\//.test(file.type)) return reject(new Error('Pilih foto (JPG/PNG) atau PDF.'));
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = function () {
        const maks = 1600;
        let w = img.naturalWidth, h = img.naturalHeight;
        if (Math.max(w, h) > maks) { const k = maks / Math.max(w, h); w = Math.round(w * k); h = Math.round(h * k); }
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h);
        let q = 0.82, data = c.toDataURL('image/jpeg', q);
        while (data.length * 0.75 > 950 * 1024 && q > 0.4) { q -= 0.1; data = c.toDataURL('image/jpeg', q); }
        URL.revokeObjectURL(url);
        resolve({ mime: 'image/jpeg', data: data.split(',')[1], nama: file.name, preview: data });
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Foto tidak dapat dibaca.')); };
      img.src = url;
    });
  };
  U.unduhBase64 = function (b64, mime, nama) {
    const bin = atob(b64); const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([arr], { type: mime }));
    const a = document.createElement('a'); a.href = url; a.download = nama; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
  };
  U.namaPerangkat = function () {
    const ua = navigator.userAgent;
    const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Perangkat';
    const br = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
    return br + ' · ' + os;
  };

  window.U = U;
})();
