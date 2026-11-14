// Middleware autentikasi admin memakai HTTP Basic Authentication tanpa sesi
const crypto = require('crypto');
const config = require('../config');

// Menghitung digest SHA-256 agar perbandingan selalu memakai panjang yang sama
function hashNilai(nilai) {
  return crypto.createHash('sha256').update(nilai, 'utf8').digest();
}

// Membaca header Authorization dan memecahnya pada titik dua pertama
function bacaKredensial(header) {
  // Header harus berupa string dengan skema Basic dan token base64
  if (typeof header !== 'string') {
    return null;
  }

  // Token base64 hanya boleh berisi huruf, angka, plus, garis miring, dan sama dengan
  const cocok = header.match(/^Basic\s+([A-Za-z0-9+/=]+)$/i);
  if (!cocok) {
    return null;
  }

  // Mengubah token menjadi teks "pengguna:kata sandi"
  const teks = Buffer.from(cocok[1], 'base64').toString('utf8');
  const pemisah = teks.indexOf(':');

  // Tanpa titik dua, kredensial dianggap tidak valid
  if (pemisah === -1) {
    return null;
  }

  return {
    user: teks.slice(0, pemisah),
    password: teks.slice(pemisah + 1),
  };
}

// Mengirim respons gagal dalam bentuk JSON untuk jalur API atau halaman error untuk halaman biasa
function kirimGagal(req, res, status, judul, pesan) {
  // Jalur API dikenali dari URL asli agar tetap benar setelah router dipasang
  const jalurApi = req.originalUrl.startsWith('/api/');

  // Permintaan API menerima JSON sesuai kontrak endpoint
  if (jalurApi) {
    return res.status(status).json({ pesan });
  }

  // Permintaan halaman memakai template error yang sudah ada
  return res.status(status).render('error', {
    judul,
    halaman: '',
    status,
    pesan,
  });
}

// Memastikan hanya admin yang dapat melanjutkan permintaan
function autentikasiAdmin(req, res, next) {
  // Server menolak akses bila kredensial admin belum diatur di lingkungan
  if (!config.admin.user || !config.admin.password) {
    return kirimGagal(
      req,
      res,
      503,
      'Akses Admin Belum Dikonfigurasi',
      'Akses admin belum dikonfigurasi di server'
    );
  }

  // Membaca kredensial yang dikirim peramban atau klien API
  const kredensial = bacaKredensial(req.headers.authorization);
  const userDikirim = kredensial ? kredensial.user : '';
  const sandiDikirim = kredensial ? kredensial.password : '';

  // Kedua perbandingan selalu dihitung tanpa short-circuit
  const cocokUser = crypto.timingSafeEqual(
    hashNilai(userDikirim),
    hashNilai(config.admin.user)
  );
  const cocokSandi = crypto.timingSafeEqual(
    hashNilai(sandiDikirim),
    hashNilai(config.admin.password)
  );

  // Header yang tidak terbentuk valid tetap dianggap gagal meski hash kebetulan sama
  if (kredensial === null || !cocokUser || !cocokSandi) {
    // Header tantangan wajib dikirim agar peramban menampilkan dialog login
    res.set('WWW-Authenticate', 'Basic realm="Admin Bura Bura Coffee", charset="UTF-8"');
    return kirimGagal(
      req,
      res,
      401,
      'Autentikasi Diperlukan',
      'Autentikasi admin diperlukan'
    );
  }

  // Menandai permintaan sebagai milik admin untuk kebutuhan lanjutan
  req.adalahAdmin = true;
  return next();
}

module.exports = autentikasiAdmin;
