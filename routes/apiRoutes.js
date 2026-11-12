const express = require('express');
const apiController = require('../controllers/apiController');
const produkController = require('../controllers/produkController');
const validasiProduk = require('../middlewares/validasiProduk');
const validasiId = require('../middlewares/validasiId');

const router = express.Router();

// Status server dan database
router.get('/status', apiController.getStatus);

// CRUD produk
router.get('/produk', produkController.daftar);
router.post('/produk', validasiProduk, produkController.buat);
router.get('/produk/:id', validasiId, produkController.detail);
router.put('/produk/:id', validasiId, validasiProduk, produkController.ubah);
router.delete('/produk/:id', validasiId, produkController.hapus);

module.exports = router;
