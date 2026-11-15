// Controller media: mengatur request dan response tanpa menulis query SQL
const mediaModel = require('../models/mediaModel');
const {
  resolusiBerkasMedia,
  hapusBerkasBilaAda,
} = require('../utils/mediaBerkas');

// GET /api/media -> seluruh media, dapat difilter dengan ?jenis=foto|video
async function daftar(req, res, next) {
  try {
    const jenis = typeof req.query.jenis === 'string' ? req.query.jenis : '';

    // Nilai filter selain foto dan video ditolak sebagai kesalahan pengguna
    if (jenis && jenis !== 'foto' && jenis !== 'video') {
      return res.status(400).json({ pesan: 'Filter jenis harus foto atau video' });
    }

    const data = await mediaModel.ambilSemua(jenis || undefined);
    return res.status(200).json(data);
  } catch (galat) {
    return next(galat);
  }
}

// GET /api/media/:id -> satu media berdasarkan id
async function detail(req, res, next) {
  try {
    const data = await mediaModel.ambilBerdasarkanId(req.idMedia);
    if (!data) {
      return res.status(404).json({ pesan: 'Media tidak ditemukan' });
    }
    return res.status(200).json(data);
  } catch (galat) {
    return next(galat);
  }
}

// POST /api/media -> menambah media baru bersama berkas yang sudah diunggah
async function buat(req, res, next) {
  try {
    const data = req.mediaTervalidasi;
    const hasil = await mediaModel.tambah({
      jenis: data.jenis,
      judul: data.judul,
      berkas: req.berkasMedia.berkas,
      urutan: data.urutan,
    });
    return res.status(201).json(hasil);
  } catch (galat) {
    // Baris gagal dibuat: berkas baru dihapus agar tidak menjadi yatim
    if (req.berkasMedia) {
      hapusBerkasBilaAda(req.berkasMedia.path);
    }
    return next(galat);
  }
}

// PUT /api/media/:id -> mengubah judul, urutan, dan berkas secara opsional
async function ubah(req, res, next) {
  try {
    // Baris lama dibaca lebih dulu untuk menentukan jenis dan berkas lama
    const lama = await mediaModel.ambilBerdasarkanId(req.idMedia);
    if (!lama) {
      if (req.berkasMedia) {
        hapusBerkasBilaAda(req.berkasMedia.path);
      }
      return res.status(404).json({ pesan: 'Media tidak ditemukan' });
    }

    // Jenis media tidak boleh berpindah antara foto dan video
    if (req.berkasMedia && req.berkasMedia.jenis !== lama.jenis) {
      hapusBerkasBilaAda(req.berkasMedia.path);
      return res.status(400).json({ pesan: 'Jenis media tidak cocok dengan berkas' });
    }

    const data = req.mediaTervalidasi;
    const berkasBaru = req.berkasMedia ? req.berkasMedia.berkas : lama.berkas;
    const hasil = await mediaModel.ubah(req.idMedia, {
      judul: data.judul,
      berkas: berkasBaru,
      urutan: data.urutan,
    });

    if (!hasil) {
      if (req.berkasMedia) {
        hapusBerkasBilaAda(req.berkasMedia.path);
      }
      return res.status(404).json({ pesan: 'Media tidak ditemukan' });
    }

    // Berkas lama dihapus dengan aman setelah pembaruan berhasil
    if (req.berkasMedia && lama.berkas !== hasil.berkas) {
      const lokasiLama = resolusiBerkasMedia(lama.berkas);
      if (lokasiLama && !(await mediaModel.berkasDirujuk(lama.berkas))) {
        hapusBerkasBilaAda(lokasiLama);
      }
    }

    return res.status(200).json(hasil);
  } catch (galat) {
    // Pembaruan gagal: berkas baru dibersihkan, baris lama tetap utuh
    if (req.berkasMedia) {
      hapusBerkasBilaAda(req.berkasMedia.path);
    }
    return next(galat);
  }
}

// DELETE /api/media/:id -> menghapus baris lalu berkas bila aman
async function hapus(req, res, next) {
  try {
    const lama = await mediaModel.ambilBerdasarkanId(req.idMedia);
    if (!lama) {
      return res.status(404).json({ pesan: 'Media tidak ditemukan' });
    }

    // Baris dihapus lebih dulu agar tidak ada baris tanpa berkas
    const data = await mediaModel.hapus(req.idMedia);
    if (!data) {
      return res.status(404).json({ pesan: 'Media tidak ditemukan' });
    }

    // Berkas hanya dihapus bila berada di folder aman dan tidak dirujuk data lain
    const lokasi = resolusiBerkasMedia(lama.berkas);
    if (lokasi) {
      try {
        if (!(await mediaModel.berkasDirujuk(lama.berkas))) {
          hapusBerkasBilaAda(lokasi);
        }
      } catch (galatRujukan) {
        // Bila pemeriksaan rujukan gagal, berkas dibiarkan agar tidak salah hapus
        console.error('Gagal memeriksa rujukan berkas media:', galatRujukan.message);
      }
    }

    return res.status(200).json({ pesan: 'Media berhasil dihapus', data });
  } catch (galat) {
    return next(galat);
  }
}

module.exports = { daftar, detail, buat, ubah, hapus };
