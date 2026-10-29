const config = require('../config');
const produkModel = require('../models/produkModel');

// GET /api/status -> informasi singkat kondisi server
function getStatus(req, res) {
  res.json({
    status: 'aktif',
    aplikasi: config.appName,
    versi: config.version,
    waktu: new Date().toISOString(),
  });
}

// GET /api/produk -> daftar menu dari model
function getProduk(req, res) {
  res.json(produkModel.getAll());
}

module.exports = { getStatus, getProduk };
