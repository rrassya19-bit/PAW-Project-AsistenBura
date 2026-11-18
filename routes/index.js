const express = require('express');
const apiRoutes = require('./apiRoutes');
const chatRoutes = require('./chatRoutes');
const captionRoutes = require('./captionRoutes');
const authRoutes = require('./authRoutes');
const adminRoutes = require('./adminRoutes');
const pageRoutes = require('./pageRoutes');

const router = express.Router();

// Login dan logout dipasang lebih dulu agar tidak terkena pengaman admin
router.use(authRoutes);

// Endpoint chatbot publik berada di /api/chat
router.use('/api', chatRoutes);

// Endpoint caption admin berada di /api/admin/caption
router.use('/api/admin', captionRoutes);

// Semua route API diawali /api, jadi URL akhirnya /api/status dan /api/produk
router.use('/api', apiRoutes);

// Area admin terproteksi untuk pengelolaan menu
router.use('/admin', adminRoutes);

// Route halaman publik
router.use('/', pageRoutes);

module.exports = router;
