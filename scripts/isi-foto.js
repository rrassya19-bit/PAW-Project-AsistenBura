// Skrip pengisian foto menu berdasarkan nama produk dan berkas di assets/menu
const fs = require('fs');
const path = require('path');
const produkModel = require('../models/produkModel');
const { buatSlug } = require('../utils/slug');
const { pool } = require('../config/database');

// Folder sumber foto dan urutan ekstensi yang dicari
const folderFoto = path.join(__dirname, '..', 'assets', 'menu');
const daftarEkstensi = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];

// Opsi --timpa dipakai untuk mengganti foto yang sudah terisi
const timpa = process.argv.includes('--timpa');

// Membaca berkas foto dan memetakan nama huruf kecil ke nama asli
function bacaDaftarBerkas() {
  try {
    return fs
      .readdirSync(folderFoto, { withFileTypes: true })
      .filter(function (berkas) {
        return berkas.isFile();
      })
      .reduce(function (peta, berkas) {
        const ekstensi = path.extname(berkas.name).toLowerCase();
        if (daftarEkstensi.includes(ekstensi)) {
          peta.set(berkas.name.toLowerCase(), berkas.name);
        }
        return peta;
      }, new Map());
  } catch (galat) {
    return new Map();
  }
}

// Mencari berkas foto yang cocok dengan slug nama produk
function cariBerkas(petaBerkas, slug) {
  if (!slug) {
    return null;
  }

  for (const ekstensi of daftarEkstensi) {
    const kandidat = slug + ekstensi;
    if (petaBerkas.has(kandidat)) {
      return petaBerkas.get(kandidat);
    }
  }

  return null;
}

// Menjalankan pengisian foto untuk seluruh produk
async function jalankan() {
  const petaBerkas = bacaDaftarBerkas();
  const daftarProduk = await produkModel.ambilSemua();
  const berhasil = [];
  const dilewati = [];

  for (const produk of daftarProduk) {
    // Produk yang sudah berfoto dilewati kecuali memakai --timpa
    if (produk.foto && !timpa) {
      dilewati.push({ nama: produk.nama, alasan: 'foto sudah ada' });
      continue;
    }

    const namaBerkas = cariBerkas(petaBerkas, buatSlug(produk.nama));
    if (!namaBerkas) {
      dilewati.push({ nama: produk.nama, alasan: 'berkas tidak ditemukan' });
      continue;
    }

    // Alamat disimpan memakai prefiks /media agar cocok dengan static Express
    const alamatFoto = '/media/menu/' + namaBerkas;

    await produkModel.ubah(produk.id, {
      nama: produk.nama,
      kategori: produk.kategori,
      harga: produk.harga,
      hargaMaks: produk.hargaMaks,
      deskripsi: produk.deskripsi,
      foto: alamatFoto,
      tersedia: produk.tersedia,
    });

    berhasil.push({ nama: produk.nama, berkas: namaBerkas });
  }

  // Ringkasan hasil pengisian
  console.log(`Foto terisi: ${berhasil.length}`);
  berhasil.forEach(function (item) {
    console.log(`- ${item.nama} (${item.berkas})`);
  });

  console.log(`Dilewati: ${dilewati.length}`);
  dilewati.forEach(function (item) {
    console.log(`- ${item.nama} (${item.alasan})`);
  });
}

// Menjalankan skrip lalu menutup pool database
jalankan()
  .catch(function (galat) {
    console.error('Pengisian foto gagal:', galat.message);
    process.exitCode = 1;
  })
  .finally(async function () {
    await pool.end();
  });
