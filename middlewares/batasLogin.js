// Pembatas percobaan login gagal di memori, tanpa paket tambahan
const MAKS_GAGAL = 5;
const JENDELA_MS = 15 * 60 * 1000;

// Catatan percobaan per IP dan per username huruf kecil
const catatan = new Map();

// Kunci IP memakai alamat yang tersedia pada request
function kunciIp(req) {
  return 'ip:' + (req.ip || req.socket.remoteAddress || 'tidak-diketahui');
}

// Kunci username selalu huruf kecil agar tidak bisa diakali dengan kapitalisasi
function kunciUsername(username) {
  return 'user:' + String(username === undefined || username === null ? '' : username)
    .trim()
    .toLowerCase();
}

// Mengambil catatan yang masih berada di dalam jendela waktu
function ambil(kunci) {
  const data = catatan.get(kunci);
  if (!data) {
    return null;
  }
  if (data.mulai + JENDELA_MS <= Date.now()) {
    catatan.delete(kunci);
    return null;
  }
  return data;
}

// Menghitung jumlah kegagalan yang masih berlaku
function jumlah(kunci) {
  const data = ambil(kunci);
  return data ? data.jumlah : 0;
}

// Menambah satu kegagalan pada kunci tertentu
function tambah(kunci) {
  const data = ambil(kunci);
  if (data) {
    data.jumlah += 1;
    return;
  }
  catatan.set(kunci, { jumlah: 1, mulai: Date.now() });
}

// Menghitung sisa detik sampai jendela kegagalan berakhir
function sisaDetik(kunci) {
  const data = ambil(kunci);
  if (!data) {
    return 0;
  }
  return Math.max(1, Math.ceil((data.mulai + JENDELA_MS - Date.now()) / 1000));
}

// Pesan yang sama untuk halaman dan API
const PESAN_BATAS = 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.';

// Middleware pembatas dipasang sebelum kredensial diperiksa
function batasLogin(req, res, next) {
  const ip = kunciIp(req);
  const user = kunciUsername(req.body ? req.body.username : '');
  const ipKena = jumlah(ip) >= MAKS_GAGAL;
  const userKena = jumlah(user) >= MAKS_GAGAL;

  if (ipKena || userKena) {
    // Retry-After memakai sisa waktu terlama agar kedua batas sudah lepas
    const detik = Math.max(sisaDetik(ip), sisaDetik(user), 1);
    res.set('Retry-After', String(detik));

    // Endpoint API menerima JSON, halaman login menerima form yang dirender ulang
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(429).json({ pesan: PESAN_BATAS });
    }

    return res.status(429).render('admin/login', {
      judul: 'Masuk Admin',
      galat: PESAN_BATAS,
      username: req.body ? String(req.body.username || '') : '',
      next: '/admin',
      keluar: false,
      belumDikonfigurasi: false,
    });
  }

  return next();
}

// Mencatat kegagalan pada IP dan username sekaligus
function catatGagal(req, username) {
  tambah(kunciIp(req));
  tambah(kunciUsername(username));
}

// Keberhasilan mengatur ulang hitungan username, bukan hitungan IP
function catatSukses(username) {
  catatan.delete(kunciUsername(username));
}

// Pembersih hanya membersihkan entri kedaluwarsa dan tidak menahan proses
const pembersih = setInterval(function () {
  const kini = Date.now();
  for (const [kunci, data] of catatan) {
    if (data.mulai + JENDELA_MS <= kini) {
      catatan.delete(kunci);
    }
  }
}, 60 * 1000);

if (typeof pembersih.unref === 'function') {
  pembersih.unref();
}

// Fungsi reset dipakai skrip pengujian agar setiap skenario terisolasi
function setelUlangBatasLogin() {
  catatan.clear();
}

module.exports = batasLogin;
module.exports.catatGagal = catatGagal;
module.exports.catatSukses = catatSukses;
module.exports.setelUlangBatasLogin = setelUlangBatasLogin;
