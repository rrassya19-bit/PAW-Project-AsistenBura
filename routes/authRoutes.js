// Route autentikasi admin: halaman login, login JSON, logout, dan status sesi
const express = require('express');
const authController = require('../controllers/authController');
const batasLogin = require('../middlewares/batasLogin');
const periksaAsal = require('../middlewares/periksaAsal');

const router = express.Router();

// Halaman login dapat dibuka tanpa sesi
router.get('/admin/login', authController.halamanLogin);

// Login halaman dibatasi percobaan lalu diperiksa asalnya
router.post('/admin/login', batasLogin, periksaAsal, authController.masuk);

// Logout halaman memakai form POST agar tidak mudah dipicu tautan
router.post('/admin/logout', periksaAsal, authController.keluar);

// Endpoint JSON untuk Postman atau Thunder Client
router.post('/api/admin/login', batasLogin, periksaAsal, authController.masukApi);
router.post('/api/admin/logout', periksaAsal, authController.keluarApi);
router.get('/api/admin/sesi', authController.sesi);

module.exports = router;
