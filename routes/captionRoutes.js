// Route caption admin yang dipasang di bawah /api/admin
const express = require('express');
const captionController = require('../controllers/captionController');
const { validasiCaption } = require('../middlewares/validasiCaption');
const { batasCaption } = require('../middlewares/batasLaju');
const autentikasiAdmin = require('../middlewares/autentikasiAdmin');

// Router khusus pembuatan caption
const router = express.Router();

// Wajib login admin, lalu dibatasi laju sebelum divalidasi dan diproses
router.post('/caption', autentikasiAdmin, batasCaption, validasiCaption, captionController.buat);

// Ekspor router
module.exports = router;
