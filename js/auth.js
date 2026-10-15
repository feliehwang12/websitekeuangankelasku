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
  async function signUp({ nama, email, password }) {
    const client = getClient();
    if (!client) return { error: { message: 'Koneksi Supabase gagal.' } };

    const { data, error } = await client.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { nama: nama.trim() }   // disimpan di auth.users.raw_user_meta_data
      }
    });

    if (error) return { error };

    // Jika email confirmation dimatikan di Supabase, user langsung terdaftar
    // Kita tetap arahkan ke login — tidak auto-login
    return { data, error: null };
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
