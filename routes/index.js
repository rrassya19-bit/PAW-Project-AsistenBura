const express = require('express');
const apiRoutes = require('./apiRoutes');
const chatRoutes = require('./chatRoutes');
const adminRoutes = require('./adminRoutes');
const pageRoutes = require('./pageRoutes');

const router = express.Router();

// Endpoint chatbot publik berada di /api/chat
router.use('/api', chatRoutes);

// Semua route API diawali /api, jadi URL akhirnya /api/status dan /api/produk
router.use('/api', apiRoutes);

// Area admin terproteksi untuk pengelolaan menu
router.use('/admin', adminRoutes);

// Route halaman publik
router.use('/', pageRoutes);

module.exports = router;
