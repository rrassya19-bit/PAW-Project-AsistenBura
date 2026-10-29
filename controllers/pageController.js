const config = require('../config');
const produkModel = require('../models/produkModel');
const { formatRupiah, formatWaktu } = require('../utils/formatter');

// GET / -> halaman beranda
function home(req, res) {
  res.render('index', {
    judul: 'Beranda',
    appName: config.appName,
    namaKafe: config.namaKafe,
    daftarProduk: produkModel.getAll(),
    formatRupiah: formatRupiah,
    waktuTerformat: formatWaktu(new Date()),
  });
}

module.exports = { home };
