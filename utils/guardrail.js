// Guardrail: fungsi murni untuk normalisasi, deteksi injeksi, validasi keluaran
// Seluruh pola dan batas ditulis sebagai konstanta agar mudah diuji

// Batas panjang jawaban chatbot yang boleh diteruskan ke pengguna
const MAKS_JAWABAN = 800;

// Batas panjang caption dari AI
const MAKS_CAPTION = 150;

// Hashtag yang diizinkan pada caption
const HASHTAG_DIIZINKAN = ['#buraburacoffee', '#yogyakarta'];

// Kata terlarang pada caption karena mengandung klaim atau promosi
const KATA_TERLARANG_CAPTION = [
  'terbaik',
  'terenak',
  'ternikmat',
  'paling',
  'dijamin',
  'gratis',
  'diskon',
  'promo',
  'sehat',
  'halal',
  'asli',
  'nomor satu',
  'no. 1',
];

// Pola upaya prompt injection; dicocokkan pada teks yang sudah dinormalisasi
const POLA_INJEKSI = [
  /abaikan (semua )?(instruksi|aturan|perintah)/i,
  /lupakan (semua )?(instruksi|aturan)/i,
  /ignore (all |the )?(previous|above|prior)/i,
  /disregard/i,
  /system prompt/i,
  /prompt sistem/i,
  /instruksi (sistem|awal|kamu)/i,
  /kamu (sekarang )?adalah/i,
  /berperanlah/i,
  /pura-pura (jadi|menjadi)/i,
  /act as/i,
  /pretend/i,
  /jailbreak/i,
  /developer mode/i,
  /mode (dev|admin|bebas)/i,
  /dan mode/i,
  /tampilkan (semua )?(instruksi|prompt|konteks)/i,
  /ulangi (semua )?(instruksi|kalimat di atas)/i,
];

// Pola permintaan yang jelas di luar domain kedai
const POLA_LUAR_TOPIK = [
  /buat(kan)? (saya )?(kode|program|script|game|aplikasi|website)/i,
  /(python|javascript|java|c\+\+|sql) (code|kode)/i,
  /tugas (sekolah|kuliah)/i,
  /kerjakan (pr|soal)/i,
  /resep (masakan|makanan)/i,
  /politik/i,
  /presiden/i,
  /saham/i,
  /crypto/i,
  /kripto/i,
  /obat/i,
  /diagnosa/i,
  /ramalan/i,
  /teori (relativitas|kuantum|evolusi)/i,
  /fotosintesis/i,
];

// Normalisasi teks: NFKC, huruf kecil, buang karakter tak terlihat, rapatkan spasi
function normalisasiTeks(teks) {
  // Nilai bukan teks diperlakukan sebagai teks kosong
  const awal = typeof teks === 'string' ? teks : '';
  // Karakter kontrol dan zero-width dibuang agar pola tidak bisa dikamuflase
  return awal
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Mendeteksi upaya mengubah aturan atau membocorkan instruksi
function cekInjeksi(teks) {
  // Teks dinormalisasi lebih dulu
  const bersih = normalisasiTeks(teks);
  // Cocok dengan salah satu pola berarti injeksi
  return POLA_INJEKSI.some(function (pola) {
    return pola.test(bersih);
  });
}

// Mendeteksi permintaan yang jelas di luar topik kedai
function cekDiLuarTopikJelas(teks) {
  // Teks dinormalisasi lebih dulu
  const bersih = normalisasiTeks(teks);
  // Cocok dengan salah satu pola berarti di luar topik
  return POLA_LUAR_TOPIK.some(function (pola) {
    return pola.test(bersih);
  });
}

// Membersihkan pesan pengguna sebelum dikirim ke model
function bersihkanPesan(teks) {
  // Nilai bukan teks menjadi string kosong
  const awal = typeof teks === 'string' ? teks : '';
  // Karakter kontrol dibuang, kecuali baris baru dan tab
  let bersih = awal.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ');
  // Zero-width dibuang agar tidak dipakai menyamarkan perintah
  bersih = bersih.replace(/[\u200B-\u200D\uFEFF]/g, '');
  // Kurung sudut diganti spasi agar tidak dapat menutup tag pembatas
  bersih = bersih.replace(/[<>]/g, ' ');
  // Akhir baris diseragamkan
  bersih = bersih.replace(/\r\n?/g, '\n');
  // Baris baru beruntun dibatasi
  bersih = bersih.replace(/\n{3,}/g, '\n\n');
  // Spasi di awal dan akhir dibuang
  return bersih.trim();
}

// Mengganti penanda harga dengan harga dari database yang sudah terformat
function gantiPenandaHarga(teks, petaHarga) {
  // Teks diubah ke string agar aman saat diganti
  return String(teks).replace(/\{harga:\s*(\d+)\s*\}/g, function (penanda, id) {
    // Id dicari pada peta harga dari database
    const harga = petaHarga && petaHarga.get(Number(id));
    // Harga yang tidak ditemukan diganti teks netral agar tidak membocorkan apa pun
    return harga || 'harga sesuai menu';
  });
}

// Menghapus URL dan email dari teks sebelum pemeriksaan angka
function tanpaTautan(teks) {
  // URL http dan https dibuang
  const tanpaUrl = String(teks).replace(/https?:\/\/[^\s]+/gi, ' ');
  // Email dibuang
  return tanpaUrl.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/gi, ' ');
}

// Memeriksa keluaran JSON model chatbot sebelum ditampilkan ke pengguna
function validasiKeluaranChat(hasilJson, opsi) {
  // Opsi dibaca dengan nilai aman agar fungsi tetap murni
  const idValid = opsi && opsi.idValid ? opsi.idValid : new Set();
  // Token angka konteks boleh berupa Set atau array
  const tokenAngka = opsi && opsi.tokenAngkaKonteks ? opsi.tokenAngkaKonteks : [];
  // Kode rahasia hanya dipakai pemeriksaan kebocoran
  const kodeRahasia = opsi && opsi.kodeRahasia ? String(opsi.kodeRahasia) : '';
  // URL yang boleh muncul di jawaban
  const urlDiizinkan = opsi && Array.isArray(opsi.urlDiizinkan) ? opsi.urlDiizinkan : [];
  // Pembantu pemeriksaan token angka
  const setAngka = tokenAngka instanceof Set ? tokenAngka : new Set(tokenAngka);

  // Struktur wajib berupa objek biasa
  if (!hasilJson || typeof hasilJson !== 'object' || Array.isArray(hasilJson)) {
    return { valid: false, jawaban: '', alasan: 'bentuk' };
  }
  // Tipe setiap bidang harus sesuai skema
  if (typeof hasilJson.dalamKonteks !== 'boolean' || typeof hasilJson.jawaban !== 'string') {
    return { valid: false, jawaban: '', alasan: 'tipe' };
  }
  // Daftar menu yang dirujuk harus berupa array bilangan bulat
  if (
    !Array.isArray(hasilJson.menuDirujuk) ||
    hasilJson.menuDirujuk.some(function (id) {
      return !Number.isInteger(id);
    })
  ) {
    return { valid: false, jawaban: '', alasan: 'menuDirujuk' };
  }
  // Semua id yang dirujuk harus benar-benar ada di konteks
  if (
    hasilJson.menuDirujuk.some(function (id) {
      return !idValid.has(id);
    })
  ) {
    return { valid: false, jawaban: '', alasan: 'id-tidak-valid' };
  }

  // Jawaban dirapikan sebelum diperiksa
  const jawaban = hasilJson.jawaban.trim();
  // Jawaban kosong tidak boleh diteruskan
  if (!jawaban) {
    return { valid: false, jawaban: '', alasan: 'kosong' };
  }
  // Batas panjang jawaban dijaga
  if (jawaban.length > MAKS_JAWABAN) {
    return { valid: false, jawaban: '', alasan: 'terlalu-panjang' };
  }
  // Kode rahasia tidak boleh bocor dalam bentuk apa pun
  if (kodeRahasia && jawaban.includes(kodeRahasia)) {
    return { valid: false, jawaban: '', alasan: 'kode-rahasia' };
  }

  // Seluruh penanda harga diperiksa memakai id valid
  const penanda = jawaban.match(/\{harga:\s*(\d+)\s*\}/g) || [];
  for (let i = 0; i < penanda.length; i += 1) {
    // Angka id diambil dari setiap penanda
    const cocok = penanda[i].match(/(\d+)/);
    // Id harus ada di daftar valid
    if (!cocok || !idValid.has(Number(cocok[1]))) {
      return { valid: false, jawaban: '', alasan: 'harga-tidak-valid' };
    }
  }

  // Teks tanpa penanda dipakai memeriksa harga dan angka bebas
  const tanpaPenanda = jawaban.replace(/\{harga:\s*\d+\s*\}/g, ' ');
  // Model tidak boleh menulis rupiah sendiri
  if (/\bRp\b/i.test(tanpaPenanda) || /\b(rb|ribu)\b/i.test(tanpaPenanda)) {
    return { valid: false, jawaban: '', alasan: 'harga-manual' };
  }
  // Nomor telepon dan deretan angka panjang ditolak
  if (/\d{7,}/.test(tanpaPenanda)) {
    return { valid: false, jawaban: '', alasan: 'angka-panjang' };
  }

  // Seluruh URL yang muncul harus termasuk tautan yang ada di konteks
  const daftarUrl = tanpaPenanda.match(/https?:\/\/[^\s]+/gi) || [];
  for (let i = 0; i < daftarUrl.length; i += 1) {
    // Tanda baca di akhir URL dibuang sebelum dibandingkan
    const url = daftarUrl[i].replace(/[).,;!?]+$/, '');
    // URL harus sama atau berawalan salah satu tautan resmi
    const diizinkan = urlDiizinkan.some(function (resmi) {
      return url === resmi || url.startsWith(resmi);
    });
    // URL asing membuat keluaran ditolak
    if (!diizinkan) {
      return { valid: false, jawaban: '', alasan: 'url' };
    }
  }

  // Email tidak boleh muncul pada jawaban
  if (/[\w.+-]+@[\w-]+\.[\w.-]+/i.test(tanpaPenanda)) {
    return { valid: false, jawaban: '', alasan: 'email' };
  }

  // Semua angka lain harus berasal dari konteks, misalnya jam atau jumlah
  const teksAngka = tanpaTautan(tanpaPenanda);
  // Deretan angka diambil satu per satu
  const deret = teksAngka.match(/\d+/g) || [];
  for (let i = 0; i < deret.length; i += 1) {
    // Angka harus ada pada token konteks dalam bentuk asli atau kanonik
    if (!setAngka.has(deret[i]) && !setAngka.has(String(Number(deret[i])))) {
      return { valid: false, jawaban: '', alasan: 'angka-asing' };
    }
  }

  // Keluaran dinyatakan valid beserta jawaban yang sudah dirapikan
  return { valid: true, jawaban, alasan: '' };
}

// Memeriksa satu caption hasil AI sebelum ditampilkan ke admin
function validasiCaption(teks) {
  // Nilai bukan teks dianggap tidak valid
  if (typeof teks !== 'string') {
    return { valid: false, caption: '', alasan: 'bentuk' };
  }
  // Spasi dirapikan dan panjang dibatasi
  const caption = teks.replace(/\s+/g, ' ').trim();
  // Caption kosong atau terlalu panjang ditolak
  if (!caption || caption.length > MAKS_CAPTION) {
    return { valid: false, caption: '', alasan: 'panjang' };
  }
  // Angka tidak boleh muncul pada caption
  if (/\d/.test(caption)) {
    return { valid: false, caption: '', alasan: 'angka' };
  }
  // Rupiah dan tautan tidak boleh muncul
  if (/\bRp\b/i.test(caption) || /https?:\/\/|www\./i.test(caption)) {
    return { valid: false, caption: '', alasan: 'tautan' };
  }
  // Mention akun tidak boleh muncul
  if (/@\w/.test(caption)) {
    return { valid: false, caption: '', alasan: 'mention' };
  }
  // Seluruh hashtag harus dari daftar izin
  const hashtag = caption.match(/#[\w]+/g) || [];
  for (let i = 0; i < hashtag.length; i += 1) {
    // Hashtag dibandingkan tanpa membedakan huruf besar kecil
    if (!HASHTAG_DIIZINKAN.includes(hashtag[i].toLowerCase())) {
      return { valid: false, caption: '', alasan: 'hashtag' };
    }
  }
  // Kata klaim, promosi, dan superlatif tidak boleh muncul
  const kecil = caption.toLowerCase();
  for (let i = 0; i < KATA_TERLARANG_CAPTION.length; i += 1) {
    // Pencocokan memakai batas kata agar tidak salah menangkap kata lain
    const pola = new RegExp('(^|[^a-z])' + KATA_TERLARANG_CAPTION[i].replace(/\./g, '\\.') + '($|[^a-z])', 'i');
    // Satu kata terlarang cukup menggagalkan caption
    if (pola.test(kecil)) {
      return { valid: false, caption: '', alasan: 'kata-terlarang' };
    }
  }
  // Caption lolos seluruh pemeriksaan
  return { valid: true, caption, alasan: '' };
}

// Ekspor seluruh fungsi murni dan konstanta batas
module.exports = {
  MAKS_JAWABAN,
  MAKS_CAPTION,
  HASHTAG_DIIZINKAN,
  KATA_TERLARANG_CAPTION,
  normalisasiTeks,
  cekInjeksi,
  cekDiLuarTopikJelas,
  bersihkanPesan,
  gantiPenandaHarga,
  validasiKeluaranChat,
  validasiCaption,
};
