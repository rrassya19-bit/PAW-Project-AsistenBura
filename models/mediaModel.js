const fs = require('fs');
const path = require('path');

const mediaDir = path.join(__dirname, '..', 'assets');

const ekstensiFoto = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
const ekstensiVideo = ['.mp4', '.webm', '.ogg'];

// Urutan koleksi dibuat tetap supaya tampilan galeri konsisten.
const urutanKoleksi = ['Ruang', 'Signature', 'Dirty', 'Pastry', 'Pagi', 'Kru', 'Lokasi'];

// Aturan pengelompokan berdasarkan judul/caption asli file.
// Aturan yang lebih spesifik diletakkan lebih dulu.
const aturanKoleksi = [
  ['five years', 'Kru'],
  ['pastry', 'Pastry'],
  ['crunch', 'Pastry'],
  ['lokasi', 'Lokasi'],
  ['inilah sekilas', 'Ruang'],
  ['headquarters', 'Ruang'],
  ['morning light', 'Ruang'],
  ['sunlight', 'Ruang'],
  ['sudut outdoor', 'Ruang'],
  ['sometimes, all you need', 'Ruang'],
  ['energi pagi', 'Pagi'],
  ['buka lebih pagi', 'Pagi'],
  ['mana pilihanmu', 'Signature'],
  ['masing-masing signature', 'Signature'],
  ["if you're not sure", 'Signature'],
  ['apa yang lebih enak', 'Signature'],
  ['which signature', 'Signature'],
  ['morning call', 'Signature'],
  ['two lattes', 'Signature'],
  ['craving a coffee', 'Dirty'],
  ['looks dirty latte', 'Dirty'],
  ['make dirty great again', 'Dirty'],
  ['nothing boring', 'Dirty'],
  ['dirty latte kami', 'Dirty'],
  ['watermelon', 'Dirty'],
  ['dirty', 'Dirty'],
];

function bacaBerkas() {
  try {
    return fs
      .readdirSync(mediaDir, { withFileTypes: true })
      .filter((berkas) => berkas.isFile())
      .map((berkas) => berkas.name);
  } catch (galat) {
    return [];
  }
}

function buatUrl(nama) {
  return '/media/' + encodeURIComponent(nama);
}

function tentukanKoleksi(nama) {
  const teks = nama.toLowerCase();

  for (let i = 0; i < aturanKoleksi.length; i += 1) {
    if (teks.includes(aturanKoleksi[i][0])) {
      return aturanKoleksi[i][1];
    }
  }

  return 'Signature';
}

function ambilEkstensi(nama) {
  return path.extname(nama).toLowerCase();
}

function urutkanAlami(a, b) {
  return a.localeCompare(b, 'id', { numeric: true, sensitivity: 'base' });
}

function getAll() {
  const berkas = bacaBerkas().sort(urutkanAlami);

  const photos = berkas
    .filter((nama) => ekstensiFoto.includes(ambilEkstensi(nama)))
    .map((nama, indeks) => {
      const koleksi = tentukanKoleksi(nama);

      return {
        nama: nama,
        src: buatUrl(nama),
        alt: koleksi + ' Bura Bura Coffee',
        koleksi: koleksi,
        indeks: indeks,
      };
    });

  const videos = berkas
    .filter((nama) => ekstensiVideo.includes(ambilEkstensi(nama)))
    .map((nama, indeks) => {
      const koleksi = tentukanKoleksi(nama);
      const poster = photos.find((foto) => foto.koleksi === koleksi) || photos[indeks % Math.max(photos.length, 1)];

      return {
        nama: nama,
        src: buatUrl(nama),
        poster: poster ? poster.src : '',
        koleksi: koleksi,
        indeks: indeks,
      };
    });

  const koleksi = urutanKoleksi
    .map((nama) => {
      const jumlah = photos.filter((foto) => foto.koleksi === nama).length;
      return { nama: nama, jumlah: jumlah };
    })
    .filter((item) => item.jumlah > 0);

  // Foto utama hero: sudut Headquarters, dengan fallback ke koleksi Ruang.
  const hero =
    photos.find((foto) => /headquarters/.test(foto.nama.toLowerCase()) && /3y/.test(foto.nama.toLowerCase())) ||
    photos.find((foto) => foto.koleksi === 'Ruang') ||
    photos[0] ||
    null;

  // Foto untuk strip berjalan: diambil menyebar agar semua koleksi terwakili.
  const marquee = photos
    .filter((foto, indeks) => indeks % 5 === 0)
    .slice(0, 14);

  return {
    photos: photos,
    videos: videos,
    koleksi: koleksi,
    hero: hero,
    marquee: marquee.length ? marquee : photos.slice(0, 14),
    totalFoto: photos.length,
    totalVideo: videos.length,
  };
}

module.exports = { getAll };
