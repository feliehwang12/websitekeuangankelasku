/**
 * utils.js — helper functions
 */

const Utils = {
  // Format rupiah
  rupiah(angka) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  },

  // Format tanggal Indonesia
  tglIndo(str) {
    if (!str) return '-';
    const d = new Date(str);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  },

  // Format bulan Indonesia
  bulanIndo(str) {
    if (!str) return '-';
    const [y, m] = str.split('-');
    const d = new Date(parseInt(y), parseInt(m) - 1, 1);
    return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  },

  // Toast notification
  toast(pesan, tipe = 'sukses') {
    const existing = document.querySelector('.kk-toast');
    if (existing) existing.remove();

    const t = document.createElement('div');
    t.className = `kk-toast kk-toast--${tipe}`;
    t.innerHTML = `
      <span class="kk-toast__icon">${tipe === 'sukses' ? '✓' : tipe === 'error' ? '✕' : 'ℹ'}</span>
      <span>${pesan}</span>
    `;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('kk-toast--show'), 10);
    setTimeout(() => {
      t.classList.remove('kk-toast--show');
      setTimeout(() => t.remove(), 300);
    }, 3000);
  },

  // Konfirmasi modal
  konfirmasi(judul, pesan) {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'kk-confirm-overlay';
      overlay.innerHTML = `
        <div class="kk-confirm-box">
          <div class="kk-confirm-icon">⚠️</div>
          <h3>${judul}</h3>
          <p>${pesan}</p>
          <div class="kk-confirm-actions">
            <button class="btn btn-outline" id="konfirmTidak">Batal</button>
            <button class="btn btn-danger" id="konfirmYa">Ya, Hapus</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      setTimeout(() => overlay.classList.add('show'), 10);

      const close = (val) => {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 200);
        resolve(val);
      };
      overlay.querySelector('#konfirmYa').onclick = () => close(true);
      overlay.querySelector('#konfirmTidak').onclick = () => close(false);
      overlay.onclick = (e) => { if (e.target === overlay) close(false); };
    });
  },

  // Modal generik
  bukaModal(id) {
    const m = document.getElementById(id);
    if (m) { m.classList.add('active'); document.body.style.overflow = 'hidden'; }
  },
  tutupModal(id) {
    const m = document.getElementById(id);
    if (m) { m.classList.remove('active'); document.body.style.overflow = ''; }
  },

  // Guard: redirect jika belum login
  requireLogin() {
    const sesi = DB.getSesi();
    if (!sesi || !sesi.siswaId) {
      window.location.href = '../index.html';
      return false;
    }
    return true;
  },

  // Guard: hanya bendahara
  requireBendahara() {
    if (!DB.isBendahara()) {
      Utils.toast('Akses ditolak. Hanya bendahara yang dapat melakukan ini.', 'error');
      return false;
    }
    return true;
  },

  // Render avatar inisial
  avatar(nama) {
    const parts = nama.trim().split(' ');
    const inisial = parts.length >= 2 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2);
    return inisial.toUpperCase();
  },

  // Warna badge status
  badgeStatus(status) {
    const map = { lunas: 'badge--sukses', belum: 'badge--warning', partial: 'badge--info' };
    return map[status] || 'badge--info';
  },

  // Nomor urut absensi
  nomorAbsen(index) {
    return String(index + 1).padStart(2, '0');
  },
};
