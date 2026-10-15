/**
 * layout.js — Render sidebar + topbar, handle navigasi
 * Di-include di setiap halaman pages/*.html
 */

const Layout = {
  // Daftar menu (icon, label, href, hanya bendahara?)
  navItems: [
    { icon: '📊', label: 'Dashboard',         href: 'dashboard.html',  section: 'Menu Utama' },
    { icon: '👥', label: 'Data Siswa',         href: 'siswa.html',      section: 'Menu Utama' },
    { icon: '💵', label: 'Kas Kelas',          href: 'kas.html',        section: 'Keuangan' },
    { icon: '🏊', label: 'Uang Kegiatan',      href: 'kegiatan.html',   section: 'Keuangan' },
    { icon: '📋', label: 'Laporan',            href: 'laporan.html',    section: 'Keuangan' },
  ],

  async init(pageId) {
    // Cek auth Supabase — tunggu sampai sesi terkonfirmasi
    if (typeof Auth !== 'undefined') {
      const user = await Auth.requireAuth();
      if (!user) return; // requireAuth sudah redirect ke index.html
    } else {
      // Fallback: cek sesi localStorage
      const sesi = DB.getSesi();
      if (!sesi || !sesi.siswaId) {
        window.location.href = '../index.html';
        return;
      }
    }
    const sesi = DB.getSesi();
    this.render(sesi, pageId);
    this.bindEvents();
  },

  render(sesi, pageId) {
    // Avatar
    const avatarText = Utils.avatar(sesi.nama);
    const roleBadge  = sesi.role === 'bendahara'
      ? '<span class="topbar-role-badge role-bendahara">💼 Bendahara</span>'
      : '<span class="topbar-role-badge role-siswa">🎓 Siswa</span>';

    // Build nav items HTML
    let navHTML = '';
    let currentSection = '';
    this.navItems.forEach(item => {
      if (item.section !== currentSection) {
        currentSection = item.section;
        navHTML += `<div class="sidebar-nav-section"><span>${item.section}</span></div>`;
      }
      const isActive = item.href === pageId + '.html' || item.href === pageId;
      navHTML += `
        <a href="${item.href}" class="sidebar-nav-item ${isActive ? 'active' : ''}" data-page="${item.href}">
          <span class="nav-icon">${item.icon}</span>
          <span>${item.label}</span>
        </a>`;
    });

    const tanggal = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    // Topbar title map
    const titles = {
      dashboard: { judul: 'Dashboard', sub: 'Selamat datang di Keuangan Kelasku' },
      siswa:     { judul: 'Data Siswa', sub: 'Daftar siswa & absensi kelas' },
      kas:       { judul: 'Kas Kelas', sub: 'Pencatatan transaksi & iuran' },
      kegiatan:  { judul: 'Uang Kegiatan & Titipan', sub: 'Kegiatan di luar kas rutin' },
      laporan:   { judul: 'Laporan Keuangan', sub: 'Riwayat transaksi & rekap kas' },
    };
    const t = titles[pageId] || { judul: 'Keuangan Kelasku', sub: '' };

    document.getElementById('appSidebar').innerHTML = `
      <div class="sidebar-brand">
        <div class="sidebar-brand-icon">💰</div>
        <div class="sidebar-brand-text">
          <h2>Keuangan Kelasku</h2>
          <p>Kas Kelas Digital</p>
        </div>
      </div>
      <div class="sidebar-user">
        <div class="sidebar-avatar">${avatarText}</div>
        <div class="sidebar-user-info">
          <strong>${sesi.nama}</strong>
          <span>${sesi.role === 'bendahara' ? '💼 Bendahara' : '🎓 Siswa · NIS ' + sesi.nis}</span>
        </div>
      </div>
      <nav class="sidebar-nav">${navHTML}</nav>
      <div class="sidebar-footer">
        <button class="btn-logout" id="btnLogout">
          <span>🚪</span> Keluar
        </button>
      </div>
    `;

    document.getElementById('appTopbar').innerHTML = `
      <div class="topbar-left">
        <button class="menu-toggle" id="menuToggle">☰</button>
        <div class="topbar-title">
          <h3>${t.judul}</h3>
          <p>${t.sub}</p>
        </div>
      </div>
      <div class="topbar-right">
        <span class="topbar-date d-none d-sm-block">${tanggal}</span>
        ${roleBadge}
      </div>
    `;
  },

  bindEvents() {
    // Logout — gunakan Auth.signOut() jika tersedia
    document.getElementById('btnLogout')?.addEventListener('click', async () => {
      if (typeof Auth !== 'undefined') {
        await Auth.signOut();
      } else {
        DB.logout();
        window.location.href = '../index.html';
      }
    });

    // Mobile menu toggle
    const sidebar  = document.getElementById('appSidebar');
    const overlay  = document.getElementById('sidebarOverlay');
    const menuBtn  = document.getElementById('menuToggle');

    menuBtn?.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('open');
    });
    overlay?.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    });
  },
};
