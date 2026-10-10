/* =====================================================================
   pages.js — tampilan setiap halaman (SPA, tanpa reload)
   ===================================================================== */
(function () {
  const ic = window.icon;
  const Pages = {};
  const e = U.esc;

  // ---------- bantuan bersama ----------
  function pastNote(S) {
    if (App.isCurrentPeriod()) return '';
    return '<div class="note info" style="margin-bottom:18px">' + ic('history') + '<div style="flex:1">Anda sedang melihat <b>' + e(S.boot.periode.nama) + '</b>. Angka anggaran mengikuti periode ini.</div>' +
      '<button class="btn btn-sm btn-sec" data-act="kembali-bulan-ini">Kembali ke bulan ini</button></div>';
  }
  function bindPast(root) {
    const b = root.querySelector('[data-act="kembali-bulan-ini"]');
    if (b) b.onclick = async function () { S.periodeId = S.boot.periodeIni; root.innerHTML = UI.skeleton(); try { await App.refresh(); } catch (err) { UI.toast(err.message, 'error'); } };
  }
  function trxRow(t) {
    const i = UI.trxIcon(t);
    const ket = t.keterangan || t.subkategori || (t.jenis === 'Pemasukan' ? t.sumber : t.kategori) || '-';
    const sub = [t.jenis === 'Pemasukan' ? t.sumber : t.subkategori, t.refTipe === 'hutang' ? 'Bayar hutang' : ''].filter(function (x, i, a) { return x && x !== ket && a.indexOf(x) === i; }).join(' · ');
    const st = t._pending ? '<span class="status-mini muted">' + ic('loader', 'sm spin') + 'Menyimpan…</span>' : t._queued ? '<span class="status-mini" style="color:var(--amber-ink)">' + ic('wifiOff', 'sm') + 'Antre</span>' : '';
    return '<tr class="clickable ' + (t._pending || t._queued ? 'pending' : '') + '" data-trx="' + e(t.id) + '">' +
      '<td><div class="dt"><b>' + e(U.hijriLabel(t.tanggal)) + '</b><small>' + U.masehi(t.tanggal) + (t.waktu ? ' · ' + e(t.waktu) : '') + '</small></div></td>' +
      '<td><div class="desc"><span class="ic-tile ' + i.tone + '">' + ic(i.ik) + '</span><div><b>' + e(ket) + '</b><small>' + e(sub) + ' ' + st + '</small></div></div></td>' +
      '<td>' + UI.wallet(t.dompet) + (t.dompet === 'Pondok' && t.jenis === 'Pengeluaran' && !t.adaBukti ? '<div style="margin-top:4px"><span class="pill p-hampir">' + ic('paperclip') + 'Belum ada nota</span></div>' : '') + '</td>' +
      '<td class="hide-m">' + e(t.jenis === 'Pemasukan' ? (t.dompet === 'Pribadi' ? 'Pemasukan' : 'Dana masuk') : (t.kategori || '-')) + '</td>' +
      '<td class="r"><span class="' + (t.jenis === 'Pemasukan' ? 'amt-in' : 'amt-out') + ' num">' + U.rpSigned(t) + '</span>' +
      (t.adaBukti ? ' <span title="Ada bukti" class="muted">' + ic('paperclip', 'sm') + '</span>' : '') + '</td></tr>';
  }
  function trxItem(t) {
    const i = UI.trxIcon(t);
    const ket = t.keterangan || t.subkategori || (t.jenis === 'Pemasukan' ? t.sumber : t.kategori) || '-';
    return '<li class="' + (t._pending || t._queued ? 'pending' : '') + '" data-trx="' + e(t.id) + '"><span class="ic-tile ' + i.tone + '">' + ic(i.ik) + '</span>' +
      '<div class="mid"><b>' + e(ket) + '</b><small>' + e(U.DOMPET_LABEL[t.dompet]) + ' · ' + e(t.jenis === 'Pemasukan' ? (t.sumber || 'Pemasukan') : (t.kategori || '-')) + (t._queued ? ' · Antre' : t._pending ? ' · Menyimpan…' : '') + '</small></div>' +
      '<div class="rt"><b class="' + (t.jenis === 'Pemasukan' ? 'amt-in' : 'amt-out') + ' num">' + U.rpSigned(t) + '</b><small>' + e(U.hijriLabel(t.tanggal, 'noYear')) + '</small></div></li>';
  }
  function trxTable(list, opt) {
    opt = opt || {};
    if (!list.length) return UI.empty('list', opt.kosong || 'Belum ada transaksi', opt.kosongSub || 'Catat transaksi pertama Anda di periode ini.', opt.cta === false ? '' : '<button class="btn btn-gold" style="margin-top:14px" data-act="catat">' + ic('plus') + 'Catat Transaksi</button>');
    return '<div class="table-wrap hide-m"><table class="tbl"><thead><tr><th>Tanggal</th><th>Keterangan</th><th>Dompet</th><th class="hide-m">Kategori</th><th class="r">Nominal</th></tr></thead><tbody>' +
      list.map(trxRow).join('') + '</tbody></table></div>' +
      '<ul class="tx-list show-m">' + list.map(trxItem).join('') + '</ul>';
  }
  function bindTrx(root, list) {
    U.$$('[data-trx]', root).forEach(function (row) {
      row.onclick = function () { const t = list.find(function (x) { return x.id === row.dataset.trx; }); if (t && !t._pending) Forms.detailTransaksi(t); };
    });
    U.$$('[data-act="catat"]', root).forEach(function (b) { b.onclick = function () { Forms.transaksi(); }; });
  }

  // ============================================================
  // BERANDA
  // ============================================================
  const KUTIPAN_CADANGAN = [
    { teks: 'Tidak akan bergeser kedua kaki seorang hamba pada hari kiamat hingga ia ditanya tentang hartanya: dari mana ia peroleh dan ke mana ia belanjakan.', tokoh: 'Rasulullah ﷺ', kelompok: 'Rasulullah ﷺ', rujukan: 'HR. at-Tirmidzi' },
    { teks: 'Jangan menabung apa yang tersisa setelah berbelanja, tetapi belanjakanlah apa yang tersisa setelah menabung.', tokoh: 'Warren Buffett', kelompok: 'Pengusaha', rujukan: 'Dinisbatkan' },
    { teks: 'Hisablah dirimu sebelum kamu dihisab.', tokoh: 'Umar bin Khattab r.a.', kelompok: 'Khalifah', rujukan: 'Atsar' }
  ];
  Pages.beranda = {
    title: 'Beranda',
    render: function (S) {
      const b = S.boot, r = b.ringkasan;
      const banner = b.notifikasi.filter(function (n) { return n.level !== 'info' && !S.hiddenBanner[n.judul + n.pesan]; })[0];
      const tg = b.target.filter(function (t) { return t.status === 'Aktif'; })[0] || b.target.filter(function (t) { return t.status === 'Tercapai'; })[0];
      const pin = b.pinjaman.filter(function (p) { return p.status === 'Berjalan'; });
      const hut = b.hutang.filter(function (h) { return h.status === 'Berjalan'; });
      const tanggungan = pin.filter(function (p) { return p.ke === 'Pribadi'; }).reduce(function (s, p) { return s + p.sisa; }, 0) + hut.reduce(function (s, h) { return s + h.sisa; }, 0);
      const terbaru = b.transaksi.slice(0, 6);
      const nama = (b.pengaturan.nama_pemilik || '').split(' ')[0];

      return pastNote(S) +
        '<div class="card quote" id="quoteCard"><div class="q-head"><span class="pill p-info">' + ic('quote') + 'Pengingat Finansial</span><span class="pill p-hampir" id="qKel"></span>' +
        '<span class="small muted hide-m">' + ic('refresh', 'sm') + ' otomatis</span><div class="q-dots" id="qDots"></div>' +
        '<button class="q-nav hide-m" id="qPrev" aria-label="Sebelumnya">' + ic('chevronLeft', 'sm') + '</button><button class="q-nav hide-m" id="qNext" aria-label="Berikutnya">' + ic('chevronRight', 'sm') + '</button></div>' +
        '<div class="q-body"><blockquote id="qText"></blockquote><cite id="qCite"></cite></div></div>' +

        (banner ? '<div class="banner ' + banner.level + '" style="margin-top:18px">' + ic(banner.level === 'danger' ? 'alertCircle' : 'alert') + '<span>' + e(banner.judul) + ' — ' + e(banner.pesan) + '</span>' +
          '<button class="x" data-hide="' + e(banner.judul + banner.pesan) + '" aria-label="Tutup">' + ic('x', 'sm') + '</button></div>' : '') +

        '<div class="grid g-12" style="margin-top:22px">' +
        '<div class="card balance span-7"><div class="row"><span class="eyebrow">' + ic('landmark', 'sm') + ' Total Saldo Pribadi</span><span class="tag-glass"><i class="dot" style="width:7px;height:7px;border-radius:50%;background:#10B981;display:inline-block"></i>Kas Aktif</span></div>' +
        '<div class="big num"><span data-count="' + b.saldo.Pribadi + '">' + U.rp(b.saldo.Pribadi) + '</span><small>IDR</small></div>' +
        '<div class="sub">' + ic('checkCircle') + 'Pemasukan pasti (Ihsan): <b>' + U.rp(r.pemasukanPasti || r.ihsanBulanan) + '</b>' + (!r.pemasukanPasti ? ' <span style="opacity:.7">(perkiraan)</span>' : '') + '</div>' +
        '<div class="in-out"><div><small>' + ic('arrowDown', 'sm') + 'Pemasukan bulan ini</small><b class="vin num">+ ' + U.rp(r.pemasukan) + '</b></div>' +
        '<div><small>' + ic('arrowUp', 'sm') + 'Pengeluaran bulan ini</small><b class="vout num">− ' + U.rp(r.pengeluaran) + '</b></div></div>' +
        '<div class="foot"><span class="dot"></span>Sisa boleh dibelanjakan: <b class="num">' + U.rp(r.sisaBoleh) + '</b>' +
        '<button class="btn btn-gold btn-sm" style="margin-left:auto" data-go="transaksi">Lihat Detail' + ic('arrowRight', 'sm') + '</button></div></div>' +

        '<div class="card span-5"><div class="card-head">' + ic('target') + '<h3 class="eyebrow" style="font-size:12px">Target Hemat</h3><button class="link" data-go="target">Semua target' + ic('arrowRight', 'sm') + '</button></div>' +
        (tg ? '<div class="row" style="gap:18px;align-items:center">' + UI.ring(tg.pct, { size: 112, stroke: 11, color: '#FFB700', color2: '#FFD15C', sub: 'terkumpul', font: 22 }) +
          '<div style="min-width:0"><b style="font-size:19px;display:block">' + e(tg.nama) + '</b><div class="num" style="font-weight:700">' + U.rp(tg.terkumpul) + ' <span class="muted" style="font-weight:500">/ ' + U.rp(tg.harga) + '</span></div>' +
          (tg.sisa > 0 ? '<span class="pill p-hampir" style="margin-top:8px">Kekurangan ' + U.rp(tg.sisa) + '</span>' : '<span class="pill p-capai" style="margin-top:8px">' + ic('trophy') + 'Tercapai</span>') + '</div></div>' +
          '<div class="small muted" style="margin-top:18px;padding-top:12px;border-top:1px solid var(--border)">' + ic('calendar', 'sm') + ' Target: <b style="color:var(--ink)">' + e(tg.bulanTarget) + ' H</b>' + (tg.sisa > 0 ? ' · saran <b style="color:var(--ink)">' + U.rp(tg.saranBulan) + '/bulan</b>' : '') + '</div>'
          : UI.empty('flag', 'Belum ada target', 'Tentukan barang impian, SafeMoney hitung cicilannya.', '<button class="btn btn-gold btn-sm" style="margin-top:12px" data-act="target-baru">' + ic('plus') + 'Buat Target</button>')) + '</div></div>' +

        '<div class="card" style="margin-top:22px"><div class="card-head">' + ic('pie') + '<h3>Anggaran Bulan Ini</h3><span class="pill p-info hide-m">' + e(b.periode.nama) + '</span><button class="link" data-go="anggaran"><span class="hide-m">Atur persentase</span><span class="show-m">Atur %</span>' + ic('arrowRight', 'sm') + '</button></div>' +
        '<div class="pos-grid">' + b.anggaran.map(function (a) {
          const si = UI.statusInfo(a.status);
          const kls = a.status === 'Hampir penuh' || a.status === 'Penuh' ? 'glow' : a.status === 'Melebihi batas' ? 'danger' : '';
          const tab = a.kategori === 'Tabungan';
          const col2 = tab ? '#FFD15C' : a.status === 'Aman' ? '#34d399' : a.status === 'Melebihi batas' ? '#f58a7d' : '#FFD15C';
          return '<div class="pos ' + kls + '" data-tip="' + e(a.kategori + ' · ' + a.persen + '% dari pemasukan\nBatas ' + U.rp(a.batas) + '\nSisa ' + U.rp(a.sisa)) + '">' +
            UI.ring(a.pct, { size: 84, stroke: 9, color: tab ? '#FFB700' : si.color, color2: col2 }) +
            '<h4><span class="hide-m">' + e(a.kategori) + '</span><span class="show-m">' + e(U.POS_SINGKAT[a.kategori]) + '</span></h4><div class="amt num"><span class="hide-m">' + U.rp(a.terpakai) + ' / ' + U.rp(a.batas) + '</span><span class="show-m">' + U.rpShort(a.terpakai) + ' / ' + U.rpShort(a.batas) + '</span></div>' + UI.pill(a.status, a.status === 'Berjalan' ? Math.round(a.pct) + '% terisi' : null) + '</div>';
        }).join('') + '</div></div>' +

        '<div class="grid g-3" style="margin-top:22px">' +
        walletCard('Pondok', b.saldo.Pondok, 'Saldo tercatat', b.belumNota.length ? '<span class="pill p-hampir">' + ic('paperclip') + b.belumNota.length + ' belum ada nota</span>' : '<span class="pill p-aman">' + ic('checkCircle') + 'Nota lengkap</span>', 'Amanah kas pondok') +
        walletCard('Terop', b.saldo.Terop, 'Saldo tersedia', '<span class="pill p-info">' + ic('arrowDown') + 'Masuk ' + U.rp(r.teropMasuk) + '</span>', 'Bulan ini') +
        '<div class="card hover"><div class="card-head"><span class="ic-tile t-coral">' + ic('swap') + '</span><h3>Pinjaman & Hutang</h3><button class="link" data-go="pinjaman">Kelola' + ic('arrowRight', 'sm') + '</button></div>' +
        (pin.length || hut.length ? pin.slice(0, 2).map(function (p) {
          const h = p.jatuhTempo ? U.diffDays(b.hariIni, p.jatuhTempo) : 99;
          return '<div class="mini-row"><div style="flex:1"><span class="muted">' + (p.ke === 'Pribadi' ? 'Pinjam dari Dana ' + e(p.dari) : 'Talangan ke Dana ' + e(p.ke) + ' (piutang)') + '</span><b class="num">' + U.rp(p.sisa) + '</b></div>' + (h <= 3 ? '<span class="pill p-lewat">' + (h < 0 ? 'Lewat' : 'Segera') + '</span>' : '<span class="pill p-mute">' + h + ' hari</span>') + '</div>';
        }).join('') + hut.slice(0, 2).map(function (h) {
          return '<div class="mini-row"><div style="flex:1"><span class="muted">Hutang ke ' + e(h.nama) + '</span><b class="num">sisa ' + U.rp(h.sisa) + '</b></div><span class="pill p-mute">Dicicil</span></div>';
        }).join('') + '<div class="row" style="margin-top:12px;font-size:13px"><span class="muted">Total tanggungan pribadi</span><b class="out num" style="margin-left:auto">' + U.rp(tanggungan) + '</b></div>'
          : UI.empty('checkCircle', 'Bebas tanggungan', 'Tidak ada pinjaman atau hutang berjalan.')) + '</div></div>' +

        '<div class="card solid" style="margin-top:22px"><div class="card-head"><span class="ic-tile t-navy">' + ic('list') + '</span><div><h3>Transaksi Terbaru</h3><div class="small muted">Mutasi kas masuk & keluar ' + e(b.periode.nama) + '</div></div>' +
        '<button class="btn btn-navy btn-sm hide-m" style="margin-left:auto" data-act="catat">' + ic('plus', 'sm') + 'Catat Transaksi</button></div>' +
        trxTable(terbaru) +
        (b.transaksi.length > 6 ? '<div class="row" style="margin-top:14px"><span class="small muted">Menampilkan 6 dari ' + b.transaksi.length + ' transaksi</span><button class="link" style="margin-left:auto" data-go="transaksi">Buka semua riwayat' + ic('arrowRight', 'sm') + '</button></div>' : '') +
        '</div>' + (nama ? '<p class="center small muted" style="margin-top:26px">Semoga berkah, ' + e(nama) + '. Catat sedikit-sedikit, lama-lama menjadi bukit.</p>' : '');
    },
    mount: function (root, S) {
      bindPast(root);
      bindTrx(root, S.boot.transaksi);
      U.$$('[data-go]', root).forEach(function (b) { b.onclick = function () { App.go(b.dataset.go); }; });
      U.$$('[data-hide]', root).forEach(function (b) { b.onclick = function () { S.hiddenBanner[b.dataset.hide] = 1; U.session.set('sm_hidebanner', S.hiddenBanner); b.parentNode.remove(); }; });
      const tb = root.querySelector('[data-act="target-baru"]'); if (tb) tb.onclick = function () { Forms.target(); };
      quoteSlider(root, S);
    }
  };
  function walletCard(d, saldo, label, badge, kanan) {
    const tone = d === 'Pondok' ? 't-em' : 't-gold';
    return '<div class="card hover wcard"><div class="card-head"><span class="ic-tile ' + tone + '">' + ic(U.DOMPET_IKON[d]) + '</span><h3>' + U.DOMPET_LABEL[d] + '</h3><button class="link" data-go="' + d.toLowerCase() + '">Buka' + ic('arrowRight', 'sm') + '</button></div>' +
      '<div class="small muted">' + label + '</div><div class="w-amt num">' + U.rp(saldo) + '</div><div class="row" style="border-top:1px solid var(--border);padding-top:12px">' + badge + '<span class="small muted" style="margin-left:auto">' + kanan + '</span></div></div>';
  }
  let qTimer = null;
  function quoteSlider(root, S) {
    clearInterval(qTimer);
    let list = S.boot.kutipan.filter(function (k) { return k.aktif && k.teks; });
    if (!list.length) list = KUTIPAN_CADANGAN.slice();
    for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = list[i]; list[i] = list[j]; list[j] = t; }
    let idx = 0, paused = false;
    const txt = U.$('#qText', root), cite = U.$('#qCite', root), kel = U.$('#qKel', root), dots = U.$('#qDots', root);
    const nDots = Math.min(5, list.length);
    function show(i, anim) {
      idx = (i + list.length) % list.length;
      const k = list[idx];
      const apply = function () {
        txt.textContent = '“' + k.teks + '”';
        cite.textContent = k.tokoh + (k.rujukan ? ' — ' + k.rujukan : '');
        kel.textContent = k.kelompok;
        dots.innerHTML = Array.from({ length: nDots }).map(function (_, d) { return '<i class="' + (d === idx % nDots ? 'on' : '') + '"></i>'; }).join('');
        txt.classList.remove('fade');
      };
      if (anim) { txt.classList.add('fade'); setTimeout(apply, 380); } else apply();
    }
    show(0);
    const ms = (window.SAFEMONEY_CONFIG && window.SAFEMONEY_CONFIG.QUOTE_INTERVAL) || 9000;
    qTimer = setInterval(function () { if (!paused && document.body.contains(txt)) show(idx + 1, true); else if (!document.body.contains(txt)) clearInterval(qTimer); }, ms);
    const card = U.$('#quoteCard', root);
    card.onmouseenter = function () { paused = true; }; card.onmouseleave = function () { paused = false; };
    U.$('#qNext', root).onclick = function () { show(idx + 1, true); };
    U.$('#qPrev', root).onclick = function () { show(idx - 1, true); };
    let x0 = null;
    card.addEventListener('touchstart', function (ev) { x0 = ev.touches[0].clientX; paused = true; }, { passive: true });
    card.addEventListener('touchend', function (ev) {
      paused = false; if (x0 == null) return;
      const dx = ev.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1), true); x0 = null;
    });
  }

  // ============================================================
  // TRANSAKSI (riwayat + filter, diambil dari server)
  // ============================================================
  Pages.transaksi = {
    title: 'Transaksi',
    render: function (S) {
      const f = S.tf = S.tf || { page: 1 };
      if (f.periodeAuto !== false) f.periode = S.periodeId;
      const kat = U.POS.concat(S.boot.kategoriDompet.filter(function (k) { return k.aktif; }).map(function (k) { return k.nama; }))
        .filter(function (v, i, a) { return a.indexOf(v) === i; });
      return '<div class="page-head"><div><h1>Riwayat Transaksi</h1><p>Cari dan saring semua catatan pemasukan & pengeluaran di ketiga dompet.</p></div>' +
        '<div class="actions"><button class="btn btn-gold" data-act="catat">' + ic('plus') + 'Catat Transaksi</button></div></div>' +
        '<div class="card" style="padding:16px"><div class="grid" style="grid-template-columns:2fr repeat(4,1fr);gap:10px" id="filterGrid">' +
        '<div class="input-pre"><span>' + ic('search', 'sm') + '</span><input class="input" id="fQ" placeholder="Cari keterangan…" value="' + e(f.q || '') + '"></div>' +
        '<select class="select" id="fPeriode"><option value="">Semua periode</option>' + S.boot.daftarPeriode.filter(function (p) { return p.mulai <= S.boot.hariIni; }).slice().reverse().map(function (p) {
          return '<option value="' + p.id + '" ' + (f.periode === p.id ? 'selected' : '') + '>' + e(p.nama) + '</option>';
        }).join('') + '</select>' +
        '<select class="select" id="fDompet"><option value="">Semua dompet</option>' + ['Pribadi', 'Pondok', 'Terop'].map(function (d) { return '<option value="' + d + '" ' + (f.dompet === d ? 'selected' : '') + '>' + U.DOMPET_LABEL[d] + '</option>'; }).join('') + '</select>' +
        '<select class="select" id="fJenis"><option value="">Semua jenis</option><option ' + (f.jenis === 'Pemasukan' ? 'selected' : '') + '>Pemasukan</option><option ' + (f.jenis === 'Pengeluaran' ? 'selected' : '') + '>Pengeluaran</option></select>' +
        '<select class="select" id="fKategori"><option value="">Semua kategori</option>' + kat.map(function (k) { return '<option ' + (f.kategori === k ? 'selected' : '') + '>' + e(k) + '</option>'; }).join('') + '</select>' +
        '</div><div class="row wrap" style="margin-top:10px;gap:8px"><span class="small muted">Rentang:</span>' +
        '<input type="date" class="input" id="fDari" style="height:40px;width:auto" value="' + e(f.dari || '') + '"><span class="muted">–</span><input type="date" class="input" id="fSampai" style="height:40px;width:auto" value="' + e(f.sampai || '') + '">' +
        '<input class="input num" id="fMin" inputmode="numeric" placeholder="Min Rp" style="height:40px;width:130px" value="' + e(f.min ? U.fmtInput(f.min) : '') + '">' +
        '<input class="input num" id="fMax" inputmode="numeric" placeholder="Maks Rp" style="height:40px;width:130px" value="' + e(f.max ? U.fmtInput(f.max) : '') + '">' +
        '<button class="link" id="fReset" style="margin-left:auto">' + ic('refresh', 'sm') + 'Reset filter</button></div></div>' +
        '<div class="grid g-3" style="margin-top:18px" id="tSum"></div>' +
        '<div class="card solid" style="margin-top:18px" id="tList">' + '<div class="skel" style="height:220px"></div>' + '</div>';
    },
    mount: function (root, S) {
      bindTrx(root, []);
      const f = S.tf;
      const read = function () {
        f.q = U.$('#fQ', root).value.trim(); f.periode = U.$('#fPeriode', root).value; f.periodeAuto = false;
        f.dompet = U.$('#fDompet', root).value; f.jenis = U.$('#fJenis', root).value; f.kategori = U.$('#fKategori', root).value;
        f.dari = U.$('#fDari', root).value; f.sampai = U.$('#fSampai', root).value; f.min = U.parseNum(U.$('#fMin', root).value); f.max = U.parseNum(U.$('#fMax', root).value);
        f.page = 1; load();
      };
      U.$$('select, input[type=date]', root).forEach(function (el) { el.onchange = read; });
      U.$('#fQ', root).oninput = U.debounce(read, 400);
      ['#fMin', '#fMax'].forEach(function (s) { const el = U.$(s, root); el.oninput = U.debounce(function () { el.value = U.fmtInput(el.value); read(); }, 500); });
      U.$('#fReset', root).onclick = function () { S.tf = { page: 1 }; App.render(); };
      if (window.innerWidth < 1100) U.$('#filterGrid', root).style.gridTemplateColumns = window.innerWidth < 768 ? '1fr 1fr' : '1fr 1fr 1fr';
      if (window.innerWidth < 768) U.$('#fQ', root).parentNode.style.gridColumn = 'span 2';
      async function load() {
        const key = JSON.stringify([f.q, f.periode, f.dompet, f.jenis, f.kategori, f.dari, f.sampai, f.min, f.max, S.boot.periode.id, S.boot.transaksi.length]);
        let d = S.trxCache[key];
        if (!d) {
          U.$('#tList', root).innerHTML = '<div class="skel" style="height:220px"></div>';
          try {
            d = await API.call('transaksiList', { q: f.q, periode: f.periode, dompet: f.dompet, jenis: f.jenis, kategori: f.kategori, dari: f.dari, sampai: f.sampai, min: f.min, max: f.max });
            S.trxCache[key] = d;
          } catch (err) {
            U.$('#tList', root).innerHTML = UI.empty('wifiOff', 'Gagal memuat', err.message, '<button class="btn btn-sec" style="margin-top:12px" id="retry">' + ic('refresh') + 'Coba lagi</button>');
            U.$('#retry', root).onclick = load; return;
          }
        }
        if (!root.isConnected) return;
        const pending = S.boot.transaksi.filter(function (t) { return t._pending || t._queued; });
        U.$('#tSum', root).innerHTML =
          '<div class="card stat"><div class="k">Total Pemasukan<span class="ic-tile t-em">' + ic('arrowDown') + '</span></div><div class="v in num">' + U.rp(d.pemasukan) + '</div></div>' +
          '<div class="card stat"><div class="k">Total Pengeluaran<span class="ic-tile t-coral">' + ic('arrowUp') + '</span></div><div class="v out num">' + U.rp(d.pengeluaran) + '</div></div>' +
          '<div class="card stat"><div class="k">Selisih<span class="ic-tile t-navy">' + ic('swap') + '</span></div><div class="v num">' + U.rp(d.pemasukan - d.pengeluaran) + '</div><div class="s">' + d.total + ' transaksi</div></div>';
        const per = 20, pages = Math.max(1, Math.ceil(d.items.length / per));
        f.page = Math.min(f.page, pages);
        const items = pending.concat(d.items.slice((f.page - 1) * per, f.page * per));
        let pager = '';
        if (d.items.length > per) {
          pager = '<div class="pager"><span class="muted">Menampilkan ' + ((f.page - 1) * per + 1) + '–' + Math.min(f.page * per, d.items.length) + ' dari ' + d.items.length + '</span>';
          pager += '<button data-pg="' + (f.page - 1) + '" ' + (f.page === 1 ? 'disabled' : '') + '>' + ic('chevronLeft', 'sm') + '</button>';
          for (let p = 1; p <= pages; p++) { if (p === 1 || p === pages || Math.abs(p - f.page) <= 1) pager += '<button class="' + (p === f.page ? 'on' : '') + '" data-pg="' + p + '">' + p + '</button>'; else if (Math.abs(p - f.page) === 2) pager += '<span class="muted">…</span>'; }
          pager += '<button data-pg="' + (f.page + 1) + '" ' + (f.page === pages ? 'disabled' : '') + '>' + ic('chevronRight', 'sm') + '</button></div>';
        }
        U.$('#tList', root).innerHTML = trxTable(items, { kosong: 'Tidak ada transaksi', kosongSub: 'Coba ubah kata kunci atau filter.', cta: false }) + pager;
        bindTrx(U.$('#tList', root), items);
        U.$$('[data-pg]', root).forEach(function (b) { b.onclick = function () { f.page = Number(b.dataset.pg); load(); window.scrollTo({ top: 0, behavior: 'smooth' }); }; });
        UI.animate(root);
      }
      load();
    }
  };

  // ============================================================
  // ANGGARAN
  // ============================================================
  Pages.anggaran = {
    title: 'Anggaran',
    render: function (S) {
      const b = S.boot, r = b.ringkasan, st = b.saranTarget;
      S.ang = {}; b.anggaran.forEach(function (a) { S.ang[a.kategori] = a.persen; });
      return pastNote(S) + '<div class="page-head"><div><h1>Anggaran Bulanan</h1><p>' + e(b.periode.nama) + ' · ' + U.masehi(b.periode.mulai) + ' – ' + U.masehi(b.periode.akhir) + '. Batas tiap pos dihitung dari ' +
        (b.pengaturan.basis_anggaran === 'PASTI' ? 'uang ihsan (pemasukan pasti)' : 'pemasukan pribadi yang sudah masuk') + '.</p></div></div>' +
        '<div class="grid g-12" style="align-items:start">' +
        '<div class="card span-7"><div class="card-head">' + ic('filter') + '<h3>Atur Persentase</h3><span class="small muted" style="margin-left:auto">Basis: <b class="num" style="color:var(--ink)">' + U.rp(r.basis) + '</b></span></div>' +
        U.POS.map(function (k) {
          return '<div class="set-row" style="align-items:flex-start"><span class="ic-tile ' + (k === 'Tabungan' ? 't-gold' : k === 'Jajanan' ? 't-coral' : 't-navy') + '">' + ic(U.POS_IKON[k]) + '</span><div style="flex:1;min-width:0">' +
            '<div class="row"><b>' + k + '</b><span class="small muted hide-m">' + U.POS_INFO[k] + '</span><span class="num strong" style="margin-left:auto" data-nom="' + k + '"></span></div>' +
            '<div class="row" style="margin-top:6px"><input type="range" class="range" min="0" max="100" step="1" value="' + S.ang[k] + '" data-sl="' + k + '" aria-label="Persen ' + k + '">' +
            '<div class="input-pre" style="width:92px;flex:none"><input class="input num" style="height:40px;padding:0 30px 0 12px;text-align:right" inputmode="numeric" value="' + S.ang[k] + '" data-pc="' + k + '"><span style="left:auto;right:12px">%</span></div></div></div></div>';
        }).join('') +
        '<div class="note" id="totalNote" style="margin-top:12px"></div>' +
        '<div class="row wrap" style="margin-top:14px;gap:16px"><span class="small strong">Berlaku mulai:</span>' +
        '<label class="row small"><input type="radio" name="mulai" value="ini" checked> Periode ini</label><label class="row small"><input type="radio" name="mulai" value="berikutnya"> Periode berikutnya</label></div>' +
        '<div class="row" style="margin-top:16px;justify-content:flex-end;gap:10px"><button class="btn btn-sec" id="angReset">Batalkan perubahan</button><button class="btn btn-gold" id="angSave">' + ic('save') + 'Simpan Anggaran</button></div></div>' +

        '<div class="span-5 stack">' +
        '<div class="card"><div class="card-head">' + ic('chart') + '<h3>Simulasi Nominal</h3></div><table class="tbl" style="margin:0 -22px;width:calc(100% + 44px)"><thead><tr><th>Pos</th><th class="r">Ihsan</th><th class="r">Realisasi</th></tr></thead><tbody id="simBody"></tbody></table>' +
        '<div class="small muted" style="margin-top:10px">Ihsan = ' + U.rp(r.ihsanBulanan) + ' (perkiraan di Pengaturan) · Realisasi = ' + U.rp(r.pemasukan) + '</div></div>' +
        '<div class="card"><div class="card-head">' + ic('alert') + '<h3>Status Pos Saat Ini</h3></div>' + b.anggaran.map(function (a) {
          const tone = a.status === 'Aman' ? 'em' : a.status === 'Melebihi batas' ? 'coral' : a.status === 'Berjalan' ? 'navy' : '';
          return '<div style="margin-bottom:14px"><div class="row small"><b>' + e(a.kategori) + '</b><span class="muted num" style="margin-left:auto">' + U.rp(a.terpakai) + ' / ' + U.rp(a.batas) + '</span></div>' +
            '<div class="row" style="margin-top:6px"><div style="flex:1">' + UI.bar(a.pct, tone) + '</div>' + UI.pill(a.status, a.status === 'Berjalan' ? Math.round(a.pct) + '%' : null) + '</div></div>';
        }).join('') +
        '<div class="set-row"><div class="txt"><b>Ambang peringatan</b><small>Beri tanda "hampir penuh" saat pemakaian mencapai</small></div><b class="num">' + r.ambang + '%</b><button class="btn btn-sm btn-sec" data-go="pengaturan">Ubah</button></div></div>' +
        (st && !st.cukup && st.usulan ? '<div class="card rec"><div class="card-head"><span class="ic-tile t-solidgold">' + ic('wand') + '</span><h3>Saran dari Target</h3></div>' +
          '<p style="margin:0 0 12px">Target aktif butuh sekitar <b>' + st.butuhPersen + '%</b> pemasukan untuk ditabung, sedangkan pos Tabungan saat ini <b>' + st.tabunganSekarang + '%</b>.</p>' +
          '<button class="btn btn-gold btn-block" data-act="saran">' + ic('wand') + 'Lihat & terapkan saran</button></div>' : '') +
        '</div></div>';
    },
    mount: function (root, S) {
      bindPast(root);
      const b = S.boot;
      U.$$('[data-go]', root).forEach(function (x) { x.onclick = function () { App.go(x.dataset.go); }; });
      const sr = root.querySelector('[data-act="saran"]'); if (sr) sr.onclick = function () { Forms.terapkanSaran(); };
      function upd() {
        let total = 0;
        U.POS.forEach(function (k) {
          total += S.ang[k];
          U.$('[data-nom="' + k + '"]', root).textContent = '= ' + U.rp(b.ringkasan.basis * S.ang[k] / 100);
        });
        const n = U.$('#totalNote', root);
        n.className = 'note ' + (total === 100 ? 'ok' : 'danger');
        n.innerHTML = ic(total === 100 ? 'checkCircle' : 'alertCircle') + '<div style="flex:1"><b>Total: ' + total + '%</b>' + (total === 100 ? ' — siap disimpan.' : ' — total harus tepat 100% (' + (total > 100 ? 'kurangi ' + (total - 100) : 'tambah ' + (100 - total)) + '%).') + '</div>' + UI.bar(Math.min(total, 100), total === 100 ? 'em' : 'coral').replace('class="bar', 'style="width:120px" class="bar');
        U.$('#angSave', root).disabled = total !== 100;
        U.$('#simBody', root).innerHTML = U.POS.map(function (k) {
          return '<tr><td>' + U.POS_SINGKAT[k] + ' <span class="muted small">' + S.ang[k] + '%</span></td><td class="r num">' + U.rp(b.ringkasan.ihsanBulanan * S.ang[k] / 100) + '</td><td class="r num">' + U.rp(b.ringkasan.pemasukan * S.ang[k] / 100) + '</td></tr>';
        }).join('');
        UI.animate(n);
      }
      U.$$('[data-sl]', root).forEach(function (sl) {
        sl.oninput = function () { S.ang[sl.dataset.sl] = Number(sl.value); U.$('[data-pc="' + sl.dataset.sl + '"]', root).value = sl.value; UI.rangeFill(sl); upd(); };
        UI.rangeFill(sl);
      });
      U.$$('[data-pc]', root).forEach(function (inp) {
        inp.oninput = function () { const v = Math.min(100, U.parseNum(inp.value)); inp.value = v; S.ang[inp.dataset.pc] = v; const sl = U.$('[data-sl="' + inp.dataset.pc + '"]', root); sl.value = v; UI.rangeFill(sl); upd(); };
      });
      U.$('#angReset', root).onclick = function () { App.render(); };
      U.$('#angSave', root).onclick = async function () {
        const btn = this; UI.busy(btn, true, 'Menyimpan…');
        try {
          const mulai = (U.$('input[name=mulai]:checked', root) || {}).value;
          const r = await API.call('simpanAnggaran', { periode: S.periodeId, persen: S.ang, mulai: mulai });
          UI.toast('Anggaran ' + (mulai === 'berikutnya' ? 'periode berikutnya' : 'bulan ini') + ' tersimpan.');
          void r; await App.refresh(true);
        } catch (err) { UI.toast(err.message, 'error'); UI.busy(btn, false); }
      };
      upd();
    }
  };

  // ============================================================
  // DANA PONDOK & DANA TEROP
  // ============================================================
  function walletPage(dompet) {
    return {
      title: U.DOMPET_LABEL[dompet],
      render: function (S) {
        const b = S.boot, r = b.ringkasan;
        S.wTab = S.wTab || {}; const tab = S.wTab[dompet] || 'riwayat';
        const list = b.transaksi.filter(function (t) { return t.dompet === dompet; });
        const masuk = dompet === 'Pondok' ? r.pondokMasuk : r.teropMasuk, keluar = dompet === 'Pondok' ? r.pondokKeluar : r.teropKeluar;
        const pinjKeluar = b.pinjaman.filter(function (p) { return p.status === 'Berjalan' && p.dari === dompet; }).reduce(function (s, p) { return s + p.sisa; }, 0);
        const tone = dompet === 'Pondok' ? 't-em' : 't-gold';
        const nota = dompet === 'Pondok' ? b.belumNota : [];
        const kategori = b.kategoriDompet.filter(function (k) { return k.dompet === dompet; });
        let isi = '';
        if (tab === 'riwayat') {
          isi = (nota.length ? '<div class="note warn" style="margin-bottom:16px">' + ic('paperclip') + '<div style="flex:1"><b>' + nota.length + ' pengeluaran belum ada nota.</b> Lengkapi agar laporan amanah rapi.</div><button class="btn btn-sm btn-sec" data-act="nota">Lengkapi</button></div>' : '') +
            '<div class="card solid">' + trxTable(list, { kosong: 'Belum ada catatan ' + U.DOMPET_LABEL[dompet], kosongSub: 'Catatan pada ' + b.periode.nama + ' akan tampil di sini.' }) + '</div>';
        } else if (tab === 'galeri') {
          const ada = list.filter(function (t) { return t.adaBukti; });
          isi = '<div class="card solid">' + (ada.length ? '<div class="grid g-4">' + ada.map(function (t) {
            return '<button class="choice" data-bukti="' + e(t.idBukti) + '" style="text-align:left"><span class="ic-tile t-navy" style="margin-bottom:10px">' + ic('image') + '</span><b class="num">' + U.rp(t.nominal) + '</b><small>' + e(t.keterangan || t.kategori || '-') + '</small><small>' + U.hijriLabel(t.tanggal, 'noYear') + ' · ' + U.masehiPendek(t.tanggal) + '</small></button>';
          }).join('') + '</div>' : UI.empty('image', 'Belum ada bukti', 'Foto nota yang diunggah pada periode ini tampil di sini.')) + '</div>';
        } else {
          isi = '<div class="card solid"><div class="card-head"><h3>Kategori Pengeluaran ' + U.DOMPET_LABEL[dompet] + '</h3><button class="btn btn-sm btn-gold" style="margin-left:auto" data-act="kat-baru">' + ic('plus', 'sm') + 'Tambah</button></div>' +
            kategori.map(function (k) {
              return '<div class="set-row"><span class="ic-tile ' + tone + '">' + ic('package') + '</span><div class="txt"><b>' + e(k.nama) + '</b><small>' + (k.aktif ? 'Aktif' : 'Nonaktif') + '</small></div>' +
                '<button class="btn btn-sm btn-ghost" data-kat="' + k.id + '">' + ic('edit', 'sm') + 'Ubah</button><label class="switch"><input type="checkbox" data-katon="' + k.id + '" ' + (k.aktif ? 'checked' : '') + '><span></span></label></div>';
            }).join('') + '</div>';
        }
        return pastNote(S) + '<div class="page-head"><div><span class="eyebrow">' + (dompet === 'Pondok' ? 'Kas amanah pondok' : 'Kas sewa terop') + '</span><h1>' + (dompet === 'Pondok' ? 'Dana Anggaran Pondok' : 'Dana Terop') + '</h1>' +
          '<p>Terpisah dari uang pribadi — tidak memengaruhi anggaran 4 pos.</p></div><div class="actions">' +
          '<button class="btn btn-sec" data-act="pdf">' + ic('download') + 'Unduh PDF</button><button class="btn btn-gold" data-act="catat-w">' + ic('plus') + (dompet === 'Pondok' ? 'Catat Dana Pondok' : 'Catat Pembayaran Terop') + '</button></div></div>' +
          '<div class="grid g-4 stagger">' +
          stat('Saldo', U.rp(b.saldo[dompet]), 'wallet', tone, pinjKeluar ? 'Dipinjam ' + U.rp(pinjKeluar) : 'Seluruh periode') +
          stat('Diterima', U.rp(masuk), 'arrowDown', 't-em', b.periode.nama, 'in') +
          stat('Dikeluarkan', U.rp(keluar), 'arrowUp', 't-coral', b.periode.nama, 'out') +
          (dompet === 'Pondok' ? stat('Belum ada nota', nota.length + ' transaksi', 'paperclip', 't-gold', nota.length ? 'Perlu dilengkapi' : 'Semua lengkap') : stat('Pinjaman keluar', U.rp(pinjKeluar), 'swap', 't-coral', 'Belum dikembalikan')) +
          '</div><div class="tabs" style="margin-top:22px">' +
          ['riwayat', 'galeri', 'kategori'].map(function (t) { return '<button class="' + (tab === t ? 'on' : '') + '" data-tab="' + t + '">' + ic({ riwayat: 'list', galeri: 'image', kategori: 'package' }[t]) + { riwayat: 'Riwayat', galeri: 'Galeri Bukti', kategori: 'Kategori' }[t] + '</button>'; }).join('') +
          '</div>' + isi;
      },
      mount: function (root, S) {
        bindPast(root);
        bindTrx(root, S.boot.transaksi);
        U.$$('[data-tab]', root).forEach(function (b) { b.onclick = function () { S.wTab[dompet] = b.dataset.tab; App.render(); }; });
        U.$$('[data-act="catat-w"], [data-act="catat"]', root).forEach(function (b) { b.onclick = function () { Forms.transaksi({ dompet: dompet }); }; });
        root.querySelector('[data-act="pdf"]').onclick = function () { Forms.pdf(dompet); };
        const nt = root.querySelector('[data-act="nota"]'); if (nt) nt.onclick = function () { Forms.daftarNota(); };
        U.$$('[data-bukti]', root).forEach(function (b) { b.onclick = function () { Forms.lihatBukti(b.dataset.bukti); }; });
        const kb = root.querySelector('[data-act="kat-baru"]'); if (kb) kb.onclick = function () { Forms.kategori({ dompet: dompet }); };
        U.$$('[data-kat]', root).forEach(function (b) { b.onclick = function () { Forms.kategori(S.boot.kategoriDompet.find(function (k) { return k.id === b.dataset.kat; })); }; });
        U.$$('[data-katon]', root).forEach(function (cb) {
          cb.onchange = async function () {
            const k = S.boot.kategoriDompet.find(function (x) { return x.id === cb.dataset.katon; });
            try { await API.call('simpanKategori', { id: k.id, dompet: k.dompet, nama: k.nama, aktif: cb.checked }); UI.toast('Kategori diperbarui.'); await App.refresh(true); }
            catch (err) { UI.toast(err.message, 'error'); cb.checked = !cb.checked; }
          };
        });
      }
    };
  }
  function stat(k, v, ik, tone, s, cls) {
    return '<div class="card stat"><div class="k">' + k + '<span class="ic-tile ' + tone + '">' + ic(ik) + '</span></div><div class="v num ' + (cls || '') + '">' + v + '</div><div class="s">' + e(s || '') + '</div></div>';
  }
  Pages.pondok = walletPage('Pondok');
  Pages.terop = walletPage('Terop');

  // ============================================================
  // PINJAMAN & HUTANG
  // ============================================================
  Pages.pinjaman = {
    title: 'Pinjaman & Hutang',
    render: function (S) {
      const b = S.boot; const tab = S.pTab || 'pinjam';
      const pin = b.pinjaman.filter(function (p) { return p.status === 'Berjalan'; });
      const hut = b.hutang.filter(function (h) { return h.status === 'Berjalan'; });
      const lunas = b.pinjaman.filter(function (p) { return p.status === 'Lunas'; }).map(function (p) { return { t: 'p', x: p }; })
        .concat(b.hutang.filter(function (h) { return h.status === 'Lunas'; }).map(function (h) { return { t: 'h', x: h }; }));
      const totPin = pin.reduce(function (s, p) { return s + p.sisa; }, 0), totHut = hut.reduce(function (s, h) { return s + h.sisa; }, 0);
      const jt = pin.map(function (p) { return p.jatuhTempo; }).concat(hut.map(function (h) { return h.jatuhTempo; })).filter(Boolean).sort()[0];
      const hJt = jt ? U.diffDays(b.hariIni, jt) : null;
      let isi;
      if (tab === 'pinjam') {
        isi = '<div class="note info" style="margin-bottom:18px">' + ic('shield') + '<div><b>Kaidah amanah:</b> pinjaman antar dana <b>tidak dihitung sebagai pemasukan pribadi</b>. Ia menambah kas sementara dan tercatat sebagai kewajiban yang wajib dikembalikan — tanpa tambahan apa pun.</div></div>' +
          (pin.length ? '<div class="grid g-2">' + pin.map(kartuPinjam).join('') + '</div>' : '<div class="card">' + UI.empty('swap', 'Tidak ada pinjaman berjalan', 'Butuh dana mendesak? Catat pinjaman dari kas lain agar tidak lupa dikembalikan.', '<button class="btn btn-gold" style="margin-top:12px" data-act="pinjam">' + ic('plus') + 'Pinjam Antar Dana</button>') + '</div>');
      } else if (tab === 'hutang') {
        isi = hut.length ? '<div class="grid g-2">' + hut.map(kartuHutang).join('') + '</div>' : '<div class="card">' + UI.empty('handCoins', 'Tidak ada hutang', 'Hutang ke orang lain yang dicatat akan muncul di sini.', '<button class="btn btn-gold" style="margin-top:12px" data-act="hutang">' + ic('plus') + 'Catat Hutang</button>') + '</div>';
      } else {
        isi = '<div class="card solid">' + (lunas.length ? lunas.map(function (l) {
          const x = l.x;
          return '<div class="set-row"><span class="ic-tile t-em">' + ic('checkCircle') + '</span><div class="txt"><b>' + (l.t === 'p' ? 'Dana ' + e(x.dari) + ' → ' + e(x.ke) : 'Hutang ke ' + e(x.nama)) + '</b><small>' + U.hijriLabel(x.tanggal) + ' · ' + e(x.alasan || x.catatan || '') + '</small></div><b class="num">' + U.rp(x.nominal) + '</b><span class="pill p-aman">Lunas</span></div>';
        }).join('') : UI.empty('history', 'Belum ada riwayat lunas', '')) + '</div>';
      }
      return '<div class="page-head"><div><span class="eyebrow">Amanah & hutang piutang</span><h1>Pinjaman & Hutang</h1><p>Catat pinjam antar dana (Pondok/Terop/Pribadi) dan hutang ke pihak lain, lengkap dengan pengingat jatuh tempo.</p></div>' +
        '<div class="actions"><button class="btn btn-sec" data-act="hutang">' + ic('plus') + 'Catat Hutang</button><button class="btn btn-gold" data-act="pinjam">' + ic('swap') + 'Pinjam Antar Dana</button></div></div>' +
        '<div class="grid g-4 stagger">' +
        stat('Total pinjaman & hutang', U.rp(totPin + totHut), 'landmark', 't-navy', pin.length + ' pinjaman · ' + hut.length + ' hutang') +
        stat('Pinjam antar dana', U.rp(totPin), 'swap', 't-gold', 'Kewajiban berjalan') +
        stat('Hutang ke orang lain', U.rp(totHut), 'user', 't-coral', hut[0] ? 'Kreditur: ' + hut[0].nama : '-') +
        '<div class="card stat"><div class="k">Jatuh tempo terdekat<span class="ic-tile ' + (hJt != null && hJt <= 3 ? 't-coral' : 't-navy') + '">' + ic('bell') + '</span></div><div class="v" style="font-size:18px">' + (jt ? e(U.hijriLabel(jt, 'H')) : '—') + '</div>' +
        '<div class="s">' + (jt ? U.masehi(jt) + ' · ' + (hJt < 0 ? '<span class="pill p-lewat">Lewat ' + (-hJt) + ' hari</span>' : hJt === 0 ? '<span class="pill p-lewat">Hari ini</span>' : '<span class="pill ' + (hJt <= 3 ? 'p-lewat' : 'p-mute') + '">' + hJt + ' hari lagi</span>') : 'Tidak ada') + '</div></div>' +
        '</div><div class="tabs" style="margin-top:22px">' +
        '<button class="' + (tab === 'pinjam' ? 'on' : '') + '" data-tab="pinjam">' + ic('swap') + 'Pinjam Antar Dana <span class="badge">' + pin.length + '</span></button>' +
        '<button class="' + (tab === 'hutang' ? 'on' : '') + '" data-tab="hutang">' + ic('users') + 'Hutang ke Orang Lain <span class="badge">' + hut.length + '</span></button>' +
        '<button class="' + (tab === 'lunas' ? 'on' : '') + '" data-tab="lunas">' + ic('checkCircle') + 'Riwayat Lunas</button></div>' + isi;
    },
    mount: function (root, S) {
      U.$$('[data-tab]', root).forEach(function (b) { b.onclick = function () { S.pTab = b.dataset.tab; App.render(); }; });
      U.$$('[data-act="pinjam"]', root).forEach(function (b) { b.onclick = function () { Forms.pinjam(); }; });
      U.$$('[data-act="hutang"]', root).forEach(function (b) { b.onclick = function () { Forms.hutang(); }; });
      U.$$('[data-bayar-p]', root).forEach(function (b) { b.onclick = function () { Forms.bayarPinjaman(S.boot.pinjaman.find(function (p) { return p.id === b.dataset.bayarP; }), b.dataset.full === '1'); }; });
      U.$$('[data-bayar-h]', root).forEach(function (b) { b.onclick = function () { Forms.bayarHutang(S.boot.hutang.find(function (h) { return h.id === b.dataset.bayarH; })); }; });
      U.$$('[data-detail-p]', root).forEach(function (b) { b.onclick = function () { Forms.detailPinjaman(S.boot.pinjaman.find(function (p) { return p.id === b.dataset.detailP; })); }; });
      U.$$('[data-detail-h]', root).forEach(function (b) { b.onclick = function () { Forms.detailHutang(S.boot.hutang.find(function (h) { return h.id === b.dataset.detailH; })); }; });
    }
  };
  function sisaHariPill(jt) {
    if (!jt) return '<span class="pill p-mute">Tanpa jatuh tempo</span>';
    const h = U.diffDays(S.boot.hariIni, jt);
    if (h < 0) return '<span class="pill p-lewat">' + ic('clock') + 'Lewat ' + (-h) + ' hari</span>';
    if (h === 0) return '<span class="pill p-lewat">' + ic('clock') + 'Jatuh tempo hari ini</span>';
    return '<span class="pill ' + (h <= 3 ? 'p-lewat' : 'p-mute') + '">' + ic('clock') + h + ' hari lagi' + (h <= 3 ? ' · Segera' : '') + '</span>';
  }
  function kartuPinjam(p) {
    const pct = p.nominal ? p.terbayar / p.nominal * 100 : 0;
    const keP = p.ke === 'Pribadi';
    return '<div class="card"><div class="flow"><span class="w">' + U.DOMPET_LABEL[p.dari] + '</span><span class="arr">' + ic('arrowRight', 'sm') + '</span><span class="w to">' + U.DOMPET_LABEL[p.ke] + '</span>' +
      '<span class="pill ' + (keP ? 'p-info' : 'p-hampir') + '" style="margin-left:auto">' + (keP ? 'Kewajiban mengembalikan' : 'Talangan (piutang)') + '</span></div>' +
      '<div class="row" style="margin-top:16px"><div><div class="eyebrow">Nominal pinjaman</div><div class="big-amt num">' + U.rp(p.nominal) + '</div></div><span style="margin-left:auto">' + sisaHariPill(p.jatuhTempo) + '</span></div>' +
      '<div class="kv"><span>Alasan</span><b>' + e(p.alasan || '-') + '</b><span>Tanggal pinjam</span><b>' + e(U.hijriLabel(p.tanggal)) + ' · ' + U.masehiPendek(p.tanggal) + '</b><span>Jatuh tempo</span><b>' + (p.jatuhTempo ? e(U.hijriLabel(p.jatuhTempo)) + ' · ' + U.masehiPendek(p.jatuhTempo) : '-') + '</b></div>' +
      '<div class="row small"><span class="muted">Status pelunasan</span><b class="num" style="margin-left:auto">' + U.rp(p.terbayar) + ' / ' + U.rp(p.nominal) + ' (' + Math.round(pct) + '%)</b></div><div style="margin:8px 0 6px">' + UI.bar(pct, 'navy') + '</div>' +
      '<div class="row small"><span class="muted">Sisa yang belum dikembalikan</span><b class="out num" style="margin-left:auto">' + U.rp(p.sisa) + '</b></div>' +
      '<div class="row" style="margin-top:16px;gap:8px"><button class="btn btn-sec btn-sm" data-bayar-p="' + p.id + '">' + ic('banknote', 'sm') + 'Bayar Sebagian</button><button class="btn btn-gold btn-sm" data-bayar-p="' + p.id + '" data-full="1">' + ic('checkCircle', 'sm') + 'Lunasi Sekarang</button>' +
      '<button class="link" style="margin-left:auto" data-detail-p="' + p.id + '">Rincian' + ic('chevronRight', 'sm') + '</button></div></div>';
  }
  function kartuHutang(h) {
    const pct = h.nominal ? h.terbayar / h.nominal * 100 : 0;
    return '<div class="card"><div class="row"><span class="ic-tile t-coral">' + ic('user') + '</span><div><b style="font-size:16px">' + e(h.nama) + '</b><div class="small muted">Sejak ' + U.hijriLabel(h.tanggal) + '</div></div><span style="margin-left:auto">' + sisaHariPill(h.jatuhTempo) + '</span></div>' +
      '<div style="margin-top:14px"><div class="eyebrow">Sisa hutang</div><div class="big-amt out num">' + U.rp(h.sisa) + '</div><div class="small muted">dari ' + U.rp(h.nominal) + (h.catatan ? ' · ' + e(h.catatan) : '') + '</div></div>' +
      '<div style="margin:12px 0 6px">' + UI.bar(pct, 'em') + '</div><div class="small muted">Terbayar ' + U.rp(h.terbayar) + ' (' + Math.round(pct) + '%) — pembayaran tercatat sebagai pengeluaran pribadi.</div>' +
      '<div class="row" style="margin-top:16px;gap:8px"><button class="btn btn-gold btn-sm" data-bayar-h="' + h.id + '">' + ic('banknote', 'sm') + 'Bayar</button><button class="link" style="margin-left:auto" data-detail-h="' + h.id + '">Rincian' + ic('chevronRight', 'sm') + '</button></div></div>';
  }

  // ============================================================
  // TARGET
  // ============================================================
  Pages.target = {
    title: 'Target',
    render: function (S) {
      const b = S.boot, st = b.saranTarget;
      const aktif = b.target.filter(function (t) { return t.status === 'Aktif'; });
      const semua = b.target.filter(function (t) { return t.status !== 'Arsip'; });
      const arsip = b.target.filter(function (t) { return t.status === 'Arsip'; });
      const kebutuhan = semua.reduce(function (s, t) { return s + t.harga; }, 0);
      const tab = b.anggaran.find(function (a) { return a.kategori === 'Tabungan'; });
      const dekat = aktif.slice().sort(function (a, c) { return a.tglTarget < c.tglTarget ? -1 : 1; })[0];
      return '<div class="page-head"><div><span class="eyebrow">Tabungan & barang impian</span><h1>Target Tabungan</h1><p>Tentukan barang impian; SafeMoney menghitung cicilan per bulan Hijriah dan menyarankan persentase Tabungan.</p></div>' +
        '<div class="actions"><button class="btn btn-gold" data-act="baru">' + ic('plus') + 'Tambah Target Baru</button></div></div>' +
        '<div class="grid g-4 stagger">' +
        '<div class="card stat"><div class="k">Total terkumpul<span class="ic-tile t-gold">' + ic('piggy') + '</span></div><div class="v num">' + U.rp(b.totalTabungan) + '</div><div class="s">dari ' + U.rp(kebutuhan) + '</div>' + UI.bar(kebutuhan ? b.totalTabungan / kebutuhan * 100 : 0) + '</div>' +
        stat('Target aktif', aktif.length + ' target', 'flag', 't-navy', semua.length - aktif.length + ' tercapai') +
        '<div class="card stat"><div class="k">Alokasi Tabungan<span class="ic-tile t-coral">' + ic('pie') + '</span></div><div class="v num">' + (tab ? tab.persen : 0) + '%</div>' +
        '<div class="s">' + (st.cukup ? '<span class="pill p-aman">' + ic('check') + 'Cukup untuk target</span>' : '<span class="pill p-lewat">' + ic('alert') + 'Butuh ' + st.butuhPersen + '%</span>') + '</div></div>' +
        stat('Estimasi terdekat', dekat ? e(dekat.nama) : '—', 'calendar', 't-em', dekat ? dekat.bulanTarget + ' H · ' + dekat.bulanTersisa + ' bulan lagi' : 'Belum ada') +
        '</div>' +
        (!st.cukup && st.usulan ? '<div class="card rec" style="margin-top:22px"><div class="row wrap" style="gap:18px;align-items:flex-start"><span class="ic-tile t-solidgold">' + ic('wand') + '</span>' +
          '<div style="flex:1;min-width:240px"><h3 style="margin:0 0 6px">Rekomendasi Penyesuaian Alokasi</h3><p style="margin:0 0 12px" class="muted">Agar semua target aktif tercapai tepat waktu, naikkan Tabungan dari <b>' + st.tabunganSekarang + '%</b> menjadi <b>' + st.usulan.Tabungan + '%</b>. Total tetap 100%.</p>' +
          '<div class="cmp">' + U.POS.filter(function (k) { return st.usulan[k] !== tabSek(b, k); }).map(function (k) {
            return '<span>' + U.POS_SINGKAT[k] + '</span><span class="from num">' + tabSek(b, k) + '%</span><span class="arrow-col">' + ic('arrowRight', 'sm') + '</span><span class="pill ' + (k === 'Tabungan' ? 'p-aman' : 'p-hampir') + '">' + st.usulan[k] + '%</span>';
          }).join('') + '</div>' + (st.kurangDari100 ? '<div class="note warn" style="margin-top:12px">' + ic('alert') + '<div>Target terlalu berat untuk pemasukan saat ini. Pertimbangkan memundurkan tanggal target.</div></div>' : '') + '</div>' +
          '<div class="row" style="gap:10px;flex-wrap:wrap"><button class="btn btn-gold" data-act="saran">' + ic('checkCircle') + 'Terapkan Saran</button><button class="btn btn-sec" data-go="anggaran">' + ic('filter') + 'Atur Manual</button></div></div></div>' : '') +
        '<div class="row" style="margin:26px 0 14px"><h3 style="margin:0;font-size:20px">Daftar Target</h3><span class="pill p-info">' + semua.length + ' sasaran</span></div>' +
        (semua.length ? '<div class="grid g-3 stagger">' + semua.map(kartuTarget).join('') + '</div>' : '<div class="card">' + UI.empty('flag', 'Belum ada target', 'Contoh: Laptop Rp 5.000.000 di bulan Rajab. SafeMoney hitung berapa yang perlu disisihkan.', '<button class="btn btn-gold" style="margin-top:12px" data-act="baru">' + ic('plus') + 'Tambah Target</button>') + '</div>') +
        (arsip.length ? '<details style="margin-top:22px"><summary class="link" style="cursor:pointer">Arsip (' + arsip.length + ')</summary><div class="card solid" style="margin-top:12px">' + arsip.map(function (t) {
          return '<div class="set-row"><span class="ic-tile t-navy">' + ic(t.ikon) + '</span><div class="txt"><b>' + e(t.nama) + '</b><small>' + U.rp(t.terkumpul) + ' / ' + U.rp(t.harga) + '</small></div><button class="btn btn-sm btn-sec" data-aktifkan="' + t.id + '">Aktifkan lagi</button></div>';
        }).join('') + '</div></details>' : '');
    },
    mount: function (root, S) {
      U.$$('[data-act="baru"]', root).forEach(function (b) { b.onclick = function () { Forms.target(); }; });
      U.$$('[data-go]', root).forEach(function (b) { b.onclick = function () { App.go(b.dataset.go); }; });
      const sr = root.querySelector('[data-act="saran"]'); if (sr) sr.onclick = function () { Forms.terapkanSaran(); };
      U.$$('[data-setor]', root).forEach(function (b) { b.onclick = function () { Forms.setor(S.boot.target.find(function (t) { return t.id === b.dataset.setor; })); }; });
      U.$$('[data-edit-t]', root).forEach(function (b) { b.onclick = function () { Forms.target(S.boot.target.find(function (t) { return t.id === b.dataset.editT; })); }; });
      U.$$('[data-arsip]', root).forEach(function (b) {
        b.onclick = async function () {
          const t = S.boot.target.find(function (x) { return x.id === b.dataset.arsip; });
          const ok = await UI.confirm({ title: 'Arsipkan target?', text: '"' + t.nama + '" dipindah ke arsip dan tidak dihitung dalam saran persentase.', ok: 'Arsipkan', icon: 'archive', tone: 't-navy', btn: 'btn-navy' });
          if (!ok) return;
          try { await API.call('arsipTarget', { id: t.id }); UI.toast('Target diarsipkan.'); await App.refresh(true); } catch (err) { UI.toast(err.message, 'error'); }
        };
      });
      U.$$('[data-aktifkan]', root).forEach(function (b) { b.onclick = async function () { try { await API.call('arsipTarget', { id: b.dataset.aktifkan, aktifkan: true }); await App.refresh(true); } catch (err) { UI.toast(err.message, 'error'); } }; });
    }
  };
  function tabSek(b, k) { const a = b.anggaran.find(function (x) { return x.kategori === k; }); return a ? a.persen : 0; }
  function kartuTarget(t, i) {
    const prioLbl = { 1: 'Prioritas 1 · Tinggi', 2: 'Prioritas 2 · Sedang', 3: 'Prioritas 3 · Santai' }[t.prioritas];
    const done = t.status === 'Tercapai';
    return '<div class="card tg ' + (t.prioritas === 1 && !done ? 'prio1' : '') + '"><div class="row"><span class="pill ' + (t.prioritas === 1 ? 'p-hampir' : t.prioritas === 2 ? 'p-info' : 'p-mute') + '">' + prioLbl + '</span>' +
      (done ? '<span class="pill p-capai">' + ic('trophy') + 'Tercapai</span>' : (i === 0 ? '<span class="pill p-mute">Target terdekat</span>' : '')) +
      '<button class="link" style="margin-left:auto" data-edit-t="' + t.id + '" aria-label="Ubah">' + ic('edit', 'sm') + '</button></div>' +
      '<div class="row" style="margin-top:14px;gap:12px"><span class="tg-ic">' + ic(t.ikon || 'target', 'lg') + '</span><div style="min-width:0"><h3 style="margin:0">' + e(t.nama) + '</h3><div class="small muted">' + e(t.deskripsi || '') + '</div></div></div>' +
      '<div class="box"><div class="row small"><span class="muted">Terkumpul</span><b class="num" style="margin-left:auto">' + U.rp(t.terkumpul) + ' <span class="muted">(' + Math.round(t.pct) + '%)</span></b></div>' +
      '<div style="margin:8px 0">' + UI.bar(t.pct, done ? 'em' : '') + '</div><div class="row small muted"><span>Target ' + U.rp(t.harga) + '</span><span style="margin-left:auto" class="' + (t.sisa ? 'out' : 'in') + '">Sisa ' + U.rp(t.sisa) + '</span></div></div>' +
      '<div class="meta"><div>' + ic('calendar', 'sm') + 'Tenggat<b>' + e(t.bulanTarget) + ' H</b></div><div>' + ic('clock', 'sm') + 'Sisa waktu<b>' + t.bulanTersisa + ' bulan Hijriah</b></div></div>' +
      (t.sisa > 0 ? '<div class="sug">' + ic('wand', 'sm') + '<span>Saran cicilan: <b class="num">' + U.rp(t.saranBulan) + '/bulan</b> (≈' + U.pct(t.saranPersen) + ' dari pemasukan)</span></div>' : '<div class="note ok" style="margin-top:10px">' + ic('trophy') + '<div>Alhamdulillah! Dana terkumpul. Arsipkan setelah barang dibeli.</div></div>') +
      '<div class="foot">' + (t.sisa > 0 ? '<button class="btn btn-gold btn-sm" style="flex:1" data-setor="' + t.id + '">' + ic('plus', 'sm') + 'Setor Tabungan</button>' : '<button class="btn btn-navy btn-sm" style="flex:1" data-arsip="' + t.id + '">' + ic('archive', 'sm') + 'Arsipkan</button>') +
      (t.sisa > 0 ? '<button class="btn btn-sm btn-ghost" data-arsip="' + t.id + '" title="Arsipkan">' + ic('archive', 'sm') + '</button>' : '') + '</div></div>';
  }

  // ============================================================
  // LAPORAN
  // ============================================================
  Pages.laporan = {
    title: 'Laporan',
    render: function (S) {
      S.lap = S.lap || { dompet: 'Pribadi' };
      return '<div class="page-head"><div><h1>Laporan</h1><p>' + e(S.boot.periode.nama) + ' · grafik pemasukan, pengeluaran, dan perkembangan saldo.</p></div>' +
        '<div class="actions"><div class="seg" style="min-width:300px">' + ['Pribadi', 'Pondok', 'Terop'].map(function (d) { return '<button class="' + (S.lap.dompet === d ? 'on' : '') + '" data-d="' + d + '">' + U.DOMPET_LABEL[d] + '</button>'; }).join('') + '</div>' +
        '<button class="btn btn-sec" data-act="email">' + ic('mail') + 'Kirim Email</button><button class="btn btn-gold" data-act="pdf">' + ic('download') + 'Unduh PDF</button></div></div>' +
        '<div id="lapBody">' + '<div class="grid g-2"><div class="skel" style="height:300px"></div><div class="skel" style="height:300px"></div></div><div class="skel" style="height:300px;margin-top:22px"></div>' + '</div>';
    },
    mount: function (root, S) {
      U.$$('[data-d]', root).forEach(function (b) { b.onclick = function () { S.lap.dompet = b.dataset.d; App.render(); }; });
      root.querySelector('[data-act="pdf"]').onclick = function () { Forms.pdf(S.lap.dompet); };
      root.querySelector('[data-act="email"]').onclick = function () { Forms.pdf(S.lap.dompet, true); };
      const key = 'lap|' + S.boot.periode.id + '|' + S.lap.dompet;
      (S.trxCache[key] ? Promise.resolve(S.trxCache[key]) : API.call('laporan', { periode: S.boot.periode.id, dompet: S.lap.dompet }))
        .then(function (L) { S.trxCache[key] = L; if (root.isConnected) { U.$('#lapBody', root).innerHTML = renderLaporan(L); UI.animate(root); } })
        .catch(function (err) { U.$('#lapBody', root).innerHTML = '<div class="card">' + UI.empty('wifiOff', 'Gagal memuat laporan', err.message) + '</div>'; });
    }
  };
  function lebarChart() {
    const cw = (document.getElementById('content') || {}).clientWidth || 1000, mob = window.innerWidth < 768;
    const full = Math.round(cw - (mob ? 32 + 36 : 64 + 44));
    return { full: full, half: mob ? full : Math.round((cw - 64 - 22) / 2 - 44) };
  }
  function renderLaporan(L) {
    const CW = lebarChart();
    const r = L.ringkasan, warna = ['#003D79', '#FFB700', '#10B981', '#F26B5B', '#5B8DEF', '#9B6BDF', '#8A5A00'];
    const posWarna = { 'Kebutuhan Primer': '#003D79', 'Investasi Otak/Tubuh': '#10B981', 'Jajanan': '#F26B5B', 'Tabungan': '#FFB700' };
    const komp = L.komposisi.map(function (k, i) { return { label: k.nama, value: k.nilai, color: posWarna[k.nama] || warna[i % warna.length] }; });
    const tiles = '<div class="grid g-4 stagger">' + stat('Saldo awal', U.rp(r.saldoAwal), 'wallet', 't-navy', 'Awal periode') + stat('Pemasukan', U.rp(r.pemasukan), 'arrowDown', 't-em', r.jumlahTransaksi + ' transaksi', 'in') +
      stat('Pengeluaran', U.rp(r.pengeluaran), 'arrowUp', 't-coral', L.dompet !== 'Pribadi' && r.tanpaNota ? r.tanpaNota + ' tanpa nota' : 'Periode ini', 'out') + stat('Saldo akhir', U.rp(r.saldoAkhir), 'landmark', 't-gold', 'Akhir periode') + '</div>';
    const donut = '<div class="card"><div class="card-head">' + ic('pie') + '<h3>' + (L.dompet === 'Pribadi' ? 'Komposisi Pengeluaran per Pos' : 'Pengeluaran per Kategori') + '</h3></div>' +
      (komp.some(function (k) { return k.value > 0; }) ? UI.donut(komp, { title: 'TERPAKAI' }) : UI.empty('pie', 'Belum ada pengeluaran', 'Grafik muncul setelah ada pengeluaran.')) + '</div>';
    const hb = L.dompet === 'Pribadi' ? '<div class="card"><div class="card-head">' + ic('filter') + '<h3>Pemakaian vs Batas</h3><span class="small muted" style="margin-left:auto">garis putus = batas</span></div>' +
      UI.hbars(L.komposisi.map(function (k) { return { label: U.POS_SINGKAT[k.nama], value: k.nilai, max: k.batas, color: k.nama === 'Tabungan' ? '#FFB700' : UI.statusInfo(k.status).color }; }), { w: CW.half }) + '</div>'
      : '<div class="card"><div class="card-head">' + ic('list') + '<h3>Ringkasan Kategori</h3></div>' + (L.komposisi.length ? UI.hbars(L.komposisi.map(function (k, i) { return { label: k.nama.slice(0, CW.half < 420 ? 10 : 16), value: k.nilai, color: warna[i % warna.length] }; }), { w: CW.half }) : UI.empty('list', 'Belum ada data', '')) + '</div>';
    const labels = L.tren.map(function (t) { return t.label; });
    const tren = '<div class="card" style="margin-top:22px"><div class="card-head">' + ic('chart') + '<h3>Pemasukan vs Pengeluaran</h3><span class="small muted" style="margin-left:auto">' + L.tren.length + ' bulan Hijriah terakhir</span></div>' +
      UI.groupBars(labels, [{ name: 'Pemasukan', color: '#10B981', values: L.tren.map(function (t) { return t.pemasukan; }) }, { name: 'Pengeluaran', color: '#F26B5B', values: L.tren.map(function (t) { return t.pengeluaran; }) }]
        .concat(L.dompet === 'Pribadi' ? [{ name: 'Setor Tabungan', color: '#FFB700', values: L.tren.map(function (t) { return t.tabungan; }) }] : []), { w: CW.full }) + '</div>';
    const area = '<div class="card" style="margin-top:22px"><div class="card-head">' + ic('trendUp') + '<h3>Perkembangan ' + (L.dompet === 'Pribadi' ? 'Tabungan & Saldo' : 'Saldo') + '</h3></div>' +
      UI.area(labels, [{ name: 'Saldo ' + U.DOMPET_LABEL[L.dompet], color: '#003D79', fill: '#003D79', values: L.tren.map(function (t) { return t.saldo; }) }]
        .concat(L.dompet === 'Pribadi' ? [{ name: 'Total Tabungan', color: '#E0A100', fill: '#FFB700', values: L.tren.map(function (t) { return t.totalTabungan; }) }] : []), { w: CW.full }) + '</div>';
    const ringkas = L.anggaran ? '<div class="card solid" style="margin-top:22px"><div class="card-head">' + ic('list') + '<h3>Ringkasan Periode</h3></div><div class="table-wrap"><table class="tbl"><thead><tr><th>Pos</th><th class="r">Persen</th><th class="r">Batas</th><th class="r">Terpakai</th><th class="r">Sisa</th><th>Status</th></tr></thead><tbody>' +
      L.anggaran.map(function (a) { return '<tr><td><b>' + e(a.kategori) + '</b></td><td class="r num">' + a.persen + '%</td><td class="r num">' + U.rp(a.batas) + '</td><td class="r num">' + U.rp(a.terpakai) + '</td><td class="r num ' + (a.sisa < 0 ? 'out' : '') + '">' + U.rp(a.sisa) + '</td><td>' + UI.pill(a.status) + '</td></tr>'; }).join('') +
      '</tbody></table></div></div>' : '';
    return tiles + '<div class="grid g-2" style="margin-top:22px">' + donut + hb + '</div>' + tren + area + ringkas;
  }

  // ============================================================
  // PENGATURAN
  // ============================================================
  Pages.pengaturan = {
    title: 'Pengaturan',
    render: function (S) {
      const tab = S.setTab || 'umum';
      const menu = [['umum', 'user', 'Umum'], ['keamanan', 'shield', 'Keamanan'], ['kutipan', 'quote', 'Kata Mutiara'], ['kalender', 'calendar', 'Kalender Hijriah'], ['notifikasi', 'bell', 'Notifikasi'], ['kategori', 'package', 'Kategori Dompet'], ['tentang', 'info', 'Tentang']];
      return '<div class="page-head"><div><h1>Pengaturan</h1><p>Atur profil, keamanan PIN, kata mutiara, kalender Hijriah, dan notifikasi.</p></div></div>' +
        '<div class="set-layout"><div class="card set-menu">' + menu.map(function (m) { return '<button class="' + (tab === m[0] ? 'on' : '') + '" data-st="' + m[0] + '">' + ic(m[1]) + m[2] + '</button>'; }).join('') + '</div>' +
        '<div id="setBody">' + setBody(tab, S) + '</div></div>';
    },
    mount: function (root, S) {
      U.$$('[data-st]', root).forEach(function (b) { b.onclick = function () { S.setTab = b.dataset.st; App.render(); }; });
      setMount(S.setTab || 'umum', root, S);
    }
  };
  function setBody(tab, S) {
    const p = S.boot.pengaturan;
    if (tab === 'umum') {
      return '<div class="card"><div class="card-head">' + ic('user') + '<h3>Profil & Dasar Anggaran</h3></div>' +
        '<div class="field"><label class="label">Nama yang tampil</label><input class="input" id="sNama" value="' + e(p.nama_pemilik) + '"></div>' +
        '<div class="field"><label class="label">Perkiraan uang ihsan per bulan <span class="hint">patokan pemasukan pasti</span></label><div class="input-pre"><span>Rp</span><input class="input num" id="sIhsan" inputmode="numeric" value="' + U.fmtInput(p.ihsan_bulanan) + '"></div></div>' +
        '<div class="field"><label class="label">Dasar perhitungan batas anggaran</label><div class="choice-grid c2">' +
        '<button class="choice ' + (p.basis_anggaran !== 'PASTI' ? 'on' : '') + '" data-basis="REALISASI"><b>Pemasukan yang sudah masuk</b><small>Batas ikut bertambah saat kiriman orang tua masuk</small><span class="chk">' + ic('checkCircle') + '</span></button>' +
        '<button class="choice ' + (p.basis_anggaran === 'PASTI' ? 'on' : '') + '" data-basis="PASTI"><b>Uang ihsan saja</b><small>Lebih hemat; kiriman tak pasti tidak menambah batas</small><span class="chk">' + ic('checkCircle') + '</span></button></div></div>' +
        '<div class="field"><label class="label">Ambang peringatan "hampir penuh" <span class="hint" id="ambLbl">' + p.ambang_peringatan + '%</span></label><input type="range" class="range" id="sAmbang" min="50" max="99" value="' + p.ambang_peringatan + '"></div>' +
        '<div class="row" style="justify-content:flex-end;margin-top:18px"><button class="btn btn-gold" id="sSimpan">' + ic('save') + 'Simpan</button></div></div>';
    }
    if (tab === 'keamanan') {
      return '<div class="card"><div class="card-head">' + ic('key') + '<h3>Ganti PIN</h3></div>' +
        '<div class="grid g-3" style="gap:12px"><div class="field"><label class="label">PIN lama</label><input class="input num" id="pLama" type="password" inputmode="numeric" maxlength="6" autocomplete="current-password"></div>' +
        '<div class="field" style="margin-top:0"><label class="label">PIN baru (4–6 digit)</label><input class="input num" id="pBaru" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"></div>' +
        '<div class="field" style="margin-top:0"><label class="label">Ulangi PIN baru</label><input class="input num" id="pUlang" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"></div></div>' +
        '<div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn btn-gold" id="pSimpan">' + ic('key') + 'Ganti PIN</button></div>' +
        '<div class="note info" style="margin-top:14px">' + ic('info') + '<div>Setelah PIN diganti, semua perangkat lain harus memasukkan PIN lagi.</div></div></div>' +
        '<div class="card" style="margin-top:22px"><div class="card-head">' + ic('monitor') + '<h3>Perangkat Aktif</h3><button class="btn btn-sm btn-danger-out" style="margin-left:auto" id="logoutAll">' + ic('logout', 'sm') + 'Keluar dari semua perangkat</button></div><div id="devList"><div class="skel" style="height:90px"></div></div></div>';
    }
    if (tab === 'kutipan') {
      const k = S.boot.kutipan;
      const tone = { 'Rasulullah ﷺ': 'p-hampir', 'Khalifah': 'p-info', 'Pengusaha': 'p-aman', 'Motivator': 'p-mute' };
      return '<div class="card solid"><div class="card-head">' + ic('quote') + '<div><h3>Kata Mutiara</h3><div class="small muted">' + k.filter(function (x) { return x.aktif; }).length + ' aktif dari ' + k.length + ' · maksimal 3 kalimat</div></div>' +
        '<button class="btn btn-sm btn-gold" style="margin-left:auto" id="kBaru">' + ic('plus', 'sm') + 'Tambah</button></div>' +
        '<div class="table-wrap"><table class="tbl"><thead><tr><th>Teks</th><th>Tokoh</th><th class="hide-m">Kelompok</th><th>Aktif</th><th></th></tr></thead><tbody>' +
        k.map(function (x) {
          return '<tr><td style="max-width:380px"><div style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">' + e(x.teks) + '</div><small class="muted">' + e(x.rujukan || '') + '</small></td><td class="small">' + e(x.tokoh) + '</td>' +
            '<td class="hide-m"><span class="pill ' + (tone[x.kelompok] || 'p-mute') + '">' + e(x.kelompok) + '</span></td><td><label class="switch"><input type="checkbox" data-kon="' + x.id + '" ' + (x.aktif ? 'checked' : '') + '><span></span></label></td>' +
            '<td><button class="btn btn-sm btn-ghost" data-kedit="' + x.id + '">' + ic('edit', 'sm') + '</button></td></tr>';
        }).join('') + '</tbody></table></div></div>';
    }
    if (tab === 'kalender') {
      const list = S.boot.daftarPeriode.filter(function (p) { return p.mulai <= U.addDays(S.boot.hariIni, 70) && p.akhir >= U.addDays(S.boot.hariIni, -200); }).slice().reverse();
      return '<div class="card solid"><div class="card-head">' + ic('calendar') + '<div><h3>Kalender Hijriah</h3><div class="small muted">Sesuaikan awal bulan dengan penetapan resmi (selisih ±1 hari). Transaksi otomatis mengikuti.</div></div></div>' +
        '<div class="table-wrap"><table class="tbl"><thead><tr><th>Bulan Hijriah</th><th>Mulai</th><th>Akhir</th><th class="hide-m">Hari</th><th>Koreksi awal bulan</th></tr></thead><tbody>' +
        list.map(function (p) {
          return '<tr><td><b>' + e(p.nama) + '</b>' + (p.id === S.boot.periodeIni ? ' <span class="pill p-aman">Bulan ini</span>' : '') + (p.sumber === 'manual' ? ' <span class="pill p-hampir">Dikoreksi</span>' : '') + '</td>' +
            '<td class="num">' + U.masehi(p.mulai) + '</td><td class="num">' + U.masehi(p.akhir) + '</td><td class="hide-m num">' + (U.diffDays(p.mulai, p.akhir) + 1) + '</td>' +
            '<td><div class="row" style="gap:6px"><button class="btn btn-sm btn-sec" data-geser="-1" data-pid="' + p.id + '">−1 hari</button><button class="btn btn-sm btn-sec" data-geser="1" data-pid="' + p.id + '">+1 hari</button></div></td></tr>';
        }).join('') + '</tbody></table></div></div>';
    }
    if (tab === 'notifikasi') {
      const sw = function (k, judul, sub) { return '<div class="set-row"><div class="txt"><b>' + judul + '</b><small>' + sub + '</small></div><label class="switch"><input type="checkbox" data-sw="' + k + '" ' + (p[k] === 'TRUE' ? 'checked' : '') + '><span></span></label></div>'; };
      return '<div class="card"><div class="card-head">' + ic('mail') + '<h3>Notifikasi Email</h3></div>' +
        '<div class="field"><label class="label">Email tujuan</label><div class="row"><input class="input" id="nEmail" type="email" value="' + e(p.email_notifikasi) + '" placeholder="nama@gmail.com"><button class="btn btn-sec" id="nTes">' + ic('send') + 'Tes</button></div></div>' +
        '<div style="margin-top:12px">' + sw('notif_anggaran', 'Peringatan anggaran', 'Saat pos hampir penuh, penuh, atau melebihi batas (sekali per tahap)') +
        sw('notif_jatuh_tempo', 'Pengingat jatuh tempo', 'Pinjaman & hutang: H-3, hari-H, dan bila terlewat') +
        sw('notif_ringkasan', 'Ringkasan akhir bulan + PDF', 'Dikirim di hari terakhir bulan Hijriah, lengkap laporan 3 dompet') + '</div>' +
        '<div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn btn-gold" id="nSimpan">' + ic('save') + 'Simpan</button></div></div>' +
        '<div class="card disabled-box" style="margin-top:22px"><div class="card-head">' + ic('smartphone') + '<h3>WhatsApp (Fonnte)</h3><span class="pill p-hampir" style="margin-left:auto">Segera hadir · Fase 2</span></div>' +
        '<div class="grid g-2" style="gap:12px"><input class="input" placeholder="Token Fonnte" disabled><input class="input" placeholder="Nomor WhatsApp" disabled></div></div>';
    }
    if (tab === 'kategori') {
      return ['Pondok', 'Terop'].map(function (d) {
        const ks = S.boot.kategoriDompet.filter(function (k) { return k.dompet === d; });
        return '<div class="card" style="margin-bottom:22px"><div class="card-head"><span class="ic-tile ' + (d === 'Pondok' ? 't-em' : 't-gold') + '">' + ic(U.DOMPET_IKON[d]) + '</span><h3>Kategori ' + U.DOMPET_LABEL[d] + '</h3>' +
          '<button class="btn btn-sm btn-gold" style="margin-left:auto" data-katbaru="' + d + '">' + ic('plus', 'sm') + 'Tambah</button></div><div class="chips">' +
          ks.map(function (k) { return '<button class="chip ' + (k.aktif ? '' : 'muted') + '" data-kat="' + k.id + '" style="' + (k.aktif ? '' : 'opacity:.55;text-decoration:line-through') + '">' + e(k.nama) + ic('edit', 'sm') + '</button>'; }).join('') + '</div></div>';
      }).join('');
    }
    return '<div class="card"><div class="center" style="padding:10px 0 16px"><img src="assets/logo-mark.png" alt="" style="width:84px;margin:0 auto 10px"><h2 style="margin:0">Safe<span style="color:var(--amber-ink)">Money</span></h2><div class="muted small">Versi 1.0.0 · Frontend GitHub Pages + Google Apps Script</div></div>' +
      '<div class="set-row"><div class="txt"><b>Data tersimpan di</b><small>Google Sheets "SafeMoney_DB" & folder Drive "SafeMoney" milik Anda</small></div></div>' +
      '<div class="set-row"><div class="txt"><b>Lupa PIN?</b><small>Jalankan fungsi resetPin() di editor Apps Script, lalu buat PIN baru di aplikasi.</small></div></div>' +
      '<div class="set-row"><div class="txt"><b>Muat ulang data</b><small>Ambil data terbaru dari server</small></div><button class="btn btn-sm btn-sec" id="reload">' + ic('refresh', 'sm') + 'Muat ulang</button></div>' +
      '<div class="set-row"><div class="txt"><b>Ikon</b><small>Lucide (ISC License)</small></div></div></div>';
  }
  function setMount(tab, root, S) {
    if (tab === 'umum') {
      let basis = S.boot.pengaturan.basis_anggaran;
      U.$$('[data-basis]', root).forEach(function (b) { b.onclick = function () { basis = b.dataset.basis; U.$$('[data-basis]', root).forEach(function (x) { x.classList.toggle('on', x === b); }); }; });
      const ih = U.$('#sIhsan', root); ih.oninput = function () { ih.value = U.fmtInput(ih.value); };
      const am = U.$('#sAmbang', root); UI.rangeFill(am); am.oninput = function () { UI.rangeFill(am); U.$('#ambLbl', root).textContent = am.value + '%'; };
      U.$('#sSimpan', root).onclick = async function () {
        UI.busy(this, true);
        try { await API.call('simpanPengaturan', { nama_pemilik: U.$('#sNama', root).value, ihsan_bulanan: U.parseNum(ih.value), basis_anggaran: basis, ambang_peringatan: am.value }); UI.toast('Pengaturan tersimpan.'); await App.refresh(true); }
        catch (err) { UI.toast(err.message, 'error'); UI.busy(this, false); }
      };
    } else if (tab === 'keamanan') {
      API.call('perangkat').then(function (list) {
        const el = U.$('#devList', root); if (!el) return;
        el.innerHTML = list.length ? list.map(function (d) {
          return '<div class="set-row"><span class="ic-tile t-navy">' + ic(/Android|iOS/.test(d.perangkat) ? 'smartphone' : 'monitor') + '</span><div class="txt"><b>' + e(d.perangkat) + (d.ini ? ' <span class="pill p-aman">Perangkat ini</span>' : '') + '</b><small>Terakhir aktif ' + new Date(d.terakhir).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) + ' · berlaku s.d. ' + new Date(d.exp).toLocaleDateString('id-ID', { dateStyle: 'medium' }) + '</small></div></div>';
        }).join('') : UI.empty('monitor', 'Tidak ada perangkat', '');
      }).catch(function (err) { const el = U.$('#devList', root); if (el) el.innerHTML = '<div class="note danger">' + e(err.message) + '</div>'; });
      U.$('#logoutAll', root).onclick = function () { App.logout(true); };
      U.$('#pSimpan', root).onclick = async function () {
        const lama = U.$('#pLama', root).value, baru = U.$('#pBaru', root).value, ulang = U.$('#pUlang', root).value;
        if (!/^\d{4,6}$/.test(baru)) return UI.toast('PIN baru harus 4–6 digit angka.', 'error');
        if (baru !== ulang) return UI.toast('Ulangi PIN baru tidak sama.', 'error');
        UI.busy(this, true);
        try { const r = await API.call('gantiPin', { lama: lama, baru: baru, perangkat: U.namaPerangkat() }); API.setToken(r); U.store.set('sm_pinlen', baru.length); UI.toast('PIN berhasil diganti.'); App.render(); }
        catch (err) { UI.toast(err.message, 'error'); UI.busy(this, false); }
      };
    } else if (tab === 'kutipan') {
      U.$('#kBaru', root).onclick = function () { Forms.kutipan(); };
      U.$$('[data-kedit]', root).forEach(function (b) { b.onclick = function () { Forms.kutipan(S.boot.kutipan.find(function (k) { return k.id === b.dataset.kedit; })); }; });
      U.$$('[data-kon]', root).forEach(function (cb) {
        cb.onchange = async function () {
          const k = S.boot.kutipan.find(function (x) { return x.id === cb.dataset.kon; });
          try { await API.call('simpanKutipan', Object.assign({}, k, { aktif: cb.checked })); k.aktif = cb.checked; UI.toast(cb.checked ? 'Kutipan diaktifkan.' : 'Kutipan dinonaktifkan.'); App.refresh(true); }
          catch (err) { cb.checked = !cb.checked; UI.toast(err.message, 'error'); }
        };
      });
    } else if (tab === 'kalender') {
      U.$$('[data-geser]', root).forEach(function (b) {
        b.onclick = async function () {
          UI.busy(b, true, '…');
          try { await API.call('koreksiPeriode', { id: b.dataset.pid, geser: Number(b.dataset.geser) }); UI.toast('Awal bulan dikoreksi. Data dihitung ulang.'); await App.refresh(true); }
          catch (err) { UI.toast(err.message, 'error'); UI.busy(b, false); }
        };
      });
    } else if (tab === 'notifikasi') {
      U.$('#nSimpan', root).onclick = async function () {
        const d = { email_notifikasi: U.$('#nEmail', root).value.trim() };
        U.$$('[data-sw]', root).forEach(function (cb) { d[cb.dataset.sw] = cb.checked ? 'TRUE' : 'FALSE'; });
        UI.busy(this, true);
        try { await API.call('simpanPengaturan', d); UI.toast('Notifikasi tersimpan.'); await App.refresh(true); } catch (err) { UI.toast(err.message, 'error'); UI.busy(this, false); }
      };
      U.$('#nTes', root).onclick = async function () {
        UI.busy(this, true, 'Mengirim…');
        try { await API.call('simpanPengaturan', { email_notifikasi: U.$('#nEmail', root).value.trim() }); await API.call('tesEmail'); UI.toast('Email tes terkirim. Cek kotak masuk Gmail.'); }
        catch (err) { UI.toast(err.message, 'error'); }
        UI.busy(this, false);
      };
    } else if (tab === 'kategori') {
      U.$$('[data-katbaru]', root).forEach(function (b) { b.onclick = function () { Forms.kategori({ dompet: b.dataset.katbaru }); }; });
      U.$$('[data-kat]', root).forEach(function (b) { b.onclick = function () { Forms.kategori(S.boot.kategoriDompet.find(function (k) { return k.id === b.dataset.kat; })); }; });
    } else {
      const rl = U.$('#reload', root); if (rl) rl.onclick = async function () { UI.busy(rl, true); try { S.hintsSent = false; await App.refresh(); UI.toast('Data diperbarui.'); } catch (err) { UI.toast(err.message, 'error'); UI.busy(rl, false); } };
    }
  }

  window.Pages = Pages;
})();
