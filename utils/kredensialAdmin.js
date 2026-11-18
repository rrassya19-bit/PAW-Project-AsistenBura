// Fungsi bantu kredensial admin yang dipakai login dan pemeriksaan kesiapan
const crypto = require('crypto');

// Batas minimal rahasia sesi setelah nilai dibersihkan
const PANJANG_MINIMAL_RAHASIA = 32;

// Jeda agar pesan konfigurasi di terminal tidak membanjiri log
const JEDA_LOG_KONFIGURASI_MS = 60 * 1000;

// Waktu pencatatan terakhir; nol berarti belum pernah mencatat
let waktuLogKonfigurasi = 0;

// Menghitung digest SHA-256 agar perbandingan memakai panjang yang sama
function hashNilai(nilai) {
  return crypto.createHash('sha256').update(nilai, 'utf8').digest();
}

// Membersihkan spasi dan tanda kutip pembungkus pada satu nilai lingkungan
function bersihkanNilai(nilai) {
  let teks = typeof nilai === 'string' ? nilai.trim() : '';
  if (teks.length >= 2) {
    const awal = teks[0];
    const akhir = teks[teks.length - 1];
    if ((awal === '"' && akhir === '"') || (awal === "'" && akhir === "'")) {
      teks = teks.slice(1, -1).trim();
    }
  }
  return teks;
}

// Membaca nilai admin langsung dari lingkungan setiap kali dipanggil
function bacaKredensial() {
  return {
    user: bersihkanNilai(process.env.ADMIN_USER),
    password: bersihkanNilai(process.env.ADMIN_PASSWORD),
    secret: bersihkanNilai(process.env.SESSION_SECRET),
  };
}

// Memeriksa apakah akun admin dan rahasia sesi sudah diisi dengan benar
function periksaKonfigurasi() {
  const kredensial = bacaKredensial();
  const masalah = [];

  if (kredensial.user.length === 0) {
    masalah.push('ADMIN_USER kosong');
  }
  if (kredensial.password.length === 0) {
    masalah.push('ADMIN_PASSWORD kosong');
  }
  if (kredensial.secret.length === 0) {
    masalah.push('SESSION_SECRET kosong');
  } else if (kredensial.secret.length < PANJANG_MINIMAL_RAHASIA) {
    masalah.push('SESSION_SECRET kurang dari 32 karakter');
  }

  return {
    siap: masalah.length === 0,
    alasan: masalah.join('; '),
    masalah,
    sandiPendek: kredensial.password.length > 0 && kredensial.password.length < 10,
  };
}

// Mencatat variabel yang bermasalah ke terminal, tanpa pernah mencetak nilainya
function catatKonfigurasiBelumSiap(req, status) {
  const sekarang = Date.now();
  if (sekarang - waktuLogKonfigurasi < JEDA_LOG_KONFIGURASI_MS) {
    return;
  }
  waktuLogKonfigurasi = sekarang;

  const jalur = req && req.originalUrl ? req.originalUrl.split('?')[0] : '/admin';
  const metode = req && req.method ? req.method : 'GET';
  console.log(
    `[admin] Konfigurasi belum siap pada ${metode} ${jalur} -> ${status.alasan}. ` +
      'Periksa .env lalu mulai ulang server.'
  );
}

// Mengizinkan pengujian memulai ulang jeda pencatatan tanpa mengubah perilaku server
function setelUlangLogKonfigurasi() {
  waktuLogKonfigurasi = 0;
}

// Membandingkan kredensial kiriman dengan akun di lingkungan
function cekKredensial(username, password) {
  const kredensial = bacaKredensial();

  // Username dibandingkan tanpa membedakan huruf besar kecil setelah trim
  const userDikirim = bersihkanNilai(username).toLowerCase();
  const userBenar = kredensial.user.toLowerCase();
  const sandiDikirim = String(password === undefined || password === null ? '' : password);

  // Kedua perbandingan selalu dihitung tanpa short-circuit
  const cocokUser = crypto.timingSafeEqual(hashNilai(userDikirim), hashNilai(userBenar));
  const cocokSandi = crypto.timingSafeEqual(hashNilai(sandiDikirim), hashNilai(kredensial.password));

  return cocokUser && cocokSandi;
}

module.exports = {
  cekKredensial,
  periksaKonfigurasi,
  catatKonfigurasiBelumSiap,
  setelUlangLogKonfigurasi,
};
