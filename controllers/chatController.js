// Controller chatbot publik
const chatService = require('../services/chatService');
const geminiService = require('../services/geminiService');
const { PESAN_GAGAL_UMUM } = require('../config/instruksi');

// Memetakan kode galat Gemini menjadi status HTTP dan pesan aman
function petakanGalat(galat) {
  // Kode galat dibaca dengan nilai aman
  const kode = galat && galat.kode;
  // Kunci belum ada atau tidak valid berarti layanan belum tersedia
  if (kode === geminiService.KODE.KUNCI_BELUM_ADA) {
    return { status: 503, pesan: 'Fitur asisten belum dikonfigurasi oleh pengelola.' };
  }
  // Kuota Gemini habis tidak boleh dibalas sebagai galat server biasa
  if (kode === geminiService.KODE.KUOTA_HABIS) {
    return { status: 429, pesan: 'Layanan asisten sedang sibuk. Coba lagi beberapa saat lagi.' };
  }
  // Batas waktu pemanggilan model
  if (kode === geminiService.KODE.TIMEOUT) {
    return { status: 504, pesan: 'Asisten melewati batas waktu. Silakan coba lagi.' };
  }
  // Keluaran tidak valid, diblokir, terpotong, atau kosong
  return { status: 502, pesan: PESAN_GAGAL_UMUM };
}

// POST /api/chat -> jawaban asisten untuk satu pertanyaan
async function kirim(req, res, next) {
  try {
    // Service menjalankan seluruh guardrail dan panggilan model
    const hasil = await chatService.jawab({
      pesan: req.pesanChat,
      ip: req.ip || req.socket.remoteAddress || 'tanpa-ip',
    });
    // Jawaban final dikirim sebagai JSON
    res.json(hasil);
  } catch (galat) {
    // Galat Gemini dipetakan ke status yang sesuai
    if (galat instanceof geminiService.GalatGemini) {
      const peta = petakanGalat(galat);
      return res.status(peta.status).json({ pesan: peta.pesan });
    }
    // Galat lain, misalnya database, diteruskan ke error handler
    return next(galat);
  }
}

// Ekspor handler
module.exports = { kirim };
