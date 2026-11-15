// Utilitas berkas media: folder, nama aman, path URL, dan pemeriksaan lokasi
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { buatSlug } = require('./slug');

// Folder akar aset yang disajikan Express melalui prefiks /media
const akarAset = path.join(__dirname, '..', 'assets');

// Folder media baru dipisahkan sesuai jenisnya
const folderFoto = path.join(akarAset, 'galeri');
const folderVideo = path.join(akarAset, 'video');

// Folder sementara dipakai bila jenis belum diketahui saat multer menyimpan
const folderSementara = path.join(akarAset, '.unggah-sementara');

// Folder foto produk tidak boleh dipakai untuk unggahan media
const folderMenu = path.join(akarAset, 'menu');

// Membuat folder bila belum tersedia
function pastikanFolder(lokasi) {
  fs.mkdirSync(lokasi, { recursive: true });
}

// Menentukan folder akhir berdasarkan jenis media
function folderUntukJenis(jenis) {
  return jenis === 'video' ? folderVideo : folderFoto;
}

// Membuat nama berkas dari slug judul, waktu, dan nilai acak
function buatNamaBerkas(judul, namaAsli) {
  const ekstensi = path.extname(namaAsli || '').toLowerCase();
  const dasarJudul =
    buatSlug(judul || '') ||
    buatSlug(path.basename(namaAsli || '', ekstensi)) ||
    'media';
  const dasar = dasarJudul.slice(0, 60).replace(/-+$/g, '') || 'media';
  const penanda = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  return `${dasar}-${penanda}${ekstensi}`;
}

// Mengubah lokasi berkas absolut menjadi path URL di bawah /media
function jalurPublikUntukBerkas(lokasiAbsolut) {
  const relatif = path.relative(akarAset, lokasiAbsolut);
  const bagian = relatif.split(path.sep).map(function (teks) {
    return encodeURIComponent(teks);
  });

  return '/media/' + bagian.join('/');
}

// Mengubah path URL menjadi lokasi absolut hanya bila berada di folder aman
function resolusiBerkasMedia(berkas) {
  if (typeof berkas !== 'string' || !berkas.startsWith('/media/')) {
    return null;
  }

  let relatif;
  try {
    relatif = decodeURIComponent(berkas.slice('/media/'.length));
  } catch (galat) {
    return null;
  }

  // Backslash dan karakter nol ditolak agar tidak dipakai untuk traversal
  if (!relatif || relatif.includes('\0') || relatif.includes('\\')) {
    return null;
  }

  const akar = path.resolve(akarAset);
  const absolut = path.resolve(akar, relatif);

  // Hasil resolusi wajib tetap berada di dalam folder aset
  if (absolut !== akar && !absolut.startsWith(akar + path.sep)) {
    return null;
  }

  // Berkas hanya boleh berada langsung di akar aset, folder galeri, atau folder video
  const induk = path.resolve(path.dirname(absolut));
  const indukDiizinkan = [
    akar,
    path.resolve(folderFoto),
    path.resolve(folderVideo),
  ];

  // Folder menu dan folder lain di luar daftar dianggap tidak aman
  if (induk === path.resolve(folderMenu) || !indukDiizinkan.includes(induk)) {
    return null;
  }

  return absolut;
}

// Menghapus berkas bila ada tanpa menghentikan alur bila gagal
function hapusBerkasBilaAda(lokasiAbsolut) {
  if (!lokasiAbsolut) {
    return;
  }

  try {
    if (fs.existsSync(lokasiAbsolut)) {
      fs.unlinkSync(lokasiAbsolut);
    }
  } catch (galat) {
    console.error('Gagal menghapus berkas media:', galat.message);
  }
}

module.exports = {
  akarAset,
  folderFoto,
  folderVideo,
  folderSementara,
  pastikanFolder,
  folderUntukJenis,
  buatNamaBerkas,
  jalurPublikUntukBerkas,
  resolusiBerkasMedia,
  hapusBerkasBilaAda,
};
