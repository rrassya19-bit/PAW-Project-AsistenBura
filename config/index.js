// Konfigurasi utama aplikasi
const config = {
  appName: 'Asisten Bura',
  namaKafe: 'Bura Bura Coffee',
  tagline: 'Kopi, ruang, dan waktu yang lambat.',
  deskripsi:
    'Bura Bura Coffee meracik dirty latte, signature, dan kopi harian di Mangkubumi serta Kotabaru, Yogyakarta.',
  version: '1.0.0',
  port: process.env.PORT || 3000,
  kontak: {
    alamat: 'Mangkubumi & Kotabaru, Yogyakarta',
    jam: 'Setiap hari · 07.00 – 22.00',
    instagram: 'https://www.instagram.com/explore/tags/buraburacoffee/',
    peta: 'https://www.google.com/maps/search/?api=1&query=Bura+Bura+Coffee+Yogyakarta',
  },
};

module.exports = config;
