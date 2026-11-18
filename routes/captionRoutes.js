// Route caption admin yang dipasang di bawah /api/admin
const express = require('express');
const captionController = require('../controllers/captionController');
const { validasiCaption } = require('../middlewares/validasiCaption');
const { batasCaption } = require('../middlewares/batasLaju');
const wajibAdmin = require('../middlewares/wajibAdmin');
const periksaAsal = require('../middlewares/periksaAsal');

// Router khusus pembuatan caption
const router = express.Router();

// Wajib sesi admin, asal permintaan diperiksa, lalu dibatasi laju sebelum diproses
router.post('/caption', wajibAdmin, periksaAsal, batasCaption, validasiCaption, captionController.buat);

// Ekspor router
module.exports = router;
