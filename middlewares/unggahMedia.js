// Middleware unggah media: menyimpan berkas ke disk lalu memeriksa keasliannya
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const config = require('../config');
const {
  folderSementara,
  folderUntukJenis,
  pastikanFolder,
  buatNamaBerkas,
  jalurPublikUntukBerkas,
  hapusBerkasBilaAda,
} = require('../utils/mediaBerkas');

// Aturan ekstensi, mimetype, dan tanda tangan byte awal setiap jenis berkas
const aturanBerkas = {
  '.jpg': { jenis: 'foto', mime: ['image/jpeg'], tanda: 'jpg' },
  '.jpeg': { jenis: 'foto', mime: ['image/jpeg'], tanda: 'jpg' },
  '.png': { jenis: 'foto', mime: ['image/png'], tanda: 'png' },
  '.webp': { jenis: 'foto', mime: ['image/webp'], tanda: 'webp' },
  '.mp4': { jenis: 'video', mime: ['video/mp4'], tanda: 'mp4' },
  '.webm': { jenis: 'video', mime: ['video/webm'], tanda: 'webm' },
};

// Batas atas multer memakai batas video; batas foto diperiksa setelah unggah
const batasVideoByte = config.unggah.maksVideoMb * 1024 * 1024;

// Membaca beberapa byte awal berkas untuk pemeriksaan tanda tangan
function bacaKepala(lokasi) {
  const deskriptor = fs.openSync(lokasi, 'r');
  const buffer = Buffer.alloc(16);
  const jumlah = fs.readSync(deskriptor, buffer, 0, buffer.length, 0);
  fs.closeSync(deskriptor);
  return buffer.subarray(0, jumlah);
}

// Memeriksa tanda tangan byte awal sesuai jenis berkas
function cocokTandaTangan(ekstensi, kepala) {
  if (ekstensi === '.jpg' || ekstensi === '.jpeg') {
    return kepala.length >= 3 && kepala[0] === 0xff && kepala[1] === 0xd8 && kepala[2] === 0xff;
  }

  if (ekstensi === '.png') {
    return (
      kepala.length >= 8 &&
      kepala[0] === 0x89 &&
      kepala[1] === 0x50 &&
      kepala[2] === 0x4e &&
      kepala[3] === 0x47
    );
  }

  if (ekstensi === '.webp') {
    return (
      kepala.length >= 12 &&
      kepala.toString('ascii', 0, 4) === 'RIFF' &&
      kepala.toString('ascii', 8, 12) === 'WEBP'
    );
  }

  if (ekstensi === '.mp4') {
    return kepala.length >= 8 && kepala.toString('ascii', 4, 8) === 'ftyp';
  }

  if (ekstensi === '.webm') {
    return (
      kepala.length >= 4 &&
      kepala[0] === 0x1a &&
      kepala[1] === 0x45 &&
      kepala[2] === 0xdf &&
      kepala[3] === 0xa3
    );
  }

  return false;
}

// Penyimpanan disk: folder dipilih dari jenis, nama dibuat oleh server
const penyimpanan = multer.diskStorage({
  destination(req, file, selesai) {
    // Jenis dari body dipakai bila valid; selain itu berkas ditampung sementara
    const jenis = req.body && req.body.jenis;
    const folder = jenis === 'foto' || jenis === 'video' ? folderUntukJenis(jenis) : folderSementara;
    pastikanFolder(folder);
    selesai(null, folder);
  },
  filename(req, file, selesai) {
    // Nama dari klien tidak pernah dipakai mentah-mentah
    selesai(null, buatNamaBerkas(req.body && req.body.judul, file.originalname));
  },
});

// Satu berkas per permintaan dengan batas ukuran video sebagai batas atas
const unggahBerkas = multer({
  storage: penyimpanan,
  limits: { fileSize: batasVideoByte, files: 1 },
}).single('berkas');

// Menjalankan multer lalu memvalidasi jenis, mimetype, isi, dan ukuran berkas
function unggahMedia(req, res, next) {
  unggahBerkas(req, res, function (galat) {
    // Kesalahan multer diteruskan ke errorHandler untuk dipetakan statusnya
    if (galat) {
      return next(galat);
    }

    // PUT tanpa berkas baru diperbolehkan
    if (!req.file) {
      req.berkasMedia = null;
      return next();
    }

    const berkas = req.file;
    const ekstensi = path.extname(berkas.originalname).toLowerCase();
    const aturan = aturanBerkas[ekstensi];

    // Ekstensi harus termasuk daftar yang diizinkan
    if (!aturan) {
      hapusBerkasBilaAda(berkas.path);
      return res.status(400).json({ pesan: 'Jenis berkas tidak didukung' });
    }

    // Mimetype dari klien harus cocok dengan ekstensi
    if (!aturan.mime.includes(berkas.mimetype)) {
      hapusBerkasBilaAda(berkas.path);
      return res.status(400).json({ pesan: 'Tipe berkas tidak cocok dengan ekstensinya' });
    }

    // Isi berkas harus memiliki tanda tangan byte awal yang benar
    if (!cocokTandaTangan(ekstensi, bacaKepala(berkas.path))) {
      hapusBerkasBilaAda(berkas.path);
      return res.status(400).json({ pesan: 'Isi berkas tidak cocok dengan jenisnya' });
    }

    // Jenis yang dikirim klien harus sama dengan jenis berkas sebenarnya
    const jenisDikirim = typeof req.body.jenis === 'string' ? req.body.jenis.trim() : '';
    if (jenisDikirim && jenisDikirim !== aturan.jenis) {
      hapusBerkasBilaAda(berkas.path);
      return res.status(400).json({ pesan: 'Jenis media tidak cocok dengan berkas' });
    }

    // Batas ukuran foto lebih kecil daripada batas ukuran video
    const batasMb =
      aturan.jenis === 'foto' ? config.unggah.maksFotoMb : config.unggah.maksVideoMb;
    if (berkas.size > batasMb * 1024 * 1024) {
      hapusBerkasBilaAda(berkas.path);
      return res.status(413).json({
        pesan: `Ukuran ${aturan.jenis} maksimal ${batasMb} MB`,
      });
    }

    // Berkas dipindahkan ke folder jenisnya bila sebelumnya di folder sementara
    const folderTujuan = folderUntukJenis(aturan.jenis);
    let lokasiAkhir = berkas.path;
    if (path.resolve(path.dirname(lokasiAkhir)) !== path.resolve(folderTujuan)) {
      try {
        pastikanFolder(folderTujuan);
        lokasiAkhir = path.join(folderTujuan, berkas.filename);
        fs.renameSync(berkas.path, lokasiAkhir);
      } catch (galatPindah) {
        hapusBerkasBilaAda(berkas.path);
        return next(galatPindah);
      }
    }

    // Informasi berkas yang sudah tervalidasi dipakai controller
    req.berkasMedia = {
      jenis: aturan.jenis,
      path: lokasiAkhir,
      berkas: jalurPublikUntukBerkas(lokasiAkhir),
      ukuran: berkas.size,
      namaAsli: berkas.originalname,
      mimetype: berkas.mimetype,
    };

    return next();
  });
}

module.exports = unggahMedia;
