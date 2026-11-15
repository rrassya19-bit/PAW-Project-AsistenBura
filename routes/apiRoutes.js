const express = require('express');
const apiController = require('../controllers/apiController');
const produkController = require('../controllers/produkController');
const mediaController = require('../controllers/mediaController');
const validasiProduk = require('../middlewares/validasiProduk');
const validasiId = require('../middlewares/validasiId');
const { validasiMedia, validasiIdMedia } = require('../middlewares/validasiMedia');
const unggahMedia = require('../middlewares/unggahMedia');
const autentikasiAdmin = require('../middlewares/autentikasiAdmin');

const router = express.Router();

// Status server dan database
router.get('/status', apiController.getStatus);

// CRUD produk
router.get('/produk', produkController.daftar);
// Operasi tulis wajib melewati autentikasi admin sebelum validasi apa pun
router.post('/produk', autentikasiAdmin, validasiProduk, produkController.buat);
router.get('/produk/:id', validasiId, produkController.detail);
router.put('/produk/:id', autentikasiAdmin, validasiId, validasiProduk, produkController.ubah);
router.delete('/produk/:id', autentikasiAdmin, validasiId, produkController.hapus);

// Daftar media dan detail media dapat dibaca publik
router.get('/media', mediaController.daftar);
router.get('/media/:id', validasiIdMedia, mediaController.detail);

// Operasi tulis media wajib melalui autentikasi sebelum unggah dan validasi
router.post('/media', autentikasiAdmin, unggahMedia, validasiMedia, mediaController.buat);
router.put('/media/:id', autentikasiAdmin, validasiIdMedia, unggahMedia, validasiMedia, mediaController.ubah);
router.delete('/media/:id', autentikasiAdmin, validasiIdMedia, mediaController.hapus);

module.exports = router;
