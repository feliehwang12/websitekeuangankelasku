# 💰 Keuangan Kelasku

Aplikasi web pengelolaan kas kelas secara digital — berjalan **lokal di browser**, tanpa perlu install apapun.

---

## 🚀 Cara Menjalankan

1. Buka folder `keuangan-kelasku`
2. Double-klik file **`index.html`** — browser akan membuka halaman login
3. Login dengan NIS demo:
   - **Bendahara:** NIS `9999`
   - **Siswa contoh:** NIS `0001` hingga `0015`

> ⚠️ Gunakan browser modern (Chrome, Edge, Firefox). Data disimpan di `localStorage` browser.

---

## 📁 Struktur Proyek

```
keuangan-kelasku/
├── index.html              ← Halaman login
├── css/
│   ├── style.css           ← Stylesheet utama (semua halaman)
│   └── login.css           ← Stylesheet khusus login
├── js/
│   ├── data.js             ← Modul data & localStorage (pengganti database)
│   ├── utils.js            ← Helper: format, toast, modal, guard
│   └── layout.js           ← Render sidebar & topbar
└── pages/
    ├── dashboard.html      ← Ringkasan & statistik
    ├── siswa.html          ← Data siswa (grid + tabel)
    ├── kas.html            ← Transaksi & iuran bulanan
    ├── kegiatan.html       ← Uang kegiatan & titipan
    └── laporan.html        ← Laporan, grafik, cetak
```

---

## ✅ Fitur

| Fitur | Siswa | Bendahara |
|-------|-------|-----------|
| Login dengan NIS | ✅ | ✅ |
| Dashboard saldo & statistik | ✅ | ✅ |
| Lihat data siswa | ✅ | ✅ |
| Tambah/edit/hapus siswa | ❌ | ✅ |
| Lihat transaksi kas | ✅ | ✅ |
| Tambah/edit/hapus transaksi | ❌ | ✅ |
| Toggle status iuran | ❌ | ✅ |
| Tambah bulan iuran baru | ❌ | ✅ |
| Lihat kegiatan & status bayar | ✅ | ✅ |
| Tambah/edit/hapus kegiatan | ❌ | ✅ |
| Toggle status bayar kegiatan | ❌ | ✅ |
| Laporan transaksi + saldo berjalan | ✅ | ✅ |
| Grafik pemasukan/pengeluaran | ✅ | ✅ |
| Cetak laporan (Ctrl+P) | ✅ | ✅ |
| Responsif (HP & laptop) | ✅ | ✅ |

---

## 🏗️ Arsitektur — Siap Integrasi AI

Data tersimpan di `js/data.js` dengan pola modular:

```
DB.getSiswa()         → ambil data siswa
DB.getTransaksi()     → ambil transaksi
DB.getSaldo()         → hitung saldo otomatis
DB.getIuran()         → rekap iuran
DB.getKegiatan()      → daftar kegiatan
```

Untuk integrasi AI di masa depan, cukup ganti implementasi fungsi di `data.js` agar memanggil API/backend — semua halaman tidak perlu diubah.

**Contoh titik integrasi AI yang potensial:**
- Analisis pengeluaran & saran anggaran
- Pengingat otomatis iuran yang belum lunas
- Ringkasan laporan keuangan dalam bahasa natural
- Deteksi anomali transaksi

---

## 🛠️ Teknologi

- **HTML5 / CSS3 / JavaScript** murni — zero dependency
- **localStorage** untuk penyimpanan data
- **Google Fonts (Inter)** untuk tipografi
- Desain: Hijau Emerald + Putih + Aksen Emas
