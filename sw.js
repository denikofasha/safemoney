/* =====================================================================
   sw.js — service worker SafeMoney (PWA)
   - Berkas aplikasi (HTML/CSS/JS/ikon): ambil dari internet dulu, simpan salinannya;
     bila offline, pakai salinan terakhir → aplikasi tetap bisa dibuka tanpa sinyal.
   - Data keuangan (Google Apps Script) TIDAK pernah disimpan di sini: selalu langsung ke server.
   ===================================================================== */
const CACHE = 'safemoney-app-v1';
const INTI = ['./', './index.html', './manifest.json', './assets/app-icon-192.png', './assets/app-icon-512.png', './assets/logo-mark.png', './assets/favicon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(INTI); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;                       // POST ke backend tidak disentuh
  const url = new URL(req.url);
  const sendiri = url.origin === self.location.origin;
  const font = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sendiri && !font) return;                           // script.google.com dll. langsung ke internet

  if (font) {                                              // font jarang berubah → simpanan dulu
    e.respondWith(caches.match(req).then(function (r) {
      return r || fetch(req).then(function (res) { const c = res.clone(); caches.open(CACHE).then(function (k) { k.put(req, c); }); return res; });
    }));
    return;
  }
  // berkas aplikasi → internet dulu (selalu versi terbaru), simpanan bila offline
  e.respondWith(fetch(req).then(function (res) {
    if (res && res.ok) { const c = res.clone(); caches.open(CACHE).then(function (k) { k.put(req, c); }); }
    return res;
  }).catch(function () {
    return caches.match(req).then(function (r) {
      return r || caches.match(req, { ignoreSearch: true }).then(function (r2) {
        return r2 || (req.mode === 'navigate' ? caches.match('./index.html') : undefined);
      });
    });
  }));
});
