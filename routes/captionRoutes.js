// Route caption admin yang dipasang di bawah /api/admin
const express = require('express');
const captionController = require('../controllers/captionController');
const { validasiCaption } = require('../middlewares/validasiCaption');
const { validasiCaptionChat } = require('../middlewares/validasiCaptionChat');
const { unggahGambarCaption } = require('../middlewares/unggahGambarCaption');
const { batasCaption } = require('../middlewares/batasLaju');
const wajibAdmin = require('../middlewares/wajibAdmin');
const periksaAsal = require('../middlewares/periksaAsal');

// Router khusus pembuatan caption
const router = express.Router();

// Endpoint chat baru: batas laju sebelum multer agar unggahan besar tidak membanjiri proses
router.post(
  '/caption/chat',
  wajibAdmin,
  periksaAsal,
  batasCaption,
  unggahGambarCaption,
  validasiCaptionChat,
  captionController.chat
);

// Endpoint lama tetap dipakai tombol AI pada form ubah foto/video
router.post('/caption', wajibAdmin, periksaAsal, batasCaption, validasiCaption, captionController.buat);

// Ekspor router
module.exports = router;
