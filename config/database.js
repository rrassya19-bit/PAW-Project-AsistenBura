// Modul koneksi PostgreSQL memakai driver pg tanpa ORM
const { Pool } = require('pg');
const config = require('./index');

// Pool dipakai ulang oleh seluruh model agar koneksi efisien
const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password,
  database: config.database.name,
});

// Menangani error tak terduga pada koneksi yang sedang menganggur
pool.on('error', (galat) => {
  console.error('Koneksi database bermasalah:', galat.message);
});

// Menjalankan query berparameter, misalnya query('SELECT * FROM produk WHERE id = $1', [id])
async function query(teks, parameter) {
  return pool.query(teks, parameter);
}

// Memastikan database dapat diakses tanpa mematikan server bila gagal
async function cekKoneksi() {
  try {
    await pool.query('SELECT NOW()');
    return true;
  } catch (galat) {
    // Hanya pesan singkat yang dicetak, kredensial tidak pernah ditampilkan
    console.error('Gagal terhubung ke database:', galat.message);
    return false;
  }
}

module.exports = { pool, query, cekKoneksi };
