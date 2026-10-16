/**
 * data.js — Keuangan Kelasku (versi Supabase, multi-kelas)
 *
 * Semua data (siswa, transaksi, iuran, kegiatan) disimpan di Supabase,
 * dipisah per KELAS. Semua user dalam kelas yang sama berbagi data yang
 * sama → sinkron antar bendahara & siswa.
 *
 * Pola: data dimuat SEKALI ke cache memori (DB.loadAll) saat halaman
 * init, lalu fungsi getXxx() membaca dari cache (sinkron). Operasi tulis
 * (tambah/update/hapus) bersifat async: menulis ke Supabase lalu reload cache.
 */

const DB = {
  KEYS: { SESI: 'kk_sesi' },

  // Cache data kelas aktif
  _cache: {
    siswa:     [],
    transaksi: [],
    iuran:     [],
    kegiatan:  [],
    kgBayar:   {},   // { kegiatanId: { siswaId: {status, tglBayar} } }
    loaded:    false,
  },

  // ── Supabase client ────────────────────────────────────────
  _client: null,
  client() {
    if (this._client) return this._client;
    if (typeof Auth !== 'undefined' && Auth.getClient) {
      this._client = Auth.getClient();
    }
    return this._client;
  },

  // ── Sesi (localStorage, diisi oleh auth.js) ────────────────
  getObj(key) { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; } },
  set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
  logout() { localStorage.removeItem(this.KEYS.SESI); this._clearCache(); },
  getSesi() { return this.getObj(this.KEYS.SESI); },
  isBendahara() { return this.getSesi().role === 'bendahara'; },
  getKelas() { return this.getSesi().kelas || 'LPS'; },

  _clearCache() {
    this._cache = { siswa: [], transaksi: [], iuran: [], kegiatan: [], kgBayar: {}, loaded: false };
  },

  now() { return new Date().toISOString(); },

  // ── Muat semua data kelas aktif dari Supabase ──────────────
  async loadAll() {
    const client = this.client();
    const kelas  = this.getKelas();
    if (!client) { this._cache.loaded = true; return; }

    const [profilesRes, trxRes, iuranRes, kegRes, kgbRes] = await Promise.all([
      client.from('profiles').select('*').eq('kelas', kelas),
      client.from('transaksi').select('*').eq('kelas', kelas),
      client.from('iuran').select('*').eq('kelas', kelas),
      client.from('kegiatan').select('*').eq('kelas', kelas),
      client.from('kegiatan_bayar').select('*').eq('kelas', kelas),
    ]);

    // Siswa / profil
    this._cache.siswa = (profilesRes.data || []).map(p => ({
      id: p.id, nis: p.nis || '-', nama: p.nama, role: p.role, aktif: p.aktif, email: p.email, kelas: p.kelas,
    }));

    // Transaksi
    this._cache.transaksi = (trxRes.data || []).map(t => ({
      id: t.id, tgl: t.tgl, jenis: t.jenis, kategori: t.kategori,
      keterangan: t.keterangan, nominal: Number(t.nominal), createdBy: t.created_by,
    }));

    // Iuran
    this._cache.iuran = (iuranRes.data || []).map(i => ({
      id: i.id, siswaId: i.siswa_id, bulan: i.bulan, nominal: Number(i.nominal),
      status: i.status, tglBayar: i.tgl_bayar,
    }));

    // Kegiatan
    this._cache.kegiatan = (kegRes.data || []).map(k => ({
      id: k.id, nama: k.nama, nominal: Number(k.nominal), tgl: k.tgl,
      deskripsi: k.deskripsi, createdBy: k.created_by,
    }));

    // Kegiatan bayar → map { kegiatanId: { siswaId: {...} } }
    const kgBayar = {};
    (kgbRes.data || []).forEach(b => {
      if (!kgBayar[b.kegiatan_id]) kgBayar[b.kegiatan_id] = {};
      kgBayar[b.kegiatan_id][b.siswa_id] = { status: b.status, tglBayar: b.tgl_bayar };
    });
    this._cache.kgBayar = kgBayar;

    this._cache.loaded = true;
  },

  // ════════════════════════════════════════════════════════════
  //  READ (sinkron — baca dari cache)
  // ════════════════════════════════════════════════════════════
  getSiswa()        { return this._cache.siswa; },
  getSiswaById(id)  { return this._cache.siswa.find(s => s.id === id); },

  getTransaksi()    { return this._cache.transaksi; },
  getSaldo() {
    return this._cache.transaksi.reduce((a, t) => t.jenis === 'masuk' ? a + t.nominal : a - t.nominal, 0);
  },
  getTotalMasuk()  { return this._cache.transaksi.filter(t => t.jenis === 'masuk').reduce((a, t) => a + t.nominal, 0); },
  getTotalKeluar() { return this._cache.transaksi.filter(t => t.jenis === 'keluar').reduce((a, t) => a + t.nominal, 0); },

  getIuran()            { return this._cache.iuran; },
  getIuranSiswa(sid)    { return this._cache.iuran.filter(i => i.siswaId === sid); },
  getBulanIuran()       { return [...new Set(this._cache.iuran.map(i => i.bulan))].sort(); },

  getKegiatan()         { return this._cache.kegiatan; },
  getKegiatanById(id)   { return this._cache.kegiatan.find(k => k.id === id); },
  getKgBayar(kegiatanId){ return this._cache.kgBayar[kegiatanId] || {}; },

  // ════════════════════════════════════════════════════════════
  //  WRITE (async — tulis ke Supabase lalu reload cache)
  // ════════════════════════════════════════════════════════════

  // ── Siswa / profil ─────────────────────────────────────────
  async tambahSiswa(data) {
    // Siswa manual (tanpa akun auth) tidak didukung di mode Supabase,
    // karena profiles terikat ke auth.users. Beri tahu pemanggil.
    throw new Error('Penambahan siswa manual tidak tersedia. Siswa bergabung dengan mendaftar akun & memilih kelas yang sama.');
  },
  async updateSiswa(id, data) {
    const client = this.client();
    const patch = {};
    if ('nama'  in data) patch.nama  = data.nama;
    if ('nis'   in data) patch.nis   = data.nis;
    if ('aktif' in data) patch.aktif = data.aktif;
    // role & kelas sengaja TIDAK diizinkan diubah dari sini (keamanan)
    const { error } = await client.from('profiles').update(patch).eq('id', id);
    if (error) throw error;
    await this.loadAll();
  },
  async hapusSiswa(id) {
    // Menghapus profil berarti menghapus akun — tidak diizinkan dari frontend.
    throw new Error('Menghapus siswa tidak tersedia. Nonaktifkan status siswa sebagai gantinya.');
  },

  // ── Transaksi ──────────────────────────────────────────────
  async tambahTransaksi(data) {
    const client = this.client();
    const { error } = await client.from('transaksi').insert({
      kelas:      this.getKelas(),
      tgl:        data.tgl,
      jenis:      data.jenis,
      kategori:   data.kategori,
      keterangan: data.keterangan,
      nominal:    data.nominal,
      created_by: this.getSesi().userId || null,
    });
    if (error) throw error;
    await this.loadAll();
  },
  async updateTransaksi(id, data) {
    const client = this.client();
    const { error } = await client.from('transaksi').update({
      tgl: data.tgl, jenis: data.jenis, kategori: data.kategori,
      keterangan: data.keterangan, nominal: data.nominal,
    }).eq('id', id);
    if (error) throw error;
    await this.loadAll();
  },
  async hapusTransaksi(id) {
    const client = this.client();
    const { error } = await client.from('transaksi').delete().eq('id', id);
    if (error) throw error;
    await this.loadAll();
  },

  // ── Iuran ──────────────────────────────────────────────────
  async updateIuran(id, data) {
    const client = this.client();
    const { error } = await client.from('iuran').update({
      status: data.status, tgl_bayar: data.tglBayar,
    }).eq('id', id);
    if (error) throw error;
    await this.loadAll();
  },
  async tambahBulanIuran(bulan, nominal) {
    const client = this.client();
    const kelas  = this.getKelas();
    const siswa  = this.getSiswa().filter(s => s.role === 'siswa' && s.aktif);
    // Hanya tambah untuk siswa yang belum punya baris bulan ini
    const sudahAda = new Set(this.getIuran().filter(i => i.bulan === bulan).map(i => i.siswaId));
    const rows = siswa
      .filter(s => !sudahAda.has(s.id))
      .map(s => ({ kelas, siswa_id: s.id, bulan, nominal, status: 'belum', tgl_bayar: null }));
    if (rows.length === 0) { await this.loadAll(); return; }
    const { error } = await client.from('iuran').insert(rows);
    if (error) throw error;
    await this.loadAll();
  },

  // ── Kegiatan ───────────────────────────────────────────────
  async tambahKegiatan(data) {
    const client = this.client();
    const kelas  = this.getKelas();
    const { data: inserted, error } = await client.from('kegiatan').insert({
      kelas, nama: data.nama, nominal: data.nominal, tgl: data.tgl,
      deskripsi: data.deskripsi, created_by: this.getSesi().userId || null,
    }).select().single();
    if (error) throw error;

    // Buat baris pembayaran untuk semua siswa aktif sekelas
    const siswa = this.getSiswa().filter(s => s.role === 'siswa' && s.aktif);
    if (siswa.length > 0) {
      const rows = siswa.map(s => ({
        kelas, kegiatan_id: inserted.id, siswa_id: s.id, status: 'belum', tgl_bayar: null,
      }));
      await client.from('kegiatan_bayar').insert(rows);
    }
    await this.loadAll();
  },
  async updateKegiatan(id, data) {
    const client = this.client();
    const { error } = await client.from('kegiatan').update({
      nama: data.nama, nominal: data.nominal, tgl: data.tgl, deskripsi: data.deskripsi,
    }).eq('id', id);
    if (error) throw error;
    await this.loadAll();
  },
  async hapusKegiatan(id) {
    const client = this.client();
    // kegiatan_bayar ikut terhapus via ON DELETE CASCADE
    const { error } = await client.from('kegiatan').delete().eq('id', id);
    if (error) throw error;
    await this.loadAll();
  },
  async updateKgBayar(kegiatanId, siswaId, status) {
    const client = this.client();
    const kelas  = this.getKelas();
    const tgl    = status === 'lunas' ? new Date().toISOString().split('T')[0] : null;
    // Upsert berdasarkan (kegiatan_id, siswa_id)
    const { error } = await client.from('kegiatan_bayar').upsert({
      kelas, kegiatan_id: kegiatanId, siswa_id: siswaId, status, tgl_bayar: tgl,
    }, { onConflict: 'kegiatan_id,siswa_id' });
    if (error) throw error;
    await this.loadAll();
  },
};
