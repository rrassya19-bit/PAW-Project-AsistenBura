// Pengaman area admin dan endpoint tulis berbasis sesi
const { periksaKonfigurasi, catatKonfigurasiBelumSiap } = require('../utils/kredensialAdmin');
const { sesiAdminAktif } = require('../utils/sesiAdmin');

// Menyusun alamat login dengan tujuan kembali yang aman
function alamatLogin(req) {
  const tujuan = req.originalUrl || req.url || '/admin';
  return '/admin/login?next=' + encodeURIComponent(tujuan);
}

// Menolak permintaan yang belum punya sesi admin yang sah
function wajibAdmin(req, res, next) {
  const konfigurasi = periksaKonfigurasi();

  // Gagal tertutup: konfigurasi belum siap membuat seluruh akses admin ditolak
  if (!konfigurasi.siap) {
    // Terminal menyebut variabel bermasalah, halaman tetap memakai pesan umum
    catatKonfigurasiBelumSiap(req, konfigurasi);
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(503).json({ pesan: 'Akses admin belum dikonfigurasi' });
    }
    return res.status(503).render('admin/login', {
      judul: 'Masuk Admin',
      belumDikonfigurasi: true,
      galat: '',
      username: '',
      next: '/admin',
      keluar: false,
    });
  }

  const jalurApi = req.originalUrl.startsWith('/api/');

  // Sesi yang tidak ada atau lewat batas mutlak diperlakukan sebagai tamu
  if (!sesiAdminAktif(req.session)) {
    if (req.session && req.session.adminId) {
      req.session.destroy(function () {});
    }
    if (jalurApi) {
      return res.status(401).json({ pesan: 'Login admin diperlukan' });
    }
    return res.redirect(302, alamatLogin(req));
  }

  // Data admin diteruskan ke view melalui res.locals
  req.admin = { username: req.session.username };
  res.locals.admin = req.admin;

  // Halaman admin tidak boleh diambil dari cache setelah logout
  res.set('Cache-Control', 'no-store');
  return next();
}

module.exports = wajibAdmin;
