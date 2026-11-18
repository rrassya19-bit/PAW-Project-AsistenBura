// Memuat variabel lingkungan dari file .env paling awal
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

// Membersihkan spasi dan tanda kutip pembungkus pada nilai lingkungan
function nilaiBersih(nilai) {
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

// Konfigurasi utama aplikasi
const config = {
  appName: 'Asisten Bura',
  namaKafe: 'Bura Bura Coffee',
  tagline: 'Kopi, ruang, dan waktu yang lambat.',
  deskripsi:
    'Bura Bura Coffee meracik dirty latte, signature, dan kopi harian di Mangkubumi serta Kotabaru, Yogyakarta.',
  version: '1.0.0',
  // Port server; memakai nilai default aman bila PORT tidak diisi
  port: Number(process.env.PORT) || 3000,
  // Konfigurasi koneksi PostgreSQL dibaca dari variabel lingkungan
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'bura_db',
  },
  // Satu akun admin dari lingkungan; kosong berarti area admin belum dikonfigurasi
  admin: {
    user: nilaiBersih(process.env.ADMIN_USER),
    password: nilaiBersih(process.env.ADMIN_PASSWORD),
  },
  // Pengaturan sesi admin; rahasia pendek ditolak oleh pemeriksaan kesiapan
  session: {
    secret: nilaiBersih(process.env.SESSION_SECRET),
    cookieSecure: process.env.COOKIE_SECURE === 'true',
    namaCookie: 'bura.sid',
    // Sesi menganggur berakhir setelah 30 menit
    masaIdleMs: 30 * 60 * 1000,
    // Batas mutlak sesi adalah 8 jam sejak login
    masaMaksimalMs: 8 * 60 * 60 * 1000,
  },
  // Batas ukuran unggahan media dalam megabyte dengan nilai default aman
  unggah: {
    maksFotoMb: Number(process.env.UPLOAD_MAKS_FOTO_MB) || 5,
    maksVideoMb: Number(process.env.UPLOAD_MAKS_VIDEO_MB) || 80,
  },
  kontak: {
    alamat: 'Mangkubumi & Kotabaru, Yogyakarta',
    jam: 'Setiap hari · 07.00 – 22.00',
    instagram: 'https://www.instagram.com/explore/tags/buraburacoffee/',
    peta: 'https://www.google.com/maps/search/?api=1&query=Bura+Bura+Coffee+Yogyakarta',
  },
};

module.exports = config;
