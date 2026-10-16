/**
 * auth.js — Modul autentikasi via Supabase
 * Menangani: signUp, signIn, signOut, getSession, onAuthChange
 */

const Auth = (() => {
  // Supabase client (diinisialisasi setelah config.js dimuat)
  let _supabase = null;

  function getClient() {
    if (_supabase) return _supabase;
    if (typeof supabase === 'undefined' || !supabase.createClient) {
      console.error('Supabase JS library belum dimuat!');
      return null;
    }
    _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      }
    });
    return _supabase;
  }

  // ── Sign Up ──────────────────────────────────────────────────
  // role: 'siswa' | 'bendahara'
  // kodeBendahara: kode rahasia (hanya relevan jika role = 'bendahara').
  // Penentuan role FINAL dilakukan oleh trigger database, bukan di sini.
  // kelas: 'LPS' | 'Akuntansi Satu' | 'Akuntansi Dua' | 'Askep'
  async function signUp({ nama, email, password, role, kodeBendahara, kelas }) {
    const client = getClient();
    if (!client) return { error: { message: 'Koneksi Supabase gagal.' } };

    const peran = (role === 'bendahara') ? 'bendahara' : 'siswa';
    const KELAS_VALID = ['LPS','Akuntansi Satu','Akuntansi Dua','Askep'];
    const kls = KELAS_VALID.includes(kelas) ? kelas : 'LPS';

    const { data, error } = await client.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        // Metadata ini dibaca oleh trigger handle_new_user di database.
        // Trigger yang memvalidasi kode & menentukan role + kelas final.
        data: {
          nama: nama.trim(),
          role: peran,
          kelas: kls,
          kode_bendahara: (peran === 'bendahara') ? (kodeBendahara || '') : '',
        }
      }
    });

    if (error) return { error };

    // Jika user memilih bendahara, klaim role via RPC (andal, tidak
    // bergantung timing trigger). Hanya berhasil jika kode cocok.
    let roleFinal = 'siswa';
    if (peran === 'bendahara' && data?.session) {
      try {
        const { data: hasil } = await client.rpc('claim_bendahara', { kode: kodeBendahara || '' });
        if (hasil === 'ok') roleFinal = 'bendahara';
      } catch (_) { /* biarkan siswa */ }
    }

    // Verifikasi role final dari DB (jika sesi tersedia)
    try {
      if (data?.user) {
        const { data: profil } = await client
          .from('profiles').select('role').eq('id', data.user.id).single();
        if (profil?.role) roleFinal = profil.role;
      }
    } catch (_) { /* abaikan */ }

    // Simpan kode sementara agar bisa diklaim saat login pertama
    // (berguna jika "Confirm email" aktif → session null saat signUp).
    if (peran === 'bendahara' && kodeBendahara) {
      try { sessionStorage.setItem('kk_pending_kode', kodeBendahara); } catch (_) {}
    }

    return { data, error: null, roleFinal };
  }

  // ── Klaim role bendahara via RPC ─────────────────────────────
  async function claimBendahara(kode) {
    const client = getClient();
    if (!client) return 'no_client';
    try {
      const { data, error } = await client.rpc('claim_bendahara', { kode: kode || '' });
      if (error) return 'error';
      return data; // 'ok' | 'wrong_code' | 'not_logged_in'
    } catch (_) {
      return 'error';
    }
  }

  // ── Sign In ──────────────────────────────────────────────────
  async function signIn({ email, password }) {
    const client = getClient();
    if (!client) return { error: { message: 'Koneksi Supabase gagal.' } };

    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) return { error };

    // Jika ada kode bendahara pending (dari signup saat session belum ada),
    // klaim sekarang setelah login berhasil.
    try {
      const pending = sessionStorage.getItem('kk_pending_kode');
      if (pending) {
        await client.rpc('claim_bendahara', { kode: pending });
        sessionStorage.removeItem('kk_pending_kode');
      }
    } catch (_) {}

    // Setelah login berhasil, sinkronisasi sesi lokal
    await _syncSesiLokal(data.user);
    return { data, error: null };
  }

  // ── Sign Out ─────────────────────────────────────────────────
  async function signOut() {
    const client = getClient();
    if (client) await client.auth.signOut();
    // Hapus sesi lokal (untuk fallback data)
    DB.logout();
    window.location.href = _isInPagesDir() ? '../index.html' : 'index.html';
  }

  // ── Get Session ──────────────────────────────────────────────
  async function getSession() {
    const client = getClient();
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data?.session ?? null;
  }

  // ── Get User ─────────────────────────────────────────────────
  async function getUser() {
    const client = getClient();
    if (!client) return null;
    const { data } = await client.auth.getUser();
    return data?.user ?? null;
  }

  // ── On Auth State Change ─────────────────────────────────────
  function onAuthChange(callback) {
    const client = getClient();
    if (!client) return;
    client.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  }

  // ── Require Auth Guard ───────────────────────────────────────
  // Dipanggil di awal setiap halaman pages/*.html
  async function requireAuth() {
    const session = await getSession();
    if (!session) {
      window.location.href = _isInPagesDir() ? '../index.html' : 'index.html';
      return null;
    }
    // Sinkron sesi lokal agar DB.getSesi() berfungsi
    await _syncSesiLokal(session.user);
    // Muat semua data kelas aktif ke cache DB (agar getXxx() sinkron)
    if (typeof DB !== 'undefined' && DB.loadAll) {
      await DB.loadAll();
    }
    return session.user;
  }

  // ── Sinkron sesi Supabase → localStorage ───────────────────
  async function _syncSesiLokal(user) {
    if (!user) return;
    const client = getClient();

    // Ambil profil dari tabel profiles
    const { data: profil } = await client
      .from('profiles')
      .select('nama, role, kelas')
      .eq('id', user.id)
      .single();

    const nama  = profil?.nama  || user.user_metadata?.nama  || user.email;
    const role  = profil?.role  || 'siswa';
    const kelas = profil?.kelas || user.user_metadata?.kelas || 'LPS';

    // Simpan ke localStorage agar DB.getSesi() berfungsi
    DB.set(DB.KEYS.SESI, {
      siswaId:  user.id,
      userId:   user.id,
      email:    user.email,
      nama,
      role,
      kelas,
      loginAt:  new Date().toISOString(),
    });
  }

  // ── Helper ────────────────────────────────────────────────────
  function _isInPagesDir() {
    return window.location.pathname.includes('/pages/');
  }

  return { signUp, signIn, signOut, getSession, getUser, onAuthChange, requireAuth, getClient, claimBendahara };
})();
