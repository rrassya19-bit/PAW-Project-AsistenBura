// Middleware validasi media untuk endpoint API dengan unggah berkas
const { hapusBerkasBilaAda } = require('../utils/mediaBerkas');

// Memvalidasi parameter :id media sebelum controller dijalankan
function validasiIdMedia(req, res, next) {
  const teksId = String(req.params.id);

  // ID harus berupa deretan angka dan bernilai lebih dari nol
  const id = /^\d+$/.test(teksId) ? Number(teksId) : NaN;
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ pesan: 'ID media harus bilangan bulat positif' });
  }

  // Menyimpan id yang sudah divalidasi untuk dipakai controller
  req.idMedia = id;
  return next();
}

// Memvalidasi judul, jenis, urutan, dan keberadaan berkas media
function validasiMedia(req, res, next) {
  // Menampung seluruh pesan kesalahan validasi
  const kesalahan = [];

  // Membaca body multipart dengan aman bila tidak dikirim
  const body = req.body || {};

  // Judul wajib diisi, berupa teks, maksimal 100 karakter
  const judul = typeof body.judul === 'string' ? body.judul.trim() : '';
  if (!judul) {
    kesalahan.push('Judul wajib diisi');
  } else if (judul.length > 100) {
    kesalahan.push('Judul maksimal 100 karakter');
  }

  // Jenis hanya boleh foto atau video
  const jenisDikirim = typeof body.jenis === 'string' ? body.jenis.trim() : '';
  let jenis = null;
  if (jenisDikirim) {
    if (jenisDikirim !== 'foto' && jenisDikirim !== 'video') {
      kesalahan.push('Jenis harus foto atau video');
    } else {
      jenis = jenisDikirim;
    }
  }

  // POST wajib menyebutkan jenis, sedangkan PUT boleh mengikuti baris lama
  if (req.method === 'POST' && !jenis) {
    kesalahan.push('Jenis wajib diisi');
  }

  // Urutan harus bilangan bulat dan default nol bila dikosongkan
  const urutanMentah = body.urutan;
  const urutanTeks =
    typeof urutanMentah === 'string' ? urutanMentah.trim() : urutanMentah;
  let urutan = 0;
  if (!(urutanTeks === '' || urutanTeks === null || urutanTeks === undefined)) {
    urutan = Number(urutanTeks);
    if (!Number.isInteger(urutan)) {
      kesalahan.push('Urutan harus bilangan bulat');
    }
  }

  // Berkas baru yang sudah lolos pemeriksaan middleware unggah
  const berkasBaru = req.berkasMedia || null;

  // POST wajib menyertakan berkas
  if (req.method === 'POST' && !berkasBaru) {
    kesalahan.push('Berkas wajib diunggah');
  }

  // Jenis yang dikirim harus cocok dengan jenis berkas baru
  if (jenis && berkasBaru && jenis !== berkasBaru.jenis) {
    kesalahan.push('Jenis media tidak cocok dengan berkas');
  }

  // Bila jenis tidak dikirim pada PUT, jenis diambil dari berkas baru
  if (!jenis && berkasBaru) {
    jenis = berkasBaru.jenis;
  }

  // Validasi gagal: berkas baru dibersihkan agar tidak menjadi berkas yatim
  if (kesalahan.length > 0) {
    if (berkasBaru) {
      hapusBerkasBilaAda(berkasBaru.path);
    }
    return res.status(400).json({ pesan: 'Validasi gagal', kesalahan });
  }

  // Meneruskan data yang sudah dibersihkan ke controller
  req.mediaTervalidasi = { judul, jenis, urutan };
  return next();
}

module.exports = { validasiMedia, validasiIdMedia };
