// Controller halaman: menyiapkan data dari model untuk template EJS
const config = require('../config');
const produkModel = require('../models/produkModel');
const mediaModel = require('../models/mediaModel');
const { formatRupiah, formatRentangHarga, formatWaktu } = require('../utils/formatter');
const { kelompokkanProduk } = require('../utils/kelompokKategori');
const { ambilInisial } = require('../utils/inisial');

// Data konteks yang dipakai bersama oleh header, footer, dan halaman
function konteksHalaman() {
  return {
    appName: config.appName,
    namaKafe: config.namaKafe,
    tagline: config.tagline,
    deskripsi: config.deskripsi,
    kontak: config.kontak,
  };
}

// GET / -> beranda dengan menu dari database dan media dari folder assets
async function home(req, res, next) {
  try {
    // Seluruh data menu diambil dari database melalui model
    const daftarProduk = await produkModel.ambilSemua();

    // Menu dikelompokkan per kategori lewat util
    const kategoriMenu = kelompokkanProduk(daftarProduk);

    // Galeri beranda tetap memakai mediaModel seperti pada Week 7
    const media = mediaModel.getAll();

    res.render('index', {
      judul: 'Beranda',
      halaman: 'beranda',
      ...konteksHalaman(),
      daftarProduk,
      kategoriMenu,
      jumlahProduk: daftarProduk.length,
      jumlahKategori: kategoriMenu.length,
      media,
      formatRupiah,
      formatRentangHarga,
      ambilInisial,
      waktuTerformat: formatWaktu(new Date()),
    });
  } catch (err) {
    next(err);
  }
}

// GET /galeri -> halaman galeri foto lengkap
async function galeri(req, res, next) {
  try {
    // Media dibaca dari folder assets melalui model
    const media = mediaModel.getAll();

    res.render('galeri', {
      judul: 'Galeri',
      halaman: 'galeri',
      ...konteksHalaman(),
      media,
      totalFoto: media.totalFoto,
    });
  } catch (err) {
    next(err);
  }
}

// GET /video -> halaman seluruh video dengan kontrol pemutar
async function video(req, res, next) {
  try {
    // Media dibaca dari folder assets melalui model
    const media = mediaModel.getAll();

    res.render('video', {
      judul: 'Video',
      halaman: 'video',
      ...konteksHalaman(),
      media,
      totalVideo: media.totalVideo,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { home, galeri, video };