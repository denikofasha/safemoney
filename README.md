# SafeMoney

Aplikasi monitoring & manajemen keuangan pribadi untuk guru pengabdian: uang pribadi, dana anggaran pondok, dan dana terop. Periode bulanan mengikuti kalender Hijriah.

- **Frontend:** HTML/CSS/JS murni (tanpa framework, tanpa library grafik), di-hosting di GitHub Pages
- **Backend:** Google Apps Script sebagai REST API JSON, dengan basis data Google Sheets, bukti di Google Drive, dan notifikasi lewat Gmail
- **Keamanan:** PIN (hash + salt) dengan token sesi 30 hari; terkunci 15 menit setelah 5 kali salah

## Struktur
```
index.html          halaman utama (SPA)
manifest.json       agar bisa "Tambahkan ke layar utama"
css/style.css       desain Sovereign Glass (navy #003D79 · emas #FFB700)
js/config.js        ← ISI URL /exec Apps Script di sini
js/icons.js         ikon Lucide (ISC) yang di-embed
js/util.js          format Rupiah, kalender Hijriah, kompres foto
js/api.js           fetch ke GAS + antrean offline
js/ui.js            modal, toast, cincin progres, grafik SVG
js/forms.js         semua form & dialog
js/pages.js         tampilan tiap halaman
js/app.js           router, layar PIN, sinkronisasi
assets/             logo & ikon aplikasi
```

Panduan pemasangan lengkap ada di **PANDUAN-INSTALASI.md**.
