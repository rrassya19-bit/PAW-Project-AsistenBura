// Service Gemini: satu-satunya tempat yang memanggil SDK @google/genai
// Seluruh galat dinormalisasi menjadi GalatGemini dengan kode yang aman
const { GoogleGenAI } = require('@google/genai');
const gemini = require('../config/gemini');

// Kode galat yang dipakai controller untuk menentukan status HTTP
const KODE = {
  KUNCI_BELUM_ADA: 'KUNCI_BELUM_ADA',
  KUOTA_HABIS: 'KUOTA_HABIS',
  TIMEOUT: 'TIMEOUT',
  DIBLOKIR: 'DIBLOKIR',
  TERPOTONG: 'TERPOTONG',
  KOSONG: 'KOSONG',
  GALAT_LAYANAN: 'GALAT_LAYANAN',
};

// Kelas galat internal: pesan tidak boleh memuat API key atau isi permintaan
class GalatGemini extends Error {
  // Konstruktor menyimpan kode dan penanda boleh diulang
  constructor(kode, pesan, bisaUlang) {
    // Pesan diwarisi dari Error agar mudah dicatat
    super(pesan || 'Terjadi kesalahan pada layanan Gemini');
    // Nama kelas dipakai saat pemeriksaan galat
    this.name = 'GalatGemini';
    // Kode dipakai controller untuk memetakan status HTTP
    this.kode = kode;
    // Penanda internal untuk percobaan ulang 5xx dan galat jaringan
    this.bisaUlang = bisaUlang === true;
  }
}

// Klien SDK dibuat malas agar server tetap hidup tanpa API key
let klienAktif = null;
// Klien tiruan dipakai pengujian dan tidak pernah dipakai di produksi
let klienTiruan = null;

// Menunda proses dengan Promise tanpa memblokir event loop
function jeda(ms) {
  // Timer sederhana yang selalu selesai
  return new Promise(function (selesai) {
    setTimeout(selesai, ms);
  });
}

// Mengambil klien SDK; membuatnya sekali lalu dipakai ulang
function ambilKlien() {
  // Klien tiruan selalu diprioritaskan saat pengujian
  if (klienTiruan) {
    return klienTiruan;
  }
  // Tanpa API key dan model, permintaan tidak boleh dilanjutkan
  if (!gemini.siap()) {
    throw new GalatGemini(KODE.KUNCI_BELUM_ADA, 'Gemini belum dikonfigurasi');
  }
  // Klien baru dibuat hanya saat benar-benar dibutuhkan
  if (!klienAktif) {
    klienAktif = new GoogleGenAI({ apiKey: gemini.konfigurasi.apiKey });
  }
  // Klien siap dipakai
  return klienAktif;
}

// Menyuntikkan klien tiruan untuk pengujian tanpa koneksi ke Gemini
function aturKlien(klienPalsu) {
  // Klien tiruan disimpan di memori proses
  klienTiruan = klienPalsu || null;
}

// Mengembalikan service ke keadaan awal, termasuk menghapus klien tiruan
function setelUlang() {
  // Klien tiruan dilepas
  klienTiruan = null;
  // Klien SDK asli dibuang agar dibuat ulang saat dibutuhkan
  klienAktif = null;
}

// Mengubah galat apa pun menjadi GalatGemini tanpa membocorkan detail internal
function normalkanGalat(galat) {
  // Galat yang sudah dinormalisasi diteruskan apa adanya
  if (galat instanceof GalatGemini) {
    return galat;
  }
  // Status HTTP dibaca dari properti SDK atau respons
  const status =
    galat && typeof galat.status === 'number'
      ? galat.status
      : galat && galat.response && typeof galat.response.status === 'number'
        ? galat.response.status
        : 0;
  // Pesan internal hanya dipakai untuk klasifikasi, tidak diteruskan ke klien
  const pesan = String((galat && galat.message) || '').toLowerCase();
  // Nama galat dipakai mendeteksi pembatalan waktu
  const nama = String((galat && galat.name) || '');

  // Pembatalan atau batas waktu menjadi TIMEOUT
  if (nama === 'AbortError' || nama === 'TimeoutError' || pesan.includes('timeout') || pesan.includes('aborted')) {
    return new GalatGemini(KODE.TIMEOUT, 'Permintaan ke Gemini melewati batas waktu');
  }
  // Kuota habis dikenali dari status 429
  if (status === 429) {
    return new GalatGemini(KODE.KUOTA_HABIS, 'Kuota Gemini habis');
  }
  // Kunci tidak valid dianggap belum dikonfigurasi
  if (status === 401 || status === 403) {
    return new GalatGemini(KODE.KUNCI_BELUM_ADA, 'Kunci Gemini tidak dapat dipakai');
  }
  // Galat server dapat diulang terbatas
  if (status >= 500) {
    return new GalatGemini(KODE.GALAT_LAYANAN, 'Layanan Gemini bermasalah', true);
  }
  // Pemblokiran keamanan dikenali dari pesan SDK
  if (pesan.includes('block') || pesan.includes('safety') || pesan.includes('prohibited')) {
    return new GalatGemini(KODE.DIBLOKIR, 'Permintaan diblokir oleh kebijakan keamanan');
  }
  // Galat jaringan juga dapat diulang terbatas
  if (
    nama === 'TypeError' ||
    pesan.includes('fetch failed') ||
    pesan.includes('network') ||
    pesan.includes('econnreset') ||
    pesan.includes('enotfound')
  ) {
    return new GalatGemini(KODE.GALAT_LAYANAN, 'Jaringan ke Gemini bermasalah', true);
  }
  // Sisa kasus dianggap kesalahan layanan umum
  return new GalatGemini(KODE.GALAT_LAYANAN, 'Layanan Gemini gagal memproses permintaan');
}

// Mengambil teks dari respons dengan aman, termasuk kandidat kosong dan finishReason
function ekstrakTeks(respons) {
  // Respons kosong tidak dapat dipakai
  if (!respons || typeof respons !== 'object') {
    throw new GalatGemini(KODE.KOSONG, 'Respons Gemini kosong');
  }
  // Prompt yang diblokir tidak memiliki kandidat yang dapat dipakai
  if (respons.promptFeedback && respons.promptFeedback.blockReason) {
    throw new GalatGemini(KODE.DIBLOKIR, 'Prompt diblokir oleh kebijakan keamanan');
  }
  // Kandidat pertama adalah keluaran utama
  const kandidat = Array.isArray(respons.candidates) ? respons.candidates[0] : null;
  // Alasan selesai dipakai membedakan potong token dan blokir
  const alasan = kandidat ? String(kandidat.finishReason || '') : '';
  // Token habis berarti jawaban tidak lengkap
  if (alasan === 'MAX_TOKENS') {
    throw new GalatGemini(KODE.TERPOTONG, 'Respons Gemini terpotong');
  }
  // Alasan blokir lain tidak boleh diteruskan ke pengguna
  if (['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII'].includes(alasan)) {
    throw new GalatGemini(KODE.DIBLOKIR, 'Respons diblokir oleh kebijakan keamanan');
  }
  // Teks diambil dari helper SDK bila tersedia
  let teks = '';
  try {
    // Helper respons.text hanya berisi teks kandidat pertama
    teks = typeof respons.text === 'string' ? respons.text : '';
  } catch (galat) {
    // Helper dapat melempar bila kandidat kosong; teks dicari manual
    teks = '';
  }
  // Bila helper tidak memberi teks, bagian kandidat dibaca langsung
  if (!teks && kandidat && kandidat.content && Array.isArray(kandidat.content.parts)) {
    teks = kandidat.content.parts
      .map(function (bagian) {
        return bagian && typeof bagian.text === 'string' ? bagian.text : '';
      })
      .join('');
  }
  // Spasi dirapikan sebelum diperiksa
  teks = String(teks).trim();
  // Teks kosong tidak boleh dianggap jawaban valid
  if (!teks) {
    throw new GalatGemini(KODE.KOSONG, 'Respons Gemini tidak berisi teks');
  }
  // Teks bersih dikembalikan ke pemanggil
  return teks;
}

// Memanggil model Gemini dengan instruksi sistem, konten, dan konfigurasi keluaran
async function hasilkanKonten({ instruksiSistem, konten, konfigurasi }) {
  // Klien diambil lebih dulu agar galat konfigurasi cepat terdeteksi
  const klien = ambilKlien();
  // Pengaturan keluaran dari pemanggil dipakai dengan nilai aman
  const opsi = konfigurasi || {};
  // Batas waktu diambil dari konfigurasi terpusat
  const batasMs = gemini.konfigurasi.timeoutMs;
  // Controller dipakai membatalkan permintaan yang terlalu lama
  const pengendali = new AbortController();
  // Timer dibersihkan di blok finally agar tidak menahan proses
  const timer = setTimeout(function () {
    // Membatalkan permintaan yang melewati batas waktu
    pengendali.abort();
  }, batasMs);

  // Penghitung percobaan ulang 5xx dan jaringan
  let ulangLayanan = 0;
  // Penghitung percobaan ulang kuota 429
  let ulangKuota = 0;

  try {
    // Percobaan diulang hanya untuk galat yang memang boleh diulang
    while (true) {
      try {
        // Permintaan dikirim ke model dari GEMINI_MODEL, bukan nama model mati
        const respons = await klien.models.generateContent({
          model: gemini.konfigurasi.model,
          contents: konten,
          config: {
            // Instruksi sistem tidak dapat diubah oleh pesan pengguna
            systemInstruction: instruksiSistem,
            // Suhu dan topP diatur pemanggil sesuai fitur
            temperature: opsi.temperature,
            // topP membatasi ekor distribusi token
            topP: opsi.topP,
            // Batas token keluaran menjaga biaya dan waktu
            maxOutputTokens: opsi.maxOutputTokens,
            // Keluaran selalu JSON agar mudah divalidasi
            responseMimeType: 'application/json',
            // Skema keluaran diberikan pemanggil
            responseSchema: opsi.responseSchema,
            // Anggaran berpikir dibuat nol agar token tidak habis untuk reasoning
            thinkingConfig: { thinkingBudget: 0 },
            // Retry SDK dimatikan karena service ini mengatur retry sendiri
            httpOptions: { timeout: batasMs, retryOptions: { attempts: 1 } },
            // AbortSignal membatalkan permintaan saat batas waktu tercapai
            abortSignal: pengendali.signal,
          },
        });
        // Teks diekstrak dengan pemeriksaan kandidat dan finishReason
        return ekstrakTeks(respons);
      } catch (galat) {
        // Semua galat diubah ke bentuk internal yang aman
        const galatAman = normalkanGalat(galat);
        // Kuota habis diulang paling banyak satu kali dengan jeda singkat
        if (galatAman.kode === KODE.KUOTA_HABIS && ulangKuota < 1) {
          ulangKuota += 1;
          await jeda(400);
          continue;
        }
        // Galat layanan atau jaringan diulang paling banyak dua kali
        if (galatAman.bisaUlang && ulangLayanan < 2) {
          ulangLayanan += 1;
          await jeda(300 * ulangLayanan);
          continue;
        }
        // Setelah batas percobaan, galat diteruskan ke pemanggil
        throw galatAman;
      }
    }
  } finally {
    // Timer selalu dibersihkan agar proses dapat berhenti normal
    clearTimeout(timer);
  }
}

// Ekspor API service dan kelas galat untuk controller
module.exports = {
  KODE,
  GalatGemini,
  hasilkanKonten,
  aturKlien,
  setelUlang,
};
