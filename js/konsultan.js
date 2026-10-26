/* =====================================================================
   konsultan.js — Konsultan Keuangan AI
   - Mesin chat bersama (riwayat sama untuk halaman & tombol melayang)
   - Halaman "Konsultan AI"  : gaya animated AI chat (latar gelap, palet perintah "/")
   - Tombol melayang + panel  : gaya AI assistant (gradien slate → indigo)
   - Basis pengetahuan (catatan Obsidian / prinsip pribadi)
   ===================================================================== */
(function () {
  const ic = window.icon, e = U.esc;
  const K_CHAT = 'sm_chat';
  const MAKS_PESAN = 40;
  const BATAS = 60000;
  const kurangGerak = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const PERINTAH = [
    { ik: 'chart', label: 'Evaluasi belanja', desc: 'Nilai belanja bulan ini per pos', prefix: '/evaluasi', teks: 'Evaluasi belanja saya bulan ini. Mana yang sudah tepat dan mana yang perlu diperbaiki?', kirim: true },
    { ik: 'heart', label: 'Rencana wakaf', desc: 'Pertimbangkan sedekah / wakaf', prefix: '/wakaf', teks: 'Bagaimana jika saya wakaf Rp  bulan ini?', kursor: 29 },
    { ik: 'pie', label: 'Atur anggaran', desc: 'Minta usulan persentase', prefix: '/anggaran', teks: 'Sarankan pembagian anggaran untuk bulan depan berdasarkan pola belanja saya.', kirim: true },
    { ik: 'shield', label: 'Cek kesehatan', desc: 'Gambaran keuangan menyeluruh', prefix: '/sehat', teks: 'Cek kesehatan keuangan saya secara keseluruhan.', kirim: true },
    { ik: 'camera', label: 'Tanya dari foto', desc: 'Lampirkan foto barang / nota', prefix: '/foto', aksi: 'foto' }
  ];

  // ============================================================
  // MESIN CHAT BERSAMA
  // ============================================================
  const C = window.KonsulChat = { menunggu: false, dengar: [] };
  function S_() { return window.S; }
  function chat() { const S = S_(); if (!S.chat) { const c = U.store.get(K_CHAT, []); S.chat = Array.isArray(c) ? c : []; } return S.chat; }
  function simpan() {
    const S = S_(); S.chat = chat().slice(-MAKS_PESAN);
    U.store.set(K_CHAT, S.chat.map(function (m) { const c = Object.assign({}, m); delete c.foto; return c; })); // foto tidak disimpan (hemat memori)
  }
  function kabari() { C.dengar.forEach(function (f) { try { f(); } catch (err) { /* abaikan */ } }); }
  C.kirim = async function (teks, gambar) {
    teks = String(teks || '').trim();
    if ((!teks && !gambar) || C.menunggu) return;
    if (!teks) teks = 'Bagaimana pendapat Anda tentang foto ini?';
    const riwayat = chat().slice(-12).map(function (m) { return { peran: m.peran, teks: m.teks }; });
    chat().push({ peran: 'user', teks: teks, adaFoto: !!gambar, foto: gambar ? gambar.preview : '', t: Date.now() });
    C.menunggu = true; simpan(); kabari();
    try {
      const r = await API.call('konsultasi', { pesan: teks, riwayat: riwayat, gambar: gambar ? { mime: gambar.mime, data: gambar.data } : undefined }, { timeout: 150000 });
      chat().push({ peran: 'ai', teks: r.jawaban, usulan: r.usulan, catatanUsulan: r.catatanUsulan, dibaca: r.dibaca, t: Date.now() });
    } catch (err) {
      chat().push({ peran: 'ai', teks: '⚠️ ' + err.message, gagal: true, t: Date.now() });
    } finally { C.menunggu = false; simpan(); kabari(); }
  };
  C.baru = function () { S_().chat = []; simpan(); kabari(); };

  /** Markdown ringan → HTML aman (teks di-escape dulu). */
  function md(s) {
    const inline = function (t) { return t.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[\s(])\*(\S[^*]*?)\*(?=[\s).,!?:;]|$)/g, '$1<i>$2</i>'); };
    let html = '', list = null;
    String(s || '').split('\n').forEach(function (raw) {
      const l = e(raw);
      const li = l.match(/^\s*(?:[-•*]|(\d+)[.)])\s+(.*)$/);
      if (li) {
        const tag = li[1] ? 'ol' : 'ul';
        if (list !== tag) { if (list) html += '</' + list + '>'; html += '<' + tag + '>'; list = tag; }
        html += '<li>' + inline(li[2]) + '</li>'; return;
      }
      if (list) { html += '</' + list + '>'; list = null; }
      const h = l.match(/^#{1,4}\s+(.*)$/);
      if (h) { html += '<p class="md-h">' + inline(h[1]) + '</p>'; return; }
      if (l.trim()) html += '<p>' + inline(l) + '</p>';
    });
    if (list) html += '</' + list + '>';
    return html;
  }

  function kartuUsulan(m, i) {
    const u = m.usulan; if (!u) return '';
    const baris = U.POS.map(function (k) {
      const a = u.sekarang[k], b = u.persen[k], d = b - a;
      return '<div class="us-row"><span>' + e(U.POS_SINGKAT[k]) + '</span><span class="num dim">' + a + '%</span><span class="arr">' + ic('arrowRight', 'sm') + '</span>' +
        '<b class="num ' + (d > 0 ? 'naik' : d < 0 ? 'turun' : '') + '">' + b + '%</b><span class="num small ' + (d > 0 ? 'naik' : d < 0 ? 'turun' : 'dim') + '">' + (d ? (d > 0 ? '+' : '') + d : '·') + '</span></div>';
    }).join('');
    const aksi = m.status === 'diterapkan' ? '<span class="us-pill ok">' + ic('checkCircle', 'sm') + 'Diterapkan</span>'
      : m.status === 'ditolak' ? '<span class="us-pill">Ditolak</span>'
        : '<button class="us-btn" data-tolak="' + i + '">Tolak</button><button class="us-btn pri" data-terapkan="' + i + '">' + ic('wand', 'sm') + 'Terapkan</button>';
    return '<div class="usulan"><div class="us-head">' + ic('pie', 'sm') + '<b>Usulan anggaran</b><span class="us-pill">' + (u.berlaku === 'berikutnya' ? 'bulan depan' : 'bulan ini') + '</span></div>' +
      '<div class="us-grid">' + baris + '</div>' + (u.alasan ? '<div class="us-alasan">' + e(u.alasan) + '</div>' : '') + '<div class="us-aksi">' + aksi + '</div></div>';
  }

  function pesanHTML(m, i) {
    if (m.peran === 'user') {
      return '<div class="msg me"><div class="bub">' + (m.foto ? '<img class="bub-foto" src="' + m.foto + '" alt="Foto lampiran">' : m.adaFoto ? '<span class="bub-tag">' + ic('image', 'sm') + 'foto</span>' : '') +
        e(m.teks).replace(/\n/g, '<br>') + '</div></div>';
    }
    return '<div class="msg ai' + (m.gagal ? ' gagal' : '') + '"><span class="av">' + ic('sparkles', 'sm') + '</span><div class="bub">' + md(m.teks) + kartuUsulan(m, i) +
      (m.catatanUsulan ? '<div class="meta">' + e(m.catatanUsulan) + '</div>' : '') +
      (m.dibaca ? '<div class="meta">' + ic('info', 'sm') + 'Membaca ' + m.dibaca.transaksi + ' transaksi ' + e(m.dibaca.periode) + (m.dibaca.pengetahuan && m.dibaca.pengetahuan.length ? ' · ' + m.dibaca.pengetahuan.length + ' catatan' : '') + '</div>' : '') +
      '</div></div>';
  }
  const titik = '<span class="dots"><i></i><i></i><i></i></span>';

  /** Pasang tombol Terapkan / Tolak pada usulan anggaran di dalam `root`. */
  function bindUsulan(root) {
    U.$$('[data-tolak]', root).forEach(function (x) { x.onclick = function () { chat()[Number(x.dataset.tolak)].status = 'ditolak'; simpan(); kabari(); }; });
    U.$$('[data-terapkan]', root).forEach(function (x) {
      x.onclick = async function () {
        const m = chat()[Number(x.dataset.terapkan)], u = m.usulan;
        const ok = await UI.confirm({
          title: 'Terapkan usulan anggaran?', icon: 'wand', tone: 't-gold', btn: 'btn-gold', ok: 'Ya, terapkan',
          html: U.POS.map(function (k) { return e(U.POS_SINGKAT[k]) + ' <b>' + u.persen[k] + '%</b>'; }).join(' · ') + '<br><span class="small">Berlaku ' + (u.berlaku === 'berikutnya' ? 'mulai bulan Hijriah berikutnya' : 'untuk bulan ini') + '.</span>'
        });
        if (!ok) return;
        UI.busy(x, true, '…');
        try {
          await API.call('simpanAnggaran', { periode: S_().boot.periodeIni, persen: u.persen, mulai: u.berlaku === 'berikutnya' ? 'berikutnya' : undefined });
          m.status = 'diterapkan'; simpan();
          UI.toast('Anggaran diperbarui sesuai usulan.');
          await App.refresh(true); kabari();
        } catch (err) { UI.toast(err.message, 'error'); UI.busy(x, false); }
      };
    });
  }

  async function ambilFoto(file) {
    const f = await U.bacaBukti(file);
    if (!/^image\//.test(f.mime)) throw new Error('Lampiran harus foto.');
    return f;
  }

  // ============================================================
  // HALAMAN KONSULTAN — gaya "animated AI chat"
  // ============================================================
  Pages.konsultan = {
    title: 'Konsultan AI',
    render: function (S) {
      chat(); S.lab = S.lab || { draft: '', lampiran: null };
      const ai = S.boot.ai || {};
      const nama = String(S.boot.pengaturan.nama_pemilik || '').split(' ')[0];
      const nKn = (ai.pengetahuan || []).filter(function (k) { return k.aktif; }).length;
      if (!ai.adaKunci) {
        return '<div class="lab"><div class="lab-blobs" aria-hidden="true"><i></i><i></i><i></i></div><div class="lab-wrap"><div class="lab-hero">' +
          '<h1 class="lab-judul">Konsultan belum aktif</h1><span class="lab-garis"></span><p>Isi API key Gemini di Pengaturan → AI &amp; Jarvis untuk mulai berkonsultasi.</p>' +
          '<button class="lab-kirim aktif" data-go-ai>' + ic('settings', 'sm') + '<span>Buka Pengaturan</span></button></div></div></div>';
      }
      const ada = chat().length > 0;
      return '<div class="lab' + (ada ? ' berisi' : '') + '" id="lab">' +
        '<div class="lab-blobs" aria-hidden="true"><i></i><i></i><i></i></div><div class="lab-glow" id="labGlow" aria-hidden="true"></div>' +
        '<div class="lab-bar"><span class="lab-merek">' + ic('sparkles', 'sm') + 'Konsultan AI <small>' + e(ai.modelKonsultan || '') + '</small></span>' +
        '<button class="lab-tb" id="labKn">' + ic('book', 'sm') + '<span>Pengetahuan</span><b>' + nKn + '</b></button>' +
        (ada ? '<button class="lab-tb" id="labBaru" aria-label="Percakapan baru">' + ic('refresh', 'sm') + '<span>Baru</span></button>' : '') + '</div>' +
        '<div class="lab-wrap">' +
        (ada ? '<div class="lab-chat" id="labChat"></div>'
          : '<div class="lab-hero"><h1 class="lab-judul">Ada yang bisa saya bantu' + (nama ? ', ' + e(nama) : '') + '?</h1><span class="lab-garis"></span>' +
            '<p>Tanyakan apa saja tentang keuangan Anda, atau ketik <kbd>/</kbd> untuk perintah cepat.</p></div>') +
        '<div class="lab-box" id="labBox">' +
        '<div class="lab-palet" id="labPalet" hidden></div>' +
        '<textarea id="labIn" rows="1" maxlength="4000" placeholder="Tanya konsultan… mis. bolehkah saya wakaf bulan ini?">' + e(S.lab.draft || '') + '</textarea>' +
        '<div class="lab-lampiran" id="labLamp"></div>' +
        '<div class="lab-alat"><button class="lab-ik" id="labFoto" title="Lampirkan foto" aria-label="Lampirkan foto">' + ic('paperclip', 'sm') + '</button>' +
        '<button class="lab-ik" id="labCmd" title="Perintah cepat" aria-label="Perintah cepat">' + ic('zap', 'sm') + '</button>' +
        '<input type="file" id="labFile" accept="image/*" hidden>' +
        '<button class="lab-kirim" id="labKirim">' + ic('send', 'sm') + '<span>Kirim</span></button></div></div>' +
        '<div class="lab-chips">' + PERINTAH.map(function (p, i) { return '<button class="lab-chip" data-cmd="' + i + '" style="animation-delay:' + (i * 0.08) + 's">' + ic(p.ik, 'sm') + '<span>' + e(p.label) + '</span></button>'; }).join('') + '</div>' +
        '<p class="lab-catatan">Saran AI adalah masukan, bukan fatwa atau nasihat profesional. Anggaran hanya berubah bila Anda menekan <b>Terapkan</b>.</p>' +
        '</div><div class="lab-pikir" id="labPikir" hidden><span class="lab-av">' + ic('sparkles', 'sm') + '</span>Menganalisis data Anda ' + titik + '</div></div>';
    },
    mount: function (root, S) {
      const goAi = root.querySelector('[data-go-ai]');
      if (goAi) { goAi.onclick = function () { S.setTab = 'ai'; App.go('pengaturan'); }; return; }
      const lab = U.$('#lab', root), inp = U.$('#labIn', root), btn = U.$('#labKirim', root), palet = U.$('#labPalet', root);
      const file = U.$('#labFile', root), lamp = U.$('#labLamp', root), glow = U.$('#labGlow', root);
      let aktif = -1, daftar = PERINTAH.slice();

      const tinggi = function () { inp.style.height = '60px'; inp.style.height = Math.min(200, Math.max(60, inp.scrollHeight)) + 'px'; };
      const tombol = function () { btn.classList.toggle('aktif', !!(inp.value.trim() || S.lab.lampiran)); btn.disabled = C.menunggu; btn.innerHTML = (C.menunggu ? ic('loader', 'sm spin') : ic('send', 'sm')) + '<span>Kirim</span>'; };
      const isiChat = function () {
        const box = U.$('#labChat', root);
        if (!box) return;
        box.innerHTML = chat().map(pesanHTML).join('') + (C.menunggu ? '<div class="msg ai"><span class="av">' + ic('sparkles', 'sm') + '</span><div class="bub">' + titik + '</div></div>' : '');
        box.scrollTop = box.scrollHeight;
        bindUsulan(box);
      };
      const lampiran = function () {
        const f = S.lab.lampiran;
        lamp.innerHTML = f ? '<span class="lab-file"><img src="' + f.preview + '" alt="">' + e(f.nama || 'foto') + '<button aria-label="Hapus lampiran" id="labLampX">' + ic('x', 'sm') + '</button></span>' : '';
        const x = U.$('#labLampX', root); if (x) x.onclick = function () { S.lab.lampiran = null; lampiran(); tombol(); };
      };
      const pikir = function () { const p = U.$('#labPikir', root); if (p) p.hidden = !C.menunggu; };
      isiChat(); lampiran(); tinggi(); tombol(); pikir();

      // dengarkan mesin chat (dibersihkan saat halaman berganti)
      const dengar = function () {
        if (S.page !== 'konsultan' || !document.body.contains(lab)) { C.dengar = C.dengar.filter(function (f) { return f !== dengar; }); return; }
        if (chat().length && !U.$('#labChat', root)) { S.lab.draft = inp.value; App.render(); return; }
        isiChat(); tombol(); pikir();
      };
      C.dengar = C.dengar.filter(function (f) { return !f._lab; }); dengar._lab = true; C.dengar.push(dengar);

      const kirim = function () {
        const t = inp.value; const g = S.lab.lampiran;
        if (!t.trim() && !g) return;
        inp.value = ''; S.lab.draft = ''; S.lab.lampiran = null; lampiran(); tinggi(); tutupPalet();
        C.kirim(t, g);
      };
      // ---- palet perintah "/" ----
      function bukaPalet(filter) {
        daftar = PERINTAH.filter(function (p) { return !filter || p.prefix.indexOf(filter) === 0; });
        if (!daftar.length) return tutupPalet();
        if (aktif >= daftar.length) aktif = 0;
        palet.innerHTML = daftar.map(function (p, i) {
          return '<button class="lab-pi' + (i === aktif ? ' on' : '') + '" data-pi="' + i + '" style="animation-delay:' + (i * 0.03) + 's">' + ic(p.ik, 'sm') + '<b>' + e(p.label) + '</b><span>' + e(p.prefix) + '</span><small>' + e(p.desc) + '</small></button>';
        }).join('');
        palet.hidden = false; U.$('#labCmd', root).classList.add('on');
        U.$$('[data-pi]', palet).forEach(function (x) { x.onmousedown = function (ev) { ev.preventDefault(); pilih(daftar[Number(x.dataset.pi)]); }; });
      }
      function tutupPalet() { palet.hidden = true; aktif = -1; const c = U.$('#labCmd', root); if (c) c.classList.remove('on'); }
      function pilih(p) {
        tutupPalet();
        if (p.aksi === 'foto') { inp.value = ''; file.click(); return; }
        inp.value = p.teks; S.lab.draft = p.teks; tinggi(); tombol();
        if (p.kirim) { kirim(); return; }
        inp.focus(); if (p.kursor) inp.setSelectionRange(p.kursor, p.kursor);
      }
      inp.oninput = function () {
        S.lab.draft = inp.value; tinggi(); tombol();
        if (/^\/\S*$/.test(inp.value)) { if (aktif < 0) aktif = 0; bukaPalet(inp.value); } else tutupPalet();
      };
      inp.onkeydown = function (ev) {
        if (!palet.hidden) {
          if (ev.key === 'ArrowDown') { ev.preventDefault(); aktif = (aktif + 1) % daftar.length; bukaPalet(/^\//.test(inp.value) ? inp.value : ''); return; }
          if (ev.key === 'ArrowUp') { ev.preventDefault(); aktif = (aktif - 1 + daftar.length) % daftar.length; bukaPalet(/^\//.test(inp.value) ? inp.value : ''); return; }
          if (ev.key === 'Enter' || ev.key === 'Tab') { ev.preventDefault(); if (aktif >= 0 && daftar[aktif]) pilih(daftar[aktif]); return; }
          if (ev.key === 'Escape') { ev.preventDefault(); tutupPalet(); return; }
        }
        if (ev.key === 'Enter' && !ev.shiftKey && window.innerWidth > 767) { ev.preventDefault(); kirim(); }
      };
      btn.onclick = kirim;
      U.$('#labCmd', root).onclick = function () { if (palet.hidden) { aktif = 0; bukaPalet(''); } else tutupPalet(); };
      document.addEventListener('mousedown', function tutup(ev) {
        if (!document.body.contains(palet)) return document.removeEventListener('mousedown', tutup);
        if (!palet.contains(ev.target) && !ev.target.closest('#labCmd')) tutupPalet();
      });
      U.$$('[data-cmd]', root).forEach(function (x) { x.onclick = function () { pilih(PERINTAH[Number(x.dataset.cmd)]); }; });
      // ---- lampiran foto ----
      U.$('#labFoto', root).onclick = function () { file.click(); };
      file.onchange = async function () {
        const f = file.files && file.files[0]; file.value = '';
        if (!f) return;
        try { const g = await ambilFoto(f); g.nama = f.name; S.lab.lampiran = g; lampiran(); tombol(); inp.focus(); }
        catch (err) { UI.toast(err.message, 'error'); }
      };
      // ---- cahaya mengikuti kursor saat mengetik ----
      if (!kurangGerak && window.matchMedia('(pointer: fine)').matches) {
        let tx = 0, ty = 0, x = 0, y = 0, jalan = false;
        const gerak = function () { x += (tx - x) * 0.12; y += (ty - y) * 0.12; glow.style.transform = 'translate(' + (x - 400) + 'px,' + (y - 400) + 'px)'; if (jalan) requestAnimationFrame(gerak); };
        lab.addEventListener('mousemove', function (ev) { const r = lab.getBoundingClientRect(); tx = ev.clientX - r.left; ty = ev.clientY - r.top; });
        inp.addEventListener('focus', function () { glow.classList.add('on'); if (!jalan) { jalan = true; requestAnimationFrame(gerak); } });
        inp.addEventListener('blur', function () { glow.classList.remove('on'); jalan = false; });
      }
      U.$('#labBox', root).addEventListener('focusin', function () { U.$('#labBox', root).classList.add('fokus'); });
      U.$('#labBox', root).addEventListener('focusout', function () { U.$('#labBox', root).classList.remove('fokus'); });
      // ---- tombol atas ----
      U.$('#labKn', root).onclick = function () { F.daftarPengetahuan(); };
      const baru = U.$('#labBaru', root);
      if (baru) baru.onclick = async function () {
        if (!(await UI.confirm({ title: 'Mulai percakapan baru?', text: 'Riwayat chat di perangkat ini akan dihapus. Data keuangan tidak berubah.', ok: 'Mulai baru', icon: 'refresh', tone: 't-navy', btn: 'btn-navy' }))) return;
        C.baru(); App.render();
      };
      if (window.innerWidth > 767 && !chat().length) setTimeout(function () { inp.focus(); }, 300);
    }
  };

  // ============================================================
  // TOMBOL MELAYANG + PANEL — gaya "AI assistant"
  // ============================================================
  const W = window.AIW = { buka: false };
  W.sync = function () {
    const S = S_(); const app = document.getElementById('app');
    if (!S || !S.boot || !document.querySelector('.shell')) return;
    let el = document.getElementById('aiw');
    if (!el) { el = U.h(htmlWidget()); app.appendChild(el); pasang(el); }
    el.hidden = S.page === 'konsultan';
    document.documentElement.classList.toggle('hal-konsultan', S.page === 'konsultan');
    if (el.hidden && W.buka) tutup();
  };
  function htmlWidget() {
    return '<div id="aiw" class="aiw">' +
      '<button class="aiw-fab" id="aiwFab" aria-label="Tanya asisten AI" title="Tanya asisten AI">' + ic('sparkles') + '<span class="aiw-ring"></span></button>' +
      '<section class="aiw-panel" id="aiwPanel" role="dialog" aria-label="Asisten AI" hidden>' +
      '<header class="aiw-head"><div class="aiw-title">' + ic('sparkles', 'sm') + '<h2>Asisten SafeMoney</h2></div>' +
      '<button class="aiw-hb" id="aiwFull" title="Buka halaman Konsultan" aria-label="Buka halaman Konsultan">' + ic('external', 'sm') + '</button>' +
      '<button class="aiw-hb" id="aiwBaru" title="Percakapan baru" aria-label="Percakapan baru">' + ic('refresh', 'sm') + '</button>' +
      '<button class="aiw-hb" id="aiwX" title="Tutup" aria-label="Tutup">' + ic('x', 'sm') + '</button></header>' +
      '<div class="aiw-body" id="aiwBody"></div>' +
      '<form class="aiw-form" id="aiwForm"><div class="aiw-input"><input id="aiwIn" type="text" maxlength="4000" autocomplete="off" placeholder="Tulis pertanyaan…">' +
      '<button type="submit" id="aiwKirim" aria-label="Kirim">' + ic('send', 'sm') + '</button></div></form></section></div>';
  }
  function isiPanel() {
    const body = document.getElementById('aiwBody'); if (!body) return;
    const S = S_(), ai = S.boot.ai || {};
    if (!ai.adaKunci) {
      body.innerHTML = '<div class="aiw-kosong">' + ic('sparkles', 'xl') + '<h3>Asisten belum aktif</h3><p>Isi API key Gemini di Pengaturan → AI &amp; Jarvis.</p><button class="aiw-chip" id="aiwSet">Buka Pengaturan</button></div>';
      const b = document.getElementById('aiwSet'); if (b) b.onclick = function () { tutup(); S.setTab = 'ai'; App.go('pengaturan'); };
      return;
    }
    if (!chat().length && !C.menunggu) {
      body.innerHTML = '<div class="aiw-kosong">' + ic('sparkles', 'xl') + '<h3>Ada yang bisa saya bantu?</h3><p>Saya membaca saldo, anggaran, dan transaksi Anda. Tanyakan apa saja!</p>' +
        '<div class="aiw-chips">' + PERINTAH.filter(function (p) { return !p.aksi; }).map(function (p, i) { return '<button class="aiw-chip" data-wc="' + PERINTAH.indexOf(p) + '">' + e(p.label) + '</button>'; }).join('') + '</div></div>';
      U.$$('[data-wc]', body).forEach(function (x) {
        x.onclick = function () {
          const p = PERINTAH[Number(x.dataset.wc)], inp = document.getElementById('aiwIn');
          if (p.kirim) { C.kirim(p.teks); return; }
          inp.value = p.teks; inp.focus(); if (p.kursor) inp.setSelectionRange(p.kursor, p.kursor); tombolW();
        };
      });
      return;
    }
    body.innerHTML = '<div class="aiw-list">' + chat().map(pesanHTML).join('') + (C.menunggu ? '<div class="msg ai"><span class="av">' + ic('sparkles', 'sm') + '</span><div class="bub">' + titik + '</div></div>' : '') + '</div>';
    body.scrollTop = body.scrollHeight;
    bindUsulan(body);
  }
  function tombolW() {
    const inp = document.getElementById('aiwIn'), b = document.getElementById('aiwKirim'); if (!inp) return;
    b.disabled = !inp.value.trim() || C.menunggu;
    b.innerHTML = C.menunggu ? ic('loader', 'sm spin') : ic('send', 'sm');
  }
  function buka() {
    const p = document.getElementById('aiwPanel'); if (!p) return;
    W.buka = true; p.hidden = false; document.getElementById('aiw').classList.add('buka');
    isiPanel(); tombolW();
    if (window.innerWidth > 767) setTimeout(function () { const i = document.getElementById('aiwIn'); if (i) i.focus(); }, 120);
  }
  function tutup() {
    const p = document.getElementById('aiwPanel'); if (!p) return;
    W.buka = false; p.hidden = true; document.getElementById('aiw').classList.remove('buka');
  }
  function pasang(el) {
    U.$('#aiwFab', el).onclick = function () { if (W.buka) tutup(); else buka(); };
    U.$('#aiwX', el).onclick = tutup;
    U.$('#aiwFull', el).onclick = function () { tutup(); App.go('konsultan'); };
    U.$('#aiwBaru', el).onclick = async function () {
      if (!chat().length) return;
      if (!(await UI.confirm({ title: 'Mulai percakapan baru?', text: 'Riwayat chat di perangkat ini akan dihapus.', ok: 'Mulai baru', icon: 'refresh', tone: 't-navy', btn: 'btn-navy' }))) return;
      C.baru();
    };
    const inp = U.$('#aiwIn', el), form = U.$('#aiwForm', el);
    inp.oninput = tombolW;
    inp.onfocus = function () { form.classList.add('fokus'); }; inp.onblur = function () { form.classList.remove('fokus'); };
    form.onsubmit = function (ev) { ev.preventDefault(); const t = inp.value; if (!t.trim()) return; inp.value = ''; C.kirim(t); };
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && W.buka && !document.querySelector('.overlay')) tutup(); });
  }
  C.dengar.push(function () { if (W.buka) { isiPanel(); tombolW(); } });

  // ============================================================
  // BASIS PENGETAHUAN
  // ============================================================
  const F = window.Forms;
  function daftarKn() { const ai = S_().boot.ai || {}; return ai.pengetahuan || []; }
  function setDaftar(daftar) { const S = S_(); if (S.boot.ai) S.boot.ai.pengetahuan = daftar; U.store.set('sm_boot', S.boot); }

  F.daftarPengetahuan = function () {
    const m = UI.modal({
      title: 'Pengetahuan Konsultan', icon: 'book', tone: 't-gold', size: 'wide', sub: 'Prinsip & catatan Anda (mis. dari Obsidian) yang selalu dibaca konsultan',
      body: '<div id="knIsiDaftar"></div>',
      foot: '<button class="btn btn-sec" id="knUnggah">' + ic('upload', 'sm') + 'Unggah .md / .txt</button><button class="btn btn-gold" id="knBaru">' + ic('plus', 'sm') + 'Tulis catatan</button>' +
        '<input type="file" id="knFile" accept=".md,.txt,text/markdown,text/plain" multiple hidden>'
    });
    const gambar = function () {
      const list = daftarKn();
      let total = 0; list.forEach(function (k) { if (k.aktif) total += k.panjang; });
      m.$('#knIsiDaftar').innerHTML = (list.length ? list.map(function (k) {
        return '<div class="set-row kn-row"><label class="switch"><input type="checkbox" data-kn-on="' + k.id + '" ' + (k.aktif ? 'checked' : '') + '><span></span></label>' +
          '<div class="txt" style="min-width:0"><b class="ellipsis">' + e(k.judul) + '</b><small>' + U.fmtInput(k.panjang) + ' huruf</small></div>' +
          '<button class="btn btn-sm btn-ghost" data-kn-edit="' + k.id + '" aria-label="Ubah">' + ic('edit', 'sm') + '</button><button class="btn btn-sm btn-ghost" data-kn-del="' + k.id + '" aria-label="Hapus">' + ic('trash', 'sm') + '</button></div>';
      }).join('') : '<div class="note info">' + ic('info') + '<div>Belum ada catatan. Konsultan memakai pengetahuan keuangan umum. Unggah catatan Obsidian Anda (.md) atau tulis prinsip sendiri, misalnya "jajan maksimal 10% ihsan".</div></div>') +
        '<div class="small muted" style="margin:14px 0 6px">Catatan aktif: ' + U.fmtInput(total) + ' / ' + U.fmtInput(BATAS) + ' huruf</div>' + UI.bar(Math.min(100, total / BATAS * 100), total > BATAS ? 'coral' : 'violet') +
        (total > BATAS ? '<div class="small out" style="margin-top:6px">Melebihi batas — sebagian catatan terakhir tidak terbaca. Nonaktifkan yang kurang penting.</div>' : '');
      UI.animate(m.$('#knIsiDaftar'));
      m.$$('[data-kn-on]').forEach(function (cb) {
        cb.onchange = async function () {
          try { const r = await API.call('simpanPengetahuan', { id: cb.dataset.knOn, aktif: cb.checked }); setDaftar(r.daftar); gambar(); segarHalaman(); }
          catch (err) { cb.checked = !cb.checked; UI.toast(err.message, 'error'); }
        };
      });
      m.$$('[data-kn-edit]').forEach(function (x) { x.onclick = function () { F.pengetahuan(x.dataset.knEdit, gambar); }; });
      m.$$('[data-kn-del]').forEach(function (x) {
        x.onclick = async function () {
          const k = daftarKn().find(function (q) { return q.id === x.dataset.knDel; });
          if (!(await UI.confirm({ title: 'Hapus catatan?', text: k ? k.judul : '', ok: 'Hapus' }))) return;
          try { const r = await API.call('hapusPengetahuan', { id: x.dataset.knDel }); setDaftar(r.daftar); UI.toast('Catatan dihapus.'); gambar(); segarHalaman(); }
          catch (err) { UI.toast(err.message, 'error'); }
        };
      });
    };
    gambar();
    m.$('#knBaru').onclick = function () { F.pengetahuan(null, gambar); };
    const f = m.$('#knFile');
    m.$('#knUnggah').onclick = function () { f.click(); };
    f.onchange = async function () {
      const files = Array.prototype.slice.call(f.files || []); f.value = '';
      if (!files.length) return;
      let n = 0; UI.busy(m.$('#knUnggah'), true, 'Mengunggah…');
      for (const file of files) {
        try {
          let teks = await file.text();
          teks = teks.replace(/^﻿/, '').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim(); // buang properti (frontmatter) Obsidian
          const judul = file.name.replace(/\.(md|txt|markdown)$/i, '');
          const bagian = pecah(teks, 40000);
          for (let i = 0; i < bagian.length; i++) {
            const r = await API.call('simpanPengetahuan', { judul: bagian.length > 1 ? judul + ' (' + (i + 1) + '/' + bagian.length + ')' : judul, isi: bagian[i] });
            setDaftar(r.daftar); n++;
          }
        } catch (err) { UI.toast(file.name + ': ' + err.message, 'error'); }
      }
      UI.busy(m.$('#knUnggah'), false);
      if (n) UI.toast(n + ' catatan pengetahuan tersimpan.');
      gambar(); segarHalaman();
    };
  };
  function segarHalaman() { const b = document.querySelector('#labKn b'); if (b) b.textContent = daftarKn().filter(function (k) { return k.aktif; }).length; }

  function pecah(teks, maks) {
    if (teks.length <= maks) return [teks];
    const out = []; let sisa = teks;
    while (sisa.length > maks) {
      let cut = sisa.lastIndexOf('\n\n', maks); if (cut < maks * 0.5) cut = sisa.lastIndexOf('\n', maks); if (cut < maks * 0.5) cut = maks;
      out.push(sisa.slice(0, cut).trim()); sisa = sisa.slice(cut).trim();
    }
    if (sisa) out.push(sisa);
    return out;
  }

  F.pengetahuan = async function (id, selesai) {
    let data = { judul: '', isi: '', aktif: true };
    const m = UI.modal({
      title: id ? 'Ubah Catatan Pengetahuan' : 'Catatan Pengetahuan Baru', icon: 'book', tone: 't-gold', size: 'wide',
      sub: 'Tempel dari Obsidian atau tulis prinsip keuangan Anda',
      body: '<div id="knBody"><div class="skel" style="height:220px"></div></div>',
      foot: '<button class="btn btn-sec" data-close>Batal</button><button class="btn btn-gold" id="knSimpan" disabled>' + ic('save') + 'Simpan</button>'
    });
    if (id) {
      try { data = await API.call('detailPengetahuan', { id: id }); } catch (err) { m.$('#knBody').innerHTML = '<div class="note danger">' + e(err.message) + '</div>'; return; }
    }
    m.$('#knBody').innerHTML = '<div class="field" style="margin-top:0"><label class="label">Judul</label><input class="input" id="knJudul" maxlength="120" placeholder="Contoh: Prinsip sedekah & wakaf saya" value="' + e(data.judul) + '"></div>' +
      '<div class="field"><label class="label">Isi <span class="hint" id="knHit"></span></label><textarea class="input" id="knIsi" rows="12" style="height:auto;min-height:260px;padding:12px 14px;line-height:1.5" placeholder="Contoh:\n- Jajan maksimal 10% dari ihsan\n- Utamakan melunasi hutang sebelum wakaf besar\n- Dana darurat minimal 3x kebutuhan primer">' + e(data.isi) + '</textarea></div>' +
      '<div class="set-row"><div class="txt"><b>Aktif</b><small>Hanya catatan aktif yang dibaca konsultan</small></div><label class="switch"><input type="checkbox" id="knAktif" ' + (data.aktif ? 'checked' : '') + '><span></span></label></div>';
    const isi = m.$('#knIsi'), hit = m.$('#knHit'), sv = m.$('#knSimpan');
    const upd = function () { hit.textContent = U.fmtInput(isi.value.length) + ' / 45.000 huruf'; };
    isi.oninput = upd; upd(); sv.disabled = false;
    sv.onclick = async function () {
      const d = { id: id || undefined, judul: m.$('#knJudul').value.trim(), isi: isi.value, aktif: m.$('#knAktif').checked };
      if (!d.judul) return UI.toast('Isi judul.', 'error');
      if (!d.isi.trim()) return UI.toast('Isi catatan kosong.', 'error');
      UI.busy(sv, true);
      try { const r = await API.call('simpanPengetahuan', d); setDaftar(r.daftar); m.close(); UI.toast('Catatan tersimpan.'); if (selesai) selesai(); segarHalaman(); }
      catch (err) { UI.toast(err.message, 'error'); UI.busy(sv, false); }
    };
  };
})();
