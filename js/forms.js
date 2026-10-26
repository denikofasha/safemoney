/* =====================================================================
   forms.js — semua dialog/form (catat transaksi, pinjam, target, dll.)
   ===================================================================== */
(function () {
  const ic = window.icon;
  const e = U.esc;
  const F = {};

  function amountField(id, val, label) {
    return '<div class="amount-box"><span class="eyebrow">' + (label || 'Nominal transaksi (IDR)') + '</span>' +
      '<input class="amount-input" id="' + id + '" inputmode="numeric" autocomplete="off" placeholder="Rp 0" value="' + (val ? 'Rp ' + U.fmtInput(val) : '') + '">' +
      '<div class="amount-words" id="' + id + 'W">' + (val ? U.terbilang(val) : '') + '</div></div>';
  }
  function bindAmount(m, id, onChange) {
    const el = m.$('#' + id);
    el.addEventListener('input', function () {
      const n = U.parseNum(el.value);
      el.value = n ? 'Rp ' + U.fmtInput(n) : '';
      m.$('#' + id + 'W').textContent = U.terbilang(n);
      if (onChange) onChange(n);
    });
    return function () { return U.parseNum(el.value); };
  }
  function dateField(id, val, label) {
    return '<div class="field"><label class="label">' + (label || 'Tanggal') + ' <span class="hint" id="' + id + 'H">' + e(U.hijriLabel(val, 'H')) + '</span></label>' +
      '<input class="input" type="date" id="' + id + '" value="' + e(val) + '"></div>';
  }
  function bindDate(m, id, cb) {
    const el = m.$('#' + id);
    el.addEventListener('change', function () { m.$('#' + id + 'H').textContent = el.value ? U.hijriLabel(el.value, 'H') : ''; if (cb) cb(el.value); });
  }
  function buktiField(id, label) {
    return '<div class="field"><label class="label">' + (label || 'Foto nota / bukti') + ' <span class="hint">opsional · JPG/PNG/PDF</span></label>' +
      '<label class="dropzone" id="' + id + 'Z">' + ic('camera') + '<span id="' + id + 'T">Ambil foto atau pilih berkas</span>' +
      '<input type="file" id="' + id + '" accept="image/*,application/pdf" capture="environment" hidden></label></div>';
  }
  function scanBox(id, judul, sub) {
    id = id || 't';
    return '<label class="scan-ai" id="' + id + 'Scan">' + '<span class="ic-tile t-violet">' + ic('sparkles') + '</span><div style="flex:1;min-width:0"><b>' + (judul || 'Baca foto nota otomatis') + '</b><small>' + (sub || 'AI mengisi nominal, tanggal, keterangan &amp; pos. Butuh internet.') + '</small></div>' +
      ic('camera') + '<input type="file" id="' + id + 'ScanF" accept="image/*" hidden></label><div id="' + id + 'ScanInfo" class="scan-info"></div>';
  }
  /** Baca foto bukti uang (pinjaman / hutang) dengan AI lalu isi form. */
  function bindScanBukti(m, cfg) {
    const f = m.$('#' + cfg.id + 'ScanF'), box = m.$('#' + cfg.id + 'Scan'), info = m.$('#' + cfg.id + 'ScanInfo');
    if (!f) return;
    const judul = box.querySelector('b').textContent;
    f.addEventListener('change', async function () {
      const file = f.files && f.files[0]; f.value = '';
      if (!file) return;
      const b = S.boot;
      if (!(b.ai && b.ai.adaKunci)) { info.innerHTML = '<div class="note warn">' + ic('alert') + '<div>Fitur baca foto belum aktif. Isi API key Gemini di <b>Pengaturan → AI &amp; Jarvis</b>.</div></div>'; return; }
      box.classList.add('busy'); box.querySelector('b').textContent = 'Membaca foto…'; info.innerHTML = '';
      let foto;
      try {
        foto = await U.bacaBukti(file);
        if (!/^image\//.test(foto.mime)) throw new Error('Pilih foto (bukan PDF).');
        if (cfg.bukti && cfg.bukti.set) cfg.bukti.set(foto, file.name);
        const r = await API.call('bacaNota', { mime: foto.mime, data: foto.data, konteks: cfg.konteks }, { timeout: 90000 });
        if (!r.terbaca) { info.innerHTML = '<div class="note warn">' + ic('alert') + '<div>Nominal di foto tidak terbaca jelas. Foto tetap dilampirkan; isi nominal secara manual.</div></div>'; return; }
        const nom = m.$('#' + cfg.nominal); nom.value = String(r.nominal); nom.dispatchEvent(new Event('input'));
        if (r.tanggal && cfg.tanggal) { const tg = m.$('#' + cfg.tanggal); tg.value = r.tanggal; tg.dispatchEvent(new Event('change')); }
        if (cfg.isi) cfg.isi(r);
        info.innerHTML = '<div class="note ok">' + ic('sparkles') + '<div><b>Terbaca · ' + U.rp(r.nominal) + '</b>' + (r.tanggal ? ' · ' + U.masehi(r.tanggal) : '') +
          (r.pihak || r.keterangan ? '<div class="small">' + e([r.pihak, r.keterangan].filter(Boolean).join(' — ')) + '</div>' : '') + '<div class="small">Periksa lagi sebelum menyimpan.</div></div></div>';
        UI.animate(info);
      } catch (err) {
        info.innerHTML = '<div class="note danger">' + ic('alertCircle') + '<div>' + e(err.message) + '</div></div>';
      } finally { box.classList.remove('busy'); box.querySelector('b').textContent = judul; }
    });
  }
  function bindBukti(m, id) {
    const holder = { val: null };
    const inp = m.$('#' + id);
    holder.set = function (val, nama) {
      holder.val = val;
      const z = m.$('#' + id + 'Z'); z.classList.add('has');
      z.innerHTML = (val.preview ? '<img src="' + val.preview + '" alt="">' : ic('file')) + '<span>' + e(nama || 'Foto nota') + ' · ' + Math.round(val.data.length * 0.75 / 1024) + ' KB</span>';
      z.appendChild(inp);
    };
    inp.addEventListener('change', async function () {
      const f = inp.files && inp.files[0]; if (!f) return;
      m.$('#' + id + 'T').textContent = 'Memproses…';
      try {
        holder.val = await U.bacaBukti(f);
        const z = m.$('#' + id + 'Z'); z.classList.add('has');
        z.innerHTML = (holder.val.preview ? '<img src="' + holder.val.preview + '" alt="">' : ic('file')) + '<span>' + e(f.name) + ' · ' + Math.round(holder.val.data.length * 0.75 / 1024) + ' KB</span>';
        z.appendChild(inp);
      } catch (err) { holder.val = null; m.$('#' + id + 'T').textContent = err.message; }
    });
    return holder;
  }

  // ============================================================
  // CATAT / UBAH TRANSAKSI
  // ============================================================
  F.transaksi = function (pre) {
    pre = pre || {};
    const b = S.boot;
    const st = {
      id: pre.id || '', jenis: pre.jenis || 'Pengeluaran', dompet: pre.dompet || 'Pribadi',
      kategori: pre.kategori || '', sumber: pre.sumber || '', subkategori: pre.subkategori || '',
      tanggal: pre.tanggal || (App.isCurrentPeriod() ? b.hariIni : (b.hariIni >= b.periode.mulai && b.hariIni <= b.periode.akhir ? b.hariIni : b.periode.akhir)),
      idTarget: pre.idTarget || '', idKelompok: pre.idKelompok || '', kelBaru: false
    };
    if (!st.kategori && st.dompet === 'Pribadi' && st.jenis === 'Pengeluaran') st.kategori = '';
    const isEdit = !!st.id;
    const terkunci = pre.refTipe === 'hutang';
    const m = UI.modal({
      title: isEdit ? 'Ubah Transaksi' : 'Catat Transaksi', icon: isEdit ? 'edit' : 'plus', tone: 't-navy',
      sub: isEdit ? e(st.id) : 'Cepat, kurang dari 15 detik',
      body: (isEdit ? '' : scanBox()) + '<div class="seg" id="tJenis">' +
        '<button data-j="Pengeluaran" class="' + (st.jenis === 'Pengeluaran' ? 'on out-on' : '') + '">' + ic('arrowUp', 'sm') + 'Pengeluaran</button>' +
        '<button data-j="Pemasukan" class="' + (st.jenis === 'Pemasukan' ? 'on in-on' : '') + '">' + ic('arrowDown', 'sm') + 'Pemasukan</button></div>' +
        '<div class="sect-title">Pilih dompet / kas <span id="saldoInfo"></span></div>' +
        '<div class="choice-grid c3" id="tDompet">' + ['Pribadi', 'Pondok', 'Terop'].map(function (d) {
          return '<button class="choice wallet ' + (st.dompet === d ? 'on' : '') + '" data-d="' + d + '"><b>' + U.DOMPET_LABEL[d] + '</b><small class="num">' + U.rp(b.saldo[d]) + '</small><span class="chk">' + ic('checkCircle', 'sm') + '</span></button>';
        }).join('') + '</div>' +
        '<div style="margin-top:14px">' + amountField('tNom', pre.nominal) + '</div>' +
        '<div style="margin-top:14px">' + dateField('tTgl', st.tanggal, 'Tanggal transaksi') + '</div>' +
        '<div id="tDyn"></div>' +
        '<div class="field"><label class="label">Keterangan</label><input class="input" id="tKet" maxlength="300" placeholder="Contoh: Kopi & roti bakar diskusi" value="' + e(pre.keterangan || '') + '"></div>' +
        (isEdit ? '' : buktiField('tBukti')) +
        (terkunci ? '<div class="note info" style="margin-top:14px">' + ic('info') + '<div>Transaksi ini adalah pembayaran hutang — dompet & jenis tidak dapat diubah.</div></div>' : ''),
      foot: '<button class="btn btn-sec" data-close>Batal</button><button class="btn btn-gold" id="tSave">' + ic('checkCircle') + '<span id="tSaveL">Simpan Transaksi</span></button>'
    });
    const getNom = bindAmount(m, 'tNom', function () { quota(); label(); });
    bindDate(m, 'tTgl', function (v) { st.tanggal = v; quota(); });
    const bukti = isEdit ? { val: null } : bindBukti(m, 'tBukti');

    function label() { const n = getNom(); m.$('#tSaveL').textContent = n ? 'Simpan Transaksi (' + U.rp(n) + ')' : 'Simpan Transaksi'; }
    function setJenis(j) {
      if (terkunci) return; st.jenis = j;
      m.$$('#tJenis button').forEach(function (x) { x.className = x.dataset.j === j ? 'on ' + (j === 'Pengeluaran' ? 'out-on' : 'in-on') : ''; });
      dyn();
    }
    function kelompokField() {
      const isP = st.dompet === 'Pondok';
      const lbl = isP ? 'Anggaran pondok' : 'Kepanitiaan';
      const ks = (b.kelompokDana || []).filter(function (k) { return k.dompet === st.dompet && !k.tanpa && (k.status === 'Aktif' || k.id === st.idKelompok); });
      if (!ks.length) st.kelBaru = true;
      if (!st.kelBaru && !st.idKelompok && ks.length === 1) st.idKelompok = ks[0].id;
      return '<div class="field" style="margin-top:14px"><label class="label">' + ic(isP ? 'landmark' : 'users', 'sm') + ' ' + lbl + ' <span class="req">*</span><span class="hint">untuk pengelompokan riwayat</span></label>' +
        (ks.length ? '<select class="select" id="tKel"><option value="">— Pilih ' + lbl.toLowerCase() + ' —</option>' +
          ks.map(function (k) { return '<option value="' + k.id + '" ' + (!st.kelBaru && st.idKelompok === k.id ? 'selected' : '') + '>' + e(k.nama) + (k.status === 'Selesai' ? ' (selesai)' : '') + '</option>'; }).join('') +
          '<option value="__baru" ' + (st.kelBaru ? 'selected' : '') + '>＋ Buat ' + lbl.toLowerCase() + ' baru…</option></select>' : '') +
        (st.kelBaru ? '<div class="grid ' + (isP ? 'g-2' : '') + '" style="gap:10px;margin-top:' + (ks.length ? '10px' : '0') + '">' +
          '<input class="input" id="tKelNama" maxlength="80" placeholder="' + (isP ? 'Nama anggaran, mis. Anggaran Maulid Nabi' : 'Nama kepanitiaan, mis. Panitia Walimah Bpk. Hasan') + '" value="' + e(st.kelNama || '') + '">' +
          (isP ? '<div class="input-pre"><span>Rp</span><input class="input num" id="tKelPagu" inputmode="numeric" placeholder="Pagu (opsional)" value="' + e(st.kelPagu || '') + '"></div>' : '') + '</div>' : '') + '</div>';
    }
    function dyn() {
      const box = m.$('#tDyn');
      let h = '';
      if (st.dompet === 'Pribadi' && st.jenis === 'Pengeluaran') {
        h += '<div class="sect-title">Pos anggaran (Pribadi) <span id="tSisa"></span></div><div class="choice-grid c2">' + U.POS.map(function (k) {
          const a = b.anggaran.find(function (x) { return x.kategori === k; });
          return '<button class="choice ' + (st.kategori === k ? 'on' : '') + '" data-k="' + e(k) + '"><b>' + ic(U.POS_IKON[k], 'sm') + ' ' + k + '</b><small>' + U.POS_INFO[k] + (a ? ' · ' + Math.round(a.pct) + '%' : '') + '</small><span class="chk">' + ic('checkCircle', 'sm') + '</span></button>';
        }).join('') + '</div><div id="tQuota" style="margin-top:12px"></div>';
        if (st.kategori === 'Tabungan') {
          const tg = b.target.filter(function (t) { return t.status === 'Aktif'; });
          h += '<div class="field" style="margin-top:12px"><label class="label">Alokasikan untuk target</label><select class="select" id="tTarget"><option value="">— Tabungan umum / dana darurat —</option>' +
            tg.map(function (t) { return '<option value="' + t.id + '" ' + (st.idTarget === t.id ? 'selected' : '') + '>' + e(t.nama) + ' (' + Math.round(t.pct) + '% terkumpul)</option>'; }).join('') + '</select></div>';
        }
        if (st.kategori) {
          h += '<div class="sect-title">Subkategori cepat</div><div class="chips" id="tSub">' + (U.SUBKAT[st.kategori] || []).map(function (s) {
            return '<button class="chip ' + (st.subkategori === s ? 'on' : '') + '" data-s="' + e(s) + '">' + e(s) + '</button>';
          }).join('') + '</div><input class="input" id="tSubIn" style="margin-top:8px;height:42px" placeholder="atau ketik sendiri…" value="' + e((U.SUBKAT[st.kategori] || []).indexOf(st.subkategori) < 0 ? st.subkategori : '') + '">';
        }
      } else if (st.dompet === 'Pribadi' && st.jenis === 'Pemasukan') {
        const std = ['Ihsan Pondok', 'Kiriman Orang Tua'];
        const lain = st.sumber && std.indexOf(st.sumber) < 0;
        h += '<div class="sect-title">Sumber pemasukan</div><div class="choice-grid c3">' +
          '<button class="choice ' + (st.sumber === 'Ihsan Pondok' ? 'on' : '') + '" data-src="Ihsan Pondok"><b>Ihsan Pondok</b><small>Pasti</small><span class="chk">' + ic('checkCircle', 'sm') + '</span></button>' +
          '<button class="choice ' + (st.sumber === 'Kiriman Orang Tua' ? 'on' : '') + '" data-src="Kiriman Orang Tua"><b>Kiriman Ortu</b><small>Tidak pasti</small><span class="chk">' + ic('checkCircle', 'sm') + '</span></button>' +
          '<button class="choice ' + (lain || st.sumber === 'Lainnya' ? 'on' : '') + '" data-src="Lainnya"><b>Lainnya…</b><small>Ketik manual</small><span class="chk">' + ic('checkCircle', 'sm') + '</span></button></div>' +
          '<input class="input ' + (lain || st.sumber === 'Lainnya' ? '' : 'hidden') + '" id="tSrcIn" style="margin-top:10px" placeholder="Nama sumber, mis. Honor mengajar" value="' + e(lain ? st.sumber : '') + '">' +
          '<div class="note ok" style="margin-top:12px">' + ic('info') + '<div>Pemasukan langsung memperbarui saldo dan batas 5 pos anggaran.</div></div>';
      } else {
        h += kelompokField();
      }
      if (st.dompet === 'Pribadi') { /* sudah */ } else if (st.jenis === 'Pengeluaran' && st.dompet === 'Terop') {
        h += '';
      } else if (st.jenis === 'Pengeluaran') {
        const ks = b.kategoriDompet.filter(function (k) { return k.dompet === st.dompet && k.aktif; });
        if (!st.kategori || !ks.some(function (k) { return k.nama === st.kategori; })) st.kategori = st.kategori && pre.id ? st.kategori : (ks[0] ? ks[0].nama : 'Lainnya');
        h += '<div class="field" style="margin-top:14px"><label class="label">Kategori ' + U.DOMPET_LABEL[st.dompet] + '</label><select class="select" id="tKatW">' +
          ks.map(function (k) { return '<option ' + (st.kategori === k.nama ? 'selected' : '') + '>' + e(k.nama) + '</option>'; }).join('') +
          (ks.some(function (k) { return k.nama === st.kategori; }) ? '' : '<option selected>' + e(st.kategori) + '</option>') + '</select></div>' +
          (st.dompet === 'Pondok' && !isEdit ? '<div class="note warn" style="margin-top:12px">' + ic('paperclip') + '<div>Dana amanah: sangat disarankan melampirkan <b>foto nota</b>.</div></div>' : '');
      } else {
        h += '<div class="field" style="margin-top:14px"><label class="label">' + (st.dompet === 'Terop' ? 'Pembayar / penyewa' : 'Dari siapa') + ' <span class="hint">opsional</span></label><input class="input" id="tSrcW" placeholder="' +
          (st.dompet === 'Terop' ? 'Contoh: Bpk. Hasan (tuan rumah)' : 'Contoh: Bendahara Pondok') + '" value="' + e(st.sumber) + '"></div>';
      }
      box.innerHTML = h;
      const kn = m.$('#tKelNama'); if (kn) kn.oninput = function () { st.kelNama = kn.value; };
      const kp = m.$('#tKelPagu'); if (kp) kp.oninput = function () { kp.value = U.fmtInput(kp.value); st.kelPagu = kp.value; };
      const ksel = m.$('#tKel');
      if (ksel) ksel.onchange = function () { if (ksel.value === '__baru') { st.kelBaru = true; st.idKelompok = ''; } else { st.kelBaru = false; st.idKelompok = ksel.value; } dyn(); };
      m.$$('#tDyn [data-k]').forEach(function (x) { x.onclick = function () { st.kategori = x.dataset.k; st.subkategori = ''; dyn(); }; });
      m.$$('#tDyn [data-s]').forEach(function (x) { x.onclick = function () { st.subkategori = st.subkategori === x.dataset.s ? '' : x.dataset.s; m.$$('#tSub .chip').forEach(function (c) { c.classList.toggle('on', c.dataset.s === st.subkategori); }); m.$('#tSubIn').value = ''; }; });
      const si = m.$('#tSubIn'); if (si) si.oninput = function () { if (si.value) { st.subkategori = si.value; m.$$('#tSub .chip').forEach(function (c) { c.classList.remove('on'); }); } };
      m.$$('#tDyn [data-src]').forEach(function (x) {
        x.onclick = function () {
          m.$$('#tDyn [data-src]').forEach(function (c) { c.classList.toggle('on', c === x); });
          const inp = m.$('#tSrcIn');
          if (x.dataset.src === 'Lainnya') { inp.classList.remove('hidden'); inp.focus(); st.sumber = inp.value || 'Lainnya'; } else { inp.classList.add('hidden'); st.sumber = x.dataset.src; }
        };
      });
      const srcIn = m.$('#tSrcIn'); if (srcIn) srcIn.oninput = function () { st.sumber = srcIn.value; };
      const srcW = m.$('#tSrcW'); if (srcW) srcW.oninput = function () { st.sumber = srcW.value; };
      const kw = m.$('#tKatW'); if (kw) kw.onchange = function () { st.kategori = kw.value; };
      const tt = m.$('#tTarget'); if (tt) tt.onchange = function () { st.idTarget = tt.value; };
      quota();
    }
    function quota() {
      const q = m.$('#tQuota'), sisaEl = m.$('#tSisa');
      if (!q) return;
      const a = b.anggaran.find(function (x) { return x.kategori === st.kategori; });
      const dalam = st.tanggal >= b.periode.mulai && st.tanggal <= b.periode.akhir;
      if (!a || !dalam) { q.innerHTML = st.kategori && !dalam ? '<div class="note info">' + ic('info') + '<div>Tanggal di luar ' + e(b.periode.nama) + ' — kuota dihitung pada periodenya.</div></div>' : ''; if (sisaEl) sisaEl.textContent = ''; return; }
      const n = getNom() * (isEdit && pre.kategori === a.kategori ? 0 : 1);
      const dulu = a.pct, jadi = a.batas ? (a.terpakai + n) / a.batas * 100 : 0;
      if (sisaEl) sisaEl.innerHTML = 'Tersisa: <b class="num">' + U.rp(a.sisa) + '</b>';
      if (a.kategori === 'Tabungan') { q.innerHTML = '<div class="note ok">' + ic('piggy') + '<div>Setoran tabungan memindahkan uang ke simpanan, tidak mengurangi jatah belanja.</div></div>'; return; }
      if (a.kategori === 'Sedekah') {
        const sd = b.ringkasan.sedekah || { minimal: 0, terpakai: a.terpakai, minPersen: 0 };
        const jadiS = sd.terpakai + n, kurangS = Math.max(0, sd.minimal - jadiS);
        q.innerHTML = '<div class="note violet" style="flex-direction:column;gap:8px"><div class="row" style="width:100%">' + ic('heart') + '<b>Sedekah bulan ini</b><span class="pill p-violet" style="margin-left:auto">' + (kurangS ? 'kurang ' + U.rp(kurangS) : 'minimal tercapai') + '</span></div>' +
          '<div style="width:100%">Tercatat ' + U.rp(sd.terpakai) + ' → menjadi <b>' + U.rp(jadiS) + '</b>. Minimal ' + sd.minPersen + '% dari ihsan = ' + U.rp(sd.minimal) + '.</div>' +
          '<div style="width:100%">' + UI.bar(sd.minimal ? Math.min(100, jadiS / sd.minimal * 100) : 100, 'violet') + '</div></div>';
        UI.animate(q); return;
      }
      const lewat = jadi > 100, amb = jadi >= b.ringkasan.ambang;
      q.innerHTML = '<div class="note ' + (lewat ? 'danger' : amb ? 'warn' : 'ok') + '" style="flex-direction:column;gap:8px">' +
        '<div class="row" style="width:100%">' + ic(lewat ? 'alertCircle' : amb ? 'alert' : 'checkCircle') + '<b>Kuota ' + e(a.kategori) + '</b><span class="pill ' + (lewat ? 'p-lewat' : amb ? 'p-hampir' : 'p-aman') + '" style="margin-left:auto">' + Math.round(jadi) + '% terpakai</span></div>' +
        '<div style="width:100%">Terpakai ' + Math.round(dulu) + '% (' + U.rp(a.terpakai) + ') → menjadi <b>' + Math.round(jadi) + '%</b> (' + U.rp(a.terpakai + n) + ') dari batas ' + U.rp(a.batas) + '.</div>' +
        '<div style="width:100%">' + UI.bar(Math.min(jadi, 100), lewat ? 'coral' : amb ? '' : 'em') + '</div></div>';
      UI.animate(q);
    }
    m.$$('#tJenis button').forEach(function (x) { x.onclick = function () { setJenis(x.dataset.j); }; });
    m.$$('#tDompet [data-d]').forEach(function (x) {
      x.onclick = function () {
        if (terkunci) return;
        st.dompet = x.dataset.d; st.kategori = ''; st.sumber = ''; st.subkategori = ''; st.idKelompok = ''; st.kelBaru = false;
        m.$$('#tDompet [data-d]').forEach(function (c) { c.classList.toggle('on', c === x); });
        dyn();
      };
    });
    if (terkunci) { m.$$('#tJenis button, #tDompet button').forEach(function (x) { x.disabled = true; }); }
    dyn(); label();
    if (!isEdit) bindScan();

    function bindScan() {
      const f = m.$('#tScanF'), box = m.$('#tScan'), info = m.$('#tScanInfo');
      f.addEventListener('change', async function () {
        const file = f.files && f.files[0]; f.value = '';
        if (!file) return;
        if (!(b.ai && b.ai.adaKunci)) {
          info.innerHTML = '<div class="note warn">' + ic('alert') + '<div>Fitur baca nota belum aktif. Isi API key Gemini di <b>Pengaturan → AI &amp; Jarvis</b>.</div></div>';
          return;
        }
        box.classList.add('busy'); box.querySelector('b').textContent = 'Membaca nota…';
        info.innerHTML = '';
        let foto;
        try {
          foto = await U.bacaBukti(file);
          if (!/^image\//.test(foto.mime)) throw new Error('Pilih foto nota (bukan PDF).');
          const r = await API.call('bacaNota', { mime: foto.mime, data: foto.data }, { timeout: 90000 });
          terapkanNota(r, foto, file.name);
        } catch (err) {
          info.innerHTML = '<div class="note danger">' + ic('alertCircle') + '<div>' + e(err.message) + '</div></div>';
          if (foto && bukti.set && /^image\//.test(foto.mime)) bukti.set(foto, file.name);
        } finally {
          box.classList.remove('busy'); box.querySelector('b').textContent = 'Baca foto nota otomatis';
        }
      });
    }
    function terapkanNota(r, foto, nama) {
      if (bukti.set) bukti.set(foto, nama);
      const info = m.$('#tScanInfo');
      if (!r.terbaca) {
        info.innerHTML = '<div class="note warn">' + ic('alert') + '<div>Total di nota tidak terbaca jelas. Foto tetap dilampirkan; isi nominal secara manual.</div></div>';
        return;
      }
      st.jenis = 'Pengeluaran';
      m.$$('#tJenis button').forEach(function (x) { x.className = x.dataset.j === 'Pengeluaran' ? 'on out-on' : ''; });
      if (r.dompet && r.dompet !== st.dompet) { st.dompet = r.dompet; st.idKelompok = ''; st.kelBaru = false; st.sumber = ''; }
      m.$$('#tDompet [data-d]').forEach(function (c) { c.classList.toggle('on', c.dataset.d === st.dompet); });
      st.kategori = r.kategori || ''; st.subkategori = r.subkategori || '';
      const nom = m.$('#tNom'); nom.value = String(r.nominal); nom.dispatchEvent(new Event('input'));
      if (r.tanggal) { const tg = m.$('#tTgl'); tg.value = r.tanggal; tg.dispatchEvent(new Event('change')); }
      const ket = m.$('#tKet'); if (!ket.value.trim()) ket.value = r.keterangan || r.toko || '';
      dyn(); label();
      info.innerHTML = '<div class="note ok scan-hasil">' + ic('sparkles') + '<div><b>Terbaca' + (r.toko ? ': ' + e(r.toko) : '') + ' · ' + U.rp(r.nominal) + '</b>' +
        (r.items && r.items.length ? '<div class="small">' + r.items.slice(0, 4).map(function (x) { return e(x.nama) + (x.harga ? ' ' + U.rpShort(x.harga) : ''); }).join(' · ') + (r.items.length > 4 ? ' …' : '') + '</div>' : '') +
        '<div class="small">' + (r.kategori ? 'Disarankan: ' + e(U.DOMPET_LABEL[st.dompet]) + ' → ' + e(r.kategori) + '. ' : 'Pilih pos/kategori sendiri. ') + 'Periksa lagi sebelum menyimpan.</div></div></div>';
      UI.animate(info);
    }

    m.$('#tSave').onclick = async function () {
      const nominal = getNom();
      if (!nominal) return UI.toast('Isi nominal dulu.', 'error');
      if (!st.tanggal) return UI.toast('Pilih tanggal.', 'error');
      if (st.dompet === 'Pribadi' && st.jenis === 'Pengeluaran' && !st.kategori) return UI.toast('Pilih salah satu dari 5 pos anggaran.', 'error');
      if (st.dompet === 'Pribadi' && st.jenis === 'Pemasukan' && (!st.sumber || st.sumber === 'Lainnya' && !(m.$('#tSrcIn') || {}).value)) return UI.toast('Isi sumber pemasukan.', 'error');
      const KL = st.dompet === 'Pondok' ? 'anggaran pondok' : 'kepanitiaan';
      let kelompokBaru;
      if (st.dompet !== 'Pribadi') {
        if (st.kelBaru) {
          const nm = (m.$('#tKelNama') || {}).value || '';
          if (!nm.trim()) return UI.toast('Isi nama ' + KL + ' baru.', 'error');
          kelompokBaru = { nama: nm.trim(), pagu: U.parseNum((m.$('#tKelPagu') || {}).value) };
        } else if (!st.idKelompok) return UI.toast('Pilih ' + KL + ' dulu.', 'error');
      }
      const payload = {
        id: st.id || undefined, tanggal: st.tanggal, waktu: pre.waktu || U.nowTime(), dompet: st.dompet, jenis: st.jenis,
        kategori: st.jenis === 'Pengeluaran' ? st.kategori : '', sumber: st.jenis === 'Pemasukan' ? st.sumber : '',
        subkategori: st.jenis === 'Pengeluaran' && st.dompet === 'Pribadi' ? st.subkategori : '', nominal: nominal,
        keterangan: m.$('#tKet').value.trim(), idTarget: st.kategori === 'Tabungan' ? st.idTarget : '',
        bukti: bukti.val ? { mime: bukti.val.mime, data: bukti.val.data } : undefined, _adaBukti: pre.adaBukti, refTipe: pre.refTipe,
        idKelompok: st.dompet !== 'Pribadi' && !st.kelBaru ? st.idKelompok : '', kelompokBaru: kelompokBaru
      };
      // peringatan sebelum melewati batas (PRD US-D2)
      const a = b.anggaran.find(function (x) { return x.kategori === payload.kategori; });
      if (st.dompet === 'Pribadi' && st.jenis === 'Pengeluaran' && a && U.POS_SIMPAN.indexOf(a.kategori) < 0 && payload.tanggal >= b.periode.mulai && payload.tanggal <= b.periode.akhir) {
        const tambah = nominal - (isEdit && pre.kategori === a.kategori ? pre.nominal : 0);
        if (a.terpakai + tambah > a.batas) {
          const lebih = a.terpakai + tambah - a.batas;
          const ok = await UI.confirm({ title: 'Melewati batas ' + a.kategori, html: 'Pengeluaran ini akan membuat pos <b>' + e(a.kategori) + '</b> menjadi <b>' + Math.round((a.terpakai + tambah) / Math.max(1, a.batas) * 100) + '%</b>, melewati batas sebesar <b class="out">' + U.rp(lebih) + '</b>. Tetap simpan?', ok: 'Tetap Simpan', cancel: 'Batal / Sesuaikan', icon: 'alert' });
          if (!ok) return;
        }
      }
      if (st.jenis === 'Pengeluaran' && !isEdit && nominal > b.saldo[st.dompet]) {
        const ok = await UI.confirm({ title: 'Saldo tidak cukup', html: 'Saldo ' + U.DOMPET_LABEL[st.dompet] + ' tercatat <b>' + U.rp(b.saldo[st.dompet]) + '</b>. Jika memang memakai dana lain, catat lewat <b>Pinjam Antar Dana</b> agar rapi. Tetap simpan?', ok: 'Tetap Simpan', icon: 'wallet', tone: 't-gold', btn: 'btn-navy' });
        if (!ok) return;
      }
      m.close();
      try {
        const r = await App.simpanTransaksi(payload);
        if (r && payload.idTarget) {
          const t = S.boot.target.find(function (x) { return x.id === payload.idTarget; });
          if (t && t.status === 'Tercapai') rayakan(t);
        }
      } catch (err) { /* toast sudah tampil */ }
    };
  };

  // ============================================================
  // DETAIL TRANSAKSI + BUKTI
  // ============================================================
  F.detailTransaksi = function (t) {
    const i = UI.trxIcon(t);
    const tgt = t.idTarget && S.boot.target.find(function (x) { return x.id === t.idTarget; });
    const m = UI.modal({
      title: t.keterangan || t.subkategori || t.kategori || t.sumber || 'Transaksi', icon: i.ik, tone: i.tone, sub: U.DOMPET_LABEL[t.dompet] + ' · ' + t.jenis,
      body: '<div class="center" style="margin:6px 0 16px"><div class="big-amt num ' + (t.jenis === 'Pemasukan' ? 'in' : 'out') + '">' + U.rpSigned(t) + '</div><div class="small muted">' + U.terbilang(t.nominal) + '</div></div>' +
        '<div class="kv"><span>Tanggal</span><b>' + e(U.hijriLabel(t.tanggal, 'H')) + '</b><span>Masehi</span><b>' + U.masehi(t.tanggal, true) + (t.waktu ? ' · ' + e(t.waktu) : '') + '</b>' +
        '<span>Dompet</span><b>' + U.DOMPET_LABEL[t.dompet] + '</b>' +
        (t.jenis === 'Pemasukan' ? '<span>Sumber</span><b>' + e(t.sumber || '-') + '</b>' : '<span>Kategori</span><b>' + e(t.kategori || '-') + '</b>' + (t.subkategori ? '<span>Subkategori</span><b>' + e(t.subkategori) + '</b>' : '')) +
        (tgt ? '<span>Target</span><b>' + e(tgt.nama) + '</b>' : '') +
        (t.dompet !== 'Pribadi' ? '<span>' + (t.dompet === 'Pondok' ? 'Anggaran' : 'Kepanitiaan') + '</span><b>' + e(U.namaKelompok(t.idKelompok) || '— belum dikelompokkan') + '</b>' : '') + (t.refTipe === 'hutang' ? '<span>Jenis</span><b>Pembayaran hutang</b>' : '') + '<span>ID</span><b class="small">' + e(t.id) + '</b></div>' +
        (t.adaBukti ? '<button class="btn btn-sec btn-block" id="dBukti">' + ic('image') + 'Lihat bukti / nota</button>' :
          t.jenis === 'Pengeluaran' || t.dompet !== 'Pribadi' ? '<label class="dropzone" style="cursor:pointer">' + ic('upload') + '<span id="dUpT">' + (t.dompet === 'Pondok' ? 'Belum ada nota — unggah sekarang' : 'Unggah bukti (opsional)') + '</span><input type="file" id="dUp" accept="image/*,application/pdf" hidden></label>' : ''),
      foot: '<button class="btn btn-danger-out" id="dDel">' + ic('trash') + 'Hapus</button><button class="btn btn-navy" id="dEdit">' + ic('edit') + 'Ubah</button>'
    });
    const vb = m.$('#dBukti'); if (vb) vb.onclick = function () { F.lihatBukti(t.idBukti); };
    const up = m.$('#dUp');
    if (up) up.onchange = async function () {
      const f = up.files[0]; if (!f) return;
      m.$('#dUpT').textContent = 'Mengunggah…';
      try { const bk = await U.bacaBukti(f); await API.call('unggahBukti', { id: t.id, bukti: { mime: bk.mime, data: bk.data } }); UI.toast('Bukti tersimpan di Google Drive.'); m.close(); await App.refresh(true); }
      catch (err) { m.$('#dUpT').textContent = err.message; }
    };
    m.$('#dEdit').onclick = function () { m.close(); F.transaksi(t); };
    m.$('#dDel').onclick = async function () {
      const ok = await UI.confirm({ title: 'Hapus transaksi ini?', text: 'Saldo dan anggaran dihitung ulang. Data tetap tersimpan di riwayat audit (tidak benar-benar dihapus).', ok: 'Hapus', icon: 'trash' });
      if (!ok) return;
      m.close();
      try { await API.call('hapusTransaksi', { id: t.id }); UI.toast('Transaksi dihapus.'); await App.refresh(true); } catch (err) { UI.toast(err.message, 'error'); }
    };
  };

  F.lihatBukti = function (id) {
    const m = UI.modal({ title: 'Bukti Transaksi', icon: 'image', size: 'wide', body: '<div class="viewer" id="vw"><div class="skel" style="height:320px"></div></div>' });
    API.call('lihatBukti', { id: id }).then(function (r) {
      const src = 'data:' + r.mime + ';base64,' + r.data;
      m.$('#vw').innerHTML = r.mime === 'application/pdf'
        ? '<iframe src="' + src + '" title="Bukti PDF"></iframe><button class="btn btn-sec btn-block" style="margin-top:10px" id="vwDl">' + ic('download') + 'Unduh PDF</button>'
        : '<img src="' + src + '" alt="Bukti transaksi"><div class="small muted center" style="margin-top:8px">' + e(r.nama) + '</div>';
      const dl = m.$('#vwDl'); if (dl) dl.onclick = function () { U.unduhBase64(r.data, r.mime, r.nama); };
    }).catch(function (err) { m.$('#vw').innerHTML = '<div class="note danger">' + ic('alertCircle') + '<div>' + e(err.message) + '</div></div>'; });
  };

  F.daftarNota = function () {
    const list = S.boot.belumNota;
    const m = UI.modal({
      title: 'Lengkapi Nota Dana Pondok', icon: 'paperclip', tone: 't-gold', sub: list.length + ' transaksi belum ada nota',
      body: list.length ? list.map(function (t) {
        return '<div class="set-row"><div class="txt"><b>' + e(t.keterangan || t.kategori) + ' · <span class="num">' + U.rp(t.nominal) + '</span></b><small>' + U.hijriLabel(t.tanggal) + ' · ' + U.masehi(t.tanggal) + '</small></div>' +
          '<label class="btn btn-sm btn-sec">' + ic('upload', 'sm') + '<span>Unggah</span><input type="file" data-up="' + t.id + '" accept="image/*,application/pdf" hidden></label></div>';
      }).join('') : UI.empty('checkCircle', 'Semua nota lengkap', 'Alhamdulillah, laporan amanah sudah rapi.')
    });
    m.$$('[data-up]').forEach(function (inp) {
      inp.onchange = async function () {
        const f = inp.files[0]; if (!f) return; const lbl = inp.parentNode.querySelector('span'); lbl.textContent = 'Mengunggah…';
        try { const bk = await U.bacaBukti(f); await API.call('unggahBukti', { id: inp.dataset.up, bukti: { mime: bk.mime, data: bk.data } }); lbl.textContent = 'Tersimpan ✓'; inp.parentNode.classList.add('btn-gold'); App.refresh(true); }
        catch (err) { lbl.textContent = 'Gagal'; UI.toast(err.message, 'error'); }
      };
    });
  };

  // ============================================================
  // PINJAM ANTAR DANA
  // ============================================================
  F.pinjam = function () {
    const b = S.boot;
    const opt = function (sel) { return ['Pribadi', 'Pondok', 'Terop'].map(function (d) { return '<option value="' + d + '" ' + (d === sel ? 'selected' : '') + '>' + U.DOMPET_LABEL[d] + ' (saldo ' + U.rp(b.saldo[d]) + ')</option>'; }).join(''); };
    const jt = b.periode.id === b.periodeIni ? b.periode.akhir : (U.periodOf(b.hariIni) || b.periode).akhir;
    const m = UI.modal({
      title: 'Pinjam Antar Dana', icon: 'swap', tone: 't-gold', sub: 'Tidak dihitung sebagai pemasukan',
      body: scanBox('pj', 'Baca foto bukti otomatis', 'Foto transfer / kuitansi / catatan serah terima — AI mengisi nominal &amp; tanggal.') +
        '<div class="grid g-2" style="gap:12px"><div class="field"><label class="label">Dari dompet (sumber)</label><select class="select" id="pjDari">' + opt('Terop') + '</select></div>' +
        '<div class="field" style="margin-top:0"><label class="label">Ke dompet (penerima)</label><select class="select" id="pjKe">' + opt('Pribadi') + '</select></div></div>' +
        '<div class="note info" style="margin-top:12px" id="pjInfo"></div>' +
        '<div style="margin-top:14px">' + amountField('pjNom', 0, 'Nominal pinjaman') + '</div>' +
        '<div class="field"><label class="label">Alasan / keperluan <span class="req">*</span></label><input class="input" id="pjAlasan" placeholder="Contoh: berobat, kebutuhan mendesak"></div>' +
        '<div class="grid g-2" style="gap:12px">' + dateField('pjTgl', b.hariIni, 'Tanggal pinjam') + '<div style="margin-top:14px">' + dateField('pjJt', jt, 'Jatuh tempo') + '</div></div>' +
        buktiField('pjBukti', 'Foto bukti (catatan serah terima, transfer)'),
      foot: '<button class="btn btn-sec" data-close>Batal</button><button class="btn btn-navy" id="pjSave">' + ic('save') + 'Simpan Pinjaman</button>'
    });
    const getNom = bindAmount(m, 'pjNom', info);
    bindDate(m, 'pjTgl'); bindDate(m, 'pjJt');
    const pjBukti = bindBukti(m, 'pjBukti');
    bindScanBukti(m, { id: 'pj', konteks: 'pinjaman', bukti: pjBukti, nominal: 'pjNom', tanggal: 'pjTgl',
      isi: function (r) { const a = m.$('#pjAlasan'); if (!a.value.trim() && r.keterangan) a.value = r.keterangan; } });
    function info() {
      const d = m.$('#pjDari').value, k = m.$('#pjKe').value, n = getNom();
      const el = m.$('#pjInfo');
      if (d === k) { el.className = 'note danger'; el.innerHTML = ic('alert') + '<div>Dompet sumber dan penerima tidak boleh sama.</div>'; return; }
      if (n > b.saldo[d]) { el.className = 'note danger'; el.innerHTML = ic('alert') + '<div>Nominal melebihi saldo ' + U.DOMPET_LABEL[d] + ' (' + U.rp(b.saldo[d]) + ').</div>'; return; }
      el.className = 'note info'; el.innerHTML = ic('shield') + '<div>Saldo ' + U.DOMPET_LABEL[d] + ' berkurang, ' + U.DOMPET_LABEL[k] + ' bertambah. Tercatat sebagai kewajiban yang wajib dikembalikan.</div>';
    }
    m.$('#pjDari').onchange = info; m.$('#pjKe').onchange = info; info();
    m.$('#pjSave').onclick = async function () {
      const d = { dari: m.$('#pjDari').value, ke: m.$('#pjKe').value, nominal: getNom(), alasan: m.$('#pjAlasan').value.trim(), tanggal: m.$('#pjTgl').value, jatuhTempo: m.$('#pjJt').value };
      if (d.dari === d.ke) return UI.toast('Dompet tidak boleh sama.', 'error');
      if (!d.nominal) return UI.toast('Isi nominal.', 'error');
      if (d.nominal > b.saldo[d.dari]) return UI.toast('Nominal melebihi saldo sumber.', 'error');
      if (!d.alasan) return UI.toast('Isi alasan peminjaman.', 'error');
      if (pjBukti.val) d.bukti = { mime: pjBukti.val.mime, data: pjBukti.val.data };
      UI.busy(this, true);
      try { await API.call('simpanPinjaman', d); m.close(); UI.toast('Pinjaman tercatat. Pengingat jatuh tempo aktif.'); await App.refresh(true); }
      catch (err) { UI.toast(err.message, 'error'); UI.busy(this, false); }
    };
  };

  F.bayarPinjaman = function (p, full) {
    const m = UI.modal({
      title: 'Bayar Pengembalian', icon: 'banknote', tone: 't-em', sub: 'Dana ' + p.dari + ' → ' + p.ke + ' · sisa ' + U.rp(p.sisa),
      body: '<div class="mini-row"><div style="flex:1"><span class="muted">Kewajiban sasaran</span><b>Pinjam dari ' + U.DOMPET_LABEL[p.dari] + ' (sisa ' + U.rp(p.sisa) + ')</b></div></div>' +
        '<div style="margin-top:14px">' + amountField('byNom', full ? p.sisa : 0, 'Nominal pengembalian') + '</div>' +
        '<div class="chips" style="margin-top:10px"><button class="chip" data-q="' + p.sisa + '">Lunasi ' + U.rp(p.sisa) + '</button>' + (p.sisa >= 100000 ? '<button class="chip" data-q="' + Math.round(p.sisa / 2 / 1000) * 1000 + '">Setengah</button>' : '') + '</div>' +
        dateField('byTgl', S.boot.hariIni, 'Tanggal bayar') +
        '<div class="field"><label class="label">Catatan</label><input class="input" id="byCat" placeholder="opsional"></div>' + buktiField('byBukti', 'Bukti transfer / resi'),
      foot: '<button class="btn btn-sec" data-close>Batal</button><button class="btn btn-gold" id="bySave">' + ic('checkCircle') + 'Konfirmasi Pengembalian</button>'
    });
    const getNom = bindAmount(m, 'byNom'); bindDate(m, 'byTgl');
    const bukti = bindBukti(m, 'byBukti');
    m.$$('[data-q]').forEach(function (c) { c.onclick = function () { const el = m.$('#byNom'); el.value = String(c.dataset.q); el.dispatchEvent(new Event('input')); }; });
    m.$('#bySave').onclick = async function () {
      const n = getNom();
      if (!n) return UI.toast('Isi nominal.', 'error');
      if (n > p.sisa) return UI.toast('Melebihi sisa pinjaman (' + U.rp(p.sisa) + ').', 'error');
      UI.busy(this, true);
      try {
        const r = await API.call('bayarPinjaman', { id: p.id, nominal: n, tanggal: m.$('#byTgl').value, catatan: m.$('#byCat').value, bukti: bukti.val ? { mime: bukti.val.mime, data: bukti.val.data } : undefined });
        m.close(); UI.toast(r.lunas ? 'Alhamdulillah, pinjaman lunas!' : 'Pengembalian tercatat.'); if (r.lunas) UI.confetti();
        await App.refresh(true);
      } catch (err) { UI.toast(err.message, 'error'); UI.busy(this, false); }
    };
  };

  F.detailPinjaman = function (p) {
    const m = UI.modal({
      title: 'Rincian Pinjaman', icon: 'swap', tone: 't-gold', sub: e(p.id),
      body: '<div class="flow"><span class="w">' + U.DOMPET_LABEL[p.dari] + '</span><span class="arr">' + ic('arrowRight', 'sm') + '</span><span class="w to">' + U.DOMPET_LABEL[p.ke] + '</span></div>' +
        '<div class="kv"><span>Nominal</span><b class="num">' + U.rp(p.nominal) + '</b><span>Terbayar</span><b class="num in">' + U.rp(p.terbayar) + '</b><span>Sisa</span><b class="num out">' + U.rp(p.sisa) + '</b>' +
        '<span>Alasan</span><b>' + e(p.alasan || '-') + '</b><span>Tanggal</span><b>' + U.hijriLabel(p.tanggal) + '</b><span>Jatuh tempo</span><b>' + (p.jatuhTempo ? U.hijriLabel(p.jatuhTempo) + ' · ' + U.masehi(p.jatuhTempo) : '-') + '</b></div>' +
        (p.adaBukti ? '<button class="btn btn-sec btn-block" style="margin-top:12px" data-bk="' + p.idBukti + '">' + ic('image') + 'Lihat foto bukti pinjaman</button>' : '') +
        '<div class="sect-title">Riwayat pengembalian</div>' + (p.riwayat.length ? p.riwayat.map(function (r) {
          return '<div class="set-row"><span class="ic-tile t-em">' + ic('banknote') + '</span><div class="txt"><b class="num">' + U.rp(r.nominal) + '</b><small>' + U.hijriLabel(r.tanggal) + ' · ' + e(r.catatan || '') + '</small></div>' + (r.adaBukti ? '<button class="btn btn-sm btn-ghost" data-bk="' + r.idBukti + '">' + ic('image', 'sm') + '</button>' : '') + '</div>';
        }).join('') : '<div class="small muted">Belum ada pengembalian.</div>'),
      foot: (p.terbayar === 0 && p.status === 'Berjalan' ? '<button class="btn btn-danger-out" id="pjBatal">' + ic('xCircle') + 'Batalkan Pinjaman</button>' : '') + '<button class="btn btn-navy" data-close>Tutup</button>'
    });
    m.$$('[data-bk]').forEach(function (x) { x.onclick = function () { F.lihatBukti(x.dataset.bk); }; });
    const bt = m.$('#pjBatal');
    if (bt) bt.onclick = async function () {
      const ok = await UI.confirm({ title: 'Batalkan pinjaman?', text: 'Gunakan jika pinjaman salah catat. Saldo kedua dompet kembali seperti semula.', ok: 'Batalkan' });
      if (!ok) return;
      try { await API.call('batalPinjaman', { id: p.id }); m.close(); UI.toast('Pinjaman dibatalkan.'); await App.refresh(true); } catch (err) { UI.toast(err.message, 'error'); }
    };
  };

  // ============================================================
  // HUTANG KE ORANG LAIN
  // ============================================================
  F.hutang = function (h) {
    h = h || {};
    const b = S.boot;
    const m = UI.modal({
      title: h.id ? 'Ubah Hutang' : 'Catat Hutang', icon: 'user', tone: 't-coral',
      body: (h.id ? '' : scanBox('h', 'Baca foto bukti otomatis', 'Foto kuitansi / transfer / catatan — AI mengisi nominal, tanggal &amp; nama.')) +
        '<div class="field"><label class="label">Nama pihak (kreditur) <span class="req">*</span></label><input class="input" id="hNama" placeholder="Contoh: Ust. Ahmad" value="' + e(h.nama || '') + '"></div>' +
        '<div style="margin-top:14px">' + amountField('hNom', h.nominal, 'Nominal hutang') + '</div>' +
        '<div class="grid g-2" style="gap:12px">' + dateField('hTgl', h.tanggal || b.hariIni, 'Tanggal') + '<div style="margin-top:14px">' + dateField('hJt', h.jatuhTempo || '', 'Jatuh tempo (opsional)') + '</div></div>' +
        '<div class="set-row" style="margin-top:8px"><div class="txt"><b>Uangnya masuk ke saldo Pribadi</b><small>Aktifkan jika uang pinjaman diterima tunai (bukan pemasukan)</small></div><label class="switch"><input type="checkbox" id="hMasuk" ' + (h.id ? (h.masukSaldo ? 'checked' : '') : 'checked') + '><span></span></label></div>' +
        '<div class="field"><label class="label">Catatan</label><input class="input" id="hCat" value="' + e(h.catatan || '') + '" placeholder="opsional"></div>' +
        buktiField('hBukti', h.adaBukti ? 'Ganti foto bukti' : 'Foto bukti (kuitansi, chat, catatan)'),
      foot: (h.id && h.terbayar === 0 ? '<button class="btn btn-danger-out" id="hDel">' + ic('trash') + 'Hapus</button>' : '<button class="btn btn-sec" data-close>Batal</button>') + '<button class="btn btn-gold" id="hSave">' + ic('save') + 'Simpan</button>'
    });
    const getNom = bindAmount(m, 'hNom'); bindDate(m, 'hTgl'); bindDate(m, 'hJt');
    const hBukti = bindBukti(m, 'hBukti');
    if (!h.id) bindScanBukti(m, { id: 'h', konteks: 'hutang', bukti: hBukti, nominal: 'hNom', tanggal: 'hTgl',
      isi: function (r) { const n = m.$('#hNama'), c = m.$('#hCat'); if (!n.value.trim() && r.pihak) n.value = r.pihak; if (!c.value.trim() && r.keterangan) c.value = r.keterangan; } });
    m.$('#hSave').onclick = async function () {
      const d = { id: h.id, nama: m.$('#hNama').value.trim(), nominal: getNom(), tanggal: m.$('#hTgl').value, jatuhTempo: m.$('#hJt').value, masukSaldo: m.$('#hMasuk').checked, catatan: m.$('#hCat').value };
      if (!d.nama) return UI.toast('Isi nama pihak.', 'error');
      if (!d.nominal) return UI.toast('Isi nominal.', 'error');
      if (hBukti.val) d.bukti = { mime: hBukti.val.mime, data: hBukti.val.data };
      UI.busy(this, true);
      try { await API.call('simpanHutang', d); m.close(); UI.toast('Hutang tersimpan.'); await App.refresh(true); } catch (err) { UI.toast(err.message, 'error'); UI.busy(this, false); }
    };
    const del = m.$('#hDel');
    if (del) del.onclick = async function () {
      const ok = await UI.confirm({ title: 'Hapus catatan hutang?', text: h.nama + ' · ' + U.rp(h.nominal), ok: 'Hapus' });
      if (!ok) return;
      try { await API.call('hapusHutang', { id: h.id }); m.close(); UI.toast('Catatan hutang dihapus.'); await App.refresh(true); } catch (err) { UI.toast(err.message, 'error'); }
    };
  };

  F.bayarHutang = function (h) {
    const b = S.boot;
    let pos = 'Kebutuhan Primer';
    const m = UI.modal({
      title: 'Bayar Hutang', icon: 'banknote', tone: 't-em', sub: 'Ke ' + e(h.nama) + ' · sisa ' + U.rp(h.sisa),
      body: scanBox('bh', 'Baca foto bukti bayar', 'Foto transfer / kuitansi — AI mengisi nominal &amp; tanggal.') + amountField('bhNom', h.sisa, 'Nominal pembayaran') +
        '<div class="sect-title">Dibebankan ke pos anggaran</div><div class="choice-grid c3">' + ['Kebutuhan Primer', 'Investasi Otak/Tubuh', 'Jajanan'].map(function (k) {
          return '<button class="choice ' + (k === pos ? 'on' : '') + '" data-k="' + k + '"><b>' + U.POS_SINGKAT[k] + '</b><small>' + Math.round((b.anggaran.find(function (a) { return a.kategori === k; }) || {}).pct || 0) + '% terpakai</small><span class="chk">' + ic('checkCircle', 'sm') + '</span></button>';
        }).join('') + '</div>' + dateField('bhTgl', b.hariIni, 'Tanggal bayar') +
        '<div class="field"><label class="label">Catatan</label><input class="input" id="bhCat" placeholder="opsional"></div>' +
        buktiField('bhBukti', 'Foto bukti pembayaran') +
        '<div class="note info" style="margin-top:12px">' + ic('info') + '<div>Pembayaran dicatat sebagai pengeluaran dompet Pribadi (PRD). Saldo Pribadi saat ini ' + U.rp(b.saldo.Pribadi) + '.</div></div>',
      foot: '<button class="btn btn-sec" data-close>Batal</button><button class="btn btn-gold" id="bhSave">' + ic('checkCircle') + 'Bayar</button>'
    });
    const getNom = bindAmount(m, 'bhNom'); bindDate(m, 'bhTgl');
    const bhBukti = bindBukti(m, 'bhBukti');
    bindScanBukti(m, { id: 'bh', konteks: 'bayarHutang', bukti: bhBukti, nominal: 'bhNom', tanggal: 'bhTgl',
      isi: function (r) { const c = m.$('#bhCat'); if (!c.value.trim() && r.keterangan) c.value = r.keterangan; } });
    m.$$('[data-k]').forEach(function (x) { x.onclick = function () { pos = x.dataset.k; m.$$('[data-k]').forEach(function (c) { c.classList.toggle('on', c === x); }); }; });
    m.$('#bhSave').onclick = async function () {
      const n = getNom();
      if (!n) return UI.toast('Isi nominal.', 'error');
      if (n > h.sisa) return UI.toast('Melebihi sisa hutang.', 'error');
      UI.busy(this, true);
      try {
        const r = await API.call('bayarHutang', { id: h.id, nominal: n, kategori: pos, tanggal: m.$('#bhTgl').value, catatan: m.$('#bhCat').value, bukti: bhBukti.val ? { mime: bhBukti.val.mime, data: bhBukti.val.data } : undefined });
        m.close(); UI.toast(r.lunas ? 'Alhamdulillah, hutang lunas!' : 'Pembayaran hutang tercatat.'); if (r.lunas) UI.confetti();
        if (r.peringatan) App.tampilPeringatan(r.peringatan);
        await App.refresh(true);
      } catch (err) { UI.toast(err.message, 'error'); UI.busy(this, false); }
    };
  };

  F.detailHutang = function (h) {
    const m = UI.modal({
      title: 'Hutang ke ' + h.nama, icon: 'user', tone: 't-coral',
      body: '<div class="kv"><span>Nominal</span><b class="num">' + U.rp(h.nominal) + '</b><span>Terbayar</span><b class="num in">' + U.rp(h.terbayar) + '</b><span>Sisa</span><b class="num out">' + U.rp(h.sisa) + '</b>' +
        '<span>Tanggal</span><b>' + U.hijriLabel(h.tanggal) + '</b><span>Jatuh tempo</span><b>' + (h.jatuhTempo ? U.hijriLabel(h.jatuhTempo) + ' · ' + U.masehi(h.jatuhTempo) : '-') + '</b><span>Masuk saldo</span><b>' + (h.masukSaldo ? 'Ya' : 'Tidak') + '</b></div>' +
        '<div class="sect-title">Riwayat pembayaran</div>' + (h.riwayat.length ? h.riwayat.map(function (r) {
          return '<div class="set-row"><span class="ic-tile t-em">' + ic('banknote') + '</span><div class="txt"><b class="num">' + U.rp(r.nominal) + '</b><small>' + U.hijriLabel(r.tanggal) + ' · pos ' + e(r.kategori) + '</small></div>' + (r.adaBukti ? '<button class="btn btn-sm btn-ghost" data-bk="' + r.idBukti + '" aria-label="Lihat bukti">' + ic('image', 'sm') + '</button>' : '') + '</div>';
        }).join('') : '<div class="small muted">Belum ada pembayaran.</div>') +
        (h.adaBukti ? '<button class="btn btn-sec btn-block" style="margin-top:12px" data-bk="' + h.idBukti + '">' + ic('image') + 'Lihat foto bukti hutang</button>' : ''),
      foot: '<button class="btn btn-sec" id="hdEdit">' + ic('edit') + 'Ubah</button><button class="btn btn-navy" data-close>Tutup</button>'
    });
    m.$('#hdEdit').onclick = function () { m.close(); F.hutang(h); };
    m.$$('[data-bk]').forEach(function (x) { x.onclick = function () { F.lihatBukti(x.dataset.bk); }; });
  };

  // ============================================================
  // TARGET TABUNGAN
  // ============================================================
  const IKON_TARGET = ['laptop', 'smartphone', 'bike', 'graduation', 'book', 'gift', 'home', 'target'];
  F.target = function (t) {
    t = t || {};
    const b = S.boot;
    let ikon = t.ikon || 'laptop', prio = t.prioritas || 2;
    const defTgl = t.tglTarget || U.addDays(b.hariIni, 90);
    const m = UI.modal({
      title: t.id ? 'Ubah Target' : 'Tambah Target Baru', icon: 'flag', tone: 't-gold',
      body: '<div class="field"><label class="label">Nama barang / target impian <span class="req">*</span></label><input class="input" id="tgNama" placeholder="Contoh: Laptop ThinkPad" value="' + e(t.nama || '') + '"></div>' +
        '<div class="field"><label class="label">Keterangan singkat</label><input class="input" id="tgDesk" placeholder="Contoh: Kebutuhan mengajar & desain" value="' + e(t.deskripsi || '') + '"></div>' +
        '<div class="sect-title">Ikon</div><div class="chips" id="tgIkon">' + IKON_TARGET.map(function (k) { return '<button class="chip ' + (k === ikon ? 'on' : '') + '" data-ik="' + k + '" aria-label="' + k + '">' + ic(k, 'sm') + '</button>'; }).join('') + '</div>' +
        '<div class="grid g-2" style="gap:12px;margin-top:14px"><div>' + amountField('tgHarga', t.harga, 'Estimasi harga') + '</div><div>' + amountField('tgAwal', t.terkumpulAwal, 'Sudah terkumpul (awal)') + '</div></div>' +
        dateField('tgTgl', defTgl, 'Target tercapai pada') +
        '<div class="chips" style="margin-top:8px">' + [3, 6, 12].map(function (n) { return '<button class="chip" data-bln="' + n + '">' + n + ' bulan lagi</button>'; }).join('') + '</div>' +
        '<div class="sect-title">Prioritas</div><div class="seg" id="tgPrio">' + [[1, 'Tinggi'], [2, 'Sedang'], [3, 'Santai']].map(function (p) { return '<button data-p="' + p[0] + '" class="' + (prio === p[0] ? 'on' : '') + '">' + p[1] + '</button>'; }).join('') + '</div>' +
        '<div class="note info" style="margin-top:14px" id="tgCalc"></div>',
      foot: '<button class="btn btn-sec" data-close>Batal</button><button class="btn btn-gold" id="tgSave">' + ic('save') + 'Simpan Target</button>'
    });
    const getH = bindAmount(m, 'tgHarga', calc), getA = bindAmount(m, 'tgAwal', calc);
    bindDate(m, 'tgTgl', calc);
    function calc() {
      const harga = getH(), awal = getA(), tgl = m.$('#tgTgl').value;
      const el = m.$('#tgCalc');
      if (!harga || !tgl) { el.innerHTML = ic('wand') + '<div>Isi harga dan tanggal untuk melihat saran cicilan per bulan Hijriah.</div>'; return; }
      const cur = U.hijri(b.hariIni), hT = U.hijri(tgl);
      const bulan = Math.max(1, (hT.y * 12 + hT.m) - (cur.y * 12 + cur.m) + 1);
      const sisa = Math.max(0, harga - awal), per = Math.ceil(sisa / bulan / 1000) * 1000;
      const basis = Math.max(b.ringkasan.ihsanBulanan, b.ringkasan.pemasukan, 1);
      el.innerHTML = ic('wand') + '<div><b>Kalkulasi otomatis:</b> tersisa ' + bulan + ' bulan Hijriah (s.d. ' + U.BULAN_H[hT.m - 1] + ' ' + hT.y + ' H). Saran cicilan <b class="num">' + U.rp(per) + '/bulan</b> ≈ <b>' + U.pct(per / basis * 100) + '</b> dari pemasukan.</div>';
    }
    m.$$('[data-ik]').forEach(function (x) { x.onclick = function () { ikon = x.dataset.ik; m.$$('[data-ik]').forEach(function (c) { c.classList.toggle('on', c === x); }); }; });
    m.$$('[data-p]').forEach(function (x) { x.onclick = function () { prio = Number(x.dataset.p); m.$$('#tgPrio button').forEach(function (c) { c.classList.toggle('on', c === x); }); }; });
    m.$$('[data-bln]').forEach(function (x) {
      x.onclick = function () {
        const cur = U.hijri(b.hariIni); let y = cur.y, mo = cur.m + Number(x.dataset.bln) - 1; while (mo > 12) { mo -= 12; y++; }
        const p = b.daftarPeriode.find(function (q) { return q.y === y && q.m === mo; });
        m.$('#tgTgl').value = p ? p.akhir : U.addDays(b.hariIni, Number(x.dataset.bln) * 29);
        m.$('#tgTgl').dispatchEvent(new Event('change'));
      };
    });
    calc();
    m.$('#tgSave').onclick = async function () {
      const d = { id: t.id, nama: m.$('#tgNama').value.trim(), deskripsi: m.$('#tgDesk').value.trim(), ikon: ikon, harga: getH(), terkumpulAwal: getA(), tglTarget: m.$('#tgTgl').value, prioritas: prio };
      if (!d.nama) return UI.toast('Isi nama target.', 'error');
      if (!d.harga) return UI.toast('Isi estimasi harga.', 'error');
      if (!d.tglTarget || d.tglTarget < b.hariIni) return UI.toast('Tanggal target harus di masa depan.', 'error');
      UI.busy(this, true);
      try { await API.call('simpanTarget', d); m.close(); UI.toast('Target tersimpan. Bismillah!'); await App.refresh(true); } catch (err) { UI.toast(err.message, 'error'); UI.busy(this, false); }
    };
  };

  F.setor = function (t) {
    const b = S.boot;
    const m = UI.modal({
      title: 'Setor Tabungan', icon: 'piggy', tone: 't-gold', sub: e(t.nama) + ' · ' + Math.round(t.pct) + '% terkumpul',
      body: amountField('stNom', t.saranBulan && t.saranBulan <= t.sisa ? t.saranBulan : t.sisa, 'Nominal setoran') +
        '<div class="chips" style="margin-top:10px">' + (t.saranBulan ? '<button class="chip" data-q="' + Math.min(t.saranBulan, t.sisa) + '">Saran ' + U.rp(Math.min(t.saranBulan, t.sisa)) + '</button>' : '') + '<button class="chip" data-q="' + t.sisa + '">Lunasi ' + U.rp(t.sisa) + '</button></div>' +
        dateField('stTgl', b.hariIni, 'Tanggal') +
        '<div class="mini-row" style="margin-top:14px"><div style="flex:1"><span class="muted">Sumber kas</span><b>Pribadi (saldo ' + U.rp(b.saldo.Pribadi) + ')</b></div>' + ic('wallet') + '</div>' +
        '<div class="note ok" style="margin-top:12px" id="stImpact"></div>',
      foot: '<button class="btn btn-sec" data-close>Batal</button><button class="btn btn-gold" id="stSave">' + ic('checkCircle') + 'Konfirmasi Setoran</button>'
    });
    const getNom = bindAmount(m, 'stNom', impact); bindDate(m, 'stTgl');
    function impact() {
      const n = getNom(); const jadi = Math.min(100, (t.terkumpul + n) / t.harga * 100);
      m.$('#stImpact').innerHTML = ic('trendUp') + '<div>Dampak kemajuan: <b>' + Math.round(t.pct) + '% → ' + Math.round(jadi) + '%</b> (+' + Math.round(jadi - t.pct) + '%). Otomatis tercatat di pos <b>Tabungan</b>.</div>';
    }
    m.$$('[data-q]').forEach(function (c) { c.onclick = function () { const el = m.$('#stNom'); el.value = c.dataset.q; el.dispatchEvent(new Event('input')); }; });
    impact();
    m.$('#stSave').onclick = async function () {
      const n = getNom();
      if (!n) return UI.toast('Isi nominal.', 'error');
      m.close();
      try {
        const r = await App.simpanTransaksi({ tanggal: m.$('#stTgl').value, waktu: U.nowTime(), dompet: 'Pribadi', jenis: 'Pengeluaran', kategori: 'Tabungan', subkategori: 'Setoran Tabungan', nominal: n, keterangan: 'Setor target: ' + t.nama, idTarget: t.id }, { pesan: 'Setoran tabungan tercatat ✓' });
        if (r) { const baru = S.boot.target.find(function (x) { return x.id === t.id; }); if (baru && baru.status === 'Tercapai') rayakan(baru); }
      } catch (err) { /* sudah ditangani */ }
    };
  };

  function rayakan(t) {
    UI.confetti();
    UI.modal({
      size: 'narrow',
      body: '<div class="center" style="padding:22px 0 6px"><div class="dialog-ic t-solidgold" style="width:72px;height:72px;border-radius:24px">' + ic('trophy', 'xl') + '</div>' +
        '<span class="pill p-aman">Target tercapai 100%</span><h2 style="margin:12px 0 6px">Alhamdulillah! Dana terkumpul</h2><p class="muted">"' + e(t.nama) + '" telah memenuhi target ' + U.rp(t.harga) + '.</p></div>',
      foot: '<button class="btn btn-gold btn-block" data-close>Masya Allah, lanjutkan!</button>'
    });
  }

  F.kunciJarvis = function (kunci) {
    const url = API.url;
    const env = 'SAFEMONEY_URL=' + url + '\nSAFEMONEY_KEY=' + kunci;
    const m = UI.modal({
      title: 'Kunci Jarvis', icon: 'key', tone: 't-violet', sub: 'Hanya ditampilkan sekali',
      body: '<p style="margin-top:0">Tempel dua baris ini ke file <b>.env</b> Hermes (<code>%LOCALAPPDATA%\\hermes\\.env</code>), lalu jalankan <code>hermes gateway restart</code> dan kirim <code>/new</code> di Telegram.</p>' +
        '<pre class="code-box" id="kjEnv">' + e(env) + '</pre>' +
        '<div class="note warn">' + ic('alert') + '<div>Simpan kunci ini seperti PIN. Jangan dikirim ke chat atau ditulis di Obsidian. Kalau bocor, tekan <b>Cabut kunci</b> lalu buat yang baru.</div></div>',
      foot: '<button class="btn btn-sec" data-close>Tutup</button><button class="btn btn-gold" id="kjCopy">' + ic('copy') + 'Salin</button>'
    });
    m.$('#kjCopy').onclick = function () {
      const done = function () { UI.toast('Disalin. Tempel ke file .env Hermes.'); };
      if (navigator.clipboard) navigator.clipboard.writeText(env).then(done).catch(pilih); else pilih();
      function pilih() { const r = document.createRange(); r.selectNodeContents(m.$('#kjEnv')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); UI.toast('Teks sudah dipilih — tekan Ctrl+C.', 'info'); }
    };
  };

  F.terapkanSaran = function () {
    const b = S.boot, st = b.saranTarget;
    if (!st || !st.usulan) return UI.toast('Belum ada saran — Tabungan sudah cukup.', 'info');
    if (!App.isCurrentPeriod()) return UI.toast('Saran hanya bisa diterapkan pada bulan berjalan.', 'warning');
    const now = {}; b.anggaran.forEach(function (a) { now[a.kategori] = a.persen; });
    const m = UI.modal({
      title: 'Pratinjau Terapkan Saran', icon: 'wand', tone: 't-gold', sub: 'Total tetap 100%',
      body: U.POS.map(function (k) {
        const a = now[k], u = st.usulan[k];
        return '<div style="margin-bottom:14px"><div class="row small"><b>' + k + '</b><span class="muted num" style="margin-left:auto">' + a + '% → <b style="color:var(--ink)">' + u + '%</b></span></div>' +
          '<div class="row" style="gap:6px;margin-top:6px"><div style="flex:1">' + UI.bar(a, 'navy') + '</div><div style="flex:1">' + UI.bar(u, k === 'Tabungan' ? 'em' : '') + '</div></div></div>';
      }).join('') + '<div class="note info">' + ic('info') + '<div>Kiri = sekarang, kanan = usulan. Batas nominal tiap pos langsung dihitung ulang.</div></div>',
      foot: '<button class="btn btn-sec" data-close>Batal</button><button class="btn btn-gold" id="sgOk">' + ic('checkCircle') + 'Ya, Terapkan</button>'
    });
    UI.animate(m.el);
    m.$('#sgOk').onclick = async function () {
      UI.busy(this, true);
      try { await API.call('simpanAnggaran', { periode: b.periodeIni, persen: st.usulan }); m.close(); UI.toast('Saran diterapkan. Semangat menabung!'); await App.refresh(true); }
      catch (err) { UI.toast(err.message, 'error'); UI.busy(this, false); }
    };
  };

  // ============================================================
  // PENGATURAN: KUTIPAN & KATEGORI
  // ============================================================
  F.kutipan = function (k) {
    k = k || { aktif: true, kelompok: 'Motivator' };
    const m = UI.modal({
      title: k.id ? 'Ubah Kata Mutiara' : 'Tambah Kata Mutiara', icon: 'quote', tone: 't-gold',
      body: '<div class="field"><label class="label">Teks (maks. 3 kalimat) <span class="hint" id="kCount"></span></label><textarea class="textarea" id="kTeks" maxlength="400">' + e(k.teks || '') + '</textarea></div>' +
        '<div class="grid g-2" style="gap:12px"><div class="field"><label class="label">Tokoh</label><input class="input" id="kTokoh" value="' + e(k.tokoh || '') + '"></div>' +
        '<div class="field" style="margin-top:14px"><label class="label">Kelompok</label><select class="select" id="kKel">' + ['Rasulullah ﷺ', 'Khalifah', 'Pengusaha', 'Motivator'].map(function (g) { return '<option ' + (k.kelompok === g ? 'selected' : '') + '>' + g + '</option>'; }).join('') + '</select></div></div>' +
        '<div class="field"><label class="label">Rujukan</label><input class="input" id="kRuj" placeholder="Contoh: HR. Muslim" value="' + e(k.rujukan || '') + '"></div>' +
        '<div class="set-row" style="margin-top:8px"><div class="txt"><b>Tampilkan di slider</b></div><label class="switch"><input type="checkbox" id="kAktif" ' + (k.aktif ? 'checked' : '') + '><span></span></label></div>',
      foot: '<button class="btn btn-sec" data-close>Batal</button><button class="btn btn-gold" id="kSave">' + ic('save') + 'Simpan</button>'
    });
    const ta = m.$('#kTeks');
    const cnt = function () { const n = ta.value.split(/[.!?]+(?=\s|$)/).filter(function (s) { return s.trim(); }).length; m.$('#kCount').textContent = n + '/3 kalimat'; m.$('#kCount').style.color = n > 3 ? 'var(--coral-ink)' : ''; };
    ta.oninput = cnt; cnt();
    m.$('#kSave').onclick = async function () {
      UI.busy(this, true);
      try { await API.call('simpanKutipan', { id: k.id, teks: ta.value, tokoh: m.$('#kTokoh').value, kelompok: m.$('#kKel').value, rujukan: m.$('#kRuj').value, aktif: m.$('#kAktif').checked }); m.close(); UI.toast('Kata mutiara tersimpan.'); await App.refresh(true); }
      catch (err) { UI.toast(err.message, 'error'); UI.busy(this, false); }
    };
  };

  F.kategori = function (k) {
    const m = UI.modal({
      title: k.id ? 'Ubah Kategori' : 'Kategori Baru', icon: 'package', size: 'narrow', sub: U.DOMPET_LABEL[k.dompet],
      body: '<div class="field"><label class="label">Nama kategori</label><input class="input" id="kgNama" value="' + e(k.nama || '') + '" maxlength="60" autofocus></div>' +
        (k.id ? '<div class="set-row" style="margin-top:8px"><div class="txt"><b>Aktif</b><small>Kategori nonaktif tidak muncul di form</small></div><label class="switch"><input type="checkbox" id="kgAktif" ' + (k.aktif ? 'checked' : '') + '><span></span></label></div>' : ''),
      foot: '<button class="btn btn-sec" data-close>Batal</button><button class="btn btn-gold" id="kgSave">' + ic('save') + 'Simpan</button>'
    });
    m.$('#kgSave').onclick = async function () {
      const nama = m.$('#kgNama').value.trim(); if (!nama) return UI.toast('Isi nama kategori.', 'error');
      UI.busy(this, true);
      try { await API.call('simpanKategori', { id: k.id, dompet: k.dompet, nama: nama, aktif: k.id ? m.$('#kgAktif').checked : true }); m.close(); UI.toast('Kategori tersimpan.'); await App.refresh(true); }
      catch (err) { UI.toast(err.message, 'error'); UI.busy(this, false); }
    };
  };

  // ============================================================
  // ANGGARAN PONDOK & KEPANITIAAN
  // ============================================================
  F.kelompok = function (k) {
    k = k || {};
    const isP = k.dompet === 'Pondok';
    const lbl = isP ? 'Anggaran Pondok' : 'Kepanitiaan';
    const m = UI.modal({
      title: (k.id ? 'Ubah ' : 'Tambah ') + lbl, icon: isP ? 'landmark' : 'users', tone: isP ? 't-em' : 't-gold', size: 'narrow',
      sub: isP ? 'Kelompok dana amanah pondok' : 'Kelompok dana per kepanitiaan',
      body: '<div class="field"><label class="label">Nama ' + lbl.toLowerCase() + ' <span class="req">*</span></label><input class="input" id="kNama" maxlength="80" value="' + e(k.nama || '') + '" placeholder="' +
          (isP ? 'Contoh: Anggaran Maulid Nabi 1448' : 'Contoh: Panitia Walimah Bpk. Hasan') + '" autofocus></div>' +
        (isP ? '<div class="field"><label class="label">Pagu anggaran <span class="hint">opsional · batas dana yang disetujui</span></label><div class="input-pre"><span>Rp</span><input class="input num" id="kPagu" inputmode="numeric" value="' + (k.pagu ? U.fmtInput(k.pagu) : '') + '"></div></div>' : '') +
        '<div class="field"><label class="label">Keterangan <span class="hint">opsional</span></label><input class="input" id="kKet" maxlength="200" value="' + e(k.keterangan || '') + '" placeholder="' + (isP ? 'Contoh: Kegiatan bulan Rabiul Awal' : 'Contoh: Sewa 3 terop + kursi, 12 Okt') + '"></div>' +
        (k.id ? '<div class="set-row" style="margin-top:8px"><div class="txt"><b>Tandai selesai</b><small>' + lbl + ' selesai tidak muncul lagi di pilihan form</small></div><label class="switch"><input type="checkbox" id="kSelesai" ' + (k.status === 'Selesai' ? 'checked' : '') + '><span></span></label></div>' : ''),
      foot: (k.id && !k.jumlah ? '<button class="btn btn-danger-out" id="kHapus">' + ic('trash') + 'Hapus</button>' : '<button class="btn btn-sec" data-close>Batal</button>') +
        '<button class="btn btn-gold" id="kSimpan">' + ic('save') + 'Simpan</button>'
    });
    const pg = m.$('#kPagu'); if (pg) pg.oninput = function () { pg.value = U.fmtInput(pg.value); };
    m.$('#kSimpan').onclick = async function () {
      const nama = m.$('#kNama').value.trim(); if (!nama) return UI.toast('Isi nama ' + lbl.toLowerCase() + '.', 'error');
      UI.busy(this, true);
      try {
        await API.call('simpanKelompok', { id: k.id, dompet: k.dompet, nama: nama, pagu: pg ? U.parseNum(pg.value) : 0, keterangan: m.$('#kKet').value, status: (m.$('#kSelesai') || {}).checked ? 'Selesai' : 'Aktif' });
        m.close(); UI.toast(lbl + ' tersimpan.'); await App.refresh(true);
      } catch (err) { UI.toast(err.message, 'error'); UI.busy(this, false); }
    };
    const h = m.$('#kHapus');
    if (h) h.onclick = async function () {
      const ok = await UI.confirm({ title: 'Hapus ' + lbl.toLowerCase() + '?', text: k.nama, ok: 'Hapus' });
      if (!ok) return;
      try { await API.call('simpanKelompok', { id: k.id, dompet: k.dompet, hapus: true }); m.close(); UI.toast('Dihapus.'); await App.refresh(true); } catch (err) { UI.toast(err.message, 'error'); }
    };
  };

  F.riwayatKelompok = function (k) {
    const isP = k.dompet === 'Pondok';
    const m = UI.modal({
      title: k.nama, icon: isP ? 'landmark' : 'users', tone: isP ? 't-em' : 't-gold', size: 'wide',
      sub: (isP ? 'Anggaran Pondok' : 'Kepanitiaan') + ' · seluruh periode',
      body: '<div class="grid g-3" style="gap:10px;margin-bottom:14px">' +
        '<div class="mini-row"><div><span class="muted">Dana masuk</span><b class="num in">' + U.rp(k.masuk || 0) + '</b></div></div>' +
        '<div class="mini-row"><div><span class="muted">' + (isP ? 'Terpakai' : 'Pengeluaran') + '</span><b class="num out">' + U.rp(k.keluar || 0) + '</b></div></div>' +
        '<div class="mini-row"><div><span class="muted">Sisa kas' + (k.pagu ? ' · pagu ' + U.rp(k.pagu) : '') + '</span><b class="num">' + U.rp(k.saldo || 0) + '</b></div></div></div>' +
        '<div id="rkList"><div class="skel" style="height:200px"></div></div>',
      foot: (k.tanpa || k.status === 'Selesai' ? '' : '<button class="btn btn-gold" id="rkCatat">' + ic('plus') + 'Catat ke ' + (isP ? 'anggaran' : 'kepanitiaan') + ' ini</button>') +
        '<button class="btn btn-sec" id="rkPdf">' + ic('download') + 'PDF bulan ini</button>'
    });
    const ct = m.$('#rkCatat'); if (ct) ct.onclick = function () { m.close(); F.transaksi({ dompet: k.dompet, idKelompok: k.id }); };
    m.$('#rkPdf').onclick = function () { m.close(); F.pdf(k.dompet); };
    API.call('transaksiList', { dompet: k.dompet, idKelompok: k.id || '__tanpa' }).then(function (d) {
      const box = m.$('#rkList'); if (!box) return;
      if (!d.items.length) { box.innerHTML = UI.empty('list', 'Belum ada transaksi', ''); return; }
      box.innerHTML = '<ul class="tx-list">' + d.items.map(function (t) {
        const i = UI.trxIcon(t);
        return '<li data-id="' + e(t.id) + '"><span class="ic-tile ' + i.tone + '">' + ic(i.ik) + '</span><div class="mid"><b>' + e(t.keterangan || t.sumber || t.kategori || '-') + '</b><small>' +
          e(U.hijriLabel(t.tanggal)) + ' · ' + U.masehiPendek(t.tanggal) + (t.kategori ? ' · ' + e(t.kategori) : '') + (t.adaBukti ? ' · 📎' : '') + '</small></div>' +
          '<div class="rt"><b class="num ' + (t.jenis === 'Pemasukan' ? 'amt-in' : 'amt-out') + '">' + U.rpSigned(t) + '</b></div></li>';
      }).join('') + '</ul>';
      U.$$('[data-id]', box).forEach(function (li) { li.onclick = function () { const t = d.items.find(function (x) { return x.id === li.dataset.id; }); m.close(); F.detailTransaksi(t); }; });
    }).catch(function (err) { const box = m.$('#rkList'); if (box) box.innerHTML = '<div class="note danger">' + e(err.message) + '</div>'; });
  };

  F.terapkanEvaluasi = function () {
    const b = S.boot, ev = b.evaluasiLalu;
    if (!ev || !ev.usulan) return UI.toast('Tidak ada saran evaluasi.', 'info');
    const now = {}; b.anggaran.forEach(function (a) { now[a.kategori] = a.persen; });
    const m = UI.modal({
      title: 'Saran dari Evaluasi Bulan Lalu', icon: 'history', tone: 't-gold', sub: e(ev.periode) + ' · total lebih ' + U.rp(ev.totalLebih),
      body: '<p class="muted" style="margin-top:0">Pos yang bulan lalu melebihi batas diturunkan persennya sebesar kelebihan itu. Selisihnya dialihkan ke <b>Tabungan</b>, sehingga total tetap 100%.</p>' +
        U.POS.map(function (k) {
          const a = now[k], u = ev.usulan[k];
          return '<div style="margin-bottom:14px"><div class="row small"><b>' + k + '</b><span class="muted num" style="margin-left:auto">' + a + '% → <b style="color:var(--ink)">' + u + '%</b></span></div>' +
            '<div class="row" style="gap:6px;margin-top:6px"><div style="flex:1">' + UI.bar(a, 'navy') + '</div><div style="flex:1">' + UI.bar(u, k === 'Tabungan' ? 'em' : u < a ? 'coral' : '') + '</div></div></div>';
        }).join('') + '<div class="note info">' + ic('info') + '<div>Kiri = sekarang, kanan = saran. Anda tetap bisa mengatur manual di halaman Anggaran.</div></div>',
      foot: '<button class="btn btn-sec" data-close>Nanti saja</button><button class="btn btn-gold" id="evOk">' + ic('checkCircle') + 'Terapkan</button>'
    });
    UI.animate(m.el);
    m.$('#evOk').onclick = async function () {
      UI.busy(this, true);
      try { await API.call('simpanAnggaran', { periode: b.periodeIni, persen: ev.usulan }); m.close(); UI.toast('Persentase bulan ini disesuaikan. Bismillah, lebih terkendali!'); await App.refresh(true); }
      catch (err) { UI.toast(err.message, 'error'); UI.busy(this, false); }
    };
  };

  // ============================================================
  // PDF
  // ============================================================
  F.pdf = function (dompet, email) {
    const b = S.boot;
    const m = UI.modal({
      title: email ? 'Kirim Laporan ke Email' : 'Unduh Laporan PDF', icon: email ? 'mail' : 'download', size: 'narrow',
      body: '<div class="field"><label class="label">Dompet</label><div class="seg" id="pdD">' + ['Pribadi', 'Pondok', 'Terop'].map(function (d) { return '<button data-d="' + d + '" class="' + (d === dompet ? 'on' : '') + '">' + U.DOMPET_LABEL[d] + '</button>'; }).join('') + '</div></div>' +
        '<div class="field"><label class="label">Periode</label><select class="select" id="pdP">' + b.daftarPeriode.filter(function (p) { return p.mulai <= b.hariIni; }).slice().reverse().slice(0, 18).map(function (p) { return '<option value="' + p.id + '" ' + (p.id === b.periode.id ? 'selected' : '') + '>' + e(p.nama) + '</option>'; }).join('') + '</select></div>' +
        (email ? '<div class="note info" style="margin-top:14px">' + ic('mail') + '<div>Dikirim ke <b>' + e(b.pengaturan.email_notifikasi || '(belum diatur)') + '</b></div></div>' : '<div class="small muted" style="margin-top:12px">Salinan PDF juga tersimpan di folder Drive "SafeMoney/Laporan_PDF".</div>'),
      foot: '<button class="btn btn-sec" data-close>Batal</button><button class="btn btn-gold" id="pdGo">' + ic(email ? 'send' : 'download') + (email ? 'Kirim' : 'Buat PDF') + '</button>'
    });
    let d = dompet;
    m.$$('#pdD button').forEach(function (x) { x.onclick = function () { d = x.dataset.d; m.$$('#pdD button').forEach(function (c) { c.classList.toggle('on', c === x); }); }; });
    m.$('#pdGo').onclick = async function () {
      UI.busy(this, true, 'Menyusun PDF…');
      try {
        const r = await API.call('buatPdf', { periode: m.$('#pdP').value, dompet: d, kirimEmail: !!email }, { timeout: 120000 });
        m.close();
        if (email) UI.toast('Laporan terkirim ke email.'); else { U.unduhBase64(r.data, 'application/pdf', r.nama); UI.toast('PDF diunduh & tersimpan di Drive.'); }
      } catch (err) { UI.toast(err.message, 'error'); UI.busy(this, false); }
    };
  };

  window.Forms = F;
})();
