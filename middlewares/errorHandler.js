// Middleware untuk menangani semua error yang diteruskan next(err)
const fs = require('fs');
const path = require('path');

// Daftar kode error PostgreSQL yang dipetakan menjadi kesalahan pengguna (400)
const kesalahanPengguna = {
  '22P02': 'Format data tidak sesuai',
  '22003': 'Angka di luar batas yang diizinkan',
  '23502': 'Data wajib belum diisi',
  '23514': 'Nilai data tidak memenuhi ketentuan',
};

// 4 argumen wajib agar Express mengenali middleware ini sebagai error handler
function errorHandler(err, req, res, next) {
  // Bila response sudah terkirim, teruskan ke handler bawaan Express
  if (res.headersSent) {
    return next(err);
  }

  // Status awal dianggap kesalahan server
  let status = 500;
  let pesan = 'Terjadi kesalahan pada server';

  // Kode error PostgreSQL tertentu dianggap kesalahan input pengguna
  if (Object.prototype.hasOwnProperty.call(kesalahanPengguna, err.code)) {
    status = 400;
    pesan = kesalahanPengguna[err.code];
  }

  // Detail internal cukup dicatat di terminal, tidak dibocorkan ke klien
  console.error('Error ditangani:', err.message);

  // Request API dibalas JSON
  if (req.path.startsWith('/api')) {
    return res.status(status).json({ pesan });
  }

  // Request halaman dirender dengan template error bila tersedia
  const berkasError = path.join(__dirname, '..', 'views', 'error.ejs');
  if (fs.existsSync(berkasError)) {
    return res.status(status).render('error', { judul: 'Terjadi Kesalahan', halaman: '', status, pesan });
  }

  // Cadangan sederhana bila template belum dibuat
  return res.status(status).send(pesan);
}

module.exports = errorHandler;
