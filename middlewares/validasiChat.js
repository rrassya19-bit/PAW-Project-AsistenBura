// Middleware validasi pesan chatbot
// Batas panjang pesan disimpan sebagai konstanta agar mudah diuji
const MAKS_PESAN = 500;

// Memvalidasi body JSON dan menyiapkan pesan yang sudah dibersihkan
function validasiChat(req, res, next) {
  // Body dibaca dengan aman bila bukan JSON
  const body = req.body || {};
  // Pesan harus berupa teks
  if (typeof body.pesan !== 'string') {
    return res.status(400).json({ pesan: 'Pesan wajib berupa teks' });
  }
  // Spasi di awal dan akhir dibuang sebelum dihitung
  const pesan = body.pesan.trim();
  // Pesan kosong tidak boleh dikirim ke model
  if (!pesan) {
    return res.status(400).json({ pesan: 'Pesan tidak boleh kosong' });
  }
  // Pesan yang terlalu panjang ditolak
  if (pesan.length > MAKS_PESAN) {
    return res.status(400).json({ pesan: `Pesan maksimal ${MAKS_PESAN} karakter` });
  }
  // Pesan bersih diteruskan ke controller
  req.pesanChat = pesan;
  return next();
}

// Ekspor middleware dan batas panjang
module.exports = { validasiChat, MAKS_PESAN };
