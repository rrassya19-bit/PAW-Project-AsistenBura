// Service chat caption admin: orkestrasi guardrail, Gemini, dan validasi keluaran
const crypto = require('crypto');
const geminiService = require('./geminiService');
const { bangunInstruksiCaptionChat } = require('../config/instruksi');
const {
  cekInjeksi,
  cekDiLuarTopikJelas,
  bersihkanPesan,
  validasiCaptionChat,
} = require('../utils/guardrail');

// Nama kedai dipakai pada instruksi sistem
const NAMA_KAFE = 'Bura Bura Coffee';
// Kode rahasia dibuat sekali per proses dan tidak pernah dikirim ke klien
const kodeRahasia = crypto.randomBytes(18).toString('base64url');
// Pesan aman ketika model tidak menghasilkan caption yang lolos aturan
const PESAN_TIDAK_AMAN = 'Gagal membuat caption yang aman, coba lagi.';
// Pesan penolakan untuk topik di luar caption dan upaya injeksi
const PESAN_TOLAK = 'Aku hanya membantu menulis caption untuk foto dan video Bura Bura Coffee.';

// Kode galat internal chat caption
const KODE = {
  TIDAK_AMAN: 'TIDAK_AMAN',
  TOLAK: 'TOLAK',
  KELUARAN_TIDAK_VALID: 'KELUARAN_TIDAK_VALID',
};

// Kelas galat yang dipetakan controller ke status HTTP
class GalatCaptionChat extends Error {
  // Konstruktor menyimpan kode dan pesan aman
  constructor(kode, pesan) {
    // Pesan diwarisi dari Error
    super(pesan);
    // Nama kelas dipakai saat pemeriksaan galat
    this.name = 'GalatCaptionChat';
    // Kode dipakai controller
    this.kode = kode;
  }
}

// Skema JSON yang diminta dari model
const SKEMA = {
  type: 'OBJECT',
  properties: {
    faktaTerlihat: { type: 'ARRAY', items: { type: 'STRING' } },
    tidakJelas: { type: 'ARRAY', items: { type: 'STRING' } },
    caption: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          gaya: { type: 'STRING' },
          teks: { type: 'STRING' },
        },
        required: ['gaya', 'teks'],
      },
    },
    pertanyaan: { type: 'STRING', nullable: true },
    catatan: { type: 'STRING', nullable: true },
  },
  required: ['faktaTerlihat', 'tidakJelas', 'caption', 'pertanyaan', 'catatan'],
};

// Membersihkan satu nilai teks agar tidak dapat menutup tag pembatas
function bersihkanNilai(nilai, maks) {
  // Nilai bukan teks menjadi teks kosong
  const teks = typeof nilai === 'string' ? nilai : '';
  // Kurung sudut dibuang dan spasi dirapikan
  return teks.replace(/[<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maks);
}

// Menormalkan riwayat yang diterima service, maksimal tiga giliran
function bersihkanRiwayat(riwayat) {
  // Nilai bukan array dianggap riwayat kosong
  if (!Array.isArray(riwayat)) {
    return [];
  }
  // Hanya tiga giliran terakhir yang dipakai
  return riwayat.slice(-3).map(function (giliran) {
    // Setiap giliran harus berupa objek
    const aman = giliran && typeof giliran === 'object' ? giliran : {};
    // Caption dibatasi tiga teks pendek
    const caption = Array.isArray(aman.caption)
      ? aman.caption
          .filter(function (teks) {
            return typeof teks === 'string';
          })
          .slice(0, 3)
          .map(function (teks) {
            return bersihkanNilai(teks, 300);
          })
          .filter(Boolean)
      : [];
    // Giliran bersih hanya memuat instruksi dan caption
    return { instruksi: bersihkanNilai(aman.instruksi, 500), caption };
  });
}

// Menyusun teks permintaan admin beserta riwayat dan pembatasnya
function susunTeksAdmin(instruksi, riwayat) {
  // Instruksi kosong diganti permintaan umum
  const teksInstruksi = bersihkanNilai(instruksi, 500) || 'Buatkan tiga pilihan caption untuk foto ini.';
  // Riwayat dibungkus hanya bila ada isinya
  const teksRiwayat = riwayat.length
    ? '<riwayat>\n' + JSON.stringify(riwayat) + '\n</riwayat>\n'
    : '';
  // Seluruh teks admin dibungkus penanda yang tidak dapat ditutup pengguna
  return teksRiwayat + '<instruksi_admin>\n' + teksInstruksi + '\n</instruksi_admin>';
}

// Mencatat metadata permintaan tanpa isi instruksi, caption, atau gambar
function catat(status, mulai, gambar, jmlRiwayat) {
  // Ukuran gambar dibulatkan ke KB; nol bila tidak ada gambar
  const ukuranKb = gambar && gambar.buffer ? Math.round(gambar.buffer.length / 1024) : 0;
  // Satu baris log saja agar mudah diaudit
  console.log(
    '[caption-chat] ' +
      JSON.stringify({
        waktu: new Date().toISOString(),
        status,
        durasiMs: Date.now() - mulai,
        adaGambar: Boolean(gambar),
        ukuranGambarKb: ukuranKb,
        jumlahRiwayat: jmlRiwayat,
      })
  );
}

// Meminta caption dari Gemini lalu memvalidasi hasilnya
async function buatCaptionChat({ instruksi, riwayat, gambar } = {}) {
  // Waktu mulai dipakai untuk log metadata
  const mulai = Date.now();
  // Riwayat dinormalkan sebelum dipakai
  const riwayatAman = bersihkanRiwayat(riwayat);
  // Instruksi dibersihkan untuk pemeriksaan lokal
  const instruksiAman = bersihkanNilai(instruksi, 500);

  // Upaya mengubah aturan ditolak tanpa memanggil Gemini
  if (cekInjeksi(instruksiAman)) {
    catat('ditolak-injeksi', mulai, gambar, riwayatAman.length);
    throw new GalatCaptionChat(KODE.TOLAK, PESAN_TOLAK);
  }
  // Permintaan yang jelas di luar topik juga ditolak tanpa memanggil Gemini
  if (cekDiLuarTopikJelas(instruksiAman)) {
    catat('ditolak-topik', mulai, gambar, riwayatAman.length);
    throw new GalatCaptionChat(KODE.TOLAK, PESAN_TOLAK);
  }

  // Bagian teks selalu ada sebagai satu pesan pengguna
  const bagian = [];
  // Gambar dikirim sebagai inlineData tanpa menyimpan berkas
  if (gambar && Buffer.isBuffer(gambar.buffer)) {
    bagian.push({
      inlineData: {
        mimeType: gambar.mimetype,
        data: gambar.buffer.toString('base64'),
      },
    });
  }
  // Teks admin dan riwayat ditempatkan setelah gambar
  bagian.push({ text: susunTeksAdmin(instruksiAman, riwayatAman) });

  // Konten hanya satu pesan user; tidak ada peran assistant dari klien
  const konten = [{ role: 'user', parts: bagian }];
  // Instruksi sistem dibangun dengan kode rahasia proses
  const instruksiSistem = bangunInstruksiCaptionChat({
    namaKafe: NAMA_KAFE,
    maksKarakter: 150,
    kodeRahasia,
  });

  // Permintaan dikirim ke service Gemini terpusat
  let teksModel;
  try {
    teksModel = await geminiService.hasilkanKonten({
      instruksiSistem,
      konten,
      konfigurasi: {
        temperature: 0.4,
        topP: 0.8,
        maxOutputTokens: 1024,
        responseSchema: SKEMA,
      },
    });
  } catch (galat) {
    // Status gagal dicatat tanpa detail internal
    catat('gagal-gemini', mulai, gambar, riwayatAman.length);
    throw galat;
  }

  // Keluaran model divalidasi dan disaring sebelum dikirim ke admin
  const hasil = validasiCaptionChat(teksModel, {
    instruksiAdmin: instruksiAman,
    riwayat: riwayatAman,
    kodeRahasia,
    batasKarakter: 150,
  });
  // Keluaran tanpa caption aman dan tanpa pertanyaan dianggap gagal
  if (!hasil.valid) {
    catat('gagal-validasi', mulai, gambar, riwayatAman.length);
    throw new GalatCaptionChat(KODE.TIDAK_AMAN, PESAN_TIDAK_AMAN);
  }

  // Keberhasilan dicatat sebagai metadata saja
  catat('sukses', mulai, gambar, riwayatAman.length);
  // Data bersih dikembalikan ke controller
  return hasil.data;
}

// Mengambil kode rahasia hanya untuk pemeriksaan pengujian
function ambilKodeRahasia() {
  // Nilai ini tidak boleh dikirim ke klien
  return kodeRahasia;
}

// Ekspor service, kode, kelas galat, dan helper pengujian
module.exports = {
  KODE,
  GalatCaptionChat,
  PESAN_TIDAK_AMAN,
  PESAN_TOLAK,
  buatCaptionChat,
  ambilKodeRahasia,
};
