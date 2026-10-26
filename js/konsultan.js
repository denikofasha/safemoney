/* =====================================================================
   konsultan.js — Konsultan Keuangan AI (chat) + Basis Pengetahuan
   ===================================================================== */
(function () {
  const ic = window.icon, e = U.esc;
  const K_CHAT = 'sm_chat';
  const MAKS_PESAN = 40;
  const BATAS = 60000;

  const SARAN = [
    { t: 'Evaluasi belanja saya bulan ini', kirim: true },
    { t: 'Cek kesehatan keuangan saya secara keseluruhan', kirim: true },
    { t: 'Sarankan pembagian anggaran untuk bulan depan', kirim: true },
    { t: 'Bagaimana jika saya wakaf Rp  bulan ini?', kirim: false, kursor: 29 }
  ];

  function muatChat() { const c = U.store.get(K_CHAT, []); return Array.isArray(c) ? c : []; }
  function simpanChat(S) { S.chat = S.chat.slice(-MAKS_PESAN); U.store.set(K_CHAT, S.chat); }

  /** Markdown ringan → HTML aman (teks di-escape dulu). */
  function md(s) {
    const inline = function (t) {
      return t.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[\s(])\*(\S[^*]*?)\*(?=[\s).,!?:;]|$)/g, '$1<i>$2</i>');
    };
    let html = '', list = null;
    String(s || '').split('\n').forEach(function (raw) {
      const l = e(raw);
      const li = l.match(/^\s*(?:[-•*]|(\d+)[.)])\s+(.*)$/);
      if (li) {
        const tag = li[1] ? 'ol' : 'ul';
        if (list !== tag) { if (list) html += '</' + list + '>'; html += '<' + tag + '>'; list = tag; }
        html += '<li>' + inline(li[2]) + '</li>';
        return;
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
      return '<div class="us-row"><span>' + e(U.POS_SINGKAT[k]) + '</span><span class="num muted">' + a + '%</span><span class="arrow-col">' + ic('arrowRight', 'sm') + '</span>' +
        '<b class="num ' + (d > 0 ? 'naik' : d < 0 ? 'turun' : '') + '">' + b + '%</b><span class="num small ' + (d > 0 ? 'naik' : d < 0 ? 'turun' : 'muted') + '">' + (d ? (d > 0 ? '+' : '') + d : '·') + '</span></div>';
    }).join('');
    const status = m.status === 'diterapkan' ? '<span class="pill p-aman">' + ic('checkCircle', 'sm') + 'Diterapkan</span>'
      : m.status === 'ditolak' ? '<span class="pill p-mute">Ditolak</span>'
        : '<button class="btn btn-sm btn-sec" data-tolak="' + i + '">Tolak</button><button class="btn btn-sm btn-gold" data-terapkan="' + i + '">' + ic('wand', 'sm') + 'Terapkan</button>';
    return '<div class="usulan"><div class="row wrap" style="gap:8px"><b>' + ic('pie', 'sm') + ' Usulan anggaran</b><span class="pill p-info">berlaku ' + (u.berlaku === 'berikutnya' ? 'bulan depan' : 'bulan ini') + '</span></div>' +
      '<div class="us-grid">' + baris + '</div>' + (u.alasan ? '<div class="small muted" style="margin-top:8px">' + e(u.alasan) + '</div>' : '') +
      '<div class="row" style="justify-content:flex-end;gap:8px;margin-top:10px">' + status + '</div></div>';
  }

  function bubble(m, i) {
    if (m.peran === 'user') return '<div class="msg me"><div class="bub">' + e(m.teks).replace(/\n/g, '<br>') + '</div></div>';
    return '<div class="msg ai"><span class="av">' + ic('sparkles', 'sm') + '</span><div class="bub">' + md(m.teks) + kartuUsulan(m, i) +
      (m.catatanUsulan ? '<div class="small muted" style="margin-top:6px">' + e(m.catatanUsulan) + '</div>' : '') +
      (m.dibaca ? '<div class="meta">' + ic('info', 'sm') + 'Membaca ' + m.dibaca.transaksi + ' transaksi ' + e(m.dibaca.periode) + (m.dibaca.pengetahuan && m.dibaca.pengetahuan.length ? ' · ' + m.dibaca.pengetahuan.length + ' catatan pengetahuan' : '') + '</div>' : '') +
      '</div></div>';
  }

  function isiChat(S) {
    if (!S.chat.length && !S.konsul.menunggu) {
      return '<div class="chat-kosong"><span class="ic-tile t-violet" style="width:54px;height:54px">' + ic('sparkles', 'lg') + '</span>' +
        '<h3>Assalamu\'alaikum' + (S.boot.pengaturan.nama_pemilik ? ', ' + e(String(S.boot.pengaturan.nama_pemilik).split(' ')[0]) : '') + '</h3>' +
        '<p class="muted">Saya membaca saldo, anggaran 5 pos, target, hutang, dan riwayat transaksi Anda. Tanyakan apa saja, misalnya rencana wakaf, evaluasi belanja, atau pembagian anggaran.</p></div>';
    }
    return S.chat.map(bubble).join('') + (S.konsul.menunggu ? '<div class="msg ai"><span class="av">' + ic('sparkles', 'sm') + '</span><div class="bub typing"><i></i><i></i><i></i><span class="small muted">Menganalisis data Anda…</span></div></div>' : '');
  }

  function kartuPengetahuan(S) {
    const ai = S.boot.ai || {};
    const list = ai.pengetahuan || [];
    let total = 0; list.forEach(function (k) { if (k.aktif) total += k.panjang; });
    return '<div class="card"><div class="card-head"><span class="ic-tile t-gold">' + ic('book') + '</span><div><h3>Pengetahuan Konsultan</h3><div class="small muted">Prinsip & catatan Anda (mis. dari Obsidian)</div></div></div>' +
      (list.length ? list.map(function (k) {
        return '<div class="set-row kn-row"><label class="switch"><input type="checkbox" data-kn-on="' + k.id + '" ' + (k.aktif ? 'checked' : '') + '><span></span></label>' +
          '<div class="txt" style="min-width:0"><b class="ellipsis">' + e(k.judul) + '</b><small>' + U.fmtInput(k.panjang) + ' huruf</small></div>' +
          '<button class="btn btn-sm btn-ghost" data-kn-edit="' + k.id + '" aria-label="Ubah">' + ic('edit', 'sm') + '</button><button class="btn btn-sm btn-ghost" data-kn-del="' + k.id + '" aria-label="Hapus">' + ic('trash', 'sm') + '</button></div>';
      }).join('') : '<div class="small muted" style="margin-bottom:10px">Belum ada catatan. Konsultan memakai pengetahuan keuangan umum.</div>') +
      '<div class="small muted" style="margin:10px 0 6px">Dipakai ' + U.fmtInput(total) + ' / ' + U.fmtInput(BATAS) + ' huruf</div>' + UI.bar(Math.min(100, total / BATAS * 100), total > BATAS ? 'coral' : 'violet') +
      (total > BATAS ? '<div class="small out" style="margin-top:6px">Melebihi batas — sebagian catatan terakhir tidak terbaca. Nonaktifkan yang kurang penting.</div>' : '') +
      '<div class="row btn-row" style="gap:8px;margin-top:14px"><button class="btn btn-sm btn-sec" id="knUnggah">' + ic('upload', 'sm') + 'Unggah .md / .txt</button><button class="btn btn-sm btn-gold" id="knBaru">' + ic('plus', 'sm') + 'Tulis catatan</button>' +
      '<input type="file" id="knFile" accept=".md,.txt,text/markdown,text/plain" multiple hidden></div></div>';
  }

  Pages.konsultan = {
    title: 'Konsultan AI',
    render: function (S) {
      S.chat = S.chat || muatChat();
      S.konsul = S.konsul || { menunggu: false, draft: '' };
      const ai = S.boot.ai || {};
      if (!ai.adaKunci) {
        return '<div class="page-head"><div><h1>Konsultan Keuangan AI</h1><p>Teman diskusi keuangan yang membaca data SafeMoney Anda.</p></div></div>' +
          '<div class="card">' + UI.empty('sparkles', 'Konsultan belum aktif', 'Isi API key Gemini terlebih dahulu di Pengaturan → AI & Jarvis.', '<button class="btn btn-gold" style="margin-top:12px" data-go-ai>' + ic('settings') + 'Buka Pengaturan</button>') + '</div>';
      }
      return '<div class="page-head"><div><h1>Konsultan Keuangan AI</h1><p>Tanya, minta evaluasi, atau minta usulan anggaran. Konsultan selalu membaca data terbaru; perubahan anggaran hanya terjadi bila Anda menekan <b>Terapkan</b>.</p></div></div>' +
        '<div class="grid g-12" style="align-items:start">' +
        '<div class="card solid span-8 chat-card"><div class="card-head"><span class="ic-tile t-violet">' + ic('sparkles') + '</span><div><h3>Konsultasi</h3><div class="small muted">Model ' + e(ai.modelKonsultan || '') + '</div></div>' +
        '<button class="btn btn-sm btn-ghost" style="margin-left:auto" id="kBaruChat">' + ic('refresh', 'sm') + '<span class="hide-m">Percakapan baru</span></button></div>' +
        '<div class="chat" id="chat">' + isiChat(S) + '</div>' +
        '<div class="chips saran-chips" id="kSaran">' + SARAN.map(function (x, i) { return '<button class="chip" data-saran="' + i + '">' + e(x.t.replace('Rp  ', 'Rp … ')) + '</button>'; }).join('') + '</div>' +
        '<div class="composer"><textarea class="input" id="kInput" rows="1" maxlength="4000" placeholder="Tulis pertanyaan… (Enter untuk kirim)">' + e(S.konsul.draft || '') + '</textarea>' +
        '<button class="btn btn-navy" id="kKirim" aria-label="Kirim"' + (S.konsul.menunggu ? ' disabled' : '') + '>' + ic('send') + '</button></div>' +
        '<div class="small muted" style="margin-top:8px">Saran AI bersifat masukan, bukan fatwa atau nasihat profesional. Untuk hukum fikih, tanyakan kepada ustadz.</div></div>' +
        '<div class="span-4 stack">' + kartuPengetahuan(S) +
        '<div class="card"><div class="card-head"><span class="ic-tile t-navy">' + ic('shield') + '</span><h3>Yang dibaca konsultan</h3></div>' +
        '<div class="small" style="display:grid;gap:8px">' +
        '<div>' + ic('wallet', 'sm') + ' Saldo 3 dompet, anggaran 5 pos, sedekah minimal</div>' +
        '<div>' + ic('list', 'sm') + ' Transaksi bulan ini + pengeluaran bulan lalu</div>' +
        '<div>' + ic('history', 'sm') + ' Ringkasan 4 bulan Hijriah sebelumnya</div>' +
        '<div>' + ic('flag', 'sm') + ' Target, pinjaman antar dana, hutang</div>' +
        '<div class="muted">Riwayat chat tersimpan di perangkat ini saja.</div></div></div>' +
        '</div></div>';
    },
    mount: function (root, S) {
      const goAi = root.querySelector('[data-go-ai]');
      if (goAi) { goAi.onclick = function () { S.setTab = 'ai'; App.go('pengaturan'); }; return; }
      const chat = U.$('#chat', root), inp = U.$('#kInput', root), btn = U.$('#kKirim', root);
      const keBawah = function () { chat.scrollTop = chat.scrollHeight; };
      keBawah();
      const tinggi = function () { inp.style.height = 'auto'; inp.style.height = Math.min(160, inp.scrollHeight) + 'px'; };
      tinggi();
      inp.oninput = function () { S.konsul.draft = inp.value; tinggi(); };
      inp.onkeydown = function (ev) { if (ev.key === 'Enter' && !ev.shiftKey && window.innerWidth > 767) { ev.preventDefault(); kirim(); } };
      btn.onclick = kirim;
      U.$$('[data-saran]', root).forEach(function (c) {
        c.onclick = function () {
          const x = SARAN[Number(c.dataset.saran)];
          if (x.kirim) { inp.value = x.t; kirim(); return; }
          inp.value = x.t; S.konsul.draft = x.t; inp.focus(); inp.setSelectionRange(x.kursor, x.kursor); tinggi();
        };
      });
      U.$('#kBaruChat', root).onclick = async function () {
        if (!S.chat.length) return;
        if (!(await UI.confirm({ title: 'Mulai percakapan baru?', text: 'Riwayat chat di perangkat ini akan dihapus. Data keuangan tidak berubah.', ok: 'Mulai baru', icon: 'refresh', tone: 't-navy', btn: 'btn-navy' }))) return;
        S.chat = []; simpanChat(S); App.render();
      };
      bindUsulan(root, S);
      bindPengetahuan(root, S);

      async function kirim() {
        const teks = inp.value.trim();
        if (!teks || S.konsul.menunggu) return;
        const riwayat = S.chat.slice(-12).map(function (m) { return { peran: m.peran, teks: m.teks }; });
        S.chat.push({ peran: 'user', teks: teks, t: Date.now() });
        S.konsul.menunggu = true; S.konsul.draft = '';
        simpanChat(S); segarkan();
        try {
          const r = await API.call('konsultasi', { pesan: teks, riwayat: riwayat }, { timeout: 150000 });
          S.chat.push({ peran: 'ai', teks: r.jawaban, usulan: r.usulan, catatanUsulan: r.catatanUsulan, dibaca: r.dibaca, t: Date.now() });
        } catch (err) {
          S.chat.push({ peran: 'ai', teks: '⚠️ ' + err.message, gagal: true, t: Date.now() });
        } finally {
          S.konsul.menunggu = false; simpanChat(S);
          if (S.page === 'konsultan') segarkan();
        }
      }
      function segarkan() {
        const c = document.getElementById('chat'); if (!c) return;
        c.innerHTML = isiChat(S); c.scrollTop = c.scrollHeight;
        const i2 = document.getElementById('kInput'); if (i2 && !S.konsul.draft) { i2.value = ''; i2.style.height = 'auto'; }
        const b2 = document.getElementById('kKirim'); if (b2) b2.disabled = S.konsul.menunggu;
        bindUsulan(document.getElementById('content'), S);
      }
    }
  };

  function bindUsulan(root, S) {
    U.$$('[data-tolak]', root).forEach(function (x) {
      x.onclick = function () { S.chat[Number(x.dataset.tolak)].status = 'ditolak'; simpanChat(S); App.render(); };
    });
    U.$$('[data-terapkan]', root).forEach(function (x) {
      x.onclick = async function () {
        const m = S.chat[Number(x.dataset.terapkan)], u = m.usulan;
        const ok = await UI.confirm({
          title: 'Terapkan usulan anggaran?', icon: 'wand', tone: 't-gold', btn: 'btn-gold', ok: 'Ya, terapkan',
          html: U.POS.map(function (k) { return e(U.POS_SINGKAT[k]) + ' <b>' + u.persen[k] + '%</b>'; }).join(' · ') + '<br><span class="small">Berlaku ' + (u.berlaku === 'berikutnya' ? 'mulai bulan Hijriah berikutnya' : 'untuk bulan ini') + '.</span>'
        });
        if (!ok) return;
        UI.busy(x, true, 'Menyimpan…');
        try {
          await API.call('simpanAnggaran', { periode: S.boot.periodeIni, persen: u.persen, mulai: u.berlaku === 'berikutnya' ? 'berikutnya' : undefined });
          m.status = 'diterapkan'; simpanChat(S);
          UI.toast('Anggaran diperbarui sesuai usulan.');
          await App.refresh(true);
        } catch (err) { UI.toast(err.message, 'error'); UI.busy(x, false); }
      };
    });
  }

  // ---------------- basis pengetahuan ----------------
  function setDaftar(S, daftar) { if (S.boot.ai) S.boot.ai.pengetahuan = daftar; U.store.set('sm_boot', S.boot); }

  function bindPengetahuan(root, S) {
    const baru = U.$('#knBaru', root); if (!baru) return;
    baru.onclick = function () { F.pengetahuan(); };
    const f = U.$('#knFile', root);
    U.$('#knUnggah', root).onclick = function () { f.click(); };
    f.onchange = async function () {
      const files = Array.prototype.slice.call(f.files || []); f.value = '';
      if (!files.length) return;
      let n = 0;
      UI.toast('Mengunggah ' + files.length + ' catatan…', 'info');
      for (const file of files) {
        try {
          let teks = await file.text();
          teks = teks.replace(/^﻿/, '').replace(/^---\n[\s\S]*?\n---\n?/, '').trim(); // buang frontmatter Obsidian
          const judul = file.name.replace(/\.(md|txt|markdown)$/i, '');
          const bagian = pecah(teks, 40000);
          for (let i = 0; i < bagian.length; i++) {
            const r = await API.call('simpanPengetahuan', { judul: bagian.length > 1 ? judul + ' (' + (i + 1) + '/' + bagian.length + ')' : judul, isi: bagian[i] });
            setDaftar(S, r.daftar); n++;
          }
        } catch (err) { UI.toast(file.name + ': ' + err.message, 'error'); }
      }
      if (n) UI.toast(n + ' catatan pengetahuan tersimpan.');
      App.render();
    };
    U.$$('[data-kn-on]', root).forEach(function (cb) {
      cb.onchange = async function () {
        try { const r = await API.call('simpanPengetahuan', { id: cb.dataset.knOn, aktif: cb.checked }); setDaftar(S, r.daftar); App.render(); }
        catch (err) { cb.checked = !cb.checked; UI.toast(err.message, 'error'); }
      };
    });
    U.$$('[data-kn-edit]', root).forEach(function (x) { x.onclick = function () { F.pengetahuan(x.dataset.knEdit); }; });
    U.$$('[data-kn-del]', root).forEach(function (x) {
      x.onclick = async function () {
        const k = (S.boot.ai.pengetahuan || []).find(function (q) { return q.id === x.dataset.knDel; });
        if (!(await UI.confirm({ title: 'Hapus catatan?', text: k ? k.judul : '', ok: 'Hapus' }))) return;
        try { const r = await API.call('hapusPengetahuan', { id: x.dataset.knDel }); setDaftar(S, r.daftar); UI.toast('Catatan dihapus.'); App.render(); }
        catch (err) { UI.toast(err.message, 'error'); }
      };
    });
  }

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

  const F = window.Forms;
  F.pengetahuan = async function (id) {
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
      try { const r = await API.call('simpanPengetahuan', d); setDaftar(S, r.daftar); m.close(); UI.toast('Catatan tersimpan.'); App.render(); }
      catch (err) { UI.toast(err.message, 'error'); UI.busy(sv, false); }
    };
  };
})();
