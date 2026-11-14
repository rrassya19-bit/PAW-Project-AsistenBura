const express = require('express');
const apiController = require('../controllers/apiController');
const produkController = require('../controllers/produkController');
const validasiProduk = require('../middlewares/validasiProduk');
const validasiId = require('../middlewares/validasiId');
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

module.exports = router;
