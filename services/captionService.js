// Service caption: membaca media, menyiapkan instruksi, memanggil Gemini, dan menyaring hasil
const fs = require('fs');
const path = require('path');
const config = require('../config');
const instruksi = require('../config/instruksi');
const geminiService = require('./geminiService');
const mediaModel = require('../models/mediaModel');
const guardrail = require('../utils/guardrail');
const { resolusiBerkasMedia } = require('../utils/mediaBerkas');

// Batas ukuran gambar yang dikirim ke Gemini
const MAKS_BYTE_GAMBAR = 3 * 1024 * 1024;

// Pemetaan ekstensi berkas ke MIME yang didukung
const MIME_GAMBAR = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

// Kode galat internal fitur caption
const KODE_CAPTION = {
  MEDIA_TIDAK_ADA: 'MEDIA_TIDAK_ADA',
  FOTO_TIDAK_TERBACA: 'FOTO_TIDAK_TERBACA',
  FORMAT_TIDAK_DIDUKUNG: 'FORMAT_TIDAK_DIDUKUNG',
  TERLALU_BESAR: 'TERLALU_BESAR',
  KELUARAN_TIDAK_VALID: 'KELUARAN_TIDAK_VALID',
};

// Kelas galat caption dengan kode yang dipetakan controller
class GalatCaption extends Error {
  // Konstruktor menyimpan kode dan pesan aman
  constructor(kode, pesan) {
    // Pesan diwarisi dari Error
    super(pesan || 'Permintaan caption gagal');
    // Nama kelas dipakai pemeriksaan
    this.name = 'GalatCaption';
    // Kode dipakai controller menentukan status HTTP
    this.kode = kode;
  }
}

// Skema keluaran tiga caption dari model
const SKEMA_CAPTION = {
  // Keluaran berupa objek dengan satu bidang array
  type: 'object',
  properties: {
    // Tepat tiga pilihan caption pendek
    caption: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3 },
  },
  required: ['caption'],
};

// Mengubah teks JSON dari model menjadi objek, termasuk bila dibungkus pagar kode
function bacaJson(teks) {
  // Teks dirapikan lebih dulu
  const bersih = String(teks).trim();
  // Pagar kode Markdown dibuang bila model menambahkannya
  const tanpaPagar = bersih.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  // JSON diurai; galat diteruskan ke pemanggil
  return JSON.parse(tanpaPagar);
}

// Membaca foto dari folder aset yang aman lalu mengubahnya menjadi base64
function bacaFoto(media) {
  // Path URL diubah menjadi lokasi absolut hanya bila berada di folder aman
  const lokasi = resolusiBerkasMedia(media.berkas);
  // Berkas yang tidak dapat diresolusi tidak boleh dibaca
  if (!lokasi || !fs.existsSync(lokasi)) {
    throw new GalatCaption(KODE_CAPTION.FOTO_TIDAK_TERBACA, 'Berkas foto tidak ditemukan');
  }
  // Ekstensi menentukan MIME yang didukung
  const ekstensi = path.extname(lokasi).toLowerCase();
  const mimeType = MIME_GAMBAR[ekstensi];
  // Format di luar daftar tidak dikirim ke model
  if (!mimeType) {
    throw new GalatCaption(KODE_CAPTION.FORMAT_TIDAK_DIDUKUNG, 'Format foto tidak didukung');
  }
  // Ukuran berkas diperiksa sebelum dibaca seluruhnya
  const info = fs.statSync(lokasi);
  if (info.size > MAKS_BYTE_GAMBAR) {
    throw new GalatCaption(KODE_CAPTION.TERLALU_BESAR, 'Ukuran foto melebihi 3 MB');
  }
  // Isi berkas diubah menjadi base64 untuk inlineData
  return { mimeType, data: fs.readFileSync(lokasi).toString('base64') };
}

// Membuat tiga pilihan caption untuk satu media
async function sarankan({ mediaId, catatan }) {
  // Waktu mulai dipakai mencatat durasi
  const mulai = Date.now();
  // Media dicari berdasarkan id
  const media = await mediaModel.ambilBerdasarkanId(mediaId);
  // Media yang tidak ada tidak dapat diberi caption
  if (!media) {
    throw new GalatCaption(KODE_CAPTION.MEDIA_TIDAK_ADA, 'Media tidak ditemukan');
  }

  // Catatan admin dibersihkan dan dibatasi sebelum masuk instruksi
  const catatanAman = guardrail.bersihkanPesan(catatan || '').slice(0, 200);
  // Instruksi sistem disusun dari data media, bukan dari perintah pengguna
  const instruksiSistem = instruksi.bangunInstruksiCaption({
    namaKafe: config.namaKafe,
    jenis: media.jenis,
    judul: media.judul,
    catatan: catatanAman,
  });

  // Bagian teks meminta tiga caption dengan aturan yang sama seperti instruksi
  const bagianTeks = {
    text:
      'Tulis tiga pilihan caption untuk media ini sesuai aturan. ' +
      'Kembalikan hanya JSON {"caption":[string,string,string]}.',
  };
  // Bagian konten diisi gambar lebih dulu untuk foto, lalu teks
  const konten = [];

  // Foto dilampirkan sebagai inlineData; video hanya memakai teks
  if (media.jenis === 'foto') {
    // Gambar dibaca dari folder aset yang tervalidasi
    const gambar = bacaFoto(media);
    // inlineData membawa MIME dan data base64
    konten.push({ inlineData: gambar });
  }
  // Teks permintaan selalu menjadi bagian terakhir
  konten.push(bagianTeks);

  // Model dipanggil dengan keluaran JSON tiga caption
  const teksModel = await geminiService.hasilkanKonten({
    instruksiSistem,
    konten: [{ role: 'user', parts: konten }],
    konfigurasi: {
      // Suhu agak tinggi agar tiga caption berbeda sudut pandang
      temperature: 0.7,
      // topP sedang untuk variasi yang tetap wajar
      topP: 0.9,
      // Batas token cukup untuk tiga caption pendek
      maxOutputTokens: 500,
      // Skema memaksa bentuk keluaran yang diminta
      responseSchema: SKEMA_CAPTION,
    },
  });

  // JSON model diurai; bentuk rusak dianggap keluaran tidak valid
  let hasilJson;
  try {
    hasilJson = bacaJson(teksModel);
  } catch (galat) {
    throw new GalatCaption(KODE_CAPTION.KELUARAN_TIDAK_VALID, 'Keluaran caption bukan JSON');
  }

  // Daftar caption harus berupa array
  if (!hasilJson || !Array.isArray(hasilJson.caption)) {
    throw new GalatCaption(KODE_CAPTION.KELUARAN_TIDAK_VALID, 'Keluaran caption tidak sesuai skema');
  }

  // Setiap caption diperiksa dan yang lolos saja yang dipakai
  const unik = new Set();
  hasilJson.caption.forEach(function (teks) {
    // Validasi menolak angka, tautan, mention, hashtag asing, dan klaim
    const hasil = guardrail.validasiCaption(teks);
    // Caption valid dan belum duplikat disimpan
    if (hasil.valid) {
      unik.add(hasil.caption);
    }
  });

  // Tiga caption valid wajib tersedia agar hasil dapat dipakai
  if (unik.size < 3) {
    // Log hanya mencatat jumlah caption yang lolos
    console.log(`[caption] id=${mediaId} jenis=${media.jenis} lolos=${unik.size} hasil=tolak ms=${Date.now() - mulai}`);
    throw new GalatCaption(KODE_CAPTION.KELUARAN_TIDAK_VALID, 'Caption yang dihasilkan tidak valid');
  }

  // Log akhir mencatat metadata tanpa isi caption
  console.log(`[caption] id=${mediaId} jenis=${media.jenis} lolos=3 hasil=ok ms=${Date.now() - mulai}`);

  // Tiga caption pertama yang unik dikembalikan ke controller
  return { caption: Array.from(unik).slice(0, 3) };
}

// Ekspor service dan konstanta galat
module.exports = { KODE_CAPTION, GalatCaption, sarankan };
