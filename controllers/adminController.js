// Controller halaman admin: menyiapkan data produk untuk area terproteksi
const config = require('../config');
const produkModel = require('../models/produkModel');
const { formatRupiah, formatRentangHarga } = require('../utils/formatter');
const { ambilInisial } = require('../utils/inisial');

// Data konteks yang dipakai bersama oleh header, footer, dan halaman admin
function konteksHalaman() {
  return {
    appName: config.appName,
    namaKafe: config.namaKafe,
    tagline: config.tagline,
    deskripsi: config.deskripsi,
    kontak: config.kontak,
  };
}

// Merender halaman 404 yang rapi bila produk admin tidak ditemukan
function tampilkanTidakDitemukan(res) {
  return res.status(404).render('404', {
    judul: 'Halaman Tidak Ditemukan',
    halaman: '',
    ...konteksHalaman(),
  });
}

// GET /admin -> daftar seluruh produk dari database
async function daftar(req, res, next) {
  try {
    // Seluruh produk diambil dari database melalui model
    const daftarProduk = await produkModel.ambilSemua();

    res.render('admin/daftar', {
      judul: 'Kelola Menu',
      halaman: 'admin',
      ...konteksHalaman(),
      daftarProduk,
      jumlahProduk: daftarProduk.length,
      formatRupiah,
      formatRentangHarga,
      ambilInisial,
    });
  } catch (err) {
    next(err);
  }
}

// GET /admin/tambah -> form kosong untuk produk baru
async function formTambah(req, res, next) {
  try {
    // Kategori unik dipakai sebagai pilihan datalist pada form
    const daftarKategori = await produkModel.ambilKategori();

    res.render('admin/form', {
      judul: 'Tambah Produk',
      halaman: 'admin',
      ...konteksHalaman(),
      mode: 'tambah',
      produk: null,
      daftarKategori,
    });
  } catch (err) {
    next(err);
  }
}

// GET /admin/:id/ubah -> form yang sudah terisi data dari database
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

    return res.render('admin/form', {
      judul: 'Ubah Produk',
      halaman: 'admin',
      ...konteksHalaman(),
      mode: 'ubah',
      produk,
      daftarKategori,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { daftar, formTambah, formUbah };
