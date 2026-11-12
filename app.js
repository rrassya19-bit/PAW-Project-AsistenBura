// Memuat variabel lingkungan dari .env paling awal sebelum modul lain
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });

const express = require('express');
const config = require('./config');
const { pool, cekKoneksi } = require('./config/database');
const routes = require('./routes');
const requestLogger = require('./middlewares/requestLogger');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// Logger dipasang paling atas agar semua request, termasuk aset statis, tercatat
app.use(requestLogger);

// Menyajikan aset statis dari folder public
app.use(express.static(path.join(__dirname, 'public')));

// Menyajikan koleksi media bila folder assets tersedia (tidak error jika tidak ada)
app.use('/media', express.static(path.join(__dirname, 'assets')));

// Mengurai body JSON dan form URL-encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Pengaturan view engine EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Menyediakan nama kedai untuk seluruh template EJS
app.use((req, res, next) => {
  res.locals.namaKafe = config.namaKafe;
  next();
});

// Semua route aplikasi
app.use(routes);

// Middleware 404 dipasang setelah seluruh route, tanpa path (gaya Express 5)
app.use(notFound);

// Middleware error dipasang paling bawah
app.use(errorHandler);

// Menjalankan server lalu memeriksa koneksi database tanpa menghentikan server bila gagal
app.listen(config.port, async () => {
  console.log(`Server berjalan di http://localhost:${config.port}`);

  const terhubung = await cekKoneksi();
  if (terhubung) {
    console.log('Database terhubung');
  } else {
    console.log('Database gagal terhubung, periksa konfigurasi koneksi');
  }
});

// Menutup pool database saat server dihentikan dengan Ctrl+C
process.on('SIGINT', async () => {
  await pool.end();
  console.log('Server dihentikan');
  process.exit(0);
});
