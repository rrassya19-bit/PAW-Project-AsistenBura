-- Migrasi 001: menambahkan kolom foto pada tabel produk
-- Kolom boleh kosong agar produk lama tetap valid
ALTER TABLE produk
ADD COLUMN IF NOT EXISTS foto VARCHAR(255);
