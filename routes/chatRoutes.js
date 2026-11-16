// Route chatbot publik yang dipasang di bawah /api
const express = require('express');
const chatController = require('../controllers/chatController');
const { validasiChat } = require('../middlewares/validasiChat');
const { batasChat } = require('../middlewares/batasLaju');

// Router khusus endpoint chat
const router = express.Router();

// Pembatas laju berjalan sebelum validasi agar percobaan spam ikut dihitung
router.post('/chat', batasChat, validasiChat, chatController.kirim);

// Ekspor router
module.exports = router;
