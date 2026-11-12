// Skrip uji API: menguji seluruh endpoint CRUD dan mencocokkannya dengan database
const config = require('../config');
const { pool } = require('../config/database');

// Alamat server lokal memakai PORT dari konfigurasi .env
const alamatDasar = `http://127.0.0.1:${config.port}`;

// Menghitung jumlah langkah yang gagal
let jumlahGagal = 0;

// Menyimpan id produk uji agar bisa dibersihkan bila perlu
let idUji = null;

// Mencetak status PASS/FAIL untuk setiap langkah
function lapor(nama, lulus, keterangan) {
  const label = lulus ? 'PASS' : 'FAIL';
  const tambahan = keterangan ? ` (${keterangan})` : '';
  console.log(`${label} - ${nama}${tambahan}`);
  if (!lulus) {
    jumlahGagal += 1;
  }
}

// Mengirim request dan membaca body JSON dengan aman
async function minta(jalur, opsi) {
  const respons = await fetch(alamatDasar + jalur, opsi || {});
  let data = null;
  try {
    data = await respons.json();
  } catch (galat) {
    data = null;
  }
  return { respons, data };
}

// Membuat opsi fetch untuk body JSON
function opsiJson(method, body) {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

// Menghitung jumlah baris produk langsung dari database
async function hitungBaris() {
  const hasil = await pool.query('SELECT COUNT(*)::int AS jumlah FROM produk');
  return hasil.rows[0].jumlah;
}

// Membaca satu baris produk langsung dari database
async function bacaBaris(id) {
  const hasil = await pool.query('SELECT * FROM produk WHERE id = $1', [id]);
  return hasil.rows[0] || null;
}

// Menjalankan seluruh skenario pengujian
async function jalankan() {
  // Langkah 1: membaca seluruh produk
  const semua = await minta('/api/produk');
  const jumlahDbAwal = await hitungBaris();
  const lulusSemua =
    semua.respons.status === 200 &&
    Array.isArray(semua.data) &&
    semua.data.length >= 33 &&
    jumlahDbAwal === semua.data.length;
  lapor(
    'GET /api/produk mengembalikan seluruh produk',
    lulusSemua,
    `API ${Array.isArray(semua.data) ? semua.data.length : 0} data, DB ${jumlahDbAwal} baris`
  );

  const produkContoh = Array.isArray(semua.data) ? semua.data[0] : null;
  if (!produkContoh) {
    console.log('Tidak ada produk awal untuk melanjutkan pengujian');
    return;
  }

  // Langkah 2: membaca satu produk
  const satu = await minta(`/api/produk/${produkContoh.id}`);
  const barisSatu = await bacaBaris(produkContoh.id);
  const lulusSatu =
    satu.respons.status === 200 &&
    satu.data &&
    satu.data.id === produkContoh.id &&
    barisSatu &&
    barisSatu.nama === produkContoh.nama;
  lapor('GET /api/produk/:id mengembalikan satu produk', lulusSatu, `id ${produkContoh.id}`);

  // Langkah 3: menambah produk valid
  const namaUji = `Uji API ${Date.now()}`;
  const dataBaru = {
    nama: namaUji,
    kategori: 'Uji Kategori',
    harga: 12345,
    hargaMaks: 15000,
    deskripsi: 'Data uji dari skrip',
    tersedia: true,
  };
  const sebelumPost = await hitungBaris();
  const post = await minta('/api/produk', opsiJson('POST', dataBaru));
  if (post.data && Number.isInteger(post.data.id)) {
    idUji = post.data.id;
  }
  const barisPost = idUji === null ? null : await bacaBaris(idUji);
  const sesudahPost = await hitungBaris();
  const lulusPost =
    post.respons.status === 201 &&
    idUji !== null &&
    barisPost &&
    barisPost.nama === namaUji &&
    sesudahPost === sebelumPost + 1;
  lapor('POST /api/produk membuat produk baru', lulusPost, `id ${idUji}, DB ${sesudahPost} baris`);

  // Langkah 4: menolak produk tidak valid
  const sebelumInvalid = await hitungBaris();
  const invalid = await minta(
    '/api/produk',
    opsiJson('POST', { nama: '', kategori: '', harga: -1, hargaMaks: -5 })
  );
  const sesudahInvalid = await hitungBaris();
  const lulusInvalid =
    invalid.respons.status === 400 &&
    invalid.data &&
    invalid.data.pesan === 'Validasi gagal' &&
    Array.isArray(invalid.data.kesalahan) &&
    sesudahInvalid === sebelumInvalid;
  lapor(
    'POST /api/produk menolak data tidak valid',
    lulusInvalid,
    `status ${invalid.respons.status}, DB tetap ${sesudahInvalid} baris`
  );

  // Langkah 5: mengubah produk uji
  const namaBaru = `${namaUji} diubah`;
  const dataUbah = {
    nama: namaBaru,
    kategori: 'Uji Kategori',
    harga: 20000,
    hargaMaks: null,
    deskripsi: 'Data uji yang sudah diubah',
    tersedia: false,
  };
  const put = await minta(`/api/produk/${idUji}`, opsiJson('PUT', dataUbah));
  const barisPut = idUji === null ? null : await bacaBaris(idUji);
  const lulusPut =
    put.respons.status === 200 &&
    put.data &&
    put.data.nama === namaBaru &&
    put.data.harga === 20000 &&
    barisPut &&
    barisPut.nama === namaBaru &&
    barisPut.harga === 20000 &&
    barisPut.tersedia === false;
  lapor('PUT /api/produk/:id mengubah produk', lulusPut, `nama menjadi "${namaBaru}"`);

  // Langkah 6: mengubah id yang tidak ada
  const idTidakAda = 99999999;
  const sebelum404 = await hitungBaris();
  const put404 = await minta(`/api/produk/${idTidakAda}`, opsiJson('PUT', dataUbah));
  const baris404 = await bacaBaris(idTidakAda);
  const sesudah404 = await hitungBaris();
  const lulus404 =
    put404.respons.status === 404 &&
    baris404 === null &&
    sesudah404 === sebelum404;
  lapor(
    'PUT /api/produk/:id mengembalikan 404 untuk id tidak ada',
    lulus404,
    `status ${put404.respons.status}`
  );

  // Langkah 7: menghapus produk uji
  const hapus = await minta(`/api/produk/${idUji}`, { method: 'DELETE' });
  const barisHapus = idUji === null ? null : await bacaBaris(idUji);
  const lulusHapus =
    hapus.respons.status === 200 &&
    hapus.data &&
    hapus.data.pesan === 'Produk berhasil dihapus' &&
    barisHapus === null;
  lapor('DELETE /api/produk/:id menghapus produk', lulusHapus, `status ${hapus.respons.status}`);

  // Menyimpan id yang sudah dihapus untuk pengecekan terakhir
  const idDihapus = hapus.data && hapus.data.data ? hapus.data.data.id : idUji;
  if (lulusHapus) {
    idUji = null;
  }

  // Langkah 8: memastikan produk yang dihapus tidak ditemukan lagi
  const getHapus = await minta(`/api/produk/${idDihapus}`);
  const barisGetHapus = idDihapus === null ? null : await bacaBaris(idDihapus);
  const lulusGetHapus =
    getHapus.respons.status === 404 &&
    barisGetHapus === null;
  lapor(
    'GET /api/produk/:id mengembalikan 404 setelah dihapus',
    lulusGetHapus,
    `status ${getHapus.respons.status}`
  );
}

// Membersihkan produk uji yang mungkin tertinggal bila terjadi kegagalan
async function bersihkan() {
  if (idUji !== null) {
    await pool.query('DELETE FROM produk WHERE id = $1', [idUji]);
    console.log(`Pembersihan: produk uji id ${idUji} dihapus`);
  }
}

// Menjalankan pengujian lalu menutup pool dan menentukan kode keluar
jalankan()
  .catch((galat) => {
    console.error('Uji gagal dijalankan:', galat.message);
    jumlahGagal += 1;
  })
  .finally(async () => {
    await bersihkan();
    await pool.end();
    console.log(`Ringkasan: ${jumlahGagal === 0 ? 'semua langkah PASS' : `${jumlahGagal} langkah FAIL`}`);
    process.exitCode = jumlahGagal === 0 ? 0 : 1;
  });
