// Skrip pemindaian OCR: menandai foto galeri yang bersih dari tulisan sebagai hero
const fs = require('fs');
const path = require('path');
const { createWorker } = require('tesseract.js');
const { pool } = require('../config/database');
const { resolusiBerkasMedia } = require('../utils/mediaBerkas');

// Ambang OCR: kata dianggap tulisan bila confidence tinggi dan cukup panjang
const CONFIDENCE_MINIMAL = 70;
// Minimal jumlah huruf pada satu kata agar dianggap tulisan
const HURUF_MINIMAL = 3;
// Jumlah kata bertulisan yang masih ditoleransi; nol berarti tidak ada toleransi
const KATA_MAKS = 0;

// Folder cache data bahasa OCR, tidak pernah ikut repositori
const folderCache = path.join(__dirname, '..', '.cache-ocr');

// Argumen --ulang mengatur ulang seluruh foto sesuai hasil OCR terbaru
const ulangSemua = process.argv.slice(2).includes('--ulang');

// Menghitung huruf pada teks kata tanpa angka dan tanda baca
function hitungHuruf(teks) {
  return String(teks).replace(/[^A-Za-z\u00C0-\u024F]/g, '').length;
}

// Mengambil daftar kata dari keluaran OCR blok maupun daftar kata langsung
function ambilKata(data) {
  if (Array.isArray(data.words)) {
    return data.words;
  }

  const hasil = [];
  const blok = Array.isArray(data.blocks) ? data.blocks : [];

  blok.forEach(function (item) {
    (item.paragraphs || []).forEach(function (paragraf) {
      (paragraf.lines || []).forEach(function (baris) {
        (baris.words || []).forEach(function (kata) {
          hasil.push(kata);
        });
      });
    });
  });

  return hasil;
}

// Menentukan kata yang cukup kuat untuk dianggap tulisan
function kataTertulis(daftarKata) {
  return daftarKata.filter(function (kata) {
    return (
      Number(kata.confidence) >= CONFIDENCE_MINIMAL &&
      hitungHuruf(kata.text) >= HURUF_MINIMAL
    );
  });
}

// Menyusun ringkasan kata dan confidence tertinggi untuk laporan
function ringkasKata(daftarKata) {
  const teksKata = daftarKata
    .slice(0, 8)
    .map(function (kata) {
      return `${String(kata.text).trim()} (${Math.round(Number(kata.confidence))}%)`;
    })
    .join(', ');

  const confidenceTertinggi = daftarKata.reduce(function (tertinggi, kata) {
    return Math.max(tertinggi, Number(kata.confidence) || 0);
  }, 0);

  return {
    teks: teksKata,
    confidence: confidenceTertinggi,
  };
}

// Memeriksa apakah kegagalan berasal dari unduhan data bahasa
function galatJaringan(galat) {
  const pesan = String((galat && galat.message) || galat || '');
  return /network|fetch|download|ENOTFOUND|EAI_AGAIN|ECONN|ETIMEDOUT|timeout/i.test(pesan);
}

// Mengambil seluruh baris foto dari database tanpa mengubah data
async function ambilFoto() {
  const hasil = await pool.query(
    "SELECT id, judul, berkas, hero FROM media WHERE jenis = 'foto' ORDER BY id ASC"
  );
  return hasil.rows;
}

// Menjalankan OCR berurutan lalu mengembalikan hasil per foto
async function pindaiFoto(daftarFoto, worker) {
  const hasil = [];

  for (let i = 0; i < daftarFoto.length; i += 1) {
    const foto = daftarFoto[i];
    const nomor = i + 1;
    const lokasi = resolusiBerkasMedia(foto.berkas);

    // Berkas yang tidak ada di disk dilewati tanpa mengubah database
    if (!lokasi || !fs.existsSync(lokasi)) {
      console.log(`[${nomor}/${daftarFoto.length}] LEWATI ${foto.berkas} (berkas tidak ditemukan)`);
      hasil.push({ foto, status: 'dilewati' });
      continue;
    }

    console.log(`[${nomor}/${daftarFoto.length}] PINDAI ${path.basename(lokasi)}`);

    try {
      const { data } = await worker.recognize(lokasi, {}, { blocks: true });
      const daftarKata = ambilKata(data);
      const tertulis = kataTertulis(daftarKata);

      if (tertulis.length > KATA_MAKS) {
        const ringkasan = ringkasKata(tertulis);
        console.log(
          `[${nomor}/${daftarFoto.length}] BERTULISAN ${foto.berkas} -> ${ringkasan.teks} (tertinggi ${Math.round(ringkasan.confidence)}%)`
        );
        hasil.push({ foto, status: 'bertulisan' });
      } else {
        console.log(`[${nomor}/${daftarFoto.length}] BERSIH ${foto.berkas}`);
        hasil.push({ foto, status: 'bersih' });
      }
    } catch (galat) {
      // Kegagalan satu berkas tidak menghentikan pemindaian foto lain
      console.log(`[${nomor}/${daftarFoto.length}] GAGAL ${foto.berkas} (${galat.message})`);
      hasil.push({ foto, status: 'dilewati' });
    }
  }

  return hasil;
}

// Menerapkan hasil OCR ke kolom hero setelah seluruh pemindaian selesai
async function terapkanHasil(hasil) {
  let bersih = 0;
  let bertulisan = 0;
  let dilewati = 0;

  for (const item of hasil) {
    if (item.status === 'bersih') {
      bersih += 1;

      // Foto bersih hanya dinaikkan dari FALSE menjadi TRUE
      await pool.query(
        'UPDATE media SET hero = TRUE, updated_at = NOW() WHERE id = $1 AND hero = FALSE',
        [item.foto.id]
      );
    } else if (item.status === 'bertulisan') {
      bertulisan += 1;

      // Tanpa --ulang, baris TRUE dibiarkan; dengan --ulang seluruh foto disetel ulang
      if (ulangSemua) {
        await pool.query(
          'UPDATE media SET hero = FALSE, updated_at = NOW() WHERE id = $1',
          [item.foto.id]
        );
      }
    } else {
      dilewati += 1;
    }
  }

  return { bersih, bertulisan, dilewati };
}

// Menjalankan pemindaian lengkap lalu menutup koneksi database
async function jalankan() {
  const daftarFoto = await ambilFoto();
  fs.mkdirSync(folderCache, { recursive: true });

  let worker = null;

  try {
    console.log(`Memindai ${daftarFoto.length} foto dengan OCR eng+ind...`);

    try {
      worker = await createWorker('eng+ind', 1, {
        cachePath: folderCache,
      });
    } catch (galat) {
      if (galatJaringan(galat)) {
        console.error(
          'Gagal mengunduh data bahasa OCR. Periksa koneksi internet lalu jalankan ulang npm run hero:saring.'
        );
        console.error(`Detail: ${galat.message}`);
        process.exitCode = 1;
        return;
      }
      throw galat;
    }

    const hasil = await pindaiFoto(daftarFoto, worker);
    const ringkasan = await terapkanHasil(hasil);

    console.log('');
    console.log('Ringkasan pemindaian hero:');
    console.log(`- Dipindai: ${daftarFoto.length}`);
    console.log(`- Bersih: ${ringkasan.bersih}`);
    console.log(`- Bertulisan: ${ringkasan.bertulisan}`);
    console.log(`- Dilewati: ${ringkasan.dilewati}`);
    console.log(`- Mode: ${ulangSemua ? 'atur ulang semua foto' : 'hanya menaikkan foto bersih'}`);

    // Daftar akhir foto yang bertanda hero setelah penerapan hasil
    const heroAkhir = await pool.query(
      "SELECT COUNT(*)::int AS jumlah FROM media WHERE jenis = 'foto' AND hero = TRUE"
    );
    console.log(`- Foto bertanda hero sekarang: ${heroAkhir.rows[0].jumlah}`);
  } catch (galat) {
    if (galatJaringan(galat)) {
      console.error(
        'Gagal mengunduh data bahasa OCR. Periksa koneksi internet lalu jalankan ulang npm run hero:saring.'
      );
      console.error(`Detail: ${galat.message}`);
      process.exitCode = 1;
      return;
    }

    console.error('Pemindaian OCR gagal:', galat.message);
    process.exitCode = 1;
  } finally {
    if (worker) {
      await worker.terminate();
    }
    await pool.end();
  }
}

jalankan();
