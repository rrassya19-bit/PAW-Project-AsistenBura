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
  -- Status ketersediaan menu, default tersedia
  tersedia BOOLEAN NOT NULL DEFAULT TRUE,
  -- Waktu data dibuat
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Waktu data terakhir diubah
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
