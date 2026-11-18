-- Tabel sesi untuk connect-pg-simple; aman dijalankan berulang kali
CREATE TABLE IF NOT EXISTS sesi (
  -- ID sesi dari express-session
  sid VARCHAR NOT NULL PRIMARY KEY,
  -- Isi sesi dalam bentuk JSON
  sess JSON NOT NULL,
  -- Waktu kedaluwarsa sesi
  expire TIMESTAMP(6) NOT NULL
);

-- Indeks mempercepat pembersihan sesi yang sudah kedaluwarsa
CREATE INDEX IF NOT EXISTS idx_sesi_expire ON sesi (expire);
