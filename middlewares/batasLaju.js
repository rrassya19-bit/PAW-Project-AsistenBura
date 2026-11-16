// Pembatas laju sederhana di memori proses untuk melindungi kuota Gemini
// Hitungan per IP per menit, per IP per hari, dan global per hari
const gemini = require('../config/gemini');
const { PESAN_GAGAL_UMUM } = require('../config/instruksi');

// Penyimpanan hitungan per menit: ip -> { jumlah, selesai }
const hitunganMenit = new Map();
// Penyimpanan hitungan per hari: ip -> { jumlah, selesai }
const hitunganHari = new Map();
// Hitungan global harian untuk seluruh pengunjung
let hitunganGlobal = { jumlah: 0, selesai: 0 };

// Menghitung waktu selesai jendela berikutnya
function jendelaBerikutnya(jendelaMs) {
  // Waktu sekarang dipakai sebagai dasar
  return Date.now() + jendelaMs;
}

// Membersihkan entri lama agar memori tidak tumbuh tanpa batas
function bersihkanPeta(peta, sekarang) {
  // Setiap entri yang jendelanya sudah lewat dihapus
  peta.forEach(function (nilai, kunci) {
    if (sekarang >= nilai.selesai) {
      peta.delete(kunci);
    }
  });
}

// Mengirim balasan 429 dengan sisa waktu tunggu
function tolak(res, detik, pesan) {
  // Header Retry-After membantu klien menunggu
  res.set('Retry-After', String(detik));
  // Pesan tidak menyebut angka kuota internal secara rinci
  return res.status(429).json({ pesan });
}

// Middleware pembatas laju khusus endpoint chatbot
function batasChat(req, res, next) {
  // Waktu sekarang dipakai untuk seluruh pemeriksaan
  const sekarang = Date.now();
  // IP diambil dari Express; tanpa IP dipakai kunci tetap
  const ip = req.ip || req.socket.remoteAddress || 'tanpa-ip';

  // Jendela global harian diperbarui bila sudah lewat
  if (sekarang >= hitunganGlobal.selesai) {
    hitunganGlobal = { jumlah: 0, selesai: jendelaBerikutnya(24 * 60 * 60 * 1000) };
  }
  // Jendela per menit untuk IP ini diperbarui bila sudah lewat
  let menit = hitunganMenit.get(ip);
  if (!menit || sekarang >= menit.selesai) {
    menit = { jumlah: 0, selesai: jendelaBerikutnya(60 * 1000) };
    hitunganMenit.set(ip, menit);
  }
  // Jendela harian untuk IP ini diperbarui bila sudah lewat
  let hari = hitunganHari.get(ip);
  if (!hari || sekarang >= hari.selesai) {
    hari = { jumlah: 0, selesai: jendelaBerikutnya(24 * 60 * 60 * 1000) };
    hitunganHari.set(ip, hari);
  }

  // Peta dibersihkan dari entri kedaluwarsa secara berkala
  bersihkanPeta(hitunganMenit, sekarang);
  bersihkanPeta(hitunganHari, sekarang);

  // Batas dibaca dari konfigurasi terpusat
  const batas = gemini.konfigurasi;
  // Batas per menit diperiksa lebih dulu
  if (menit.jumlah >= batas.chatPerMenit) {
    const detik = Math.max(1, Math.ceil((menit.selesai - sekarang) / 1000));
    return tolak(res, detik, 'Terlalu banyak pertanyaan. Coba lagi sebentar lagi.');
  }
  // Batas harian per IP diperiksa berikutnya
  if (hari.jumlah >= batas.chatPerHari) {
    const detik = Math.max(1, Math.ceil((hari.selesai - sekarang) / 1000));
    return tolak(res, detik, 'Batas pertanyaan harian untuk perangkat ini sudah tercapai.');
  }
  // Batas global harian melindungi kuota bersama
  if (hitunganGlobal.jumlah >= batas.chatGlobalPerHari) {
    const detik = Math.max(1, Math.ceil((hitunganGlobal.selesai - sekarang) / 1000));
    return tolak(res, detik, PESAN_GAGAL_UMUM);
  }

  // Permintaan dihitung setelah lolos semua pemeriksaan
  menit.jumlah += 1;
  hari.jumlah += 1;
  hitunganGlobal.jumlah += 1;

  // Permintaan diteruskan ke middleware berikutnya
  return next();
}

// Mengosongkan seluruh hitungan; hanya dipakai pengujian
function setelUlangBatasLaju() {
  // Peta per menit dan per hari dikosongkan
  hitunganMenit.clear();
  hitunganHari.clear();
  // Hitungan global dikembalikan ke nol
  hitunganGlobal = { jumlah: 0, selesai: 0 };
}

// Ekspor middleware dan hook pengujian
module.exports = { batasChat, setelUlangBatasLaju };
