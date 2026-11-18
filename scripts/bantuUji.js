// Pembantu bersama skrip pengujian: login sesi, cookie, dan pembersihan sesi
const config = require('../config');
const { pool } = require('../config/database');

// Kredensial admin dibaca dari lingkungan setelah dotenv dimuat oleh config
function ambilKredensial() {
  return {
    username: process.env.ADMIN_USER || config.admin.user || '',
    password: process.env.ADMIN_PASSWORD || config.admin.password || '',
  };
}

// Menggabungkan seluruh nilai Set-Cookie menjadi satu header Cookie
function gabungSetCookie(respons) {
  const daftar =
    typeof respons.headers.getSetCookie === 'function'
      ? respons.headers.getSetCookie()
      : [respons.headers.get('set-cookie')];

  return daftar
    .filter(Boolean)
    .map(function (nilai) {
      return String(nilai).split(';')[0];
    })
    .join('; ');
}

// Mengambil nilai cookie bura.sid dari header Cookie
function ambilNilaiCookie(cookieHeader) {
  const bagian = String(cookieHeader || '')
    .split(';')
    .map(function (item) {
      return item.trim();
    })
    .find(function (item) {
      return item.startsWith(config.session.namaCookie + '=');
    });

  if (!bagian) {
    return '';
  }

  return bagian.slice(config.session.namaCookie.length + 1);
}

// Mengambil ID sesi asli dari cookie bertanda tangan express-session
function ambilSid(cookieHeader) {
  const nilai = decodeURIComponent(ambilNilaiCookie(cookieHeader));
  const cocok = /^s:([^.]+)\./.exec(nilai);
  return cocok ? cocok[1] : '';
}

// Membuat pembantu untuk satu alamat server
function buatPembantu(dasar) {
  let cookieAktif = '';
  const daftarSid = new Set();

  // Menyimpan cookie dan ID sesi agar dapat dibersihkan nanti
  function serapSetCookie(respons) {
    const cookieBaru = gabungSetCookie(respons);
    if (!cookieBaru) {
      return;
    }

    const nilaiBaru = ambilNilaiCookie(cookieBaru);
    if (nilaiBaru) {
      cookieAktif = config.session.namaCookie + '=' + nilaiBaru;
    }

    const sid = ambilSid(cookieAktif);
    if (sid) {
      daftarSid.add(sid);
    }
  }

  // Permintaan biasa tanpa cookie, dipakai menguji akses tamu
  async function mintaTanpaSesi(jalur, opsi) {
    return fetch(dasar + jalur, opsi || {});
  }

  // Permintaan dengan cookie sesi yang sedang aktif
  async function minta(jalur, opsi) {
    const pengaturan = { ...(opsi || {}) };
    const headers = new Headers(pengaturan.headers || {});
    if (cookieAktif) {
      headers.set('Cookie', cookieAktif);
    }
    pengaturan.headers = headers;

    const respons = await fetch(dasar + jalur, pengaturan);
    serapSetCookie(respons);
    return respons;
  }

  // Login lewat endpoint JSON lalu menyimpan cookie hasilnya
  async function login(username, password) {
    const kredensial = ambilKredensial();
    const respons = await fetch(dasar + '/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username === undefined ? kredensial.username : username,
        password: password === undefined ? kredensial.password : password,
      }),
    });

    serapSetCookie(respons);

    let data = null;
    try {
      data = await respons.json();
    } catch (galat) {
      data = null;
    }

    if (!respons.ok) {
      const pesan = data && data.pesan ? data.pesan : 'status ' + respons.status;
      throw new Error('Login admin untuk pengujian gagal: ' + pesan);
    }

    return { respons, data };
  }

  // Menghapus seluruh baris sesi milik pengujian dari tabel sesi
  async function bersihkan() {
    for (const sid of daftarSid) {
      await pool.query('DELETE FROM sesi WHERE sid = $1', [sid]);
    }
    daftarSid.clear();
    cookieAktif = '';
  }

  return {
    minta,
    mintaTanpaSesi,
    login,
    bersihkan,
    ambilKredensial,
    cookie: function () {
      return cookieAktif;
    },
    simpanCookie: function (cookieHeader) {
      cookieAktif = cookieHeader;
      const sid = ambilSid(cookieAktif);
      if (sid) {
        daftarSid.add(sid);
      }
    },
    catatSid: function (sid) {
      if (sid) {
        daftarSid.add(sid);
      }
    },
  };
}

module.exports = { buatPembantu, ambilKredensial, ambilSid, ambilNilaiCookie, gabungSetCookie };
