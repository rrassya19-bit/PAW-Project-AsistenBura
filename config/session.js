// Konfigurasi express-session memakai penyimpanan PostgreSQL
const crypto = require('crypto');
const session = require('express-session');
const PgStore = require('connect-pg-simple')(session);
const config = require('./index');
const { pool } = require('./database');

// Panjang minimal rahasia sesi agar tanda tangan cookie tidak mudah ditebak
const PANJANG_MINIMAL_RAHASIA = 32;

// Menentukan apakah rahasia dari lingkungan sudah memenuhi syarat
function rahasiaValid() {
  return (
    typeof config.session.secret === 'string' &&
    config.session.secret.trim().length >= PANJANG_MINIMAL_RAHASIA
  );
}

// Memakai rahasia sementara bila lingkungan belum siap agar server tetap hidup;
// permintaan admin tetap ditolak 503 oleh pemeriksaan kesiapan
const rahasiaAktif = rahasiaValid()
  ? config.session.secret
  : crypto.randomBytes(48).toString('hex');

// Penyimpanan sesi memakai pool yang sama dengan model dan tabel hasil migrasi
const store = new PgStore({
  pool,
  tableName: 'sesi',
  createTableIfMissing: false,
});

// Middleware sesi dipasang sekali sebelum seluruh route
const sessionMiddleware = session({
  store,
  name: config.session.namaCookie,
  secret: rahasiaAktif,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.session.cookieSecure,
    maxAge: config.session.masaIdleMs,
  },
});

module.exports = { sessionMiddleware, rahasiaValid, store };
