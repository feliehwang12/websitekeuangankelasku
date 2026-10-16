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
  async function signUp({ nama, email, password, role, kodeBendahara }) {
    const client = getClient();
    if (!client) return { error: { message: 'Koneksi Supabase gagal.' } };

    const peran = (role === 'bendahara') ? 'bendahara' : 'siswa';

    const { data, error } = await client.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        // Metadata ini dibaca oleh trigger handle_new_user di database.
        // Trigger yang memvalidasi kode & menentukan role final.
        data: {
          nama: nama.trim(),
          role: peran,
          kode_bendahara: (peran === 'bendahara') ? (kodeBendahara || '') : '',
        }
      }
    });

    if (error) return { error };

    // Cek role final yang ditentukan trigger DB (untuk info ke user).
    let roleFinal = 'siswa';
    try {
      if (data?.user) {
        const { data: profil } = await client
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();
        if (profil?.role) roleFinal = profil.role;
      }
    } catch (_) { /* abaikan — default siswa */ }

    // Tidak auto-login — user tetap diarahkan ke halaman login.
    return { data, error: null, roleFinal };
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
    // Sinkron sesi lokal agar DB.getSesi() tetap berfungsi
    await _syncSesiLokal(session.user);
    return session.user;
  }

  // ── Sinkron sesi Supabase → localStorage (untuk kompatibilitas DB lama) ──
  async function _syncSesiLokal(user) {
    if (!user) return;
    const client = getClient();

    // Ambil profil dari tabel profiles
    const { data: profil } = await client
      .from('profiles')
      .select('nama, role')
      .eq('id', user.id)
      .single();

    const nama = profil?.nama || user.user_metadata?.nama || user.email;
    const role = profil?.role || 'siswa';

    // Simpan ke localStorage agar kode lama (DB.getSesi()) tetap bekerja
    DB.set(DB.KEYS.SESI, {
      siswaId:  user.id,
      userId:   user.id,
      email:    user.email,
      nama,
      role,
      loginAt:  new Date().toISOString(),
    });
  }

  // ── Helper ────────────────────────────────────────────────────
  function _isInPagesDir() {
    return window.location.pathname.includes('/pages/');
  }

  return { signUp, signIn, signOut, getSession, getUser, onAuthChange, requireAuth, getClient };
})();
