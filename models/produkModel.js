// Model produk: seluruh operasi dan query database untuk tabel produk
const { query } = require('../config/database');

// Mengubah kolom snake_case dari database menjadi camelCase untuk JSON
function petakanBaris(baris) {
  if (!baris) {
    return null;
  }

  return {
    id: baris.id,
    nama: baris.nama,
    kategori: baris.kategori,
    harga: baris.harga,
    hargaMaks: baris.harga_maks,
    deskripsi: baris.deskripsi,
    foto: baris.foto || null,
    tersedia: baris.tersedia,
    dibuatPada: baris.created_at,
    diubahPada: baris.updated_at,
  };
}

// Mengambil semua produk, diurutkan berdasarkan id
async function ambilSemua() {
  const hasil = await query(
    `SELECT id, nama, kategori, harga, harga_maks, deskripsi, foto, tersedia, created_at, updated_at
     FROM produk
     ORDER BY id ASC`
  );
  return hasil.rows.map(petakanBaris);
}

// Mengambil satu produk berdasarkan id
async function ambilBerdasarkanId(id) {
  const hasil = await query(
    `SELECT id, nama, kategori, harga, harga_maks, deskripsi, foto, tersedia, created_at, updated_at
     FROM produk
     WHERE id = $1`,
    [id]
  );
  return petakanBaris(hasil.rows[0]);
}

// Menambah produk baru dan mengembalikan baris yang dibuat
async function tambah(data) {
  const hasil = await query(
    `INSERT INTO produk (nama, kategori, harga, harga_maks, deskripsi, foto, tersedia)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, nama, kategori, harga, harga_maks, deskripsi, foto, tersedia, created_at, updated_at`,
    [
      data.nama,
      data.kategori,
      data.harga,
      data.hargaMaks,
      data.deskripsi,
      data.foto,
      data.tersedia,
    ]
  );
  return petakanBaris(hasil.rows[0]);
}

// Mengubah produk berdasarkan id; null bila id tidak ditemukan
async function ubah(id, data) {
  const hasil = await query(
    `UPDATE produk
     SET nama = $1,
         kategori = $2,
         harga = $3,
         harga_maks = $4,
         deskripsi = $5,
         foto = $6,
         tersedia = $7,
         updated_at = NOW()
     WHERE id = $8
     RETURNING id, nama, kategori, harga, harga_maks, deskripsi, foto, tersedia, created_at, updated_at`,
    [
      data.nama,
      data.kategori,
      data.harga,
      data.hargaMaks,
      data.deskripsi,
      data.foto,
      data.tersedia,
      id,
    ]
  );
  return petakanBaris(hasil.rows[0]);
}

// Menghapus produk berdasarkan id; mengembalikan baris yang dihapus atau null
async function hapus(id) {
  const hasil = await query('DELETE FROM produk WHERE id = $1 RETURNING *', [id]);
  return petakanBaris(hasil.rows[0]);
}

// Mengambil daftar kategori unik untuk pilihan pada form
async function ambilKategori() {
  const hasil = await query('SELECT DISTINCT kategori FROM produk ORDER BY kategori ASC');
  return hasil.rows.map((baris) => baris.kategori);
}

module.exports = {
  ambilSemua,
  ambilBerdasarkanId,
  tambah,
  ubah,
  hapus,
  ambilKategori,
};
