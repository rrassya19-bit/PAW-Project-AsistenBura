const config = require('../config');
const produkModel = require('../models/produkModel');
const mediaModel = require('../models/mediaModel');
const { formatRupiah, formatWaktu } = require('../utils/formatter');

// GET / -> halaman beranda
function home(req, res) {
  res.render('index', {
    judul: 'Beranda',
    appName: config.appName,
    namaKafe: config.namaKafe,
    tagline: config.tagline,
    deskripsi: config.deskripsi,
    kontak: config.kontak,
    daftarProduk: produkModel.getAll(),
    media: mediaModel.getAll(),
    formatRupiah: formatRupiah,
    waktuTerformat: formatWaktu(new Date()),
  });
}

module.exports = { home };
