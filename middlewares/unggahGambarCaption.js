// Middleware unggah satu gambar caption ke memori, bukan ke disk
const multer = require('multer');
const path = require('path');

// Batas ukuran gambar yang diterima endpoint chat caption
const MAKS_UKURAN = 4 * 1024 * 1024;

// Pemetaan ekstensi yang diizinkan ke MIME yang sesuai
const EKSTENSI = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

// Penyimpanan memori memastikan berkas tidak pernah menyentuh disk
const penyimpanan = multer.memoryStorage();

// Parser hanya menerima satu berkas pada field gambar
const unggah = multer({
  storage: penyimpanan,
  limits: { fileSize: MAKS_UKURAN, files: 1 },
}).single('gambar');

// Memeriksa tanda byte awal berkas sesuai format yang didukung
function tandaByteCocok(buffer, mime) {
  // Buffer kosong tidak mungkin berupa gambar valid
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    return false;
  }
  // JPEG selalu diawali FF D8 FF
  if (mime === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  // PNG memiliki tanda delapan byte yang tetap
  if (mime === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }
  // WebP diawali RIFF dan memiliki penanda WEBP pada byte kedelapan
  if (mime === 'image/webp') {
    return (
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    );
  }
  // Format lain selalu ditolak
  return false;
}

// Middleware utama: jalankan multer lalu cocokkan ekstensi, MIME, dan tanda byte
function unggahGambarCaption(req, res, next) {
  // Multer menangani multipart dan menyimpan berkas di memori
  unggah(req, res, function (galat) {
    // Berkas terlalu besar dipetakan ke 413
    if (galat && galat.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ pesan: 'Ukuran gambar maksimal 4 MB.' });
    }
    // Field berkas ganda atau nama field salah tetap 400
    if (galat) {
      return res.status(400).json({ pesan: 'Gambar tidak dapat diproses.' });
    }
    // Tanpa berkas, permintaan boleh lanjut untuk pembuatan caption dari teks
    if (!req.file) {
      return next();
    }

    // Ekstensi diambil dari nama asli tanpa membaca folder apa pun
    const ekstensi = path.extname(String(req.file.originalname || '')).toLowerCase();
    // MIME dari klien dan MIME dari ekstensi harus sama
    const mimeEkstensi = EKSTENSI[ekstensi];
    // Format yang tidak ada dalam daftar ditolak
    if (!mimeEkstensi || mimeEkstensi !== req.file.mimetype) {
      return res.status(400).json({ pesan: 'Format gambar harus JPEG, PNG, atau WebP.' });
    }
    // Tanda byte harus cocok agar MIME palsu tidak lolos
    if (!tandaByteCocok(req.file.buffer, mimeEkstensi)) {
      return res.status(400).json({ pesan: 'Isi gambar tidak sesuai format yang didukung.' });
    }

    // Metadata minimal disimpan untuk service, tanpa isi berkas di log
    req.gambarCaption = {
      buffer: req.file.buffer,
      mimetype: mimeEkstensi,
      size: req.file.size,
    };
    // Lanjut ke validasi field
    return next();
  });
}

// Ekspor middleware dan batas untuk pengujian
module.exports = { unggahGambarCaption, MAKS_UKURAN };
