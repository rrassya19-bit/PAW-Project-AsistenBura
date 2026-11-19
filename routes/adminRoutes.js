const express = require('express');
const wajibAdmin = require('../middlewares/wajibAdmin');
const adminController = require('../controllers/adminController');

const router = express.Router();

// Seluruh halaman admin wajib memiliki sesi login yang masih berlaku
router.use(wajibAdmin);

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

// Halaman khusus admin untuk membuat caption media dengan AI
router.get('/caption', adminController.halamanCaption);

// Form ubah produk diletakkan terakhir agar tidak menutupi rute media
router.get('/:id/ubah', adminController.formUbah);

module.exports = router;
