// Konfigurasi Gemini: satu-satunya tempat membaca variabel lingkungan Gemini
// Nilai di bawah tidak pernah dikirim ke view, respons, atau log

// Membaca angka dari lingkungan dengan batas aman bila kosong atau tidak valid
function angkaAman(nilai, bawaan, minimum) {
  // Nilai kosong langsung memakai bawaan
  const angka = Number(nilai);
  // Hanya angka bulat di atas batas minimum yang diterima
  if (!Number.isInteger(angka) || angka < minimum) {
    return bawaan;
  }
  // Nilai valid dipakai apa adanya
  return angka;
}

// Menyusun objek konfigurasi dari process.env; dotenv sudah dimuat di app.js
function bacaKonfigurasi() {
  return {
    // API key hanya disimpan di memori server
    apiKey: typeof process.env.GEMINI_API_KEY === 'string' ? process.env.GEMINI_API_KEY.trim() : '',
    // Nama model dibaca dari lingkungan, tidak pernah ditulis mati di kode
    model: typeof process.env.GEMINI_MODEL === 'string' ? process.env.GEMINI_MODEL.trim() : '',
    // Batas waktu permintaan ke Gemini dalam milidetik
    timeoutMs: angkaAman(process.env.GEMINI_TIMEOUT_MS, 15000, 1000),
    // Batas laju chatbot per IP per menit
    chatPerMenit: angkaAman(process.env.CHAT_BATAS_PER_MENIT, 10, 1),
    // Batas laju chatbot per IP per hari
    chatPerHari: angkaAman(process.env.CHAT_BATAS_PER_HARI, 100, 1),
    // Batas laju chatbot global per hari untuk seluruh pengunjung
    chatGlobalPerHari: angkaAman(process.env.CHAT_BATAS_GLOBAL_PER_HARI, 500, 1),
    // Batas laju pembuatan caption admin per menit
    captionPerMenit: angkaAman(process.env.CAPTION_BATAS_PER_MENIT, 10, 1),
  };
}

// Objek konfigurasi dipakai bersama oleh service Gemini
const konfigurasi = bacaKonfigurasi();

// Fungsi siap: true hanya bila API key DAN nama model terisi
function siap() {
  // Kedua nilai wajib ada agar service dapat memanggil model
  return Boolean(konfigurasi.apiKey && konfigurasi.model);
}

// Memuat ulang nilai dari lingkungan; dipakai pengujian tanpa memuat ulang proses
function muatUlang() {
  // Menyalin nilai baru ke objek yang sama agar referensi tetap berlaku
  Object.assign(konfigurasi, bacaKonfigurasi());
  // Mengembalikan objek yang sudah diperbarui
  return konfigurasi;
}

// Ekspor objek konfigurasi dan fungsi siap; objek tidak boleh diteruskan ke view
module.exports = { konfigurasi, siap, muatUlang };
