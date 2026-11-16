-- Migrasi 003: menambahkan penanda foto yang layak dipakai sebagai latar hero
-- Default FALSE agar foto baru tidak otomatis masuk rotasi hero
ALTER TABLE media
ADD COLUMN IF NOT EXISTS hero BOOLEAN NOT NULL DEFAULT FALSE;
