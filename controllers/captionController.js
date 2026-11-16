// Controller caption admin: memetakan hasil dan galat ke respons JSON
const captionService = require('../services/captionService');
const geminiService = require('../services/geminiService');
const { PESAN_GAGAL_UMUM } = require('../config/instruksi');

// POST /api/admin/caption -> tiga pilihan caption dari Gemini
async function buat(req, res, next) {
  try {
    // Service membaca media dan memanggil model
    const hasil = await captionService.sarankan(req.captionTervalidasi);
    // Tiga caption dikirim sebagai JSON
    return res.json(hasil);
  } catch (galat) {
    // Galat caption dipetakan sesuai jenisnya
    if (galat instanceof captionService.GalatCaption) {
      const kode = galat.kode;
      // Media yang tidak ada berarti 404
      if (kode === captionService.KODE_CAPTION.MEDIA_TIDAK_ADA) {
        return res.status(404).json({ pesan: 'Media tidak ditemukan' });
      }
      // Foto yang tidak dapat dibaca atau formatnya tidak didukung adalah 400
      if (
        kode === captionService.KODE_CAPTION.FOTO_TIDAK_TERBACA ||
        kode === captionService.KODE_CAPTION.FORMAT_TIDAK_DIDUKUNG ||
        kode === captionService.KODE_CAPTION.TERLALU_BESAR
      ) {
        return res.status(400).json({ pesan: galat.message });
      }
      // Keluaran yang tidak valid tidak pernah diteruskan ke admin
      return res.status(502).json({ pesan: PESAN_GAGAL_UMUM });
    }

    // Galat Gemini dipetakan sama seperti chatbot
    if (galat instanceof geminiService.GalatGemini) {
      const kode = galat.kode;
      if (kode === geminiService.KODE.KUNCI_BELUM_ADA) {
        return res.status(503).json({ pesan: 'Fitur AI belum dikonfigurasi oleh pengelola.' });
      }
      if (kode === geminiService.KODE.KUOTA_HABIS) {
        return res.status(429).json({ pesan: 'Layanan AI sedang sibuk. Coba lagi beberapa saat lagi.' });
      }
      if (kode === geminiService.KODE.TIMEOUT) {
        return res.status(504).json({ pesan: 'Permintaan melewati batas waktu. Silakan coba lagi.' });
      }
      return res.status(502).json({ pesan: PESAN_GAGAL_UMUM });
    }

    // Galat lain, misalnya database, diteruskan ke error handler
    return next(galat);
  }
}

// Ekspor handler
module.exports = { buat };
