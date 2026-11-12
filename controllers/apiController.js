const config = require('../config');
const { cekKoneksi } = require('../config/database');
const produkModel = require('../models/produkModel');

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

// GET /api/produk -> daftar menu dari model
function getProduk(req, res) {
  res.json(produkModel.getAll());
}

module.exports = { getStatus, getProduk };
