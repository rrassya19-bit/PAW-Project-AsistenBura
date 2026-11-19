// Validasi field chat caption setelah multer selesai membaca multipart
const FIELD_IZIN = new Set(['instruksi', 'riwayat']);

// Mengirim galat validasi dengan pesan yang mudah dipahami admin
function tolak(res, pesan) {
  // Status 400 dipakai untuk seluruh kesalahan bentuk permintaan
  return res.status(400).json({ pesan });
}

// Memeriksa satu giliran riwayat yang akan diteruskan ke model
function validasiGiliran(giliran) {
  // Giliran harus berupa objek biasa
  if (!giliran || typeof giliran !== 'object' || Array.isArray(giliran)) {
    return false;
  }
  // Instruksi harus teks dan tidak melebihi 500 karakter
  if (typeof giliran.instruksi !== 'string' || giliran.instruksi.length > 500) {
    return false;
  }
  // Caption harus array maksimal tiga teks pendek
  if (
    !Array.isArray(giliran.caption) ||
    giliran.caption.length > 3 ||
    giliran.caption.some(function (teks) {
      return typeof teks !== 'string' || teks.length > 300;
    })
  ) {
    return false;
  }
  // Bentuk giliran valid
  return true;
}

// Middleware validasi field dan riwayat chat caption
function validasiCaptionChat(req, res, next) {
  // Field selain instruksi dan riwayat tidak boleh dikirim
  const kunci = Object.keys(req.body || {});
  for (let i = 0; i < kunci.length; i += 1) {
    if (!FIELD_IZIN.has(kunci[i])) {
      return tolak(res, 'Field permintaan tidak dikenali.');
    }
  }

  // Nilai instruksi harus berupa satu teks
  const instruksiMentah = req.body ? req.body.instruksi : '';
  if (
    instruksiMentah !== undefined &&
    (typeof instruksiMentah !== 'string' || instruksiMentah.length > 500)
  ) {
    return tolak(res, 'Instruksi maksimal 500 karakter.');
  }
  // Spasi dirapikan tanpa mengubah isi permintaan
  const instruksi = typeof instruksiMentah === 'string' ? instruksiMentah.trim() : '';

  // Riwayat kosong dianggap tidak ada
  const riwayatMentah = req.body ? req.body.riwayat : '';
  let riwayat = [];
  if (riwayatMentah !== undefined && riwayatMentah !== '') {
    // Riwayat harus berupa teks JSON
    if (typeof riwayatMentah !== 'string') {
      return tolak(res, 'Riwayat percakapan tidak valid.');
    }
    try {
      // JSON diurai menjadi nilai apa pun lebih dulu
      const hasil = JSON.parse(riwayatMentah);
      // Bentuk akar wajib array
      if (!Array.isArray(hasil)) {
        return tolak(res, 'Riwayat percakapan tidak valid.');
      }
      // Hanya tiga giliran terakhir yang dipakai
      riwayat = hasil.slice(-3);
    } catch (galat) {
      return tolak(res, 'Riwayat percakapan tidak valid.');
    }
  }
  // Setiap giliran yang dipakai harus memiliki bentuk yang benar
  for (let i = 0; i < riwayat.length; i += 1) {
    if (!validasiGiliran(riwayat[i])) {
      return tolak(res, 'Riwayat percakapan tidak valid.');
    }
  }

  // Tanpa gambar dan tanpa instruksi tidak ada yang bisa dibuat
  if (!req.file && !instruksi) {
    return tolak(res, 'Tulis permintaan atau lampirkan gambar.');
  }

  // Data bersih dipakai controller dan service
  req.captionChatTervalidasi = { instruksi, riwayat };
  // Lanjut ke handler
  return next();
}

// Ekspor middleware dan pembantu untuk pengujian
module.exports = { validasiCaptionChat, validasiGiliran };
