// Controller halaman: menyiapkan data dari model untuk template EJS
const config = require('../config');
const produkModel = require('../models/produkModel');
const { cekKoneksi } = require('../config/database');
const { formatRupiah, formatRentangHarga, formatWaktu } = require('../utils/formatter');
const { kelompokkanProduk } = require('../utils/kelompokKategori');

// Merender halaman 404 yang rapi untuk data halaman yang tidak ditemukan
function tampilkanTidakDitemukan(res) {
  return res.status(404).render('404', { judul: 'Halaman Tidak Ditemukan', halaman: '' });
}

// GET / -> beranda dengan menu dari database
async function home(req, res, next) {
  try {
    // Seluruh data menu diambil dari database melalui model
    const daftarProduk = await produkModel.ambilSemua();

    // Menu dikelompokkan per kategori lewat util
    const kategoriMenu = kelompokkanProduk(daftarProduk);

    // Status database diperiksa untuk lencana pada beranda
    const terhubung = await cekKoneksi();

    res.render('index', {
      judul: 'Beranda',
      halaman: 'beranda',
      appName: config.appName,
      namaKafe: config.namaKafe,
      tagline: config.tagline,
      deskripsi: config.deskripsi,
      kontak: config.kontak,
      daftarProduk,
      kategoriMenu,
      jumlahProduk: daftarProduk.length,
      jumlahKategori: kategoriMenu.length,
      statusServer: 'aktif',
      statusDatabase: terhubung ? 'terhubung' : 'terputus',
      formatRupiah,
      formatRentangHarga,
      waktuTerformat: formatWaktu(new Date()),
    });
  } catch (err) {
    next(err);
  }
}

// GET /produk -> daftar seluruh produk dari database
async function daftarProduk(req, res, next) {
  try {
    const daftar = await produkModel.ambilSemua();

    res.render('produk/daftar', {
      judul: 'Daftar Produk',
      halaman: 'produk',
      namaKafe: config.namaKafe,
      daftarProduk: daftar,
      jumlahProduk: daftar.length,
      formatRupiah,
      formatRentangHarga,
    });
  } catch (err) {
    next(err);
  }
}

// GET /produk/tambah -> form kosong untuk produk baru
async function formTambah(req, res, next) {
  try {
    // Kategori unik dipakai sebagai pilihan datalist pada form
    const daftarKategori = await produkModel.ambilKategori();

    res.render('produk/form', {
      judul: 'Tambah Produk',
      halaman: 'tambah',
      namaKafe: config.namaKafe,
      mode: 'tambah',
      produk: null,
      daftarKategori,
    });
  } catch (err) {
    next(err);
  }
}

// GET /produk/:id/ubah -> form yang sudah terisi data dari database
async function formUbah(req, res, next) {
  try {
    // ID harus bilangan bulat positif, selain itu dianggap tidak ditemukan
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return tampilkanTidakDitemukan(res);
    }

    // Produk diambil langsung dari database
    const produk = await produkModel.ambilBerdasarkanId(id);
    if (!produk) {
      return tampilkanTidakDitemukan(res);
    }

    // Kategori unik dipakai sebagai pilihan datalist pada form
    const daftarKategori = await produkModel.ambilKategori();

    return res.render('produk/form', {
      judul: 'Ubah Produk',
      halaman: 'produk',
      namaKafe: config.namaKafe,
      mode: 'ubah',
      produk,
      daftarKategori,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { home, daftarProduk, formTambah, formUbah };
