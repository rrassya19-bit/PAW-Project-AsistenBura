// Skrip uji API: menguji seluruh endpoint CRUD dan mencocokkannya dengan database
const config = require('../config');
const { pool } = require('../config/database');

// Alamat server lokal memakai PORT dari konfigurasi .env
const alamatDasar = `http://127.0.0.1:${config.port}`;

// Menyusun header Basic Auth dari konfigurasi admin tanpa mencetak kredensial
function headerAdmin() {
  const token = Buffer.from(
    `${config.admin.user}:${config.admin.password}`
  ).toString('base64');
  return { Authorization: `Basic ${token}` };
}

// Menghitung jumlah langkah yang gagal
let jumlahGagal = 0;

// Menyimpan id produk uji agar bisa dibersihkan bila perlu
let idUji = null;

// Menyimpan id produk uji foto agar bisa dibersihkan bila perlu
let idFotoUji = null;
let idTanpaFotoUji = null;

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

// Membuat opsi fetch untuk body JSON dengan kredensial admin
function opsiJson(method, body) {
  return {
    method,
    headers: { 'Content-Type': 'application/json', ...headerAdmin() },
    body: JSON.stringify(body),
  };
}

// Membuat opsi fetch untuk operasi tulis tanpa body
function opsiAdmin(method) {
  return {
    method,
    headers: headerAdmin(),
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

// Menguji penyimpanan foto valid, foto kosong, dan penolakan foto tidak aman
async function ujiFoto() {
  // Data dasar dipakai ulang oleh seluruh skenario foto
  const dataDasar = {
    kategori: 'Uji Foto',
    harga: 15000,
    hargaMaks: null,
    deskripsi: 'Data uji kolom foto',
    tersedia: true,
  };

  // Langkah foto 1: POST dengan path /media yang valid
  const fotoValid = '/media/menu/uji-api.jpg';
  const sebelumFoto = await hitungBaris();
  const postFoto = await minta(
    '/api/produk',
    opsiJson('POST', { ...dataDasar, nama: `Uji Foto ${Date.now()}`, foto: fotoValid })
  );
  if (postFoto.data && Number.isInteger(postFoto.data.id)) {
    idFotoUji = postFoto.data.id;
  }
  const barisFoto = idFotoUji === null ? null : await bacaBaris(idFotoUji);
  const sesudahFoto = await hitungBaris();
  lapor(
    'POST /api/produk menyimpan foto valid',
    postFoto.respons.status === 201 &&
      postFoto.data &&
      postFoto.data.foto === fotoValid &&
      barisFoto &&
      barisFoto.foto === fotoValid &&
      sesudahFoto === sebelumFoto + 1,
    `status ${postFoto.respons.status}, id ${idFotoUji}`
  );

  // Langkah foto 2: POST tanpa foto harus menyimpan null
  const sebelumTanpaFoto = await hitungBaris();
  const postTanpaFoto = await minta(
    '/api/produk',
    opsiJson('POST', { ...dataDasar, nama: `Uji Tanpa Foto ${Date.now()}` })
  );
  if (postTanpaFoto.data && Number.isInteger(postTanpaFoto.data.id)) {
    idTanpaFotoUji = postTanpaFoto.data.id;
  }
  const barisTanpaFoto =
    idTanpaFotoUji === null ? null : await bacaBaris(idTanpaFotoUji);
  const sesudahTanpaFoto = await hitungBaris();
  lapor(
    'POST /api/produk menerima produk tanpa foto',
    postTanpaFoto.respons.status === 201 &&
      postTanpaFoto.data &&
      postTanpaFoto.data.foto === null &&
      barisTanpaFoto &&
      barisTanpaFoto.foto === null &&
      sesudahTanpaFoto === sebelumTanpaFoto + 1,
    `status ${postTanpaFoto.respons.status}, foto null`
  );

  // Langkah foto 3: skema berbahaya harus ditolak tanpa menambah baris
  const sebelumSkema = await hitungBaris();
  const postSkema = await minta(
    '/api/produk',
    opsiJson('POST', {
      ...dataDasar,
      nama: `Uji Foto Skema ${Date.now()}`,
      foto: 'javascript:alert(1)',
    })
  );
  const sesudahSkema = await hitungBaris();
  lapor(
    'POST /api/produk menolak foto javascript:',
    postSkema.respons.status === 400 &&
      Array.isArray(postSkema.data && postSkema.data.kesalahan) &&
      sesudahSkema === sebelumSkema,
    `status ${postSkema.respons.status}, DB tetap ${sesudahSkema} baris`
  );

  // Langkah foto 4: path traversal harus ditolak tanpa menambah baris
  const sebelumTraversal = await hitungBaris();
  const postTraversal = await minta(
    '/api/produk',
    opsiJson('POST', {
      ...dataDasar,
      nama: `Uji Foto Traversal ${Date.now()}`,
      foto: '../foto.jpg',
    })
  );
  const sesudahTraversal = await hitungBaris();
  lapor(
    'POST /api/produk menolak foto ../',
    postTraversal.respons.status === 400 &&
      Array.isArray(postTraversal.data && postTraversal.data.kesalahan) &&
      sesudahTraversal === sebelumTraversal,
    `status ${postTraversal.respons.status}, DB tetap ${sesudahTraversal} baris`
  );

  // Langkah foto 5: PUT dengan URL https harus memperbarui kolom foto
  if (idFotoUji === null) {
    lapor('PUT /api/produk/:id memperbarui foto', false, 'id uji foto tidak tersedia');
  } else {
    const fotoHttps = 'https://example.com/foto-menu.jpg';
    const putFoto = await minta(
      `/api/produk/${idFotoUji}`,
      opsiJson('PUT', {
        ...dataDasar,
        nama: `Uji Foto Diubah ${Date.now()}`,
        foto: fotoHttps,
      })
    );
    const barisPutFoto = await bacaBaris(idFotoUji);
    lapor(
      'PUT /api/produk/:id memperbarui foto',
      putFoto.respons.status === 200 &&
        putFoto.data &&
        putFoto.data.foto === fotoHttps &&
        barisPutFoto &&
        barisPutFoto.foto === fotoHttps,
      `status ${putFoto.respons.status}, URL https tersimpan`
    );
  }

  // Membersihkan produk uji foto agar jumlah data kembali seperti semula
  if (idFotoUji !== null) {
    const hapusFoto = await minta(`/api/produk/${idFotoUji}`, opsiAdmin('DELETE'));
    if (hapusFoto.respons.ok) {
      idFotoUji = null;
    }
  }
  if (idTanpaFotoUji !== null) {
    const hapusTanpaFoto = await minta(
      `/api/produk/${idTanpaFotoUji}`,
      opsiAdmin('DELETE')
    );
    if (hapusTanpaFoto.respons.ok) {
      idTanpaFotoUji = null;
    }
  }
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

  // Langkah 1b: memastikan endpoint status tetap publik tanpa kredensial
  const statusPublik = await minta('/api/status');
  lapor(
    'GET /api/status tetap dapat diakses tanpa kredensial',
    statusPublik.respons.status === 200,
    `status ${statusPublik.respons.status}`
  );

  // Data valid dipakai untuk membuktikan autentikasi berjalan sebelum validasi
  const dataTolak = {
    nama: `Tidak boleh dibuat ${Date.now()}`,
    kategori: 'Uji Autentikasi',
    harga: 1000,
    hargaMaks: null,
    deskripsi: 'Data uji autentikasi',
    tersedia: true,
  };

  // Langkah 1c: menolak POST tanpa header Authorization
  const sebelum401Post = await hitungBaris();
  const post401 = await minta('/api/produk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dataTolak),
  });
  const sesudah401Post = await hitungBaris();
  const lulus401Post =
    post401.respons.status === 401 &&
    post401.data &&
    post401.data.pesan === 'Autentikasi admin diperlukan' &&
    (post401.respons.headers.get('www-authenticate') || '').includes(
      'Basic realm="Admin Bura Bura Coffee"'
    ) &&
    sesudah401Post === sebelum401Post;
  lapor(
    'POST /api/produk menolak permintaan tanpa kredensial',
    lulus401Post,
    `status ${post401.respons.status}, DB tetap ${sesudah401Post} baris`
  );

  // Langkah 1d: menolak POST dengan kredensial yang salah
  const tokenSalah = Buffer.from('salah:salah').toString('base64');
  const sebelum401Salah = await hitungBaris();
  const postSalah = await minta('/api/produk', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${tokenSalah}`,
    },
    body: JSON.stringify(dataTolak),
  });
  const sesudah401Salah = await hitungBaris();
  const lulus401Salah =
    postSalah.respons.status === 401 &&
    postSalah.data &&
    postSalah.data.pesan === 'Autentikasi admin diperlukan' &&
    sesudah401Salah === sebelum401Salah;
  lapor(
    'POST /api/produk menolak kredensial salah',
    lulus401Salah,
    `status ${postSalah.respons.status}, DB tetap ${sesudah401Salah} baris`
  );

  // Langkah 1e: menolak PUT tanpa kredensial dan tidak mengubah data
  const put401 = await minta(`/api/produk/${produkContoh.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dataTolak),
  });
  const barisPut401 = await bacaBaris(produkContoh.id);
  const lulus401Put =
    put401.respons.status === 401 &&
    barisPut401 &&
    barisPut401.nama === produkContoh.nama;
  lapor(
    'PUT /api/produk/:id menolak permintaan tanpa kredensial',
    lulus401Put,
    `status ${put401.respons.status}, data tidak berubah`
  );

  // Langkah 1f: menolak DELETE tanpa kredensial dan tidak menghapus data
  const hapus401 = await minta(`/api/produk/${produkContoh.id}`, {
    method: 'DELETE',
  });
  const barisHapus401 = await bacaBaris(produkContoh.id);
  const lulus401Hapus =
    hapus401.respons.status === 401 &&
    barisHapus401 !== null;
  lapor(
    'DELETE /api/produk/:id menolak permintaan tanpa kredensial',
    lulus401Hapus,
    `status ${hapus401.respons.status}, data tetap ada`
  );

  // Pengujian kolom foto dijalankan sebelum CRUD utama
  await ujiFoto();

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
  const hapus = await minta(`/api/produk/${idUji}`, opsiAdmin('DELETE'));
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
  if (idFotoUji !== null) {
    await pool.query('DELETE FROM produk WHERE id = $1', [idFotoUji]);
    console.log(`Pembersihan: produk uji foto id ${idFotoUji} dihapus`);
  }
  if (idTanpaFotoUji !== null) {
    await pool.query('DELETE FROM produk WHERE id = $1', [idTanpaFotoUji]);
    console.log(`Pembersihan: produk uji tanpa foto id ${idTanpaFotoUji} dihapus`);
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
