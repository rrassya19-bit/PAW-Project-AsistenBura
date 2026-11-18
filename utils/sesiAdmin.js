// Pemeriksaan masa berlaku sesi admin yang dipakai beberapa middleware
const config = require('../config');

// Sesi dianggap aktif hanya bila admin sudah login dan batas 8 jam belum lewat
function sesiAdminAktif(sesi) {
  if (!sesi || !sesi.adminId) {
    return false;
  }

  const mulai = Number(sesi.mulai);
  if (!Number.isFinite(mulai)) {
    return false;
  }

  return Date.now() - mulai <= config.session.masaMaksimalMs;
}

module.exports = { sesiAdminAktif };
