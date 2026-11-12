const config = require('../config');
const { cekKoneksi } = require('../config/database');

// GET /api/status -> informasi singkat kondisi server dan database
async function getStatus(req, res, next) {
  try {
    // Memeriksa koneksi database tanpa menghentikan server bila gagal
    const terhubung = await cekKoneksi();

    res.json({
      status: 'aktif',
      aplikasi: config.appName,
      versi: config.version,
      waktu: new Date().toISOString(),
      database: terhubung ? 'terhubung' : 'terputus',
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/produk -> ditangani controller produk

module.exports = { getStatus };
