// Memuat variabel lingkungan dari file .env paling awal
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

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
  // Akun admin untuk HTTP Basic Authentication; kosong berarti belum dikonfigurasi
  admin: {
    user: process.env.ADMIN_USER || '',
    password: process.env.ADMIN_PASSWORD || '',
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
