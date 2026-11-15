// Model media: seluruh operasi dan query database untuk tabel media
const { query } = require('../config/database');

// Daftar kolom dipakai konsisten agar hasil query mudah dipetakan
const kolomMedia = 'id, jenis, judul, berkas, urutan, created_at, updated_at';

// Urutan koleksi dibuat tetap supaya tampilan galeri konsisten
const urutanKoleksi = ['Ruang', 'Signature', 'Dirty', 'Pastry', 'Pagi', 'Kru', 'Lokasi'];

// Aturan pengelompokan berdasarkan judul atau nama berkas
// Aturan yang lebih spesifik diletakkan lebih dulu
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

// Mengubah kolom snake_case dari database menjadi camelCase untuk JSON
function petakanBaris(baris) {
  if (!baris) {
    return null;
  }

  return {
    id: baris.id,
    jenis: baris.jenis,
    judul: baris.judul,
    berkas: baris.berkas,
    urutan: baris.urutan,
    dibuatPada: baris.created_at,
    diubahPada: baris.updated_at,
  };
}

// Mengambil semua media; jenis opsional berisi foto atau video
async function ambilSemua(jenis) {
  // Query berparameter dipakai bila filter jenis dikirim
  if (jenis) {
    const hasil = await query(
      `SELECT ${kolomMedia} FROM media WHERE jenis = $1 ORDER BY urutan ASC, id ASC`,
      [jenis]
    );
    return hasil.rows.map(petakanBaris);
  }

  // Tanpa filter, seluruh media diurutkan sesuai urutan lalu id
  const hasil = await query(
    `SELECT ${kolomMedia} FROM media ORDER BY urutan ASC, id ASC`
  );
  return hasil.rows.map(petakanBaris);
}

// Mengambil satu media berdasarkan id; null bila tidak ditemukan
async function ambilBerdasarkanId(id) {
  const hasil = await query(
    `SELECT ${kolomMedia} FROM media WHERE id = $1`,
    [id]
  );
  return petakanBaris(hasil.rows[0]);
}

// Menambah media baru dan mengembalikan baris yang dibuat
async function tambah(data) {
  const hasil = await query(
    `INSERT INTO media (jenis, judul, berkas, urutan)
     VALUES ($1, $2, $3, $4)
     RETURNING ${kolomMedia}`,
    [data.jenis, data.judul, data.berkas, data.urutan]
  );
  return petakanBaris(hasil.rows[0]);
}

// Mengubah media berdasarkan id dan memperbarui waktu perubahan
async function ubah(id, data) {
  const hasil = await query(
    `UPDATE media
     SET judul = $1,
         berkas = $2,
         urutan = $3,
         updated_at = NOW()
     WHERE id = $4
     RETURNING ${kolomMedia}`,
    [data.judul, data.berkas, data.urutan, id]
  );
  return petakanBaris(hasil.rows[0]);
}

// Menghapus media berdasarkan id; mengembalikan baris yang dihapus atau null
async function hapus(id) {
  const hasil = await query(
    `DELETE FROM media WHERE id = $1 RETURNING ${kolomMedia}`,
    [id]
  );
  return petakanBaris(hasil.rows[0]);
}

// Memeriksa apakah path berkas sudah terdaftar pada tabel media
async function cekAdaBerkas(berkas) {
  const hasil = await query(
    'SELECT id FROM media WHERE berkas = $1 LIMIT 1',
    [berkas]
  );
  return hasil.rows.length > 0;
}

// Memeriksa apakah berkas masih dirujuk media lain atau kolom foto produk
async function berkasDirujuk(berkas) {
  const hasil = await query(
    `SELECT
       (SELECT COUNT(*)::int FROM media WHERE berkas = $1) AS media,
       (SELECT COUNT(*)::int FROM produk WHERE foto = $1) AS produk`,
    [berkas]
  );
  const jumlah = hasil.rows[0];
  return jumlah.media > 0 || jumlah.produk > 0;
}

// Mengambil nama berkas dari path URL untuk keperluan pengelompokan
function ekstrakNama(berkas) {
  const bagian = String(berkas).split('/').pop();

  // Path yang mengandung persen didekode agar nama asli terbaca
  try {
    return decodeURIComponent(bagian);
  } catch (galat) {
    return bagian;
  }
}

// Menentukan koleksi media dari judul dan nama berkas
function tentukanKoleksi(teks) {
  const teksKecil = String(teks).toLowerCase();

  for (let i = 0; i < aturanKoleksi.length; i += 1) {
    if (teksKecil.includes(aturanKoleksi[i][0])) {
      return aturanKoleksi[i][1];
    }
  }

  return 'Signature';
}

// Menyusun data tampilan publik dari baris media di database
async function getAll() {
  // Foto dan video diambil terpisah agar poster video dapat memakai foto
  const daftarFoto = await ambilSemua('foto');
  const daftarVideo = await ambilSemua('video');

  // Setiap foto dipetakan ke bentuk yang dipakai template lama
  const photos = daftarFoto.map(function (item, indeks) {
    const nama = ekstrakNama(item.berkas);
    const koleksi = tentukanKoleksi(item.judul + ' ' + nama + ' ' + item.berkas);

    return {
      id: item.id,
      nama: nama,
      judul: item.judul,
      src: item.berkas,
      alt: koleksi + ' Bura Bura Coffee',
      koleksi: koleksi,
      urutan: item.urutan,
      indeks: indeks,
    };
  });

  // Setiap video memakai poster dari foto koleksi yang sama bila tersedia
  const videos = daftarVideo.map(function (item, indeks) {
    const nama = ekstrakNama(item.berkas);
    const koleksi = tentukanKoleksi(item.judul + ' ' + nama + ' ' + item.berkas);
    const poster =
      photos.find(function (foto) {
        return foto.koleksi === koleksi;
      }) || photos[indeks % Math.max(photos.length, 1)];

    return {
      id: item.id,
      nama: nama,
      judul: item.judul,
      src: item.berkas,
      poster: poster ? poster.src : '',
      koleksi: koleksi,
      urutan: item.urutan,
      indeks: indeks,
    };
  });

  // Jumlah foto per koleksi dipakai oleh filter galeri
  const koleksi = urutanKoleksi
    .map(function (nama) {
      const jumlah = photos.filter(function (foto) {
        return foto.koleksi === nama;
      }).length;
      return { nama: nama, jumlah: jumlah };
    })
    .filter(function (item) {
      return item.jumlah > 0;
    });

  // Foto utama hero: sudut Headquarters, dengan cadangan koleksi Ruang
  const hero =
    photos.find(function (foto) {
      const teks = (foto.nama + ' ' + foto.judul).toLowerCase();
      return /headquarters/.test(teks) && /3y/.test(teks);
    }) ||
    photos.find(function (foto) {
      return foto.koleksi === 'Ruang';
    }) ||
    photos[0] ||
    null;

  // Foto strip berjalan diambil menyebar agar semua koleksi terwakili
  const marquee = photos
    .filter(function (foto, indeks) {
      return indeks % 5 === 0;
    })
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

module.exports = {
  ambilSemua,
  ambilBerdasarkanId,
  tambah,
  ubah,
  hapus,
  cekAdaBerkas,
  berkasDirujuk,
  getAll,
};
