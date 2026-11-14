// Skrip migrasi: menjalankan seluruh berkas SQL di database/migrasi secara berurutan
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

// Folder migrasi dan pola nama berkas yang dikenali
const folderMigrasi = path.join(__dirname, 'migrasi');

// Membaca daftar migrasi dengan urutan nama berkas
function ambilBerkasMigrasi() {
  if (!fs.existsSync(folderMigrasi)) {
    return [];
  }

  return fs
    .readdirSync(folderMigrasi)
    .filter((nama) => nama.toLowerCase().endsWith('.sql'))
    .sort(function (a, b) {
      return a.localeCompare(b, 'id', { numeric: true });
    });
}

// Menjalankan seluruh migrasi di dalam transaksi terpisah per berkas
async function jalankanMigrasi() {
  const daftarBerkas = ambilBerkasMigrasi();

  if (daftarBerkas.length === 0) {
    console.log('Tidak ada berkas migrasi untuk dijalankan');
    return;
  }

  for (const namaBerkas of daftarBerkas) {
    const lokasiBerkas = path.join(folderMigrasi, namaBerkas);
    const isiSql = fs.readFileSync(lokasiBerkas, 'utf8');
    const klien = await pool.connect();

    try {
      await klien.query('BEGIN');
      await klien.query(isiSql);
      await klien.query('COMMIT');
      console.log(`Migrasi berhasil: ${namaBerkas}`);
    } catch (galat) {
      await klien.query('ROLLBACK');
      throw galat;
    } finally {
      klien.release();
    }
  }
}

// Menjalankan migrasi lalu menutup pool database
jalankanMigrasi()
  .then(function () {
    console.log('Seluruh migrasi selesai');
  })
  .catch(function (galat) {
    console.error('Migrasi gagal:', galat.message);
    process.exitCode = 1;
  })
  .finally(async function () {
    await pool.end();
  });
