const express = require('express');
const apiRoutes = require('./apiRoutes');
const pageRoutes = require('./pageRoutes');

const router = express.Router();

// Semua route API diawali /api, jadi URL akhirnya /api/status dan /api/produk
router.use('/api', apiRoutes);

// Route halaman
router.use('/', pageRoutes);

module.exports = router;
