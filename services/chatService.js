// Service chatbot: guardrail lokal, konteks database, panggilan Gemini, validasi keluaran
const crypto = require('crypto');
const config = require('../config');
const instruksi = require('../config/instruksi');
const geminiService = require('./geminiService');
const konteksService = require('./konteksService');
const guardrail = require('../utils/guardrail');

// Kode rahasia dibuat sekali per proses dan tidak pernah dikirim ke klien
const kodeRahasia = 'RAHASIA-' + crypto.randomBytes(12).toString('hex');

// Skema keluaran JSON yang diminta dari model
const SKEMA_CHAT = {
  // Keluaran berupa objek dengan tiga bidang wajib
  type: 'object',
  properties: {
    // Penanda apakah pertanyaan terjawab penuh dari konteks
    dalamKonteks: { type: 'boolean' },
    // Teks jawaban untuk pengguna
    jawaban: { type: 'string' },
    // Daftar id menu yang dirujuk
    menuDirujuk: { type: 'array', items: { type: 'integer' } },
  },
  required: ['dalamKonteks', 'jawaban', 'menuDirujuk'],
  propertyOrdering: ['dalamKonteks', 'jawaban', 'menuDirujuk'],
};

// Mengambil kode rahasia untuk keperluan pengujian
function ambilKodeRahasia() {
  // Nilai hanya dipakai di dalam proses pengujian
  return kodeRahasia;
}

// Mengubah teks JSON dari model menjadi objek, termasuk bila dibungkus pagar kode
function bacaJson(teks) {
  // Teks dirapikan lebih dulu
  const bersih = String(teks).trim();
  // Pagar kode Markdown dibuang bila model menambahkannya
  const tanpaPagar = bersih.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  // JSON diurai; galat diteruskan ke pemanggil
  return JSON.parse(tanpaPagar);
}

// Menjawab pertanyaan pengunjung dengan alur guardrail yang berlapis
async function jawab({ pesan, ip }) {
  // Waktu mulai dipakai mencatat durasi di log
  const mulai = Date.now();

  // Upaya mengubah aturan dijawab tanpa memanggil model sama sekali
  if (guardrail.cekInjeksi(pesan)) {
    // Log hanya mencatat metadata, bukan isi pesan pengguna
    console.log(`[chat] ip=${ip} panjang=${pesan.length} hasil=injeksi ms=${Date.now() - mulai}`);
    // Pesan aturan dikembalikan sebagai jawaban biasa
    return { jawaban: instruksi.PESAN_ATURAN, dalamKonteks: false, menuDirujuk: [] };
  }
  // Permintaan yang jelas di luar topik juga ditolak sebelum memanggil model
  if (guardrail.cekDiLuarTopikJelas(pesan)) {
    // Log mencatat penolakan topik
    console.log(`[chat] ip=${ip} panjang=${pesan.length} hasil=luar-topik ms=${Date.now() - mulai}`);
    // Pesan tolak topik dikembalikan sebagai jawaban biasa
    return { jawaban: instruksi.PESAN_TOLAK_TOPIK, dalamKonteks: false, menuDirujuk: [] };
  }

  // Konteks database dan konfigurasi kedai dibangun atau diambil dari cache
  const konteks = await konteksService.bangunKonteks();
  // Pesan dibersihkan dari karakter yang dapat menyamarkan perintah
  const pesanAman = guardrail.bersihkanPesan(pesan);
  // Instruksi sistem disusun dari konteks dan kode rahasia proses ini
  const instruksiSistem = instruksi.bangunInstruksiChat({
    namaKafe: config.namaKafe,
    konteks: konteks.teks,
    kodeRahasia,
  });

  // Model dipanggil dengan pesan sebagai data di dalam tag pembatas
  const teksModel = await geminiService.hasilkanKonten({
    instruksiSistem,
    konten: [
      {
        role: 'user',
        parts: [{ text: `<pesan_pengguna>\n${pesanAman}\n</pesan_pengguna>` }],
      },
    ],
    konfigurasi: {
      // Suhu rendah menjaga jawaban tetap dekat dengan konteks
      temperature: 0.2,
      // topP sedang agar variasi kalimat tetap wajar
      topP: 0.8,
      // Batas token cukup untuk empat kalimat dan JSON
      maxOutputTokens: 700,
      // Skema memaksa keluaran JSON yang dapat divalidasi
      responseSchema: SKEMA_CHAT,
    },
  });

  // JSON model diurai; bentuk yang tidak dapat dibaca dianggap keluaran rusak
  let hasilJson;
  try {
    hasilJson = bacaJson(teksModel);
  } catch (galat) {
    // Log tidak memuat isi keluaran agar tidak membocorkan data
    console.log(`[chat] ip=${ip} panjang=${pesan.length} hasil=json-rusak ms=${Date.now() - mulai}`);
    // Galat layanan membuat controller membalas 502
    throw new geminiService.GalatGemini(geminiService.KODE.KOSONG, 'Keluaran Gemini bukan JSON');
  }

  // Pertanyaan yang tidak terjawab dari konteks dijawab pesan data belum tersedia
  if (!hasilJson || hasilJson.dalamKonteks !== true) {
    // Log mencatat jawaban tanpa data
    console.log(`[chat] ip=${ip} panjang=${pesan.length} hasil=tanpa-data ms=${Date.now() - mulai}`);
    // Pesan standar dikembalikan tanpa meneruskan teks model
    return { jawaban: instruksi.PESAN_TIDAK_ADA_DATA, dalamKonteks: false, menuDirujuk: [] };
  }

  // Keluaran model diperiksa terhadap id, harga, angka, tautan, dan kode rahasia
  const validasi = guardrail.validasiKeluaranChat(hasilJson, {
    idValid: konteks.idValid,
    tokenAngkaKonteks: konteks.tokenAngkaKonteks,
    urlDiizinkan: konteks.urlDiizinkan,
    kodeRahasia,
  });
  // Keluaran yang tidak lolos tidak pernah diteruskan ke pengguna
  if (!validasi.valid) {
    // Log hanya mencatat alasan penolakan
    console.log(`[chat] ip=${ip} panjang=${pesan.length} hasil=tolak-${validasi.alasan} ms=${Date.now() - mulai}`);
    // Controller memetakan galat ini menjadi 502
    throw new geminiService.GalatGemini(geminiService.KODE.KOSONG, 'Keluaran chatbot tidak valid');
  }

  // Penanda harga diganti dengan harga terformat dari database
  const jawaban = guardrail.gantiPenandaHarga(validasi.jawaban, konteks.petaHarga);

  // Log akhir memuat metadata dan jumlah menu yang dirujuk
  console.log(
    `[chat] ip=${ip} panjang=${pesan.length} hasil=ok menu=${hasilJson.menuDirujuk.length} ms=${Date.now() - mulai}`
  );

  // Jawaban final dikembalikan ke controller
  return {
    jawaban,
    dalamKonteks: true,
    menuDirujuk: hasilJson.menuDirujuk,
  };
}

// Ekspor service dan pembantu pengujian
module.exports = { jawab, ambilKodeRahasia };
