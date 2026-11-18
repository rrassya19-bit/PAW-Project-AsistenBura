// Fungsi bantu kredensial admin yang dipakai login dan pemeriksaan kesiapan
const crypto = require('crypto');
const config = require('../config');

// Menghitung digest SHA-256 agar perbandingan memakai panjang yang sama
function hashNilai(nilai) {
  return crypto.createHash('sha256').update(nilai, 'utf8').digest();
}

// Memeriksa apakah akun admin dan rahasia sesi sudah diisi dengan benar
function periksaKonfigurasi() {
  const userSiap = String(config.admin.user).trim().length > 0;
  const sandiSiap = String(config.admin.password).length > 0;
  const rahasiaSiap =
    typeof config.session.secret === 'string' &&
    config.session.secret.trim().length >= 32;

  // Alasan hanya berupa penanda, tidak pernah memuat nilai rahasia
  if (!userSiap) {
    return { siap: false, alasan: 'ADMIN_USER kosong' };
  }
  if (!sandiSiap) {
    return { siap: false, alasan: 'ADMIN_PASSWORD kosong' };
  }
  if (!rahasiaSiap) {
    return { siap: false, alasan: 'SESSION_SECRET kosong atau kurang dari 32 karakter' };
  }

  return { siap: true, alasan: '' };
}

// Membandingkan kredensial kiriman dengan akun di lingkungan
function cekKredensial(username, password) {
  // Username dibandingkan tanpa membedakan huruf besar kecil setelah trim
  const userDikirim = String(username === undefined || username === null ? '' : username)
    .trim()
    .toLowerCase();
  const userBenar = String(config.admin.user).trim().toLowerCase();
  const sandiDikirim = String(password === undefined || password === null ? '' : password);

  // Kedua perbandingan selalu dihitung tanpa short-circuit
  const cocokUser = crypto.timingSafeEqual(hashNilai(userDikirim), hashNilai(userBenar));
  const cocokSandi = crypto.timingSafeEqual(
    hashNilai(sandiDikirim),
    hashNilai(String(config.admin.password))
  );

  return cocokUser && cocokSandi;
}

module.exports = { cekKredensial, periksaKonfigurasi };
