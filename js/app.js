/* =====================================================================
   app.js — state, router, kerangka tampilan, layar PIN, sinkronisasi
   ===================================================================== */
(function () {
  const ic = window.icon;
  const S = window.S = {
    boot: null, periodeId: null, page: 'beranda', hintsSent: false, loading: false,
    hiddenBanner: U.session.get('sm_hidebanner', {}), trxCache: {}
  };
  const NAV = [
    { id: 'beranda', label: 'Beranda', ik: 'home' },
    { id: 'transaksi', label: 'Transaksi', ik: 'list' },
    { id: 'anggaran', label: 'Anggaran', ik: 'pie' },
    { id: 'pondok', label: 'Dana Pondok', ik: 'building' },
    { id: 'terop', label: 'Dana Terop', ik: 'tent' },
    { id: 'pinjaman', label: 'Pinjaman & Hutang', ik: 'swap' },
    { id: 'target', label: 'Target', ik: 'flag' },
    { id: 'laporan', label: 'Laporan', ik: 'chart' },
    { id: 'pengaturan', label: 'Pengaturan', ik: 'settings' }
  ];

  const App = window.App = {};

  // ============================================================
  // START
  // ============================================================
  App.start = async function () {
    API.onAuthLost = function () { App.lock('Sesi berakhir. Silakan masukkan PIN lagi.'); };
    window.addEventListener('hashchange', App.route);
    window.addEventListener('online', function () { API.flush(function (n) { UI.toast(n + ' transaksi antrean berhasil disimpan.'); App.refresh(true); }); });
    if (!API.configured()) { hideLoader(); return renderBelumSetup(); }
    if (API.getToken()) {
      const cache = U.store.get('sm_boot');
      if (cache) { setBoot(cache); renderShell(); App.route(); hideLoader(); }
      try {
        await App.refresh(!!cache);
        if (!cache) { renderShell(); App.route(); }
        hideLoader();
        API.flush(function (n) { UI.toast(n + ' transaksi antrean berhasil disimpan.'); App.refresh(true); });
      } catch (e) {
        hideLoader();
        if (e.code === 'AUTH') return; // layar PIN sudah ditampilkan
        if (!cache) return renderGagal(e);
        UI.toast(e.message, 'warning');
      }
      return;
    }
    try {
      const st = await API.call('status');
      hideLoader();
      showPin(st.adaPin ? (st.terkunciSampai ? 'locked' : 'login') : 'create1', { sampai: st.terkunciSampai, nama: st.nama });
    } catch (e) { hideLoader(); renderGagal(e); }
  };

  function hideLoader() { const l = document.getElementById('bootLoader'); if (l) { l.style.transition = 'opacity .35s'; l.style.opacity = 0; setTimeout(function () { l.remove(); }, 380); } }

  function setBoot(b) {
    S.boot = b;
    S.periodeId = b.periode.id;
    U.setPeriods(b.daftarPeriode);
  }

  /** Ambil ulang seluruh data beranda dari server. */
  App.refresh = async function (silent) {
    if (!silent && S.boot) { /* biarkan data lama tampil */ }
    const payload = { periode: S.periodeId };
    if (!S.hintsSent) payload.hints = U.periodHints();
    const b = await API.call('bootstrap', payload);
    S.hintsSent = true;
    setBoot(b);
    S.trxCache = {};
    U.store.set('sm_boot', b);
    if (document.querySelector('.shell')) { updateChrome(); App.render(); }
    return b;
  };

  App.isCurrentPeriod = function () { return S.boot && S.boot.periode.id === S.boot.periodeIni; };

  // ============================================================
  // ROUTER
  // ============================================================
  App.route = function () {
    const id = (location.hash.replace(/^#\/?/, '') || 'beranda').split('?')[0];
    S.page = window.Pages[id] ? id : 'beranda';
    U.$$('.nav a, .dock a').forEach(function (a) { a.classList.toggle('active', a.dataset.page === S.page); });
    App.render();
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  };
  App.go = function (page) { if (location.hash === '#/' + page) App.route(); else location.hash = '#/' + page; };

  App.render = function () {
    const root = document.getElementById('content');
    if (!root || !S.boot) return;
    const P = window.Pages[S.page];
    root.innerHTML = P.render(S);
    if (P.mount) P.mount(root, S);
    UI.animate(root);
    document.title = (P.title || 'SafeMoney') + ' · SafeMoney';
  };

  // ============================================================
  // KERANGKA (sidebar, topbar, dock)
  // ============================================================
  function renderShell() {
    const app = document.getElementById('app');
    app.innerHTML =
      '<div class="ambient"><i></i><i></i><i></i></div>' +
      '<div class="shell">' +
      '<aside class="sidebar"><div class="brand"><img src="assets/logo-mark.png" alt=""><div><b>Safe<em>Money</em></b><small>Keuangan Personal</small></div></div>' +
      '<nav class="nav" aria-label="Menu utama">' + NAV.map(function (n) {
        return '<a href="#/' + n.id + '" data-page="' + n.id + '">' + ic(n.ik) + '<span>' + n.label + '</span><span class="badge hidden" data-badge="' + n.id + '"></span></a>';
      }).join('') + '</nav>' +
      '<div class="side-foot"><button id="btnLogout">' + ic('lock') + 'Keluar dari perangkat ini</button></div></aside>' +
      '<div class="main">' +
      '<header class="topbar"><div class="mlogo"><img src="assets/logo-mark.png" alt=""><span>Safe<em>Money</em></span></div>' +
      '<button class="period-chip" id="periodChip" aria-label="Pilih periode">' + ic('calendar') + '<span id="periodText"></span>' + ic('chevronDown', 'sm') + '</button>' +
      '<div class="top-actions"><button class="icon-btn" id="btnNotif" aria-label="Notifikasi">' + ic('bell') + '<span class="badge hidden" id="notifCount"></span></button>' +
      '<button class="avatar" id="btnAvatar" title="Pengaturan" aria-label="Pengaturan"></button></div></header>' +
      '<main class="content" id="content"></main></div>' +
      '<button class="fab" id="fab">' + ic('plus') + 'Catat Transaksi</button>' +
      '<nav class="dock" aria-label="Menu bawah">' +
      '<a href="#/beranda" data-page="beranda">' + ic('home') + 'Beranda</a>' +
      '<a href="#/transaksi" data-page="transaksi">' + ic('list') + 'Transaksi</a>' +
      '<button class="cta" id="dockAdd" aria-label="Catat transaksi"><span>' + ic('plus') + '</span>Catat</button>' +
      '<a href="#/target" data-page="target">' + ic('flag') + 'Target</a>' +
      '<button id="dockMore">' + ic('grid') + 'Lainnya<span class="badge hidden" id="dockBadge"></span></button></nav>' +
      '</div>';
    U.$('#fab').onclick = function () { Forms.transaksi(); };
    U.$('#dockAdd').onclick = function () { Forms.transaksi(); };
    U.$('#dockMore').onclick = menuLainnya;
    U.$('#periodChip').onclick = pilihPeriode;
    U.$('#btnNotif').onclick = panelNotif;
    U.$('#btnAvatar').onclick = function () { App.go('pengaturan'); };
    U.$('#btnLogout').onclick = function () { App.logout(false); };
    updateChrome();
  }

  function updateChrome() {
    const b = S.boot; if (!b || !U.$('#periodText')) return;
    const P = b.periode;
    U.$('#periodText').innerHTML = U.esc(P.nama) + '<span class="long"> · ' + U.masehiPendek(P.mulai) + ' – ' + U.masehi(P.akhir) + '</span>';
    U.$('#periodChip').classList.toggle('past', !App.isCurrentPeriod());
    setBadge(U.$('#notifCount'), b.notifikasi.length);
    setBadge(U.$('[data-badge="pondok"]'), b.belumNota.length);
    const jt = b.notifikasi.filter(function (n) { return n.tipe === 'jatuh_tempo'; }).length;
    setBadge(U.$('[data-badge="pinjaman"]'), jt);
    setBadge(U.$('#dockBadge'), jt + b.belumNota.length);
    U.$('#btnAvatar').textContent = U.inisial(b.pengaturan.nama_pemilik);
  }
  App.updateChrome = updateChrome;
  function setBadge(el, n) { if (!el) return; el.textContent = n > 99 ? '99+' : n; el.classList.toggle('hidden', !n); }

  function menuLainnya() {
    const b = S.boot;
    const item = function (id, ik, label, tone, extra) {
      return '<button class="choice" data-go="' + id + '" style="display:flex;gap:12px;align-items:center"><span class="ic-tile ' + tone + '">' + ic(ik) + '</span><span><b>' + label + '</b>' + (extra ? '<small>' + extra + '</small>' : '') + '</span></button>';
    };
    const m = UI.modal({
      title: 'Menu Lainnya', icon: 'grid',
      body: '<div class="choice-grid c2">' +
        item('anggaran', 'pie', 'Anggaran', 't-navy', 'Atur persen 4 pos') +
        item('pondok', 'building', 'Dana Pondok', 't-em', b.belumNota.length ? b.belumNota.length + ' belum ada nota' : 'Kas amanah') +
        item('terop', 'tent', 'Dana Terop', 't-gold', 'Kas sewa terop') +
        item('pinjaman', 'swap', 'Pinjaman & Hutang', 't-coral', 'Kewajiban berjalan') +
        item('laporan', 'chart', 'Laporan', 't-navy', 'Grafik & PDF') +
        item('pengaturan', 'settings', 'Pengaturan', 't-navy', 'PIN, kutipan, kalender') +
        '</div><button class="btn btn-danger-out btn-block" id="mLogout" style="margin-top:16px">' + ic('lock') + 'Keluar dari perangkat ini</button>'
    });
    m.$$('[data-go]').forEach(function (b2) { b2.onclick = function () { m.close(); App.go(b2.dataset.go); }; });
    m.$('#mLogout').onclick = function () { m.close(); App.logout(false); };
  }

  function pilihPeriode() {
    const b = S.boot;
    const list = b.daftarPeriode.filter(function (p) { return p.mulai <= U.addDays(b.hariIni, 31); }).slice().reverse().slice(0, 14);
    const m = UI.modal({
      title: 'Pilih Bulan Pembukuan', icon: 'calendar', size: 'narrow',
      body: '<div class="fields">' + list.map(function (p) {
        const ini = p.id === b.periodeIni, aktif = p.id === S.periodeId;
        return '<button class="choice ' + (aktif ? 'on' : '') + '" data-p="' + p.id + '" style="width:100%"><b>' + U.esc(p.nama) + (ini ? ' <span class="pill p-aman" style="margin-left:6px">Bulan ini</span>' : '') +
          '</b><small>' + U.masehi(p.mulai) + ' – ' + U.masehi(p.akhir) + '</small><span class="chk">' + ic('checkCircle') + '</span></button>';
      }).join('') + '</div>'
    });
    m.$$('[data-p]').forEach(function (btn) {
      btn.onclick = async function () {
        m.close();
        if (btn.dataset.p === S.periodeId) return;
        S.periodeId = btn.dataset.p;
        document.getElementById('content').innerHTML = UI.skeleton();
        try { await App.refresh(); } catch (e) { UI.toast(e.message, 'error'); App.render(); }
      };
    });
  }

  function panelNotif() {
    const list = S.boot.notifikasi;
    const ikon = { jatuh_tempo: 'clock', anggaran: 'pie', nota: 'paperclip' };
    const m = UI.modal({
      title: 'Pusat Pemberitahuan', icon: 'bell', sub: list.length ? list.length + ' pemberitahuan' : 'Semua aman',
      body: list.length ? list.map(function (n, i) {
        return '<div class="ntf ' + n.level + '"><span class="ic-tile ' + (n.level === 'danger' ? 't-coral' : n.level === 'warning' ? 't-gold' : 't-navy') + '">' + ic(ikon[n.tipe] || 'bell') + '</span>' +
          '<div style="flex:1"><b>' + U.esc(n.judul) + '</b><small>' + U.esc(n.pesan) + '</small></div><button class="btn btn-sm btn-sec" data-i="' + i + '">Buka</button></div>';
      }).join('') : UI.empty('checkCircle', 'Tidak ada pemberitahuan', 'Anggaran aman, tidak ada jatuh tempo dekat. Alhamdulillah.')
    });
    m.$$('[data-i]').forEach(function (b) { b.onclick = function () { m.close(); App.go(list[b.dataset.i].halaman); }; });
  }

  // ============================================================
  // TRANSAKSI OPTIMISTIS (tampil seketika, sinkron di belakang)
  // ============================================================
  App.simpanTransaksi = async function (payload, opt) {
    opt = opt || {};
    const b = S.boot;
    const tmp = Object.assign({}, payload, { id: payload.id || U.uid(), _pending: true, nominal: Number(payload.nominal), adaBukti: !!(payload.bukti || payload._adaBukti), refTipe: payload.refTipe || '' });
    const inPeriod = tmp.tanggal >= b.periode.mulai && tmp.tanggal <= b.periode.akhir;
    const snapshot = JSON.stringify(b);
    if (!payload.id) {
      if (inPeriod) b.transaksi.unshift(tmp);
      terapkanLokal(tmp, 1);
    } else {
      const i = b.transaksi.findIndex(function (t) { return t.id === payload.id; });
      if (i >= 0) { terapkanLokal(b.transaksi[i], -1); b.transaksi[i] = tmp; terapkanLokal(tmp, 1); }
    }
    App.render(); updateChrome();
    const kirim = Object.assign({}, payload); delete kirim._adaBukti; delete kirim.refTipe;
    try {
      const r = await API.call('simpanTransaksi', kirim);
      UI.toast(opt.pesan || (payload.id ? 'Perubahan tersimpan.' : 'Transaksi tersimpan ✓'));
      if (r.peringatan) tampilPeringatan(r.peringatan);
      await App.refresh(true);
      return r;
    } catch (e) {
      if (e.code === 'NETWORK' && !payload.id) {
        API.enqueue(tmp.id, kirim);
        tmp._pending = false; tmp._queued = true; App.render();
        UI.toast('Koneksi lemah — transaksi disimpan di antrean dan dikirim saat tersambung.', 'warning', 5000);
        return null;
      }
      S.boot = JSON.parse(snapshot); U.setPeriods(S.boot.daftarPeriode);
      App.render(); updateChrome();
      UI.toast('Gagal menyimpan: ' + e.message, 'error', 5000);
      throw e;
    }
  };

  function terapkanLokal(t, arah) {
    const b = S.boot, n = Number(t.nominal) * arah;
    if (b.saldo[t.dompet] !== undefined) b.saldo[t.dompet] += t.jenis === 'Pemasukan' ? n : -n;
    if (t.tanggal < b.periode.mulai || t.tanggal > b.periode.akhir || t.dompet !== 'Pribadi') return;
    if (t.jenis === 'Pemasukan') { b.ringkasan.pemasukan += n; return; }
    const a = b.anggaran.find(function (x) { return x.kategori === t.kategori; });
    if (!a) return;
    a.terpakai += n; a.sisa = a.batas - a.terpakai;
    a.pct = a.batas > 0 ? Math.round(a.terpakai / a.batas * 1000) / 10 : (a.terpakai > 0 ? 999 : 0);
    const amb = b.ringkasan.ambang || 80;
    a.status = a.kategori === 'Tabungan' ? (a.pct >= 100 ? 'Tercapai' : 'Berjalan') : a.pct > 100 ? 'Melebihi batas' : a.pct >= 100 ? 'Penuh' : a.pct >= amb ? 'Hampir penuh' : 'Aman';
    if (t.kategori === 'Tabungan') b.ringkasan.setorTabungan += n; else b.ringkasan.pengeluaran += n;
    b.ringkasan.sisaBoleh = b.anggaran.filter(function (x) { return x.kategori !== 'Tabungan'; }).reduce(function (s, x) { return s + Math.max(0, x.sisa); }, 0);
  }

  function tampilPeringatan(p) {
    const teks = p.level === 'lewat' ? p.kategori + ' melebihi batas ' + U.rp(-p.sisa) : p.level === 'penuh' ? p.kategori + ' sudah 100% — batas bulan ini penuh' : p.kategori + ' sudah ' + Math.round(p.pct) + '% dari batas bulan ini';
    UI.toast(teks, p.level === 'ambang' ? 'warning' : 'error', 6000);
  }
  App.tampilPeringatan = tampilPeringatan;

  // ============================================================
  // LOGOUT / KUNCI
  // ============================================================
  App.logout = async function (semua) {
    const ok = await UI.confirm({ title: semua ? 'Keluar dari semua perangkat?' : 'Keluar dari perangkat ini?', text: semua ? 'Semua HP/laptop yang tersimpan harus memasukkan PIN lagi.' : 'Anda perlu memasukkan PIN saat membuka SafeMoney lagi.', ok: 'Keluar', icon: 'lock', tone: 't-navy', btn: 'btn-navy' });
    if (!ok) return;
    try { await API.call('logout', { semua: !!semua }); } catch (e) { /* tetap keluar */ }
    App.lock();
  };
  App.lock = function (pesan) {
    API.clearToken();
    U.store.del('sm_boot');
    S.boot = null;
    document.getElementById('app').innerHTML = '';
    showPin('login', { pesan: pesan });
  };

  // ============================================================
  // LAYAR PIN
  // ============================================================
  function showPin(mode, o) {
    o = o || {};
    let pin = '', pinBaru = '', ingat = U.store.get('sm_ingat', true);
    const panjang = U.store.get('sm_pinlen', 6);
    const app = document.getElementById('app');
    let timer = null;

    function judul() {
      return {
        login: ['Masukkan PIN Anda', 'Akses aman ke catatan keuangan pribadi & kas amanah'],
        create1: ['Buat PIN Baru', 'Pertama kali? Buat PIN 4–6 digit untuk mengunci SafeMoney'],
        create2: ['Ulangi PIN', 'Ketik sekali lagi PIN yang sama'],
        locked: ['Akses Sementara Dibatasi', 'Terlalu banyak percobaan keliru']
      }[mode];
    }
    function draw(msg, err) {
      const j = judul();
      const maxLen = mode === 'login' ? panjang : 6;
      const dots = Array.from({ length: Math.max(maxLen, pin.length) }).map(function (_, i) { return '<span class="' + (i < pin.length ? 'on' : '') + '"></span>'; }).join('');
      app.innerHTML = '<div class="pin-screen"><div class="pin-card">' +
        '<img class="pin-logo" src="assets/logo-full.png" alt="SafeMoney">' +
        '<h1>' + j[0] + '</h1><p class="sub">' + j[1] + '</p>' +
        (mode === 'locked' ? '<div class="lockbox">' + ic('lock', 'lg') + '<div class="small" style="margin-top:6px">Keypad dinonaktifkan sampai waktu habis.</div><div class="timer num" id="lockTimer">--:--</div></div>' :
          '<div class="pin-dots ' + (err ? 'err shake' : '') + '" aria-label="' + pin.length + ' digit">' + dots + '</div>' +
          '<div class="pin-msg ' + (err ? 'err' : '') + '">' + U.esc(msg || '') + '</div>' +
          '<div class="keypad">' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) { return '<button data-k="' + n + '">' + n + '</button>'; }).join('') +
          '<button data-k="del" aria-label="Hapus">' + ic('backspace', 'lg') + '</button><button data-k="0">0</button><button data-k="ok" class="k-ok" aria-label="Masuk">' + ic('check', 'lg') + '</button></div>' +
          (mode === 'login' ? '<label class="remember"><span>' + ic('monitor', 'sm') + ' Ingat perangkat ini (30 hari)</span><span class="switch"><input type="checkbox" id="ingat" ' + (ingat ? 'checked' : '') + '><span></span></span></label>' : '') +
          '<button class="btn btn-gold" id="pinGo">' + (mode === 'login' ? 'Masuk ke Beranda' : mode === 'create1' ? 'Lanjut' : 'Simpan & Aktifkan PIN') + ic('arrowRight') + '</button>') +
        (mode === 'login' || mode === 'locked' ? '<div><button class="pin-link" id="lupa">Lupa PIN?</button></div>' : '') +
        '</div></div>';
      U.$$('.keypad button', app).forEach(function (b) { b.onclick = function () { tekan(b.dataset.k); }; });
      const go = U.$('#pinGo', app); if (go) go.onclick = function () { tekan('ok'); };
      const cb = U.$('#ingat', app); if (cb) cb.onchange = function () { ingat = cb.checked; U.store.set('sm_ingat', ingat); };
      const lupa = U.$('#lupa', app); if (lupa) lupa.onclick = bantuanLupa;
      if (mode === 'locked') mulaiTimer();
    }
    function mulaiTimer() {
      clearInterval(timer);
      const tick = function () {
        const sisa = Math.max(0, (o.sampai || 0) - Date.now());
        const el = U.$('#lockTimer'); if (el) el.textContent = String(Math.floor(sisa / 60000)).padStart(2, '0') + ':' + String(Math.floor(sisa / 1000) % 60).padStart(2, '0');
        if (sisa <= 0) { clearInterval(timer); mode = 'login'; pin = ''; draw('Silakan coba lagi.'); }
      };
      tick(); timer = setInterval(tick, 1000);
    }
    let sibuk = false;
    async function tekan(k) {
      if (sibuk || mode === 'locked') return;
      if (k === 'del') { pin = pin.slice(0, -1); return draw(); }
      if (k === 'ok') return kirim();
      if (pin.length >= 6) return;
      pin += k; draw();
      if (mode === 'login' && pin.length === panjang) kirim();
    }
    async function kirim() {
      if (pin.length < 4) return draw('PIN minimal 4 digit.', true);
      if (mode === 'create1') {
        if (/^(\d)\1+$/.test(pin)) { pin = ''; return draw('Hindari angka yang sama semua (misal 111111).', true); }
        pinBaru = pin; pin = ''; mode = 'create2'; return draw();
      }
      if (mode === 'create2') {
        if (pin !== pinBaru) { pin = ''; mode = 'create1'; return draw('PIN tidak sama. Ulangi dari awal.', true); }
      }
      sibuk = true; draw('Memeriksa…');
      try {
        const r = mode === 'create2'
          ? await API.call('buatPinAwal', { pin: pin, perangkat: U.namaPerangkat(), ingat: true })
          : await API.call('login', { pin: pin, perangkat: U.namaPerangkat(), ingat: ingat });
        API.setToken(r);
        U.store.set('sm_pinlen', pin.length);
        clearInterval(timer);
        document.removeEventListener('keydown', onKey);
        app.innerHTML = '<div class="pin-screen"><div class="pin-card"><img class="pin-logo" src="assets/logo-full.png" alt=""><p class="sub">' + ic('loader', 'spin') + ' Menyiapkan beranda…</p></div></div>';
        await App.refresh();
        renderShell(); App.route();
        if (mode === 'create2') UI.toast('PIN aktif. Selamat datang di SafeMoney!');
      } catch (e) {
        sibuk = false; pin = '';
        if (e.code === 'LOCKED') { mode = 'locked'; o.sampai = (e.data && e.data.sampai) || Date.now() + 15 * 60000; return draw(); }
        if (e.code === 'NO_PIN') { mode = 'create1'; return draw(); }
        draw(e.message, true);
        return;
      }
      sibuk = false;
    }
    function onKey(e) {
      if (!document.querySelector('.pin-screen')) return document.removeEventListener('keydown', onKey);
      if (/^\d$/.test(e.key)) tekan(e.key);
      else if (e.key === 'Backspace') tekan('del');
      else if (e.key === 'Enter') tekan('ok');
    }
    document.addEventListener('keydown', onKey);
    draw(o.pesan || '');
  }

  function bantuanLupa() {
    UI.modal({
      title: 'Lupa PIN?', icon: 'key', size: 'narrow',
      body: '<p>Demi keamanan, PIN hanya bisa direset oleh pemilik akun Google yang memasang SafeMoney:</p>' +
        '<ol style="padding-left:18px;line-height:1.8"><li>Buka <b>script.google.com</b> → proyek SafeMoney.</li><li>Pilih fungsi <b>resetPin</b> di menu atas, lalu klik <b>▶ Run</b>.</li><li>Buka lagi SafeMoney, lalu buat PIN baru.</li></ol>' +
        '<div class="note info">' + ic('shield') + '<div>Data keuangan Anda tidak terhapus saat PIN direset.</div></div>',
      foot: '<button class="btn btn-navy" data-close>Mengerti</button>'
    });
  }

  // ============================================================
  // LAYAR KHUSUS
  // ============================================================
  function renderBelumSetup() {
    document.getElementById('app').innerHTML = '<div class="pin-screen"><div class="pin-card" style="max-width:480px;text-align:left">' +
      '<img class="pin-logo" src="assets/logo-full.png" alt="SafeMoney">' +
      '<h1 style="text-align:center">Backend belum terhubung</h1><p class="sub" style="text-align:center">Satu langkah lagi sebelum SafeMoney bisa dipakai.</p>' +
      '<ol style="line-height:1.9;color:rgba(255,255,255,.85);padding-left:20px;margin:0 0 8px"><li>Deploy <b>Kode.gs</b> sebagai Web App (Execute as: <b>Me</b>, Access: <b>Anyone</b>).</li>' +
      '<li>Salin URL yang berakhiran <b>/exec</b>.</li><li>Tempel ke <b>js/config.js</b> pada baris <code>GAS_URL</code>, lalu unggah ulang ke GitHub.</li></ol>' +
      '<p class="small" style="color:rgba(255,255,255,.6);text-align:center">Panduan lengkap ada di PANDUAN-INSTALASI.md</p></div></div>';
  }
  function renderGagal(e) {
    document.getElementById('app').innerHTML = '<div class="pin-screen"><div class="pin-card"><img class="pin-logo" src="assets/logo-full.png" alt="SafeMoney">' +
      '<h1>Tidak dapat terhubung</h1><p class="sub">' + U.esc(e.message) + '</p>' +
      (e.code === 'NOT_SETUP' ? '<p class="small" style="color:rgba(255,255,255,.7)">Jalankan <b>setupAppEnvironment()</b> di editor Apps Script.</p>' : '') +
      '<button class="btn btn-gold" onclick="location.reload()">' + ic('refresh') + 'Coba lagi</button></div></div>';
  }

  document.addEventListener('DOMContentLoaded', App.start);
})();
