// Skrip impor media: mendaftarkan berkas foto dan video lama ke tabel media
const fs = require('fs');
const path = require('path');
const mediaModel = require('../models/mediaModel');
const { pool } = require('../config/database');

// Folder akar aset dan folder turunan yang ikut dipindai
const akarAset = path.join(__dirname, '..', 'assets');
const folderPindai = [
  akarAset,
  path.join(akarAset, 'galeri'),
  path.join(akarAset, 'video'),
];

// Ekstensi yang dikenali sebagai foto dan video galeri
const ekstensiFoto = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
const ekstensiVideo = ['.mp4', '.webm', '.ogg'];

// Mengurutkan nama berkas secara alami agar angka tetap berurutan
function urutkanAlami(a, b) {
  return a.localeCompare(b, 'id', { numeric: true, sensitivity: 'base' });
}

// Membaca berkas pada setiap folder pindai tanpa menyentuh assets/menu
function bacaBerkas() {
  const hasil = [];

  folderPindai.forEach(function (folder) {
    if (!fs.existsSync(folder)) {
      return;
    }

    fs.readdirSync(folder, { withFileTypes: true }).forEach(function (berkas) {
      if (berkas.isFile()) {
        hasil.push({ folder: folder, nama: berkas.name });
      }
    });
  });

  return hasil;
}

// Menentukan jenis media dari ekstensi berkas
function jenisBerkas(nama) {
  const ekstensi = path.extname(nama).toLowerCase();

  if (ekstensiFoto.includes(ekstensi)) {
    return 'foto';
  }
  if (ekstensiVideo.includes(ekstensi)) {
    return 'video';
  }
  return null;
}

// Membuat path URL dari lokasi berkas di dalam folder aset
function buatPathUrl(folder, nama) {
  const relatif = path.relative(akarAset, path.join(folder, nama));
  const bagian = relatif.split(path.sep).map(function (teks) {
    return encodeURIComponent(teks);
  });
  return '/media/' + bagian.join('/');
}

// Membuat judul awal dari nama berkas yang dirapikan
function buatJudul(nama) {
  const tanpaEkstensi = path.basename(nama, path.extname(nama));
  const bersih = tanpaEkstensi
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const judul = bersih ? bersih.charAt(0).toUpperCase() + bersih.slice(1) : 'Media';

  // Judul dibatasi 100 karakter sesuai kolom database
  return judul.slice(0, 100);
}

// Menjalankan impor media yang belum terdaftar di database
async function jalankan() {
  // Berkas dipindai lalu diurutkan sesuai nama berkas
  const daftarBerkas = bacaBerkas().sort(function (a, b) {
    return urutkanAlami(a.nama, b.nama);
  });

  let jumlahDitambah = 0;
  let jumlahDilewati = 0;

  for (let i = 0; i < daftarBerkas.length; i += 1) {
    const berkas = daftarBerkas[i];
    const jenis = jenisBerkas(berkas.nama);

    // Berkas selain foto dan video galeri dilewati
    if (!jenis) {
      jumlahDilewati += 1;
      continue;
    }

    const pathUrl = buatPathUrl(berkas.folder, berkas.nama);

    // Berkas yang sudah ada di tabel media tidak didaftarkan ulang
    if (await mediaModel.cekAdaBerkas(pathUrl)) {
      jumlahDilewati += 1;
      continue;
    }

    await mediaModel.tambah({
      jenis: jenis,
      judul: buatJudul(berkas.nama),
      berkas: pathUrl,
      urutan: i + 1,
    });
    jumlahDitambah += 1;
  }

  // Ringkasan hasil impor
  console.log(`Media ditambahkan: ${jumlahDitambah}`);
  console.log(`Media dilewati: ${jumlahDilewati}`);
}

// Menjalankan skrip lalu menutup pool database
jalankan()
  .catch(function (galat) {
    console.error('Impor media gagal:', galat.message);
    process.exitCode = 1;
  })
  .finally(async function () {
    await pool.end();
  });
