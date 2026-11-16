-- Migrasi 004: menambah kolom caption opsional pada tabel media
-- Aman dijalankan berulang kali karena memakai IF NOT EXISTS
ALTER TABLE media ADD COLUMN IF NOT EXISTS caption VARCHAR(300);
