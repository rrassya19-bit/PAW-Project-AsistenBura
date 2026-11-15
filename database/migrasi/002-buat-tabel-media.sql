-- Migrasi 002: membuat tabel media untuk foto galeri dan video
-- Aman dijalankan berulang kali karena memakai IF NOT EXISTS
CREATE TABLE IF NOT EXISTS media (
  -- Kunci utama otomatis
  id SERIAL PRIMARY KEY,
  -- Jenis media dibatasi pada foto atau video
  jenis VARCHAR(10) NOT NULL CHECK (jenis IN ('foto', 'video')),
  -- Judul media wajib diisi
  judul VARCHAR(100) NOT NULL,
  -- Path URL berkas media dan tidak boleh sama dengan baris lain
  berkas VARCHAR(255) NOT NULL UNIQUE,
  -- Urutan tampil media, default nol
  urutan INTEGER NOT NULL DEFAULT 0,
  -- Waktu data dibuat
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Waktu data terakhir diubah
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
