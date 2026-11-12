// Skrip seed: membuat tabel produk lalu mengisi data awal bila masih kosong
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');
const daftarProduk = require('./produkData');

// Membaca isi skema SQL dari folder database
const berkasSkema = path.join(__dirname, 'schema.sql');
const sqlSkema = fs.readFileSync(berkasSkema, 'utf8');

// Argumen --reset dipakai untuk membuang tabel lama lalu membuat ulang
const modeReset = process.argv.includes('--reset');

async function jalankanSeed() {
  // Pada mode reset, tabel lama dihapus terlebih dahulu
  if (modeReset) {
    await pool.query('DROP TABLE IF EXISTS produk');
    console.log('Tabel produk lama dihapus');
  }

  // Membuat tabel bila belum ada
  await pool.query(sqlSkema);

  // Semua perubahan data dilakukan dalam satu transaksi
  const klien = await pool.connect();
  try {
    await klien.query('BEGIN');

    // Menghitung jumlah baris agar seed tidak menggandakan data
    const hasilHitung = await klien.query('SELECT COUNT(*)::int AS jumlah FROM produk');
    const jumlahAwal = hasilHitung.rows[0].jumlah;

    if (jumlahAwal === 0) {
      // Memasukkan seluruh data dengan id eksplisit
      for (const produk of daftarProduk) {
        await klien.query(
          `INSERT INTO produk (id, nama, kategori, harga, harga_maks, deskripsi, tersedia)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            produk.id,
            produk.nama,
            produk.kategori,
            produk.harga,
            produk.hargaMaks,
            produk.deskripsi,
            produk.tersedia,
          ]
        );
      }

      // Menyamakan urutan sequence dengan id terbesar yang baru dimasukkan
      await klien.query(
        `SELECT setval(pg_get_serial_sequence('produk', 'id'), (SELECT MAX(id) FROM produk))`
      );

      console.log(`Data awal dimasukkan: ${daftarProduk.length} produk`);
    } else {
      console.log(`Tabel sudah berisi ${jumlahAwal} produk, seed dilewati`);
    }

    await klien.query('COMMIT');
  } catch (galat) {
    // Membatalkan seluruh perubahan bila ada yang gagal
    await klien.query('ROLLBACK');
    throw galat;
  } finally {
    // Koneksi selalu dikembalikan ke pool
    klien.release();
  }

  // Menampilkan jumlah data akhir sebagai konfirmasi
  const hasilAkhir = await pool.query('SELECT COUNT(*)::int AS jumlah FROM produk');
  console.log(`Jumlah data produk saat ini: ${hasilAkhir.rows[0].jumlah}`);
}

jalankanSeed()
  .catch((galat) => {
    console.error('Seed gagal:', galat.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    // Pool selalu ditutup agar proses Node berhenti dengan rapi
    await pool.end();
  });
