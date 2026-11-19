// Controller halaman admin: menyiapkan data produk dan media untuk area terproteksi
const config = require('../config');
const produkModel = require('../models/produkModel');
const mediaModel = require('../models/mediaModel');
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
      tabAktif: 'produk',
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
      tabAktif: 'produk',
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
      tabAktif: 'produk',
      ...konteksHalaman(),
      mode: 'ubah',
      produk,
      daftarKategori,
    });
  } catch (err) {
    return next(err);
  }
}

// Merender daftar media untuk jenis foto atau video
async function daftarMedia(req, res, next, jenis) {
  try {
    // Media diambil dari database sesuai jenisnya
    const daftar = await mediaModel.ambilSemua(jenis);

    return res.render('admin/media-daftar', {
      judul: jenis === 'foto' ? 'Kelola Foto' : 'Kelola Video',
      halaman: 'admin',
      tabAktif: jenis,
      ...konteksHalaman(),
      jenis,
      daftarMedia: daftar,
      jumlah: daftar.length,
    });
  } catch (err) {
    return next(err);
  }
}

// GET /admin/foto -> daftar foto galeri
function daftarFoto(req, res, next) {
  return daftarMedia(req, res, next, 'foto');
}

// GET /admin/video -> daftar video
function daftarVideo(req, res, next) {
  return daftarMedia(req, res, next, 'video');
}

// Merender form tambah media sesuai jenis
async function formTambahMedia(req, res, next, jenis) {
  try {
    return res.render('admin/media-form', {
      judul: jenis === 'foto' ? 'Tambah Foto' : 'Tambah Video',
      halaman: 'admin',
      tabAktif: jenis,
      ...konteksHalaman(),
      mode: 'tambah',
      jenis,
      media: null,
    });
  } catch (err) {
    return next(err);
  }
}

// GET /admin/foto/tambah -> form foto baru
function formTambahFoto(req, res, next) {
  return formTambahMedia(req, res, next, 'foto');
}

// GET /admin/video/tambah -> form video baru
function formTambahVideo(req, res, next) {
  return formTambahMedia(req, res, next, 'video');
}

// Merender form ubah media dan memastikan jenisnya sesuai halaman
async function formUbahMedia(req, res, next, jenis) {
  try {
    // ID harus bilangan bulat positif, selain itu dianggap tidak ditemukan
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return tampilkanTidakDitemukan(res);
    }

    // Media diambil dari database lalu dicocokkan dengan jenis halaman
    const media = await mediaModel.ambilBerdasarkanId(id);
    if (!media || media.jenis !== jenis) {
      return tampilkanTidakDitemukan(res);
    }

    return res.render('admin/media-form', {
      judul: jenis === 'foto' ? 'Ubah Foto' : 'Ubah Video',
      halaman: 'admin',
      tabAktif: jenis,
      ...konteksHalaman(),
      mode: 'ubah',
      jenis,
      media,
    });
  } catch (err) {
    return next(err);
  }
}

// GET /admin/foto/:id/ubah -> form ubah foto
function formUbahFoto(req, res, next) {
  return formUbahMedia(req, res, next, 'foto');
}

// GET /admin/video/:id/ubah -> form ubah video
function formUbahVideo(req, res, next) {
  return formUbahMedia(req, res, next, 'video');
}

// GET /admin/caption -> halaman chat caption admin tanpa memuat daftar media
function halamanCaption(req, res) {
  // Halaman hanya membutuhkan konteks admin dan tab aktif
  return res.render('admin/caption', {
    judul: 'AI Caption',
    halaman: 'admin',
    tabAktif: 'caption',
    ...konteksHalaman(),
  });
}

module.exports = {
  daftar,
  formTambah,
  formUbah,
  daftarFoto,
  daftarVideo,
  formTambahFoto,
  formTambahVideo,
  formUbahFoto,
  formUbahVideo,
  halamanCaption,
};
