-- Skema tabel produk; aman dijalankan berulang kali
CREATE TABLE IF NOT EXISTS produk (
  -- Kunci utama otomatis
  id SERIAL PRIMARY KEY,
  -- Nama menu wajib diisi
  nama VARCHAR(100) NOT NULL,
  -- Kategori menu wajib diisi
  kategori VARCHAR(50) NOT NULL,
  -- Harga utama tidak boleh negatif
  harga INTEGER NOT NULL CHECK (harga >= 0),
  -- Harga maksimum opsional, tidak boleh lebih kecil dari harga utama
  harga_maks INTEGER CHECK (harga_maks IS NULL OR harga_maks >= harga),
  -- Deskripsi menu boleh kosong
  deskripsi TEXT,
  -- Alamat foto menu, boleh kosong bila belum tersedia
  foto VARCHAR(255),
  -- Status ketersediaan menu, default tersedia
  tersedia BOOLEAN NOT NULL DEFAULT TRUE,
  -- Waktu data dibuat
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Waktu data terakhir diubah
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabel media menyimpan foto galeri dan video yang tampil di situs publik
CREATE TABLE IF NOT EXISTS media (
  -- Kunci utama otomatis
  id SERIAL PRIMARY KEY,
  -- Jenis media hanya boleh foto atau video
  jenis VARCHAR(10) NOT NULL CHECK (jenis IN ('foto', 'video')),
  -- Judul media wajib diisi
  judul VARCHAR(100) NOT NULL,
  -- Path URL berkas media, misalnya /media/galeri/contoh.jpg
  berkas VARCHAR(255) NOT NULL UNIQUE,
  -- Urutan tampil media, angka kecil tampil lebih dulu
  urutan INTEGER NOT NULL DEFAULT 0,
  -- Penanda foto tanpa tulisan dan beresolusi tinggi untuk latar hero
  hero BOOLEAN NOT NULL DEFAULT FALSE,
  -- Caption opsional yang tampil di galeri dan video
  caption VARCHAR(300),
  -- Waktu data dibuat
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Waktu data terakhir diubah
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
