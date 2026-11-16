// Service konteks: menyusun teks konteks dari database dan konfigurasi kedai
// Hasil disimpan di memori paling lama 60 detik agar tidak query berulang
const config = require('../config');
const produkModel = require('../models/produkModel');
const mediaModel = require('../models/mediaModel');
const { formatRentangHarga } = require('../utils/formatter');

// Lama cache konteks dalam milidetik
const UMUR_CACHE_MS = 60000;

// Cache tunggal di memori proses
let cache = null;
// Waktu kedaluwarsa cache
let kedaluwarsa = 0;

// Menambahkan seluruh angka pada teks ke kumpulan token yang diizinkan
function tambahTokenAngka(kumpulan, nilai) {
  // Teks diubah ke string agar angka dan teks diperlakukan sama
  const teks = String(nilai == null ? '' : nilai);
  // Setiap deretan angka diambil sebagai token
  const cocok = teks.match(/\d+/g) || [];
  // Token disimpan dalam bentuk asli dan bentuk kanonik
  cocok.forEach(function (token) {
    kumpulan.add(token);
    kumpulan.add(String(Number(token)));
  });
}

// Menyusun seluruh konteks dari database dan konfigurasi kedai
async function bangunKonteks() {
  // Cache yang masih berlaku dikembalikan langsung
  if (cache && Date.now() < kedaluwarsa) {
    return cache;
  }

  // Seluruh produk dan media diambil paralel dari model
  const [daftarProduk, daftarMedia] = await Promise.all([
    produkModel.ambilSemua(),
    mediaModel.ambilSemua(),
  ]);

  // Jumlah foto dan video dihitung dari baris media
  const jumlahFoto = daftarMedia.filter(function (item) {
    return item.jenis === 'foto';
  }).length;
  // Jumlah video dihitung terpisah
  const jumlahVideo = daftarMedia.filter(function (item) {
    return item.jenis === 'video';
  }).length;

  // Kategori unik dipakai sebagai informasi tambahan yang benar
  const kategori = Array.from(
    new Set(
      daftarProduk.map(function (item) {
        return item.kategori;
      })
    )
  );

  // Peta harga menyimpan harga terformat untuk penggantian penanda
  const petaHarga = new Map();
  // Daftar id valid dipakai memeriksa menuDirujuk model
  const idValid = new Set();

  // Setiap menu ditulis satu baris agar mudah dibaca model
  const barisMenu = daftarProduk.map(function (item) {
    // Harga mentah ditulis sebagai angka agar model tidak menyalin format rupiah
    const harga =
      item.hargaMaks !== null && item.hargaMaks !== undefined && Number(item.hargaMaks) > Number(item.harga)
        ? `${item.harga}-${item.hargaMaks}`
        : String(item.harga);
    // Harga terformat dipakai backend saat mengganti penanda
    petaHarga.set(item.id, formatRentangHarga(item.harga, item.hargaMaks));
    // Id menu dicatat sebagai id valid
    idValid.add(item.id);
    // Deskripsi kosong diganti tanda hubung
    const deskripsi = item.deskripsi ? String(item.deskripsi).replace(/\s+/g, ' ').trim() : '-';
    // Satu baris menu sesuai format yang diminta
    return `[id=${item.id}] ${item.nama} | kategori: ${item.kategori} | harga: ${harga} | tersedia: ${
      item.tersedia ? 'ya' : 'tidak'
    } | deskripsi: ${deskripsi}`;
  });

  // Teks konteks disusun dari informasi kedai, jumlah data, dan daftar menu
  const teks = [
    'INFORMASI KEDAI',
    `- Nama: ${config.namaKafe}`,
    `- Tagline: ${config.tagline}`,
    `- Alamat: ${config.kontak.alamat}`,
    `- Jam buka: ${config.kontak.jam}`,
    `- Instagram: ${config.kontak.instagram}`,
    `- Tautan peta: ${config.kontak.peta}`,
    `- Jumlah menu: ${daftarProduk.length}`,
    `- Jumlah kategori menu: ${kategori.length}`,
    `- Jumlah foto galeri: ${jumlahFoto}`,
    `- Jumlah video galeri: ${jumlahVideo}`,
    '',
    'DAFTAR MENU',
    ...barisMenu,
  ].join('\n');

  // Token angka yang boleh muncul di jawaban: jam buka dan jumlah dari konteks
  const tokenAngkaKonteks = new Set();
  // Angka jam buka dimasukkan
  tambahTokenAngka(tokenAngkaKonteks, config.kontak.jam);
  // Angka jumlah menu, kategori, foto, dan video dimasukkan
  tambahTokenAngka(tokenAngkaKonteks, daftarProduk.length);
  tambahTokenAngka(tokenAngkaKonteks, kategori.length);
  tambahTokenAngka(tokenAngkaKonteks, jumlahFoto);
  tambahTokenAngka(tokenAngkaKonteks, jumlahVideo);

  // URL yang boleh ditulis model hanya tautan yang ada di konteks
  const urlDiizinkan = [config.kontak.instagram, config.kontak.peta];

  // Hasil lengkap disimpan ke cache
  cache = {
    teks,
    petaHarga,
    idValid,
    tokenAngkaKonteks,
    urlDiizinkan,
    jumlahProduk: daftarProduk.length,
    jumlahFoto,
    jumlahVideo,
    daftarProduk,
  };
  // Waktu kedaluwarsa diperbarui
  kedaluwarsa = Date.now() + UMUR_CACHE_MS;

  // Hasil dikembalikan ke pemanggil
  return cache;
}

// Mengosongkan cache; dipakai pengujian atau setelah data berubah
function kosongkanCache() {
  // Cache dan waktu kedaluwarsa dihapus
  cache = null;
  kedaluwarsa = 0;
}

// Ekspor fungsi utama dan pembantu cache
module.exports = { bangunKonteks, kosongkanCache, UMUR_CACHE_MS };
