/* =====================================================================
   cocokkan.js — halaman "Cocokkan Saldo" (v1.5)
   Uang nyata vs catatan → cari letak selisih (aturan otomatis + AI), lalu
   perbaiki langsung ke catatan utama (pinjaman, transaksi, piutang, penyesuaian).
   ===================================================================== */
(function () {
  const ic = window.icon;
  const e = U.esc;
  const DOMPET = ['Pribadi', 'Pondok', 'Terop'];
  const PECAHAN = [100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100];

  function st() {
    if (!S.cocok) {
      // pulihkan isian yang belum selesai (tersimpan otomatis di perangkat ini)
      const dr = U.store.get(K_DRAF, null);
      S.cocok = { mode: 'dana', nyata: {}, gabungan: '', hasil: null, ai: null, kunci: '', sibuk: false, aiSibuk: false, rinci: {}, pecahan: {}, diubah: 0 };
      if (dr && typeof dr === 'object') ['mode', 'nyata', 'gabungan', 'rinci', 'pecahan', 'diubah'].forEach(function (k) { if (dr[k] !== undefined) S.cocok[k] = dr[k]; });
    }
    if (!S.cocok.rinci) S.cocok.rinci = {};
    if (!S.cocok.pecahan) S.cocok.pecahan = {};
    return S.cocok;
  }
  const K_DRAF = 'sm_cocok_draf';
  /** Simpan isian setiap kali berubah — tidak hilang walau aplikasi ditutup / dimuat ulang. */
  function simpanDraf(c) {
    c.diubah = Date.now();
    U.store.set(K_DRAF, { mode: c.mode, nyata: c.nyata, gabungan: c.gabungan, rinci: c.rinci, pecahan: c.pecahan, diubah: c.diubah });
  }
  function adaDraf(c) {
    return c.gabungan !== '' || Object.keys(c.nyata).some(function (k) { return c.nyata[k] !== '' && c.nyata[k] !== undefined; }) || Object.keys(c.pecahan || {}).length > 0;
  }
  function hapusDraf() { U.store.del(K_DRAF); }
  function kunciSaldo() { return JSON.stringify(S.boot.saldo) + '|' + JSON.stringify(S.boot.akun || {}) + '|' + JSON.stringify((S.boot.kelompokDana || []).map(function (k) { return k.saldo; })) + '|' + (S.boot.piutang || []).length + '|' + S.boot.pinjaman.length; }
  /** Baris utama: bila ATM sudah dipisah, Pribadi dicek per akun (Tunai & ATM). */
  function unitAktif() {
    return S.boot.akun && S.boot.akun.aktif ? ['Tunai', 'ATM', 'Pondok', 'Terop'] : DOMPET;
  }
  /** Anggaran pondok / kepanitiaan terop yang bisa dicek terpisah: kunci "Pondok|<id>". */
  function kelompokUnit(d) {
    return (S.boot.kelompokDana || []).filter(function (k) { return k.dompet === d && (k.status === 'Aktif' || k.saldo !== 0 || k.tanpa); })
      .filter(function (k) { return !k.tanpa || k.saldo !== 0; })
      .map(function (k) { return { key: d + '|' + (k.id || ''), nama: k.nama, saldo: k.saldo }; });
  }
  /** Semua kunci yang ikut dikirim (anggaran menggantikan total dompet bila dirinci). */
  function kunciDikirim(c) {
    const out = [];
    unitAktif().forEach(function (d) {
      if (c.rinci[d]) kelompokUnit(d).forEach(function (k) { out.push(k.key); });
      else out.push(d);
    });
    return out;
  }
  function labelKunci(k, h) {
    if (h && h.label && h.label[k]) return h.label[k];
    if (UNIT[k]) return UNIT[k].label;
    const p = String(k).split('|'), kel = (S.boot.kelompokDana || []).find(function (x) { return x.dompet === p[0] && (x.id || '') === p[1]; });
    return U.DOMPET_LABEL[p[0]] + ' › ' + (kel ? kel.nama : '?');
  }
  const UNIT = {
    Tunai: { label: 'Pribadi › Tunai', ik: 'wallet', tone: 't-navy' }, ATM: { label: 'Pribadi › ATM', ik: 'landmark', tone: 't-navy' },
    Pribadi: { label: 'Pribadi', ik: 'wallet', tone: 't-navy' }, Pondok: { label: 'Dana Pondok', ik: 'building', tone: 't-em' }, Terop: { label: 'Dana Terop', ik: 'tent', tone: 't-gold' }
  };
  function catatanUnit(k) {
    if (k === 'Tunai' || k === 'ATM') return (S.boot.akun || {})[k] || 0;
    if (String(k).indexOf('|') > 0) { const ku = kelompokUnit(k.split('|')[0]).find(function (x) { return x.key === k; }); return ku ? ku.saldo : 0; }
    return S.boot.saldo[k];
  }
  function payload(c) {
    if (c.mode === 'gabung') return { gabungan: U.parseNum(c.gabungan) };
    const n = {};
    kunciDikirim(c).forEach(function (d) { if (c.nyata[d] !== undefined && c.nyata[d] !== '') n[d] = U.parseNum(c.nyata[d]); });
    return { nyata: n };
  }
  function adaInput(c) {
    if (c.mode === 'gabung') return c.gabungan !== '';
    return kunciDikirim(c).some(function (d) { return c.nyata[d] !== undefined && c.nyata[d] !== ''; });
  }
  function barisInput(d, v, nama, catatan, sub) {
    return '<div class="ck-in"><div class="input-pre"><span>Rp</span><input class="input num" inputmode="numeric" data-nyata="' + e(d) + '" placeholder="kosong = tidak dicek" value="' + (v !== undefined && v !== '' ? U.fmtInput(v) : '') + '"></div>' +
      '<button class="btn btn-sm btn-ghost" data-pecahan="' + e(d) + '" title="Hitung per lembar">' + ic('banknote', 'sm') + '<span class="hide-m">Hitung</span></button>' +
      '<button class="btn btn-sm btn-ghost" data-sama="' + e(d) + '" title="Isi sama dengan catatan">=</button></div>';
  }
  function pillSelisih(s) {
    if (!s) return '<span class="pill p-aman">' + ic('checkCircle') + 'Cocok</span>';
    return s > 0 ? '<span class="pill p-info">' + ic('arrowDown') + 'Lebih ' + U.rp(s) + '</span>' : '<span class="pill p-lewat">' + ic('arrowUp') + 'Kurang ' + U.rp(-s) + '</span>';
  }
  function labelSkor(n) {
    return n >= 80 ? ['Sangat mungkin', 'p-lewat'] : n >= 50 ? ['Mungkin', 'p-hampir'] : ['Coba cek', 'p-mute'];
  }

  const Pages = window.Pages;
  Pages.cocokkan = {
    title: 'Cocokkan Saldo',
    render: function (S) {
      const b = S.boot, c = st();
      const cocok = b.cocok || { riwayat: [] };
      const terakhir = cocok.terakhir;
      const totalCatatan = DOMPET.reduce(function (s, d) { return s + b.saldo[d]; }, 0);
      const h = c.hasil;

      const inputDana = unitAktif().map(function (d) {
        const bisaRinci = (d === 'Pondok' || d === 'Terop') && kelompokUnit(d).length > 0;
        const tombolRinci = bisaRinci ? '<button class="link ck-rinci" data-rinci="' + d + '">' + ic(c.rinci[d] ? 'chevronDown' : 'chevronRight', 'sm') + (c.rinci[d] ? 'Gabungkan' : 'Rinci per ' + (d === 'Pondok' ? 'anggaran' : 'kepanitiaan')) + '</button>' : '';
        if (bisaRinci && c.rinci[d]) {
          const subs = kelompokUnit(d);
          let tot = 0, ada = false;
          subs.forEach(function (k) { const v = c.nyata[k.key]; if (v !== undefined && v !== '') { tot += U.parseNum(v); ada = true; } });
          return '<div class="ck-row ck-grup"><div class="ck-lbl"><span class="ic-tile ' + UNIT[d].tone + '">' + ic(UNIT[d].ik) + '</span>' +
            '<div><b>' + UNIT[d].label + '</b><small>Catatan: <span class="num">' + U.rp(catatanUnit(d)) + '</span>' + (ada ? ' · isian: <b class="num">' + U.rp(tot) + '</b>' : '') + '</small></div></div>' + tombolRinci + '</div>' +
            subs.map(function (k) {
              return '<div class="ck-row ck-sub"><div class="ck-lbl"><span class="ck-garis"></span><div><b>' + e(k.nama) + '</b><small>Catatan: <span class="num">' + U.rp(k.saldo) + '</span></small></div></div>' + barisInput(k.key, c.nyata[k.key]) + '</div>';
            }).join('');
        }
        return '<div class="ck-row"><div class="ck-lbl"><span class="ic-tile ' + UNIT[d].tone + '">' + ic(UNIT[d].ik) + '</span>' +
          '<div><b>' + UNIT[d].label + '</b><small>Catatan: <span class="num">' + U.rp(catatanUnit(d)) + '</span>' +
          (d === 'ATM' && S.boot.akun && S.boot.akun.minimum ? ' · min. mengendap ' + U.rpShort(S.boot.akun.minimum) : '') + '</small>' + tombolRinci + '</div></div>' +
          barisInput(d, c.nyata[d]) + '</div>';
      }).join('');

      const inputGabung = '<div class="ck-row"><div class="ck-lbl"><span class="ic-tile t-navy">' + ic('wallet') + '</span><div><b>Total semua uang</b><small>Catatan gabungan: <span class="num">' + U.rp(totalCatatan) + '</span></small></div></div>' +
        '<div class="ck-in"><div class="input-pre"><span>Rp</span><input class="input num" inputmode="numeric" id="ckGabung" placeholder="0" value="' + (c.gabungan !== '' ? U.fmtInput(c.gabungan) : '') + '"></div>' +
        '<button class="btn btn-sm btn-ghost" data-pecahan="__gabung" title="Hitung per lembar">' + ic('banknote', 'sm') + '<span class="hide-m">Hitung</span></button></div></div>' +
        '<div class="note info" style="margin-top:12px">' + ic('info') + '<div>Mode tercampur hanya tahu totalnya, jadi tidak bisa menunjukkan dana mana yang terpakai. Bila bisa, pisahkan uang per dana untuk hasil yang lebih tajam.</div></div>';

      let hasil = '';
      if (c.sibuk && !h) hasil = '<div class="card" style="margin-top:22px"><div class="skel" style="height:140px"></div></div>';
      if (h) {
        const baris = h.gabungan
          ? '<div class="ck-sum-row"><b>Semua dana</b><span class="num">' + U.rp(h.nyata.gabungan) + '</span><span class="num muted">' + U.rp(totalCatatan) + '</span>' + pillSelisih(h.totalSelisih) + '</div>'
          : h.dicek.map(function (d) {
            return '<div class="ck-sum-row"><b>' + e(labelKunci(d, h)) + '</b><span class="num">' + U.rp(h.nyata[d]) + '</span><span class="num muted">' + U.rp(h.catatan[d]) + '</span>' + pillSelisih(h.selisih[d]) + '</div>';
          }).join('');
        hasil = '<div class="card ck-hasil' + (h.cocok ? ' ok' : '') + '" style="margin-top:22px"><div class="card-head">' + ic(h.cocok ? 'checkCircle' : 'scale') + '<h3>' + (h.cocok ? 'Alhamdulillah, semuanya cocok' : 'Hasil pencocokan') + '</h3>' + (c.sibuk ? '<span class="small muted" style="margin-left:auto">' + ic('loader', 'sm spin') + ' menghitung ulang…</span>' : '') + '</div>' +
          '<div class="ck-sum"><div class="ck-sum-row head"><span>Dana</span><span>Uang nyata</span><span>Catatan</span><span>Selisih</span></div>' + baris + '</div>' +
          (h.cocok
            ? '<div class="note ok" style="margin-top:14px">' + ic('trophy') + '<div style="flex:1">Uang yang Anda pegang sama persis dengan catatan. Simpan hasil ini sebagai patokan pencocokan berikutnya.</div></div>' +
              '<div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn btn-gold" data-act="simpan-cocok">' + ic('save') + 'Simpan hasil</button></div>'
            : '<div class="small muted" style="margin-top:10px">Memeriksa ' + h.jumlahTrx + ' transaksi sejak ' + U.masehi(h.sejak) + '. <b>Lebih</b> = uang nyata lebih banyak dari catatan; <b>kurang</b> = lebih sedikit.</div>') +
          '</div>';
        if (!h.cocok) {
          hasil += '<div class="row" style="margin:26px 0 12px"><h3 style="margin:0;font-size:19px">Kemungkinan penyebab</h3><span class="pill p-info">' + h.temuan.length + ' temuan</span></div>' +
            '<div class="ck-list">' + h.temuan.map(function (t, i) { return kartuTemuan(t, 'r' + i); }).join('') + '</div>' +
            kartuAI(c, b) +
            '<div class="card" style="margin-top:22px"><div class="card-head">' + ic('flag') + '<h3>Selesaikan</h3></div>' +
            '<p class="muted" style="margin-top:0">Perbaiki dulu lewat tombol di setiap temuan — hasil dihitung ulang otomatis. Bila sisa selisih tetap tidak ketemu, sesuaikan catatan agar sama dengan uang nyata (tidak memengaruhi pos anggaran).</p>' +
            '<div class="field"><label class="label">Catatan pencocokan <span class="hint">opsional</span></label><input class="input" id="ckCatatan" maxlength="300" placeholder="Contoh: sisa 7rb kemungkinan parkir & receh"></div>' +
            (h.gabungan ? '<div class="field"><label class="label">Selisih disesuaikan ke dana</label><select class="select" id="ckDompetSes">' + unitAktif().map(function (d) { return '<option value="' + d + '">' + UNIT[d].label + '</option>'; }).join('') + '</select></div>' : '') +
            '<div class="row btn-row" style="justify-content:flex-end;gap:10px;margin-top:14px;flex-wrap:wrap"><button class="btn btn-sec" data-act="simpan-belum">' + ic('save') + 'Simpan, belum cocok</button>' +
            '<button class="btn btn-navy" data-act="sesuaikan">' + ic('scale') + 'Sesuaikan &amp; simpan</button></div></div>';
        }
      }

      const riwayat = cocok.riwayat || [];
      return '<div class="page-head"><div><span class="eyebrow">Evaluasi keuangan</span><h1>Cocokkan Saldo</h1>' +
        '<p>Hitung uang yang benar-benar Anda pegang, lalu SafeMoney mencari di mana selisihnya: lupa catat, salah dompet, dobel, salah ketik, atau dana yang terpakai untuk dana lain.</p></div></div>' +
        (terakhir ? '<div class="note ' + (terakhir.status === 'Belum cocok' ? 'warn' : 'info') + '" style="margin-bottom:18px">' + ic('history') + '<div>Terakhir dicocokkan <b>' + U.masehi(terakhir.tanggal) + '</b> (' + U.diffDays(terakhir.tanggal, b.hariIni) + ' hari lalu) — ' + e(terakhir.status) + (terakhir.selisih ? ', selisih ' + U.rp(terakhir.selisih) : '') + '.</div></div>' : '') +
        '<div class="card"><div class="card-head">' + ic('banknote') + '<div><h3>1. Hitung uang nyata</h3><div class="small muted">Isi dana yang ingin dicek saja. Uang ATM ikut dihitung ke Pribadi.</div></div></div>' +
        '<div class="seg" id="ckMode" style="margin-bottom:14px"><button data-m="dana" class="' + (c.mode === 'dana' ? 'on in-on' : '') + '">' + ic('grid', 'sm') + 'Per dana</button><button data-m="gabung" class="' + (c.mode === 'gabung' ? 'on in-on' : '') + '">' + ic('wallet', 'sm') + 'Tercampur (total saja)</button></div>' +
        (c.mode === 'gabung' ? inputGabung : inputDana) +
        '<div class="row wrap" style="gap:10px;margin-top:16px">' +
        (adaDraf(c) ? '<span class="small muted">' + ic('save', 'sm') + ' Isian tersimpan otomatis di perangkat ini' + (c.diubah ? ' · ' + new Date(c.diubah).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '') + '</span>' +
          '<button class="link" data-act="kosongkan" style="font-size:13px">' + ic('trash', 'sm') + 'Kosongkan</button>' : '') +
        '<button class="btn btn-gold" style="margin-left:auto" data-act="cek" ' + (c.sibuk ? 'disabled' : '') + '>' + ic(c.sibuk ? 'loader' : 'scale', c.sibuk ? 'spin' : '') + 'Cocokkan</button></div></div>' +
        hasil +
        (riwayat.length ? '<details style="margin-top:26px"' + (h ? '' : ' open') + '><summary class="link" style="cursor:pointer">Riwayat pencocokan (' + riwayat.length + ')</summary><div class="card solid" style="margin-top:12px">' + riwayat.map(function (r) {
          const tone = r.status === 'Cocok' ? 'p-aman' : r.status === 'Disesuaikan' ? 'p-info' : 'p-hampir';
          return '<div class="set-row"><span class="ic-tile t-navy">' + ic('scale') + '</span><div class="txt"><b>' + U.masehi(r.tanggal) + ' · ' + e(r.waktu || '') + '</b><small>' + e(ringkasRiwayat(r)) + '</small></div><span class="pill ' + tone + '">' + e(r.status) + '</span>' +
            '<button class="btn btn-sm btn-sec" data-pakai="' + e(r.id) + '" title="Isi ulang angka uang nyata dari pencocokan ini">' + ic('refresh', 'sm') + '<span class="hide-m">Pakai lagi</span></button></div>';
        }).join('') + '</div></details>' : '');
    },
    mount: function (root, S) {
      const c = st();
      U.$$('#ckMode [data-m]', root).forEach(function (x) { x.onclick = function () { if (c.mode === x.dataset.m) return; c.mode = x.dataset.m; c.hasil = null; c.ai = null; simpanDraf(c); App.render(); }; });
      U.$$('[data-nyata]', root).forEach(function (inp) {
        inp.addEventListener('input', function () { const n = U.parseNum(inp.value); inp.value = inp.value.trim() === '' ? '' : U.fmtInput(n) || '0'; c.nyata[inp.dataset.nyata] = inp.value === '' ? '' : n; simpanDraf(c); });
      });
      const g = U.$('#ckGabung', root);
      if (g) g.addEventListener('input', function () { const n = U.parseNum(g.value); g.value = g.value.trim() === '' ? '' : U.fmtInput(n) || '0'; c.gabungan = g.value === '' ? '' : n; simpanDraf(c); });
      U.$$('[data-sama]', root).forEach(function (x) { x.onclick = function () { c.nyata[x.dataset.sama] = catatanUnit(x.dataset.sama); simpanDraf(c); App.render(); }; });
      U.$$('[data-rinci]', root).forEach(function (x) { x.onclick = function () { const d = x.dataset.rinci; c.rinci[d] = !c.rinci[d]; c.hasil = null; simpanDraf(c); App.render(); }; });
      U.$$('[data-pecahan]', root).forEach(function (x) {
        x.onclick = function () {
          const k = x.dataset.pecahan;
          hitungPecahan(k === '__gabung' ? 'Total semua uang' : labelKunci(k), c.pecahan[k], function (isi) {
            c.pecahan[k] = isi; simpanDraf(c); // hitungan per lembar ikut tersimpan walau belum dipakai
          }, function (tot) {
            if (k === '__gabung') c.gabungan = tot; else c.nyata[k] = tot;
            simpanDraf(c); App.render();
          });
        };
      });
      const ks = root.querySelector('[data-act="kosongkan"]');
      if (ks) ks.onclick = async function () {
        if (!(await UI.confirm({ title: 'Kosongkan isian?', text: 'Semua angka uang nyata dan hitungan per lembar di halaman ini dihapus. Riwayat yang sudah disimpan tidak terpengaruh.', ok: 'Kosongkan', icon: 'trash' }))) return;
        hapusDraf(); S.cocok = null; App.render();
      };
      U.$$('[data-pakai]', root).forEach(function (x) {
        x.onclick = async function () {
          const r = ((S.boot.cocok || {}).riwayat || []).find(function (z) { return z.id === x.dataset.pakai; });
          if (!r) return;
          if (adaDraf(c) && !(await UI.confirm({ title: 'Ganti isian sekarang?', text: 'Isian yang sedang terisi akan diganti dengan angka dari pencocokan ' + U.masehi(r.tanggal) + ' ' + (r.waktu || '') + '.', ok: 'Ganti', icon: 'refresh', tone: 't-navy', btn: 'btn-navy' }))) return;
          const n = r.nyata || {};
          c.hasil = null; c.ai = null; c.pecahan = {};
          if (n.gabungan !== undefined) { c.mode = 'gabung'; c.gabungan = n.gabungan; c.nyata = {}; }
          else {
            c.mode = 'dana'; c.gabungan = ''; c.nyata = Object.assign({}, n); c.rinci = {};
            Object.keys(n).forEach(function (k) { if (k.indexOf('|') > 0) c.rinci[k.split('|')[0]] = true; });
          }
          simpanDraf(c); App.render(); window.scrollTo({ top: 0, behavior: 'smooth' });
          UI.toast('Angka dari ' + U.masehi(r.tanggal) + ' dimuat. Tekan Cocokkan untuk menghitung ulang.', 'info', 4500);
        };
      });
      const cek = root.querySelector('[data-act="cek"]');
      if (cek) cek.onclick = function () {
        if (!adaInput(c)) return UI.toast('Isi jumlah uang nyata minimal satu dana.', 'error');
        c.ai = null; analisis(true);
      };
      // tombol aksi temuan (aturan otomatis & AI)
      U.$$('[data-aksi]', root).forEach(function (x) {
        x.onclick = function () {
          const sumber = x.dataset.aksi.charAt(0) === 'a' ? (c.ai && c.ai.dugaan) : (c.hasil && c.hasil.temuan);
          const p = x.dataset.aksi.slice(1).split('-');
          const t = sumber && sumber[Number(p[0])];
          if (t) jalankanAksi(t.aksi[Number(p[1])], t);
        };
      });
      U.$$('[data-trx-lihat]', root).forEach(function (x) {
        x.onclick = function () {
          const semua = [].concat((c.hasil && c.hasil.temuan) || [], (c.ai && c.ai.dugaan) || []);
          let t = null;
          semua.some(function (tm) { t = (tm.terkait || []).find(function (z) { return z.id === x.dataset.trxLihat; }); return !!t; });
          if (t) Forms.detailTransaksi(t);
        };
      });
      const ai = root.querySelector('[data-act="ai"]'); if (ai) ai.onclick = mintaAI;
      const sc = root.querySelector('[data-act="simpan-cocok"]'); if (sc) sc.onclick = function () { simpan(this, false); };
      const sb = root.querySelector('[data-act="simpan-belum"]'); if (sb) sb.onclick = function () { simpan(this, false); };
      const ss = root.querySelector('[data-act="sesuaikan"]');
      if (ss) ss.onclick = async function () {
        const h = c.hasil;
        const rinci = h.gabungan ? U.rp(Math.abs(h.totalSelisih)) : h.dicek.filter(function (d) { return h.selisih[d]; }).map(function (d) { return ((h.label && h.label[d]) || d) + ' ' + (h.selisih[d] > 0 ? '+' : '−') + U.rp(Math.abs(h.selisih[d])); }).join(', ');
        const ok = await UI.confirm({ title: 'Sesuaikan catatan?', icon: 'scale', tone: 't-navy', btn: 'btn-navy', ok: 'Sesuaikan',
          html: 'Akan dibuat catatan <b>Penyesuaian (selisih kas)</b>: ' + e(rinci) + '. Saldo jadi sama dengan uang nyata. Pos anggaran tidak berubah. Catatan ini bisa dihapus dari riwayat transaksi bila keliru.' });
        if (ok) simpan(this, true);
      };
      // hasil lama tetapi data sudah berubah (mis. setelah memperbaiki temuan) → hitung ulang otomatis
      const pending = S.boot.transaksi.some(function (t) { return t._pending; });
      if (c.hasil && c.kunci !== kunciSaldo() && !c.sibuk && !pending) analisis(false);
    }
  };

  /** "Pribadi +30.000 · Pondok −30.000" dari data nyata vs catatan yang tersimpan. */
  function ringkasRiwayat(r) {
    const n = r.nyata || {}, c = r.catatan || {};
    let teks;
    if (n.gabungan !== undefined) teks = 'Gabungan ' + (r.selisih ? (r.selisih > 0 ? '+' : '−') + U.rp(Math.abs(r.selisih)) : 'cocok');
    else teks = Object.keys(n).map(function (d) {
      const s = n[d] - (c[d] || 0);
      return labelKunci(d) + ' ' + (s ? (s > 0 ? '+' : '−') + U.rp(Math.abs(s)) : 'cocok');
    }).join(' · ');
    return teks + (r.ket ? ' — ' + r.ket : '');
  }

  function kartuTemuan(t, kode) {
    const sk = labelSkor(t.skor);
    return '<div class="card ck-temuan"><div class="row" style="gap:12px;align-items:flex-start"><span class="ic-tile ' + (t.skor >= 80 ? 't-coral' : t.skor >= 50 ? 't-gold' : 't-navy') + '">' + ic(ikonTemuan(t)) + '</span>' +
      '<div style="flex:1;min-width:0"><span class="pill ' + sk[1] + '" style="margin-bottom:6px">' + sk[0] + '</span><b class="ck-judul">' + e(t.judul) + '</b><div class="small muted" style="margin-top:4px">' + e(t.penjelasan || '') + '</div></div></div>' +
      (t.terkait && t.terkait.length ? '<div class="ck-terkait">' + t.terkait.map(function (z) {
        return '<button class="ck-trx" data-trx-lihat="' + e(z.id) + '"><span>' + U.masehiPendek(z.tanggal) + ' · ' + e(U.DOMPET_LABEL[z.dompet]) + '</span><b>' + e(z.ket) + '</b><span class="num ' + (z.jenis === 'Pemasukan' ? 'in' : 'out') + '">' + (z.jenis === 'Pemasukan' ? '+' : '−') + U.rp(z.nominal) + '</span></button>';
      }).join('') + '</div>' : '') +
      (t.aksi && t.aksi.length ? '<div class="row" style="gap:8px;margin-top:12px;flex-wrap:wrap">' + t.aksi.map(function (a, j) {
        return '<button class="btn btn-sm ' + (j === 0 ? 'btn-gold' : 'btn-sec') + '" data-aksi="' + kode.charAt(0) + kode.slice(1) + '-' + j + '">' + ic(ikonAksi(a.tipe), 'sm') + e(a.label || a.tipe) + '</button>';
      }).join('') + '</div>' : '') + '</div>';
  }
  function ikonTemuan(t) {
    return { pindahAkun: 'landmark', pindahDana: 'swap', salahDompet: 'swap', dobel: 'copy', salahKetik: 'edit', piutangKembali: 'handCoins', pinjamanKembali: 'banknote',
      lupaMasuk: 'arrowDown', lupaKeluar: 'arrowUp', rutin: 'history', hariKosong: 'calendar', kecil: 'coins', hutangBaru: 'user', hutangDibayar: 'user' }[t.tipe] || 'sparkles';
  }
  function ikonAksi(tp) {
    return { pindahKelompok: 'swap', pindahUang: 'swap', pinjam: 'swap',
 pindah: 'swap', hapus: 'trash', ubahNominal: 'edit', transaksi: 'plus', terimaPiutang: 'arrowDown', bayarPinjaman: 'banknote',
      bayarHutang: 'banknote', hutang: 'user', penyesuaian: 'scale' }[tp] || 'check';
  }

  function kartuAI(c, b) {
    const ai = b.ai || {};
    const aktif = ai.adaDeepseek || ai.adaKunci;
    const nama = ai.adaDeepseek ? 'DeepSeek' : 'Gemini';
    let isi;
    if (!aktif) isi = '<div class="note warn">' + ic('alert') + '<div style="flex:1">Analisis AI belum aktif. Isi API key DeepSeek atau Gemini di <b>Pengaturan → AI &amp; Jarvis</b>.</div><button class="btn btn-sm btn-sec" data-go-set>Buka</button></div>';
    else if (c.aiSibuk) isi = '<div class="row" style="gap:10px">' + ic('loader', 'spin') + '<span class="muted">' + nama + ' sedang menelusuri transaksi…</span></div>';
    else if (c.ai) {
      isi = (c.ai.ringkasan ? '<p style="margin:0 0 12px"><b>' + e(c.ai.ringkasan) + '</b></p>' : '') +
        (c.ai.dugaan.length ? '<div class="ck-list">' + c.ai.dugaan.map(function (t, i) { return kartuTemuan(t, 'a' + i); }).join('') + '</div>' : '<div class="small muted">AI tidak menemukan dugaan tambahan.</div>') +
        (c.ai.pertanyaan && c.ai.pertanyaan.length ? '<div class="note info" style="margin-top:12px">' + ic('info') + '<div><b>Coba ingat-ingat:</b><ul style="margin:6px 0 0;padding-left:18px">' + c.ai.pertanyaan.map(function (q) { return '<li>' + e(q) + '</li>'; }).join('') + '</ul></div></div>' : '') +
        '<div class="small muted" style="margin-top:10px">Dianalisis oleh ' + e(c.ai.penyedia || '') + ' (' + e(c.ai.model || '') + ')' + (c.ai.cadangan ? ' — penyedia utama sedang sibuk' : '') + '. Periksa sebelum menerapkan.</div>' +
        (c.ai.kunci !== kunciSaldo() ? '<div class="note warn" style="margin-top:10px">' + ic('history') + '<div style="flex:1">Catatan sudah berubah sejak analisis ini.</div><button class="btn btn-sm btn-sec" data-act="ai">' + ic('refresh', 'sm') + 'Analisis ulang</button></div>' : '');
    } else isi = '<p class="muted" style="margin:0 0 12px">Belum ketemu di temuan otomatis? Minta ' + nama + ' menelusuri pola transaksi. Hanya ringkasan transaksi sejak pencocokan terakhir yang dikirim agar hemat token.</p>' +
      '<button class="btn btn-navy" data-act="ai">' + ic('sparkles') + 'Analisis dengan ' + nama + '</button>';
    return '<div class="card ck-ai" style="margin-top:22px"><div class="card-head"><span class="ic-tile t-violet">' + ic('sparkles') + '</span><div><h3>Bantuan AI</h3><div class="small muted">Menebak penyebab selisih dari pola transaksi</div></div></div>' + isi + '</div>';
  }

  async function analisis(tampilkanSibuk) {
    const c = st();
    c.sibuk = true;
    const kunci = kunciSaldo(); // patokan data saat permintaan dikirim
    if (tampilkanSibuk) App.render();
    try {
      c.hasil = await API.call('analisisSaldo', payload(c));
      c.kunci = kunci;
    } catch (err) { UI.toast(err.message, 'error'); }
    c.sibuk = false;
    if (S.page === 'cocokkan') { App.render(); const r = document.querySelector('.ck-hasil'); if (r && tampilkanSibuk) r.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }

  async function mintaAI() {
    const c = st();
    c.aiSibuk = true; App.render();
    try { const k = kunciSaldo(); c.ai = await API.call('analisisSaldoAI', payload(c), { timeout: 90000 }); c.ai.kunci = k; }
    catch (err) { UI.toast(err.message, 'error', 6000); }
    c.aiSibuk = false;
    if (S.page === 'cocokkan') App.render();
  }

  async function simpan(btn, sesuaikan) {
    const c = st();
    const d = payload(c);
    d.sesuaikan = sesuaikan;
    const cat = document.getElementById('ckCatatan'); d.catatan = cat ? cat.value.trim() : '';
    const dp = document.getElementById('ckDompetSes'); if (dp) d.dompetPenyesuaian = dp.value;
    UI.busy(btn, true, 'Menyimpan…');
    try {
      const r = await API.call('simpanCocok', d);
      UI.toast(r.status === 'Cocok' ? 'Pencocokan tersimpan. Alhamdulillah cocok!' : r.status === 'Disesuaikan' ? 'Catatan disesuaikan & tersimpan.' : 'Pencocokan disimpan (belum cocok).');
      if (r.status === 'Cocok') UI.confetti();
      S.cocok = null; hapusDraf(); // isian baru dikosongkan setelah benar-benar tersimpan
      await App.refresh(true);
    } catch (err) { UI.toast(err.message, 'error'); UI.busy(btn, false); }
  }

  /** Jalankan tombol perbaikan → membuka form yang sudah terisi, atau langsung menyimpan. */
  async function jalankanAksi(a, t) {
    if (!a) return;
    const b = S.boot;
    const trx = function (id) { return (t.terkait || []).find(function (z) { return z.id === id; }); };
    switch (a.tipe) {
      case 'pinjam':
        return Forms.pinjam({ dari: a.dari, ke: a.ke, kelompokDari: a.kelompokDari, kelompokKe: a.kelompokKe, nominal: a.nominal, alasan: 'Hasil cocokkan saldo: uang ' + U.DOMPET_LABEL[a.dari] + ' terpakai untuk ' + U.DOMPET_LABEL[a.ke] });
      case 'pindahUang':
        return Forms.pindahUang({ dari: a.dari, nominal: a.nominal });
      case 'pindah': {
        const z = trx(a.idTrx); if (!z) return;
        if (z.dompet === a.ke && a.ke === 'Pribadi') return Forms.transaksi(Object.assign({}, z, { akun: a.akun || 'Tunai' })); // hanya ganti akun Tunai/ATM
        if (z.dompet === a.ke) return Forms.transaksi(Object.assign({}, z, { idKelompok: a.idKelompok || '' })); // hanya ganti anggaran/kepanitiaan
        UI.toast('Pilih pos/kategori untuk ' + U.DOMPET_LABEL[a.ke] + ', lalu simpan.', 'info', 4000);
        return Forms.transaksi(Object.assign({}, z, { dompet: a.ke, akun: a.akun || '', kategori: '', idKelompok: '', sumber: z.jenis === 'Pemasukan' ? z.sumber : '' }));
      }
      case 'ubahNominal': {
        const z = trx(a.idTrx); if (!z) return;
        return Forms.transaksi(Object.assign({}, z, { nominal: a.nominalBaru }));
      }
      case 'hapus': {
        const z = trx(a.idTrx);
        const ok = await UI.confirm({ title: 'Hapus catatan ini?', text: z ? z.ket + ' · ' + U.rp(z.nominal) + ' (' + U.masehi(z.tanggal) + ')' : a.idTrx, ok: 'Hapus', icon: 'trash' });
        if (!ok) return;
        try { await API.call('hapusTransaksi', { id: a.idTrx }); UI.toast('Catatan kembar dihapus.'); await App.refresh(true); } catch (err) { UI.toast(err.message, 'error'); }
        return;
      }
      case 'transaksi':
        return Forms.transaksi({ jenis: a.jenis, dompet: a.dompet, akun: a.akun || undefined, idKelompok: a.idKelompok || '', nominal: a.nominal, kategori: a.kategori || '', subkategori: a.subkategori || '', keterangan: a.keterangan || '', tanggal: a.tanggal });
      case 'terimaPiutang': {
        const x = (b.piutang || []).find(function (p) { return p.id === a.id; }); if (!x) return;
        return Forms.terimaPiutang(x, a.nominal);
      }
      case 'bayarPinjaman': {
        const p = b.pinjaman.find(function (q) { return q.id === a.id; }); if (!p) return;
        return Forms.bayarPinjaman(p, a.nominal >= p.sisa);
      }
      case 'bayarHutang': {
        const h = b.hutang.find(function (q) { return q.id === a.id; }); if (!h) return;
        return Forms.bayarHutang(h);
      }
      case 'hutang':
        return Forms.hutang({ nominal: a.nominal, akun: a.akun || undefined });
      case 'penyesuaian': {
        const n = Math.round(a.nominal);
        if (!n) return;
        const nm = a.idKelompok ? labelKunci(a.dompet + '|' + a.idKelompok) : U.DOMPET_LABEL[a.dompet] + (a.akun ? ' › ' + a.akun : '');
        const ok = await UI.confirm({ title: 'Sesuaikan ' + nm + '?', icon: 'scale', tone: 't-navy', btn: 'btn-navy', ok: 'Sesuaikan',
          html: 'Catatan ' + e(nm) + ' akan ' + (n > 0 ? 'ditambah' : 'dikurangi') + ' <b>' + U.rp(Math.abs(n)) + '</b> sebagai selisih kas (tidak memengaruhi pos anggaran).' });
        if (!ok) return;
        try { await API.call('sesuaikanSaldo', { dompet: a.dompet, akun: a.akun || '', idKelompok: a.idKelompok || '', nominal: n, catatan: t.judul }); UI.toast('Disesuaikan.'); await App.refresh(true); } catch (err) { UI.toast(err.message, 'error'); }

        return;
      }
    }
  }

  /** Kalkulator pecahan uang: isi jumlah lembar/koin → total. */
  function hitungPecahan(judul, awal, onUbah, cb) {
    awal = awal || {};
    const m = UI.modal({
      title: 'Hitung Uang', icon: 'banknote', tone: 't-gold', sub: e(judul),
      body: '<div class="pecahan">' + PECAHAN.map(function (p) {
        return '<label class="pc-row"><span class="num">' + U.rp(p) + '</span><span class="muted">×</span><input class="input num" inputmode="numeric" data-pc="' + p + '" placeholder="0" value="' + (awal[p] || '') + '"><b class="num" data-pcs="' + p + '">Rp 0</b></label>';
      }).join('') + '<label class="pc-row"><span>Lainnya / ATM</span><span></span><input class="input num" inputmode="numeric" id="pcLain" placeholder="Rp 0" value="' + (awal.lain ? 'Rp ' + U.fmtInput(awal.lain) : '') + '"><b></b></label></div>' +
        '<div class="pc-total"><span>Total</span><b class="num" id="pcTot">Rp 0</b></div>',
      foot: '<button class="btn btn-sec" data-close>Batal</button><button class="btn btn-gold" id="pcPakai">' + ic('check') + 'Pakai total</button>'
    });
    let total = 0;
    function hitung() {
      total = 0;
      m.$$('[data-pc]').forEach(function (inp) {
        const n = U.parseNum(inp.value), sub = n * Number(inp.dataset.pc);
        m.$('[data-pcs="' + inp.dataset.pc + '"]').textContent = U.rp(sub); total += sub;
      });
      const l = m.$('#pcLain'); const nl = U.parseNum(l.value); total += nl;
      m.$('#pcTot').textContent = U.rp(total);
    }
    function catat() {
      const isi = {};
      m.$$('[data-pc]').forEach(function (inp) { const n = U.parseNum(inp.value); if (n) isi[inp.dataset.pc] = n; });
      const nl = U.parseNum(m.$('#pcLain').value); if (nl) isi.lain = nl;
      if (onUbah) onUbah(isi);
    }
    m.$$('[data-pc]').forEach(function (inp) { inp.addEventListener('input', function () { inp.value = String(U.parseNum(inp.value) || ''); hitung(); catat(); }); });
    const l = m.$('#pcLain'); l.addEventListener('input', function () { const n = U.parseNum(l.value); l.value = n ? 'Rp ' + U.fmtInput(n) : ''; hitung(); catat(); });
    hitung();

    m.$('#pcPakai').onclick = function () { m.close(); cb(total); };
  }

  // tautan "Buka" pengaturan AI di kartu AI
  document.addEventListener('click', function (ev) {
    if (ev.target.closest && ev.target.closest('[data-go-set]')) { S.setTab = 'ai'; App.go('pengaturan'); }
  });
})();
