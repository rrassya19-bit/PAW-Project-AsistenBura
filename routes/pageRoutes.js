const express = require('express');
const pageController = require('../controllers/pageController');

const router = express.Router();

// Route halaman dipetakan ke controller tanpa query database di sini
router.get('/', pageController.home);
router.get('/produk', pageController.daftarProduk);
router.get('/produk/tambah', pageController.formTambah);
router.get('/produk/:id/ubah', pageController.formUbah);

module.exports = router;
