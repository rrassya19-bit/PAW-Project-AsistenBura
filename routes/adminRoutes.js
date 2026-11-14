const express = require('express');
const autentikasiAdmin = require('../middlewares/autentikasiAdmin');
const adminController = require('../controllers/adminController');

const router = express.Router();

// Seluruh halaman admin wajib melewati autentikasi Basic
router.use(autentikasiAdmin);

// Daftar menu, form tambah, dan form ubah produk
router.get('/', adminController.daftar);
router.get('/tambah', adminController.formTambah);
router.get('/:id/ubah', adminController.formUbah);

module.exports = router;
