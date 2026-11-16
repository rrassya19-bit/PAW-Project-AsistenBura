// Middleware validasi permintaan caption AI dari admin
// Batas catatan admin disimpan sebagai konstanta agar mudah diuji
const MAKS_CATATAN = 200;

// Memvalidasi mediaId dan catatan sebelum controller memanggil Gemini
function validasiCaption(req, res, next) {
  // Body dibaca dengan aman bila bukan JSON
  const body = req.body || {};

  // mediaId harus bilangan bulat positif
  const id = Number(body.mediaId);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ pesan: 'mediaId harus bilangan bulat positif' });
  }

  // Catatan bersifat opsional dan harus berupa teks
  if (body.catatan !== undefined && body.catatan !== null && typeof body.catatan !== 'string') {
    return res.status(400).json({ pesan: 'Catatan harus berupa teks' });
  }
  // Spasi dirapikan sebelum panjangnya diperiksa
  const catatan = typeof body.catatan === 'string' ? body.catatan.trim() : '';
  // Catatan yang terlalu panjang ditolak
  if (catatan.length > MAKS_CATATAN) {
    return res.status(400).json({ pesan: `Catatan maksimal ${MAKS_CATATAN} karakter` });
  }

  // Nilai tervalidasi diteruskan ke controller
  req.captionTervalidasi = { mediaId: id, catatan };
  return next();
}

// Ekspor middleware dan batas catatan
module.exports = { validasiCaption, MAKS_CATATAN };
