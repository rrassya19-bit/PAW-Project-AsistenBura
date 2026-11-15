const express = require('express');
const autentikasiAdmin = require('../middlewares/autentikasiAdmin');
const adminController = require('../controllers/adminController');

const router = express.Router();

// Seluruh halaman admin wajib melewati autentikasi Basic
router.use(autentikasiAdmin);

// Daftar menu dan form tambah produk
router.get('/', adminController.daftar);
router.get('/tambah', adminController.formTambah);

// Halaman pengelolaan foto galeri
router.get('/foto', adminController.daftarFoto);
router.get('/foto/tambah', adminController.formTambahFoto);
router.get('/foto/:id/ubah', adminController.formUbahFoto);

// Halaman pengelolaan video
router.get('/video', adminController.daftarVideo);
router.get('/video/tambah', adminController.formTambahVideo);
router.get('/video/:id/ubah', adminController.formUbahVideo);

// Form ubah produk diletakkan terakhir agar tidak menutupi rute media
router.get('/:id/ubah', adminController.formUbah);

module.exports = router;
