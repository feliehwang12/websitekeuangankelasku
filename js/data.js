/**
 * data.js — Keuangan Kelasku
 * Modul data terpusat menggunakan localStorage.
 * Arsitektur ini dirancang agar mudah diganti dengan API/backend di masa depan.
 */

const DB = {
  // ── Keys localStorage ──────────────────────────────────────
  KEYS: {
    SISWA:     'kk_siswa',
    TRANSAKSI: 'kk_transaksi',
    IURAN:     'kk_iuran',        // rekap iuran per siswa per bulan
    KEGIATAN:  'kk_kegiatan',     // daftar kegiatan/titipan
    KG_BAYAR:  'kk_kg_bayar',     // status bayar per siswa per kegiatan
    SESI:      'kk_sesi',
  },

  // ── Utilitas ───────────────────────────────────────────────
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  },
  getObj(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; }
    catch { return {}; }
  },
  set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  },
  genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  },
  now() {
    return new Date().toISOString();
  },

  // ── Seed data awal (demo) ──────────────────────────────────
  seed() {
    if (this.get(this.KEYS.SISWA).length > 0) return; // sudah pernah di-seed

    const siswa = [
      { id: 's001', nis: '0001', nama: 'Ahmad Fauzi',        role: 'siswa',     aktif: true },
      { id: 's002', nis: '0002', nama: 'Bunga Citra Lestari', role: 'siswa',    aktif: true },
      { id: 's003', nis: '0003', nama: 'Cahya Ramadhan',     role: 'siswa',     aktif: true },
      { id: 's004', nis: '0004', nama: 'Dewi Sartika',       role: 'siswa',     aktif: true },
      { id: 's005', nis: '0005', nama: 'Eko Prasetyo',       role: 'siswa',     aktif: true },
      { id: 's006', nis: '0006', nama: 'Fitri Handayani',    role: 'siswa',     aktif: true },
      { id: 's007', nis: '0007', nama: 'Gilang Saputra',     role: 'siswa',     aktif: true },
      { id: 's008', nis: '0008', nama: 'Hana Pertiwi',       role: 'siswa',     aktif: true },
      { id: 's009', nis: '0009', nama: 'Ilham Maulana',      role: 'siswa',     aktif: true },
      { id: 's010', nis: '0010', nama: 'Juwita Sari',        role: 'siswa',     aktif: true },
      { id: 's011', nis: '0011', nama: 'Kevin Pratama',      role: 'siswa',     aktif: true },
      { id: 's012', nis: '0012', nama: 'Laila Nurhasanah',   role: 'siswa',     aktif: true },
      { id: 's013', nis: '0013', nama: 'Muhammad Rizky',     role: 'siswa',     aktif: true },
      { id: 's014', nis: '0014', nama: 'Nadia Putri',        role: 'siswa',     aktif: true },
      { id: 's015', nis: '0015', nama: 'Oki Setiawan',       role: 'siswa',     aktif: true },
      { id: 'b001', nis: '9999', nama: 'Siti Rahayu',        role: 'bendahara', aktif: true },
    ];

    const bulan = ['2025-01','2025-02','2025-03','2025-04','2025-05'];
    const iuranData = [];
    siswa.filter(s => s.role === 'siswa').forEach(s => {
      bulan.forEach(bln => {
        iuranData.push({
          id: this.genId(),
          siswaId: s.id,
          bulan: bln,
          nominal: 10000,
          status: Math.random() > 0.3 ? 'lunas' : 'belum',
          tglBayar: Math.random() > 0.3 ? `${bln}-05` : null,
        });
      });
    });

    const transaksi = [
      { id: this.genId(), tgl: '2025-01-05', jenis: 'masuk',  kategori: 'iuran',       keterangan: 'Iuran Januari',     nominal: 150000, createdBy: 'b001' },
      { id: this.genId(), tgl: '2025-01-10', jenis: 'keluar', kategori: 'kebersihan',  keterangan: 'Beli alat kebersihan', nominal: 45000, createdBy: 'b001' },
      { id: this.genId(), tgl: '2025-02-05', jenis: 'masuk',  kategori: 'iuran',       keterangan: 'Iuran Februari',    nominal: 140000, createdBy: 'b001' },
      { id: this.genId(), tgl: '2025-02-20', jenis: 'keluar', kategori: 'dekorasi',    keterangan: 'Dekorasi kelas',    nominal: 60000,  createdBy: 'b001' },
      { id: this.genId(), tgl: '2025-03-05', jenis: 'masuk',  kategori: 'iuran',       keterangan: 'Iuran Maret',       nominal: 150000, createdBy: 'b001' },
      { id: this.genId(), tgl: '2025-03-15', jenis: 'keluar', kategori: 'snack',       keterangan: 'Snack ulangan',     nominal: 50000,  createdBy: 'b001' },
      { id: this.genId(), tgl: '2025-04-05', jenis: 'masuk',  kategori: 'iuran',       keterangan: 'Iuran April',       nominal: 130000, createdBy: 'b001' },
      { id: this.genId(), tgl: '2025-05-05', jenis: 'masuk',  kategori: 'iuran',       keterangan: 'Iuran Mei',         nominal: 150000, createdBy: 'b001' },
      { id: this.genId(), tgl: '2025-05-10', jenis: 'keluar', kategori: 'fotocopy',    keterangan: 'Fotocopy soal',     nominal: 30000,  createdBy: 'b001' },
    ];

    const kegiatan = [
      { id: 'kg001', nama: 'Renang', nominal: 50000, tgl: '2025-04-20', deskripsi: 'Kegiatan renang semester 2', createdBy: 'b001' },
      { id: 'kg002', nama: 'Study Tour', nominal: 250000, tgl: '2025-06-15', deskripsi: 'Kunjungan museum', createdBy: 'b001' },
    ];

    const kgBayar = {};
    kegiatan.forEach(kg => {
      kgBayar[kg.id] = {};
      siswa.filter(s => s.role === 'siswa').forEach(s => {
        kgBayar[kg.id][s.id] = {
          status: Math.random() > 0.4 ? 'lunas' : 'belum',
          tglBayar: Math.random() > 0.4 ? kg.tgl : null,
        };
      });
    });

    this.set(this.KEYS.SISWA, siswa);
    this.set(this.KEYS.IURAN, iuranData);
    this.set(this.KEYS.TRANSAKSI, transaksi);
    this.set(this.KEYS.KEGIATAN, kegiatan);
    this.set(this.KEYS.KG_BAYAR, kgBayar);
  },

  // ── Auth / Sesi ────────────────────────────────────────────
  login(nis) {
    const siswa = this.get(this.KEYS.SISWA).find(s => s.nis === nis.trim() && s.aktif);
    if (!siswa) return null;
    this.set(this.KEYS.SESI, { siswaId: siswa.id, nis: siswa.nis, nama: siswa.nama, role: siswa.role, loginAt: this.now() });
    return siswa;
  },
  logout() { localStorage.removeItem(this.KEYS.SESI); },
  getSesi() { return this.getObj(this.KEYS.SESI); },
  isBendahara() { return this.getSesi().role === 'bendahara'; },

  // ── Siswa ──────────────────────────────────────────────────
  getSiswa()          { return this.get(this.KEYS.SISWA); },
  getSiswaById(id)    { return this.getSiswa().find(s => s.id === id); },
  tambahSiswa(data) {
    const list = this.getSiswa();
    const baru = { id: this.genId(), aktif: true, role: 'siswa', ...data };
    list.push(baru); this.set(this.KEYS.SISWA, list); return baru;
  },
  updateSiswa(id, data) {
    const list = this.getSiswa().map(s => s.id === id ? { ...s, ...data } : s);
    this.set(this.KEYS.SISWA, list);
  },
  hapusSiswa(id) {
    this.set(this.KEYS.SISWA, this.getSiswa().filter(s => s.id !== id));
  },

  // ── Transaksi ──────────────────────────────────────────────
  getTransaksi()      { return this.get(this.KEYS.TRANSAKSI); },
  tambahTransaksi(data) {
    const list = this.getTransaksi();
    const baru = { id: this.genId(), createdAt: this.now(), createdBy: this.getSesi().siswaId, ...data };
    list.push(baru); this.set(this.KEYS.TRANSAKSI, list); return baru;
  },
  updateTransaksi(id, data) {
    this.set(this.KEYS.TRANSAKSI, this.getTransaksi().map(t => t.id === id ? { ...t, ...data } : t));
  },
  hapusTransaksi(id) {
    this.set(this.KEYS.TRANSAKSI, this.getTransaksi().filter(t => t.id !== id));
  },
  getSaldo() {
    return this.getTransaksi().reduce((acc, t) => {
      return t.jenis === 'masuk' ? acc + t.nominal : acc - t.nominal;
    }, 0);
  },
  getTotalMasuk() {
    return this.getTransaksi().filter(t => t.jenis === 'masuk').reduce((a, t) => a + t.nominal, 0);
  },
  getTotalKeluar() {
    return this.getTransaksi().filter(t => t.jenis === 'keluar').reduce((a, t) => a + t.nominal, 0);
  },

  // ── Iuran ──────────────────────────────────────────────────
  getIuran()          { return this.get(this.KEYS.IURAN); },
  getIuranSiswa(siswaId) { return this.getIuran().filter(i => i.siswaId === siswaId); },
  getBulanIuran() {
    const set = new Set(this.getIuran().map(i => i.bulan));
    return [...set].sort();
  },
  updateIuran(id, data) {
    this.set(this.KEYS.IURAN, this.getIuran().map(i => i.id === id ? { ...i, ...data } : i));
  },
  tambahBulanIuran(bulan, nominal) {
    const siswa = this.getSiswa().filter(s => s.role === 'siswa' && s.aktif);
    const list = this.getIuran();
    siswa.forEach(s => {
      if (!list.find(i => i.siswaId === s.id && i.bulan === bulan)) {
        list.push({ id: this.genId(), siswaId: s.id, bulan, nominal, status: 'belum', tglBayar: null });
      }
    });
    this.set(this.KEYS.IURAN, list);
  },

  // ── Kegiatan ───────────────────────────────────────────────
  getKegiatan()       { return this.get(this.KEYS.KEGIATAN); },
  getKegiatanById(id) { return this.getKegiatan().find(k => k.id === id); },
  tambahKegiatan(data) {
    const list = this.getKegiatan();
    const baru = { id: this.genId(), createdBy: this.getSesi().siswaId, ...data };
    list.push(baru);
    this.set(this.KEYS.KEGIATAN, list);
    // inisialisasi status bayar semua siswa
    const kgBayar = this.getObj(this.KEYS.KG_BAYAR);
    kgBayar[baru.id] = {};
    this.getSiswa().filter(s => s.role === 'siswa' && s.aktif).forEach(s => {
      kgBayar[baru.id][s.id] = { status: 'belum', tglBayar: null };
    });
    this.set(this.KEYS.KG_BAYAR, kgBayar);
    return baru;
  },
  updateKegiatan(id, data) {
    this.set(this.KEYS.KEGIATAN, this.getKegiatan().map(k => k.id === id ? { ...k, ...data } : k));
  },
  hapusKegiatan(id) {
    this.set(this.KEYS.KEGIATAN, this.getKegiatan().filter(k => k.id !== id));
    const kgBayar = this.getObj(this.KEYS.KG_BAYAR);
    delete kgBayar[id];
    this.set(this.KEYS.KG_BAYAR, kgBayar);
  },
  getKgBayar(kegiatanId) {
    return (this.getObj(this.KEYS.KG_BAYAR))[kegiatanId] || {};
  },
  updateKgBayar(kegiatanId, siswaId, status) {
    const kgBayar = this.getObj(this.KEYS.KG_BAYAR);
    if (!kgBayar[kegiatanId]) kgBayar[kegiatanId] = {};
    kgBayar[kegiatanId][siswaId] = { status, tglBayar: status === 'lunas' ? new Date().toISOString().split('T')[0] : null };
    this.set(this.KEYS.KG_BAYAR, kgBayar);
  },
};

// Jalankan seed data saat pertama kali
DB.seed();
