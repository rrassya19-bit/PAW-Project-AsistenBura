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

// Daftar kata klaim yang tidak boleh muncul pada caption chat baru
const KATA_KLAIM_CHAT_CAPTION = [
  'terbaik',
  'terenak',
  'ternikmat',
  'paling',
  'nomor satu',
  'no. 1',
  'satu-satunya',
  'dijamin',
  'gratis',
  'diskon',
  'promo',
  'sehat',
  'halal',
  'asli',
  'rendah kalori',
];

// Daftar kata waktu yang hanya boleh muncul bila admin menyebutkannya
const KATA_WAKTU_CHAT_CAPTION = [
  'pagi',
  'siang',
  'sore',
  'malam',
  'akhir pekan',
  'hari ini',
  'besok',
];

// Daftar kata risiko yang harus sudah ada di fakta atau instruksi admin
const KATA_RISIKO_CHAT_CAPTION = [
  'espresso',
  'latte',
  'cappuccino',
  'americano',
  'mocha',
  'macchiato',
  'flat white',
  'matcha',
  'cokelat',
  'coklat',
  'karamel',
  'caramel',
  'vanila',
  'vanilla',
  'susu',
  'oat',
  'hazelnut',
  'butterscotch',
  'aren',
  'gula aren',
  'sirup',
  'kopi susu',
  'cold brew',
  'v60',
  'tubruk',
];

// Hashtag dasar yang selalu boleh dipakai caption chat
const HASHTAG_CHAT_CAPTION = ['#buraburacoffee', '#yogyakarta'];

// Melarikan karakter khusus regex agar kata dicocokkan sebagai teks biasa
function pelarianRegex(teks) {
  // Karakter regex diberi garis miring terbalik
  return String(teks).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Memeriksa kata atau frasa utuh tanpa membedakan huruf besar kecil
function adaKataUtuh(teks, kata) {
  // Teks dan kata dinormalkan lebih dulu
  const sumber = String(teks || '').toLowerCase();
  // Pola memakai batas nonhuruf agar tidak menangkap kata lain
  const pola = new RegExp('(^|[^a-z])' + pelarianRegex(kata) + '($|[^a-z])', 'i');
  // Hasil pencocokan dikembalikan sebagai boolean
  return pola.test(sumber);
}

// Membersihkan satu nilai teks keluaran model tanpa menyisakan tag pembatas
function bersihkanTeksChatCaption(nilai, maks) {
  // Nilai bukan teks menjadi teks kosong
  const awal = typeof nilai === 'string' ? nilai : '';
  // Kurung sudut dibuang agar tidak dapat menutup tag pembatas
  return awal
    .replace(/[<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maks);
}

// Mengubah teks JSON model menjadi objek, termasuk bila dibungkus pagar kode
function bacaJsonChatCaption(teks) {
  // Teks diubah ke string dan dirapikan
  const bersih = String(teks || '').trim();
  // Pagar kode Markdown dibuang bila model menambahkannya
  const tanpaPagar = bersih.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  // JSON diurai dan galat diteruskan ke pemanggil
  return JSON.parse(tanpaPagar);
}

// Memvalidasi keluaran chat caption sesuai aturan anti-halusinasi
function validasiCaptionChat(teksModel, opsi) {
  // Opsi dibaca dengan nilai aman agar fungsi tetap murni
  const pengaturan = opsi || {};
  // Instruksi admin dipakai sebagai sumber kata yang diizinkan
  const instruksiAdmin = typeof pengaturan.instruksiAdmin === 'string' ? pengaturan.instruksiAdmin : '';
  // Riwayat hanya menyumbang instruksi admin, bukan caption lama
  const riwayat = Array.isArray(pengaturan.riwayat) ? pengaturan.riwayat : [];
  // Kode rahasia proses tidak boleh bocor ke caption
  const kodeRahasia = typeof pengaturan.kodeRahasia === 'string' ? pengaturan.kodeRahasia : '';
  // Batas awal caption adalah 150 karakter
  let batas = Number.isInteger(pengaturan.batasKarakter) && pengaturan.batasKarakter > 0
    ? pengaturan.batasKarakter
    : 150;
  // Admin boleh meminta caption sampai 300 karakter secara eksplisit
  if (/300|lebih panjang|lebih dari 150|maksimal 300/i.test(instruksiAdmin)) {
    batas = 300;
  }
  // Batas mutlak dari skema tetap 300 karakter
  batas = Math.min(batas, 300);

  // JSON model diurai; bentuk rusak langsung ditolak
  let hasil;
  try {
    hasil = bacaJsonChatCaption(teksModel);
  } catch (galat) {
    return { valid: false, alasan: 'json', data: null };
  }
  // Akar keluaran wajib berupa objek biasa
  if (!hasil || typeof hasil !== 'object' || Array.isArray(hasil)) {
    return { valid: false, alasan: 'bentuk', data: null };
  }
  // Tiga daftar wajib berupa array
  if (
    !Array.isArray(hasil.faktaTerlihat) ||
    !Array.isArray(hasil.tidakJelas) ||
    !Array.isArray(hasil.caption)
  ) {
    return { valid: false, alasan: 'bentuk', data: null };
  }
  // Pertanyaan dan catatan boleh null tetapi harus teks bila diisi
  if (
    (hasil.pertanyaan !== null && typeof hasil.pertanyaan !== 'string') ||
    (hasil.catatan !== null && typeof hasil.catatan !== 'string')
  ) {
    return { valid: false, alasan: 'bentuk', data: null };
  }

  // Fakta dibatasi jumlah dan panjangnya sebelum dipakai aturan risiko
  const faktaTerlihat = hasil.faktaTerlihat
    .filter(function (item) {
      return typeof item === 'string';
    })
    .map(function (item) {
      return bersihkanTeksChatCaption(item, 160);
    })
    .filter(Boolean)
    .slice(0, 8);
  // Ketidakjelasan dibatasi dengan cara yang sama
  const tidakJelas = hasil.tidakJelas
    .filter(function (item) {
      return typeof item === 'string';
    })
    .map(function (item) {
      return bersihkanTeksChatCaption(item, 160);
    })
    .filter(Boolean)
    .slice(0, 8);

  // Angka dari instruksi admin boleh muncul kembali di caption
  const angkaInstruksi = new Set((instruksiAdmin.match(/\d+/g) || []).map(String));
  // Hashtag tambahan yang diketik admin ikut diizinkan
  const hashtagDiizinkan = new Set(HASHTAG_CHAT_CAPTION);
  // Seluruh hashtag instruksi ditambahkan ke daftar izin
  (instruksiAdmin.match(/#[\w]+/g) || []).forEach(function (tag) {
    hashtagDiizinkan.add(tag.toLowerCase());
  });
  // Gabungan fakta dan instruksi menjadi sumber kata risiko
  const sumberRisiko =
    faktaTerlihat.join(' ') +
    ' ' +
    instruksiAdmin +
    ' ' +
    riwayat
      .map(function (giliran) {
        return giliran && typeof giliran.instruksi === 'string' ? giliran.instruksi : '';
      })
      .join(' ');

  // Caption yang sudah dipakai dicegah berulang
  const teksDipakai = new Set();
  // Hasil akhir hanya memuat caption yang lolos seluruh pemeriksaan
  const caption = [];

  // Setiap item caption diperiksa satu per satu
  hasil.caption.forEach(function (item) {
    // Item harus berupa objek dengan teks string
    if (!item || typeof item !== 'object' || Array.isArray(item) || typeof item.teks !== 'string') {
      return;
    }
    // Teks caption dirapikan dan dibatasi
    const teks = bersihkanTeksChatCaption(item.teks, 300);
    // Caption kosong dan terlalu panjang ditolak
    if (!teks || teks.length > batas) {
      return;
    }
    // Caption yang sama tidak dikembalikan dua kali
    const kunci = teks.toLowerCase();
    if (teksDipakai.has(kunci)) {
      return;
    }
    // Kode rahasia tidak boleh muncul dalam bentuk apa pun
    if (kodeRahasia && teks.includes(kodeRahasia)) {
      return;
    }
    // Rupiah, nominal pendek, dan tautan selalu ditolak
    if (/\bRp\b/i.test(teks) || /\b(rb|ribu)\b/i.test(teks) || /https?:\/\/|www\./i.test(teks)) {
      return;
    }
    // Email dan mention akun tidak boleh muncul
    if (/[\w.+-]+@[\w-]+\.[\w.-]+/i.test(teks) || /@\w/.test(teks)) {
      return;
    }
    // Setiap angka harus sudah ada pada instruksi admin
    const angkaCaption = teks.match(/\d+/g) || [];
    for (let i = 0; i < angkaCaption.length; i += 1) {
      if (!angkaInstruksi.has(angkaCaption[i]) && !angkaInstruksi.has(String(Number(angkaCaption[i])))) {
        return;
      }
    }
    // Seluruh hashtag harus termasuk daftar izin
    const daftarHashtag = teks.match(/#[\w]+/g) || [];
    for (let i = 0; i < daftarHashtag.length; i += 1) {
      if (!hashtagDiizinkan.has(daftarHashtag[i].toLowerCase())) {
        return;
      }
    }
    // Kata klaim dan superlatif selalu ditolak
    for (let i = 0; i < KATA_KLAIM_CHAT_CAPTION.length; i += 1) {
      if (adaKataUtuh(teks, KATA_KLAIM_CHAT_CAPTION[i])) {
        return;
      }
    }
    // Kata waktu hanya boleh bila sudah ada di instruksi admin
    for (let i = 0; i < KATA_WAKTU_CHAT_CAPTION.length; i += 1) {
      if (
        adaKataUtuh(teks, KATA_WAKTU_CHAT_CAPTION[i]) &&
        !adaKataUtuh(instruksiAdmin, KATA_WAKTU_CHAT_CAPTION[i])
      ) {
        return;
      }
    }
    // Kata risiko hanya boleh bila muncul di fakta atau instruksi admin
    for (let i = 0; i < KATA_RISIKO_CHAT_CAPTION.length; i += 1) {
      if (
        adaKataUtuh(teks, KATA_RISIKO_CHAT_CAPTION[i]) &&
        !adaKataUtuh(sumberRisiko, KATA_RISIKO_CHAT_CAPTION[i])
      ) {
        return;
      }
    }
    // Gaya dirapikan dan diberi cadangan bila kosong
    const gaya = bersihkanTeksChatCaption(item.gaya, 40) || 'Caption';
    // Caption lolos seluruh pemeriksaan
    caption.push({ gaya, teks });
    // Teks ditandai agar tidak muncul lagi
    teksDipakai.add(kunci);
    // Maksimal tiga caption dikembalikan
    if (caption.length >= 3) {
      return;
    }
  });

  // Caption dibatasi tepat maksimal tiga item
  const captionAkhir = caption.slice(0, 3);
  // Pertanyaan dibersihkan dan diubah menjadi null bila kosong
  const pertanyaan = bersihkanTeksChatCaption(hasil.pertanyaan, 300) || null;
  // Catatan dibersihkan dan diubah menjadi null bila kosong
  const catatan = bersihkanTeksChatCaption(hasil.catatan, 500) || null;
  // Tanpa caption dan tanpa pertanyaan, keluaran dianggap tidak aman
  if (captionAkhir.length === 0 && !pertanyaan) {
    return { valid: false, alasan: 'tidak-aman', data: null };
  }

  // Hasil bersih dikembalikan ke service
  return {
    valid: true,
    alasan: '',
    data: { faktaTerlihat, tidakJelas, caption: captionAkhir, pertanyaan, catatan },
  };
}

// Ekspor seluruh fungsi murni dan konstanta batas
module.exports = {
  MAKS_JAWABAN,
  MAKS_CAPTION,
  HASHTAG_DIIZINKAN,
  KATA_TERLARANG_CAPTION,
  KATA_KLAIM_CHAT_CAPTION,
  KATA_WAKTU_CHAT_CAPTION,
  KATA_RISIKO_CHAT_CAPTION,
  HASHTAG_CHAT_CAPTION,
  normalisasiTeks,
  cekInjeksi,
  cekDiLuarTopikJelas,
  bersihkanPesan,
  gantiPenandaHarga,
  validasiKeluaranChat,
  validasiCaption,
  validasiCaptionChat,
};
