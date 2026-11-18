const express = require('express');
const apiController = require('../controllers/apiController');
const produkController = require('../controllers/produkController');
const mediaController = require('../controllers/mediaController');
const validasiProduk = require('../middlewares/validasiProduk');
const validasiId = require('../middlewares/validasiId');
const { validasiMedia, validasiIdMedia } = require('../middlewares/validasiMedia');
const unggahMedia = require('../middlewares/unggahMedia');
const wajibAdmin = require('../middlewares/wajibAdmin');
const periksaAsal = require('../middlewares/periksaAsal');

const router = express.Router();

// Status server dan database
router.get('/status', apiController.getStatus);

// CRUD produk
router.get('/produk', produkController.daftar);
// Operasi tulis wajib memiliki sesi admin dan asal permintaan yang sah
router.post('/produk', wajibAdmin, periksaAsal, validasiProduk, produkController.buat);
router.get('/produk/:id', validasiId, produkController.detail);
router.put('/produk/:id', wajibAdmin, periksaAsal, validasiId, validasiProduk, produkController.ubah);
router.delete('/produk/:id', wajibAdmin, periksaAsal, validasiId, produkController.hapus);

// Daftar media dan detail media dapat dibaca publik
router.get('/media', mediaController.daftar);
router.get('/media/:id', validasiIdMedia, mediaController.detail);

// Operasi tulis media wajib memiliki sesi admin sebelum unggah dan validasi
router.post('/media', wajibAdmin, periksaAsal, unggahMedia, validasiMedia, mediaController.buat);
router.put('/media/:id', wajibAdmin, periksaAsal, validasiIdMedia, unggahMedia, validasiMedia, mediaController.ubah);
router.delete('/media/:id', wajibAdmin, periksaAsal, validasiIdMedia, mediaController.hapus);

module.exports = router;
