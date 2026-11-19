// Skrip uji autentikasi dan kerangka admin berbasis sesi
// Aplikasi dijalankan di dalam proses pada port acak dengan kredensial uji sementara
const modeAnak = process.env.UJI_ADMIN_ANAK === '1';

// Proses induk memakai kredensial uji; proses anak menerima nilai dari induk
if (!modeAnak) {
  process.env.ADMIN_USER = 'uji';
  process.env.ADMIN_PASSWORD = 'sandi-uji-12345';
  process.env.SESSION_SECRET = require('crypto').randomBytes(48).toString('hex');
}

// Nilai uji disimpan agar pemindaian kebocoran tidak bergantung pada perubahan sementara
const rahasiaUji = process.env.SESSION_SECRET || '';
const sandiUji = process.env.ADMIN_PASSWORD || '';

const crypto = require('crypto');
const { spawnSync } = require('child_process');
const app = require('../app');
const config = require('../config');
const { pool } = require('../config/database');
const batasLogin = require('../middlewares/batasLogin');
const { setelUlangLogKonfigurasi } = require('../utils/kredensialAdmin');
const {
  buatPembantu,
  ambilSid,
  gabungSetCookie,
} = require('./bantuUji');

// Penghitung hasil dan catatan respons untuk pemindaian kebocoran
let jumlahLulus = 0;
let jumlahGagal = 0;
const catatanRespons = [];

// Mencetak status setiap langkah
function lapor(nama, lulus, keterangan) {
  const label = lulus ? 'PASS' : 'FAIL';
  const tambahan = keterangan ? ` (${keterangan})` : '';
  console.log(`${label} - ${nama}${tambahan}`);
  if (lulus) {
    jumlahLulus += 1;
  } else {
    jumlahGagal += 1;
  }
}

// Menyimpan teks dan header respons untuk pemindaian akhir
function catatRespons(respons, teks) {
  const header = Array.from(respons.headers.entries())
    .map(function (pasangan) {
      return pasangan[0] + ': ' + pasangan[1];
    })
    .join('\n');
  catatanRespons.push(teks + '\n' + header);
}

// Membaca body teks dan mencatat respons
async function bacaRespons(respons) {
  const teks = await respons.text();
  catatRespons(respons, teks);
  return { respons, teks };
}

// Menyusun cookie bertanda tangan untuk sesi tiruan sebelum login
function cookieTandaTangan(sid) {
  const tanda = crypto
    .createHmac('sha256', config.session.secret)
    .update(sid)
    .digest('base64')
    .replace(/=+$/, '');
  return config.session.namaCookie + '=' + encodeURIComponent('s:' + sid + '.' + tanda);
}

// Membuat baris sesi tiruan agar dapat menguji regenerasi ID sesi
async function buatSesiTiruan() {
  const sid = 'uji-' + crypto.randomBytes(16).toString('hex');
  await pool.query(
    'INSERT INTO sesi (sid, sess, expire) VALUES ($1, $2::json, NOW() + INTERVAL \'1 hour\')',
    [sid, '{"cookie":{}}']
  );
  return { sid, cookie: cookieTandaTangan(sid) };
}

// Menjalankan seluruh skenario
async function jalankan() {
  // Server uji berjalan di dalam proses pada port acak
  const server = await new Promise(function (selesai) {
    const aktif = app.listen(0, function () {
      selesai(aktif);
    });
  });
  const dasar = 'http://127.0.0.1:' + server.address().port;
  const pembantu = buatPembantu(dasar);

  // Membuka halaman memakai cookie tertentu tanpa mengubah cookie pembantu
  async function halamanDenganCookie(jalur, cookie) {
    const respons = await pembantu.mintaTanpaSesi(jalur, {
      headers: { Cookie: cookie },
      redirect: 'manual',
    });
    return bacaRespons(respons);
  }

  // Membaca halaman tanpa mengikuti pengalihan
  async function halaman(jalur, tamu) {
    const opsi = { redirect: 'manual' };
    const respons = tamu
      ? await pembantu.mintaTanpaSesi(jalur, opsi)
      : await pembantu.minta(jalur, opsi);
    return bacaRespons(respons);
  }

  // Mengirim permintaan JSON dan membaca hasilnya
  async function mintaJson(jalur, opsi, tamu) {
    const respons = tamu
      ? await pembantu.mintaTanpaSesi(jalur, opsi)
      : await pembantu.minta(jalur, opsi);
    const hasil = await bacaRespons(respons);
    let data = null;
    try {
      data = JSON.parse(hasil.teks);
    } catch (galat) {
      data = null;
    }
    return { respons, data, teks: hasil.teks };
  }

  // Login halaman memakai form URL-encoded dan cookie opsional
  async function loginHalaman(username, password, next, cookieAwal) {
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    if (cookieAwal) {
      headers.Cookie = cookieAwal;
    }
    const body = new URLSearchParams({ username, password });
    if (next !== undefined) {
      body.set('next', next);
    }
    const respons = await pembantu.mintaTanpaSesi('/admin/login', {
      method: 'POST',
      headers,
      body,
      redirect: 'manual',
    });
    return bacaRespons(respons);
  }

  const idProdukUji = [];

  try {
    // ---------- 1. Halaman admin tanpa sesi ----------
    for (const jalur of ['/admin', '/admin/foto', '/admin/video', '/admin/foto/tambah', '/admin/caption']) {
      const hasil = await halaman(jalur, true);
      const lokasi = hasil.respons.headers.get('location') || '';
      lapor(
        `GET ${jalur} tanpa sesi dialihkan ke login`,
        hasil.respons.status === 302 &&
          lokasi.startsWith('/admin/login?next=') &&
          !hasil.respons.headers.get('www-authenticate'),
        `status ${hasil.respons.status}, tujuan ${lokasi}`
      );
    }

    // ---------- 2. Halaman login ----------
    const loginTamu = await halaman('/admin/login', true);
    lapor(
      'GET /admin/login menampilkan form',
      loginTamu.respons.status === 200 &&
        loginTamu.teks.includes('action="/admin/login"') &&
        loginTamu.teks.includes('name="username"') &&
        loginTamu.teks.includes('name="password"'),
      `status ${loginTamu.respons.status}`
    );

    // ---------- 3. Batas percobaan login ----------
    batasLogin.setelUlangBatasLogin();
    const salahSandi = await loginHalaman('uji', 'sandi-salah');
    const salahUser = await loginHalaman('tidak-ada', 'sandi-salah');
    lapor(
      'login dengan password salah dibalas 401',
      salahSandi.respons.status === 401 && salahSandi.teks.includes('Username atau password salah'),
      `status ${salahSandi.respons.status}`
    );
    lapor(
      'login dengan username salah dibalas pesan yang sama',
      salahUser.respons.status === 401 && salahUser.teks.includes('Username atau password salah'),
      `status ${salahUser.respons.status}`
    );

    // Tiga kegagalan tambahan membuat batas per IP dan per username tercapai
    await loginHalaman('uji', 'sandi-salah');
    await loginHalaman('uji', 'sandi-salah');
    await loginHalaman('tidak-ada', 'sandi-salah');
    const kenaBatas = await loginHalaman('uji', 'sandi-salah');
    const retryAfter = Number(kenaBatas.respons.headers.get('retry-after'));
    lapor(
      'percobaan gagal keenam dibalas 429',
      kenaBatas.respons.status === 429 &&
        Number.isInteger(retryAfter) &&
        retryAfter > 0 &&
        kenaBatas.teks.includes('Terlalu banyak percobaan. Coba lagi beberapa menit lagi.'),
      `status ${kenaBatas.respons.status}, Retry-After ${retryAfter}`
    );

    batasLogin.setelUlangBatasLogin();

    // ---------- 4. Login benar dan regenerasi sesi ----------
    const sesiTiruan = await buatSesiTiruan();
    pembantu.catatSid(sesiTiruan.sid);
    const sebelumLogin = await halamanDenganCookie('/admin/login', sesiTiruan.cookie);
    const loginBenar = await loginHalaman(
      'uji',
      'sandi-uji-12345',
      undefined,
      sesiTiruan.cookie
    );
    const setCookieLogin = loginBenar.respons.headers.getSetCookie
      ? loginBenar.respons.headers.getSetCookie()
      : [loginBenar.respons.headers.get('set-cookie')];
    const cookieSesi = setCookieLogin.filter(Boolean).find(function (nilai) {
      return String(nilai).startsWith(config.session.namaCookie + '=');
    }) || '';
    const cookieBaru = gabungSetCookie(loginBenar.respons);
    const sidBaru = ambilSid(cookieBaru);
    if (cookieBaru) {
      pembantu.simpanCookie(cookieBaru);
    }
    lapor(
      'login benar dialihkan ke /admin',
      loginBenar.respons.status === 302 && loginBenar.respons.headers.get('location') === '/admin',
      `status ${loginBenar.respons.status}`
    );
    lapor(
      'cookie sesi memakai HttpOnly dan SameSite=Lax',
      /HttpOnly/i.test(cookieSesi) && /SameSite=Lax/i.test(cookieSesi),
      cookieSesi ? 'cookie bura.sid diterima' : 'cookie tidak ditemukan'
    );
    lapor(
      'ID sesi berubah setelah login',
      Boolean(sidBaru) && sidBaru !== sesiTiruan.sid,
      `sebelum ${sesiTiruan.sid.slice(0, 6)}..., sesudah ${sidBaru ? sidBaru.slice(0, 6) : 'kosong'}...`
    );
    lapor(
      'halaman login dapat dibuka dengan sesi tamu',
      sebelumLogin.respons.status === 200,
      `status ${sebelumLogin.respons.status}`
    );

    // ---------- 5. Halaman admin dengan sesi ----------
    const adminMasuk = await halaman('/admin', false);
    const judulAdmin = adminMasuk.teks;
    lapor(
      'GET /admin dengan sesi menampilkan tombol Keluar dan navigasi',
      adminMasuk.respons.status === 200 &&
        judulAdmin.includes('Keluar') &&
        judulAdmin.includes('Menu') &&
        judulAdmin.includes('Galeri') &&
        judulAdmin.includes('Video'),
      `status ${adminMasuk.respons.status}`
    );
    lapor(
      'skrip navigasi sidebar dimuat di dalam elemen script',
      /<script>\s*\/\/ Skrip navigasi sidebar admin/.test(judulAdmin),
      'tidak tampil sebagai teks halaman'
    );
    lapor(
      'respons halaman admin memakai Cache-Control no-store',
      String(adminMasuk.respons.headers.get('cache-control') || '').includes('no-store'),
      `Cache-Control ${adminMasuk.respons.headers.get('cache-control')}`
    );

    const captionMasuk = await halaman('/admin/caption', false);
    lapor(
      'GET /admin/caption dengan sesi menampilkan halaman AI caption',
      captionMasuk.respons.status === 200 &&
        captionMasuk.teks.includes('Buat caption untuk galeri.') &&
        captionMasuk.teks.includes('href="/admin/caption"'),
      `status ${captionMasuk.respons.status}`
    );

    const loginSaatMasuk = await halaman('/admin/login', false);
    lapor(
      'GET /admin/login saat sudah masuk dialihkan ke /admin',
      loginSaatMasuk.respons.status === 302 &&
        loginSaatMasuk.respons.headers.get('location') === '/admin',
      `status ${loginSaatMasuk.respons.status}`
    );

    // ---------- 6. API publik dan API tulis tanpa sesi ----------
    const postTamu = await mintaJson(
      '/api/produk',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: `Uji Tamu ${Date.now()}`,
          kategori: 'Uji',
          harga: 1000,
          hargaMaks: null,
          tersedia: true,
        }),
      },
      true
    );
    lapor(
      'POST /api/produk tanpa sesi dibalas 401 JSON',
      postTamu.respons.status === 401 &&
        postTamu.data &&
        postTamu.data.pesan === 'Login admin diperlukan' &&
        !postTamu.respons.headers.get('www-authenticate'),
      `status ${postTamu.respons.status}`
    );

    const getPublik = await mintaJson('/api/produk', {}, true);
    lapor(
      'GET /api/produk tetap publik',
      getPublik.respons.status === 200 && Array.isArray(getPublik.data),
      `status ${getPublik.respons.status}`
    );

    const chatTamu = await mintaJson(
      '/api/chat',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pesan: '' }),
      },
      true
    );
    lapor(
      'POST /api/chat tanpa sesi tidak dibalas 401',
      chatTamu.respons.status !== 401,
      `status ${chatTamu.respons.status}`
    );

    // ---------- 7. API tulis dengan sesi ----------
    const namaProdukUji = `Uji Sesi ${Date.now()}`;
    const postSesi = await mintaJson('/api/produk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nama: namaProdukUji,
        kategori: 'Uji Sesi',
        harga: 12000,
        hargaMaks: null,
        deskripsi: 'Data uji sesi',
        tersedia: true,
      }),
    });
    if (postSesi.data && Number.isInteger(postSesi.data.id)) {
      idProdukUji.push(postSesi.data.id);
    }
    lapor(
      'POST /api/produk dengan sesi berhasil',
      postSesi.respons.status === 201 && postSesi.data && postSesi.data.nama === namaProdukUji,
      `status ${postSesi.respons.status}`
    );

    const hapusSesi = idProdukUji.length
      ? await mintaJson(`/api/produk/${idProdukUji[0]}`, { method: 'DELETE' })
      : { respons: { status: 0 }, data: null };
    if (hapusSesi.respons.status === 200) {
      idProdukUji.shift();
    }
    lapor(
      'DELETE /api/produk dengan sesi berhasil',
      hapusSesi.respons.status === 200,
      `status ${hapusSesi.respons.status}`
    );

    // ---------- 8. Pemeriksaan asal permintaan ----------
    const dataAsal = {
      nama: `Uji Asal ${Date.now()}`,
      kategori: 'Uji Asal',
      harga: 9000,
      hargaMaks: null,
      tersedia: true,
    };
    const originAsing = await mintaJson('/api/produk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://evil.example' },
      body: JSON.stringify(dataAsal),
    });
    lapor(
      'POST dengan Origin asing dibalas 403',
      originAsing.respons.status === 403 &&
        originAsing.data &&
        originAsing.data.pesan === 'Permintaan ditolak',
      `status ${originAsing.respons.status}`
    );

    const fetchCross = await mintaJson('/api/produk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'cross-site' },
      body: JSON.stringify(dataAsal),
    });
    lapor(
      'POST dengan Sec-Fetch-Site cross-site dibalas 403',
      fetchCross.respons.status === 403,
      `status ${fetchCross.respons.status}`
    );

    const tanpaOrigin = await mintaJson('/api/produk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...dataAsal, nama: `Uji Tanpa Origin ${Date.now()}` }),
    });
    if (tanpaOrigin.data && Number.isInteger(tanpaOrigin.data.id)) {
      idProdukUji.push(tanpaOrigin.data.id);
    }
    lapor(
      'POST tanpa Origin tetap lolos',
      tanpaOrigin.respons.status === 201,
      `status ${tanpaOrigin.respons.status}`
    );

    // ---------- 9. Parameter next ----------
    const ujiNext = [
      { nilai: '//evil.com', harapan: '/admin' },
      { nilai: 'https://evil.com', harapan: '/admin' },
      { nilai: '/admin/foto', harapan: '/admin/foto' },
    ];
    for (const kasus of ujiNext) {
      const hasil = await loginHalaman('uji', 'sandi-uji-12345', kasus.nilai);
      const lokasi = hasil.respons.headers.get('location') || '';
      const cookieHasil = gabungSetCookie(hasil.respons);
      pembantu.catatSid(ambilSid(cookieHasil));
      lapor(
        `next ${kasus.nilai} diarahkan ke ${kasus.harapan}`,
        hasil.respons.status === 302 && lokasi === kasus.harapan,
        `tujuan ${lokasi}`
      );
    }

    // ---------- 10. Logout ----------
    const sidAktif = ambilSid(pembantu.cookie());
    const keluar = await mintaJson('/admin/logout', { method: 'POST', redirect: 'manual' });
    const lokasiKeluar = keluar.respons.headers.get('location') || '';
    const barisSesi = sidAktif
      ? await pool.query('SELECT COUNT(*)::int AS jumlah FROM sesi WHERE sid = $1', [sidAktif])
      : { rows: [{ jumlah: -1 }] };
    lapor(
      'POST /admin/logout dialihkan ke halaman login',
      keluar.respons.status === 302 && lokasiKeluar === '/admin/login?keluar=1',
      `status ${keluar.respons.status}, tujuan ${lokasiKeluar}`
    );

    const adminSetelahKeluar = await halaman('/admin', false);
    const tulisSetelahKeluar = await mintaJson('/api/produk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama: `Uji Keluar ${Date.now()}`, kategori: 'Uji' }),
    });
    lapor(
      'cookie lama tidak berlaku setelah logout',
      adminSetelahKeluar.respons.status === 302 && tulisSetelahKeluar.respons.status === 401,
      `halaman ${adminSetelahKeluar.respons.status}, tulis ${tulisSetelahKeluar.respons.status}`
    );
    lapor(
      'baris sesi terhapus setelah logout',
      barisSesi.rows[0].jumlah === 0,
      `baris tersisa ${barisSesi.rows[0].jumlah}`
    );

    const halamanKeluar = await halaman('/admin/login?keluar=1', true);
    lapor(
      'halaman login menampilkan pesan keluar',
      halamanKeluar.respons.status === 200 && halamanKeluar.teks.includes('Kamu sudah keluar.'),
      `status ${halamanKeluar.respons.status}`
    );

    // ---------- 11. Kedaluwarsa sesi ----------
    const loginKedua = await pembantu.login();
    const sidKedua = ambilSid(pembantu.cookie());
    pembantu.catatSid(sidKedua);
    lapor('login ulang untuk uji kedaluwarsa berhasil', loginKedua.respons.status === 200, `status ${loginKedua.respons.status}`);

    await pool.query('UPDATE sesi SET expire = NOW() - INTERVAL \'1 minute\' WHERE sid = $1', [sidKedua]);
    const setelahExpire = await halaman('/admin', false);
    lapor(
      'sesi dengan expire lampau ditolak',
      setelahExpire.respons.status === 302 &&
        !setelahExpire.respons.headers.get('www-authenticate'),
      `status ${setelahExpire.respons.status}`
    );

    const loginKetiga = await pembantu.login();
    const sidKetiga = ambilSid(pembantu.cookie());
    pembantu.catatSid(sidKetiga);
    const mulaiLama = Date.now() - 9 * 60 * 60 * 1000;
    await pool.query(
      'UPDATE sesi SET sess = jsonb_set(sess::jsonb, \'{mulai}\', to_jsonb($2::bigint), true)::json WHERE sid = $1',
      [sidKetiga, mulaiLama]
    );
    const setelahMulai = await halaman('/admin', false);
    lapor(
      'sesi lebih dari 8 jam ditolak',
      loginKetiga.respons.status === 200 && setelahMulai.respons.status === 302,
      `status ${setelahMulai.respons.status}`
    );

    // ---------- 12. Konfigurasi admin per variabel pada proses terpisah ----------
    // Setiap kasus memuat ulang app di proses anak agar urutan baca variabel teruji
    const envAwal = {
      ADMIN_USER: process.env.ADMIN_USER,
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
      SESSION_SECRET: process.env.SESSION_SECRET,
    };

    function jalankanProsesAnak(user, sandi, rahasia) {
      const envAnak = {
        ...process.env,
        UJI_ADMIN_ANAK: '1',
        ADMIN_USER: user,
        ADMIN_PASSWORD: sandi,
        SESSION_SECRET: rahasia,
      };
      const hasil = spawnSync(process.execPath, [__filename], {
        env: envAnak,
        encoding: 'utf8',
        timeout: 30000,
      });
      const baris = String(hasil.stdout || '')
        .split(/\r?\n/)
        .find(function (nilai) {
          return nilai.startsWith('HASIL_ANAK:');
        });
      if (!baris) {
        return { gagalJalan: true, kode: hasil.status };
      }
      return JSON.parse(baris.slice('HASIL_ANAK:'.length));
    }

    function konfigurasiAnak(user, sandi, rahasia) {
      return jalankanProsesAnak(user, sandi, rahasia);
    }

    const tanpaRahasiaAnak = konfigurasiAnak(envAwal.ADMIN_USER, envAwal.ADMIN_PASSWORD, '   ');
    lapor(
      'tanpa SESSION_SECRET proses baru membalas 503',
      tanpaRahasiaAnak.status === 503,
      `status ${tanpaRahasiaAnak.status}`
    );
    lapor(
      'halaman 503 tidak memuat nama variabel, nilai, atau rahasia',
      tanpaRahasiaAnak.status === 503 &&
        tanpaRahasiaAnak.petunjuk === true &&
        tanpaRahasiaAnak.memuatNamaVariabel === false &&
        tanpaRahasiaAnak.memuatSandi === false &&
        tanpaRahasiaAnak.memuatRahasia === false,
      'pesan tetap umum dan memuat petunjuk pengelola'
    );

    const rahasiaPendekAnak = konfigurasiAnak(
      envAwal.ADMIN_USER,
      envAwal.ADMIN_PASSWORD,
      'x'.repeat(31)
    );
    lapor(
      'SESSION_SECRET 31 karakter pada proses baru dibalas 503',
      rahasiaPendekAnak.status === 503,
      `status ${rahasiaPendekAnak.status}`
    );

    const tanpaUserAnak = konfigurasiAnak('   ', envAwal.ADMIN_PASSWORD, envAwal.SESSION_SECRET);
    lapor(
      'tanpa ADMIN_USER pada proses baru dibalas 503',
      tanpaUserAnak.status === 503,
      `status ${tanpaUserAnak.status}`
    );

    const tanpaSandiAnak = konfigurasiAnak(envAwal.ADMIN_USER, '   ', envAwal.SESSION_SECRET);
    lapor(
      'tanpa ADMIN_PASSWORD pada proses baru dibalas 503',
      tanpaSandiAnak.status === 503,
      `status ${tanpaSandiAnak.status}`
    );

    const spasiAnak = konfigurasiAnak(
      '  ' + envAwal.ADMIN_USER + '  ',
      '  ' + envAwal.ADMIN_PASSWORD + '  ',
      '  ' + envAwal.SESSION_SECRET + '  '
    );
    lapor(
      'spasi di ujung nilai dibersihkan pada proses baru',
      spasiAnak.status === 200 && spasiAnak.form === true,
      `status ${spasiAnak.status}`
    );

    const kutipAnak = konfigurasiAnak(
      '"' + envAwal.ADMIN_USER + '"',
      '"' + envAwal.ADMIN_PASSWORD + '"',
      '"' + envAwal.SESSION_SECRET + '"'
    );
    lapor(
      'tanda kutip pembungkus diperlakukan seperti tanpa kutip',
      kutipAnak.status === 200 && kutipAnak.form === true,
      `status ${kutipAnak.status}`
    );

    const lengkapAnak = konfigurasiAnak(
      envAwal.ADMIN_USER,
      envAwal.ADMIN_PASSWORD,
      envAwal.SESSION_SECRET
    );
    lapor(
      'konfigurasi lengkap pada proses baru menampilkan form login',
      lengkapAnak.status === 200 && lengkapAnak.form === true,
      `status ${lengkapAnak.status}`
    );

    // Log terminal menyebut variabel bermasalah tetapi tidak pernah nilainya
    process.env.ADMIN_USER = '   ';
    process.env.ADMIN_PASSWORD = '   ';
    process.env.SESSION_SECRET = '   ';
    setelUlangLogKonfigurasi();
    const logTertangkap = [];
    const logAsli = console.log;
    console.log = function () {
      logTertangkap.push(Array.from(arguments).join(' '));
    };
    try {
      await halaman('/admin', true);
      await halaman('/admin/login', true);
    } finally {
      console.log = logAsli;
      process.env.ADMIN_USER = envAwal.ADMIN_USER;
      process.env.ADMIN_PASSWORD = envAwal.ADMIN_PASSWORD;
      process.env.SESSION_SECRET = envAwal.SESSION_SECRET;
    }

    const teksLog = logTertangkap.join('\n');
    const barisKonfigurasi = logTertangkap.filter(function (baris) {
      return baris.includes('[admin] Konfigurasi belum siap');
    });
    lapor(
      'log terminal menyebut ketiga variabel yang bermasalah',
      teksLog.includes('ADMIN_USER') &&
        teksLog.includes('ADMIN_PASSWORD') &&
        teksLog.includes('SESSION_SECRET'),
      'nama variabel tersedia untuk diagnosis'
    );
    lapor(
      'log terminal tidak memuat nilai rahasia atau kata sandi',
      !teksLog.includes(rahasiaUji) && !teksLog.includes(sandiUji),
      'pemindaian keluaran konsol'
    );
    lapor(
      'log konfigurasi dibatasi sekali per 60 detik',
      barisKonfigurasi.length === 1,
      `${barisKonfigurasi.length} baris untuk dua permintaan`
    );

    const hidup = await mintaJson('/api/status', {}, true);
    lapor('server tetap hidup setelah konfigurasi dipulihkan', hidup.respons.status === 200, `status ${hidup.respons.status}`);

    // ---------- 13. Pemindaian kebocoran ----------
    const gabungan = catatanRespons.join('\n');
    lapor(
      'tidak ada password atau rahasia sesi pada respons',
      !gabungan.includes(sandiUji) && !gabungan.includes(rahasiaUji),
      'pemindaian teks dan header'
    );
  } finally {
    // Seluruh data uji dibersihkan, termasuk saat terjadi kegagalan
    for (const id of idProdukUji) {
      await pool.query('DELETE FROM produk WHERE id = $1', [id]);
    }
    await pembantu.bersihkan();
    await pool.query('DELETE FROM sesi WHERE sid LIKE $1', ['uji-%']);
    server.close();
  }
}

// Proses anak memuat app dengan variabel lingkungan yang sudah ditentukan induk
async function jalankanModeAnak() {
  let server = null;
  try {
    server = await new Promise(function (selesai) {
      const aktif = app.listen(0, function () {
        selesai(aktif);
      });
    });
    const dasar = 'http://127.0.0.1:' + server.address().port;
    const respons = await fetch(dasar + '/admin/login', { redirect: 'manual' });
    const teks = await respons.text();
    const sandi = String(process.env.ADMIN_PASSWORD || '').trim();
    const rahasia = String(process.env.SESSION_SECRET || '').trim();
    const hasil = {
      status: respons.status,
      form:
        teks.includes('action="/admin/login"') &&
        teks.includes('name="username"') &&
        teks.includes('name="password"'),
      petunjuk: teks.includes('Hubungi pengelola situs.'),
      memuatNamaVariabel:
        teks.includes('ADMIN_USER') ||
        teks.includes('ADMIN_PASSWORD') ||
        teks.includes('SESSION_SECRET'),
      memuatSandi: sandi.length > 0 && teks.includes(sandi),
      memuatRahasia: rahasia.length > 0 && teks.includes(rahasia),
    };
    console.log('HASIL_ANAK:' + JSON.stringify(hasil));
  } catch (galat) {
    console.log('HASIL_ANAK:' + JSON.stringify({ gagalJalan: true }));
  } finally {
    if (server) {
      await new Promise(function (selesai) {
        server.close(selesai);
      });
    }
    await pool.end();
  }
}

// Proses induk menjalankan seluruh skenario; proses anak hanya melaporkan satu kasus
if (modeAnak) {
  jalankanModeAnak();
} else {
  jalankan()
    .catch(function (galat) {
      console.error('Uji gagal dijalankan:', galat.message);
      jumlahGagal += 1;
    })
    .finally(async function () {
      await pool.end();
      console.log(`Ringkasan: ${jumlahLulus} PASS, ${jumlahGagal} FAIL`);
      process.exitCode = jumlahGagal === 0 ? 0 : 1;
    });
}
