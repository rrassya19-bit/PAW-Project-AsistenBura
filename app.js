// Memuat variabel lingkungan dari .env paling awal sebelum modul lain
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });

const express = require('express');
const config = require('./config');
const gemini = require('./config/gemini');
const { pool, cekKoneksi } = require('./config/database');
const routes = require('./routes');
const { sessionMiddleware } = require('./config/session');
const { periksaKonfigurasi } = require('./utils/kredensialAdmin');
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

// Sesi admin dipasang sebelum route agar seluruh endpoint dapat membacanya
app.use(sessionMiddleware);

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
function jalankanServer() {
  // Server mendengarkan port dari konfigurasi
  app.listen(config.port, async () => {
    // Alamat server dicetak tanpa nilai rahasia apa pun
    console.log(`Server berjalan di http://localhost:${config.port}`);

    // Menampilkan status sesi admin tanpa pernah mencetak kredensial atau rahasianya
    const statusAdmin = periksaKonfigurasi();
    if (statusAdmin.siap) {
      console.log('Sesi admin: siap');
    } else {
      // Nama variabel dan alasan aman dicetak, nilainya tidak pernah ikut
      console.log(
        `Sesi admin: BELUM dikonfigurasi -> ${statusAdmin.alasan}. ` +
          'Periksa .env lalu mulai ulang server.'
      );
      console.log('Perubahan .env baru terbaca setelah server dimulai ulang.');
    }

    // Mengingatkan bila kata sandi admin terlalu pendek, tanpa menampilkan nilainya
    if (statusAdmin.sandiPendek) {
      console.log('Peringatan: ADMIN_PASSWORD kurang dari 10 karakter');
    }

    // Status Gemini hanya menyebut siap atau belum, tanpa mencetak kunci
    console.log(
      gemini.siap()
        ? 'Gemini: siap'
        : 'Gemini: BELUM dikonfigurasi (isi GEMINI_API_KEY dan GEMINI_MODEL di .env)'
    );

    // Koneksi database diperiksa setelah server hidup
    const terhubung = await cekKoneksi();
    if (terhubung) {
      console.log('Database terhubung');
    } else {
      console.log('Database gagal terhubung, periksa konfigurasi koneksi');
    }
  });
}

// Server hanya dijalankan bila berkas ini dieksekusi langsung, bukan saat di-require pengujian
if (require.main === module) {
  // Menjalankan server seperti npm start dan npm run dev
  jalankanServer();

  // Menutup pool database saat server dihentikan dengan Ctrl+C
  process.on('SIGINT', async () => {
    await pool.end();
    console.log('Server dihentikan');
    process.exit(0);
  });
}

// Ekspor app agar skrip pengujian dapat menjalankannya di dalam proses
module.exports = app;
