# Panduan Instalasi SafeMoney (v1.1)

Aplikasi SafeMoney terdiri dari dua bagian. Keduanya dipasang terpisah:

| Bagian | Isi | Dipasang di |
|---|---|---|
| **Backend** | `Kode.gs` (dan opsional `appsscript.json`) | Google Apps Script — akun Google Anda |
| **Frontend** | Isi folder `safemoney` (file `index.html`, folder `css/`, `js/`, `assets/`) | GitHub Pages |

Urutannya penting: **pasang backend dulu**, karena frontend butuh alamat (URL) backend.

---

## BAGIAN A — Backend (Google Apps Script)

### A1. Buat proyek
1. Buka **https://script.google.com** dengan akun Gmail Anda, lalu klik **Proyek baru**.
2. Klik nama "Untitled project" di kiri atas dan ganti menjadi **SafeMoney**.
3. Di file `Code.gs`, hapus semua isinya, lalu tempel **seluruh isi `Kode.gs`**. Tekan **Ctrl+S**.
4. *(Opsional, tapi disarankan)* Buka ⚙️ **Project Settings**, lalu atur **Time zone** ke **(GMT+07:00) Jakarta**.

### A2. Jalankan setup (SEKALI SAJA)
1. Di bilah atas editor, pilih fungsi **`setupAppEnvironment`**, lalu klik **▶ Run**.
2. Google akan meminta izin. Klik **Review permissions**, pilih akun Anda, lalu **Advanced → Go to SafeMoney (unsafe) → Allow**.
   > Tulisan "unsafe" muncul karena skrip ini buatan Anda sendiri dan belum diverifikasi Google. Ini normal.
3. Tunggu sampai **Execution log** menampilkan **✅ SETUP SELESAI**.
4. Cek Google Drive Anda. Sekarang ada folder **SafeMoney** yang berisi:
   - Spreadsheet **SafeMoney_DB**, dengan sheet Pengaturan, Periode, Anggaran, Transaksi, dan seterusnya
   - Folder **Bukti_Pribadi**, **Bukti_Pondok**, **Bukti_Terop**, dan **Laporan_PDF**

⚠️ **Jangan jalankan `setupAppEnvironment` dua kali.** Kalau tidak sengaja dijalankan lagi, skrip akan menolak dan tidak membuat data ganda.

### A3. Deploy sebagai Web App
1. Klik **Deploy → New deployment**.
2. Klik ikon ⚙️ di sebelah "Select type", lalu pilih **Web app**.
3. Isi pengaturannya:
   - **Description:** SafeMoney v1
   - **Execute as:** **Me**
   - **Who has access:** **Anyone**
4. Klik **Deploy**, lalu **salin Web app URL** (berakhiran `/exec`).

> **Kenapa "Anyone"?** Supaya aplikasi bisa dibuka dari GitHub Pages tanpa login Google. Data Anda tetap aman: setiap permintaan wajib membawa token dari **PIN**, dan PIN salah 5 kali berturut-turut membuat login terkunci 15 menit.

### A4. Uji cepat
Tempel URL `/exec` di browser. Jika muncul tulisan seperti `{"success":true,"data":{"app":"SafeMoney",...,"siap":true}}`, backend sudah siap.

---

## BAGIAN B — Frontend (GitHub Pages)

### B1. Isi alamat backend
1. Ekstrak ZIP **safemoney.zip**. Hasilnya folder `safemoney`.
2. Buka `safemoney/js/config.js` dengan Notepad.
3. Ganti `https://script.google.com/macros/s/XXXX/exec` dengan URL `/exec` dari langkah A3.
4. Simpan.

### B2. Upload ke GitHub (lewat terminal, BUKAN tombol "Upload files")

> Folder yang di-`git init` adalah **folder `safemoney`**, yaitu folder yang langsung berisi `index.html`. Jangan folder di atasnya.

Ringkasannya (detail langkah demi langkah akan dipandu di percakapan):

```bash
cd "C:\lokasi\safemoney"        # folder yang berisi index.html
dir                             # pastikan index.html, css, js, assets terlihat
git init
git add .
git commit -m "Upload pertama SafeMoney"
git branch -M main
git remote add origin https://github.com/USERNAME/safemoney.git
git push -u origin main         # password = Personal Access Token
```

### B3. Aktifkan GitHub Pages
Buka repo di github.com → **Settings → Pages**. Isi:

- **Source:** Deploy from a branch
- **Branch:** `main` · `/ (root)`
- Centang **Enforce HTTPS**

Klik **Save**. Tunggu 1–2 menit sampai muncul tulisan *"Your site is live at https://USERNAME.github.io/safemoney/"*.

---

## BAGIAN C — Pertama kali dibuka

1. Buka alamat GitHub Pages Anda. Layar **Buat PIN Baru** muncul.
2. Buat PIN 4–6 digit, lalu ulangi sekali lagi.
3. Selesai. Di HP, buka menu browser lalu pilih **"Tambahkan ke layar utama"** agar SafeMoney tampil seperti aplikasi.
4. Disarankan: buka **Pengaturan → Umum**, lalu isi **perkiraan uang ihsan per bulan**. Setelah itu buka **Pengaturan → Notifikasi** dan klik **Tes**.

---

## Perawatan

| Kebutuhan | Caranya |
|---|---|
| **Lupa PIN** | Di Apps Script, pilih fungsi `resetPin` lalu klik ▶ Run. Buka aplikasi dan buat PIN baru. Data tidak hilang. |
| **Update kode backend** | Tempel kode baru, lalu **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. URL `/exec` tetap sama. |
| **Update frontend** | Dari folder `safemoney`, jalankan `git add .`, lalu `git commit -m "update"`, lalu `git push`. Setelah itu tekan **Ctrl+Shift+R** di browser. |
| **Trigger pengingat harian** | Dipasang otomatis oleh setup (±06.00 WIB). Kalau terhapus, jalankan fungsi `pasangTrigger`. |
| **Koreksi awal bulan Hijriah** | Di aplikasi, buka **Pengaturan → Kalender Hijriah**, lalu tekan −1 / +1 hari. |
| **Cadangan data** | Spreadsheet **SafeMoney_DB** bisa disalin kapan saja: File → Make a copy. |

## Memperbarui dari v1.0 ke v1.1

Isi v1.1: Anggaran Pondok, Kepanitiaan Dana Terop, evaluasi bulan lalu, dan perbaikan menu bawah di HP.

1. **Backend:** di Apps Script, ganti seluruh isi `Code.gs` dengan `Kode.gs` versi baru, lalu **Ctrl+S**. Setelah itu buka **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. URL `/exec` tetap sama.
   - Tidak perlu menjalankan setup lagi. Saat aplikasi dibuka, sheet **Kelompok_Dana** dan kolom **id_kelompok** dibuat otomatis. Data lama tetap aman dan masuk kelompok "Tanpa anggaran/kepanitiaan".
2. **Frontend:** ekstrak `safemoney-update-v1.1.zip` lalu **timpa** ke folder `safemoney` Anda. ZIP ini sengaja tidak berisi `js/config.js`, jadi URL backend Anda tidak berubah. Kemudian jalankan:
   ```
   git add .
   git commit -m "Update v1.1"
   git push
   ```
3. Buka aplikasi di HP, lalu tarik ke bawah untuk muat ulang atau buka di tab baru.

## Masalah umum

| Gejala | Solusi |
|---|---|
| Muncul layar "Backend belum terhubung" | `js/config.js` belum diisi URL `/exec`, atau URL salah ketik |
| "Backend mengembalikan halaman, bukan data" | Deployment belum diatur **Who has access: Anyone** |
| "Backend belum di-setup" | Fungsi `setupAppEnvironment` belum dijalankan |
| Halaman GitHub 404 | `index.html` tidak berada di root repo. Folder yang di-push salah. |
| Tampilan polos tanpa warna | Folder `css/` atau `js/` tidak ikut ter-upload. Gunakan terminal, bukan Upload files. |
| Perubahan kode backend tidak berefek | Lupa membuat **New version** saat deploy ulang |
