/* =====================================================================
   api.js — komunikasi ke Google Apps Script (fetch POST text/plain)
   ===================================================================== */
(function () {
  const CFG = window.SAFEMONEY_CONFIG || {};
  const K_TOKEN = 'sm_token';
  const K_QUEUE = 'sm_queue';

  const API = {
    url: String(CFG.GAS_URL || '').trim(),
    onAuthLost: null,
    configured: function () { return /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec/.test(API.url) && !/XXXX/.test(API.url) || /^http:\/\/(localhost|127\.0\.0\.1)/.test(API.url); },

    // ---------- token sesi ----------
    getToken: function () {
      const s = U.session.get(K_TOKEN) || U.store.get(K_TOKEN);
      if (!s || !s.token) return null;
      if (s.exp && s.exp < Date.now()) { API.clearToken(); return null; }
      return s.token;
    },
    setToken: function (t) {
      API.clearToken();
      if (t.ingat) U.store.set(K_TOKEN, t); else U.session.set(K_TOKEN, t);
    },
    clearToken: function () { U.store.del(K_TOKEN); U.session.del(K_TOKEN); },

    /**
     * Panggil aksi backend. Mengembalikan `data` atau melempar Error dengan .code
     * ⚠️ Content-Type WAJIB text/plain agar tidak memicu CORS preflight yang diblok GAS.
     */
    call: async function (action, data, opt) {
      opt = opt || {};
      const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, opt.timeout || 60000);
      let res;
      try {
        const r = await fetch(API.url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: action, token: API.getToken(), data: data || {} }),
          signal: ctrl ? ctrl.signal : undefined,
          redirect: 'follow'
        });
        const teks = await r.text();
        try { res = JSON.parse(teks); } catch (e) {
          const err = new Error(/<html/i.test(teks) ? 'Backend mengembalikan halaman, bukan data. Pastikan Web App di-deploy dengan akses "Anyone".' : 'Respons server tidak valid.');
          err.code = 'BAD_RESPONSE'; throw err;
        }
      } catch (e) {
        if (e.code) throw e;
        const err = new Error(navigator.onLine === false ? 'Tidak ada koneksi internet.' : 'Gagal menghubungi server. Periksa koneksi lalu coba lagi.');
        err.code = 'NETWORK'; throw err;
      } finally { clearTimeout(timer); }
      if (!res.success) {
        const err = new Error(res.message || 'Terjadi kesalahan.');
        err.code = res.code || 'ERROR'; err.data = res.data;
        if (err.code === 'AUTH' && API.onAuthLost) API.onAuthLost();
        throw err;
      }
      return res.data;
    },

    // ---------- antrean offline untuk transaksi ----------
    queue: U.store.get(K_QUEUE, []),
    saveQueue: function () {
      const ringan = API.queue.map(function (q) { const c = Object.assign({}, q); if (c.payload && c.payload.bukti && c.payload.bukti.data && c.payload.bukti.data.length > 1500000) c.payload = Object.assign({}, c.payload, { bukti: null }); return c; });
      U.store.set(K_QUEUE, ringan);
    },
    enqueue: function (tmpId, payload) { API.queue.push({ tmpId: tmpId, payload: payload, t: Date.now() }); API.saveQueue(); },
    dequeue: function (tmpId) { API.queue = API.queue.filter(function (q) { return q.tmpId !== tmpId; }); API.saveQueue(); },
    flushing: false,
    flush: async function (onDone) {
      if (API.flushing || !API.queue.length || !API.getToken()) return 0;
      API.flushing = true; let n = 0;
      try {
        for (const q of API.queue.slice()) {
          try { await API.call('simpanTransaksi', q.payload); API.dequeue(q.tmpId); n++; }
          catch (e) { if (e.code === 'NETWORK') break; API.dequeue(q.tmpId); if (window.UI) UI.toast('Transaksi antrean gagal: ' + e.message, 'error'); }
        }
      } finally { API.flushing = false; }
      if (n && onDone) onDone(n);
      return n;
    }
  };
  window.API = API;
})();
