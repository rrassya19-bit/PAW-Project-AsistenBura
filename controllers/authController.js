// Controller autentikasi admin: halaman login, login API, logout, dan status sesi
const config = require('../config');
const { cekKredensial, periksaKonfigurasi } = require('../utils/kredensialAdmin');
const { sesiAdminAktif } = require('../utils/sesiAdmin');
const batasLogin = require('../middlewares/batasLogin');

// Menerima hanya tujuan internal area admin yang tidak berputar balik ke login
function amankanNext(nilai) {
  const teks = typeof nilai === 'string' ? nilai : '';

  if (!teks.startsWith('/admin')) {
    return '/admin';
  }
  if (teks.startsWith('//') || teks.includes('\\')) {
    return '/admin';
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(teks)) {
    return '/admin';
  }
  if (
    teks === '/admin/login' ||
    teks.startsWith('/admin/login?') ||
    teks === '/admin/logout' ||
    teks.startsWith('/admin/logout?')
  ) {
    return '/admin';
  }

  return teks;
}

// Mencatat satu baris keamanan tanpa pernah memuat kata sandi
function catatPercobaan(req, username, hasil) {
  const ip = req.ip || req.socket.remoteAddress || 'tidak-diketahui';
  const namaAman = String(username === undefined || username === null ? '' : username)
    .replace(/[\r\n\t]/g, ' ')
    .slice(0, 100);

  console.log(
    `[login admin] ${new Date().toISOString()} username="${namaAman}" ip=${ip} hasil=${hasil}`
  );
}

// Menyusun data umum halaman login
function dataLogin(extra) {
  return {
    judul: 'Masuk Admin',
    belumDikonfigurasi: false,
    galat: '',
    username: '',
    next: '/admin',
    keluar: false,
    ...extra,
  };
}

// Menyimpan data admin ke sesi baru setelah regenerasi untuk mencegah session fixation
function buatSesiAdmin(req, username, selesai) {
  req.session.regenerate(function (galatRegenerasi) {
    if (galatRegenerasi) {
      return selesai(galatRegenerasi);
    }

    req.session.adminId = 1;
    req.session.username = username;
    req.session.mulai = Date.now();

    return req.session.save(function (galatSimpan) {
      return selesai(galatSimpan || null);
    });
  });
}

// GET /admin/login -> form login atau pengalihan bila sudah masuk
function halamanLogin(req, res) {
  const konfigurasi = periksaKonfigurasi();
  if (!konfigurasi.siap) {
    return res.status(503).render('admin/login', dataLogin({ belumDikonfigurasi: true }));
  }

  if (sesiAdminAktif(req.session)) {
    return res.redirect('/admin');
  }

  return res.render(
    'admin/login',
    dataLogin({
      next: amankanNext(req.query.next),
      keluar: req.query.keluar === '1',
    })
  );
}

// POST /admin/login -> memeriksa kredensial lalu membuat sesi
function masuk(req, res, next) {
  const konfigurasi = periksaKonfigurasi();
  if (!konfigurasi.siap) {
    return res.status(503).render('admin/login', dataLogin({ belumDikonfigurasi: true }));
  }

  const username = String(req.body && req.body.username ? req.body.username : '').trim();
  const password = String(req.body && req.body.password ? req.body.password : '');
  const tujuan = amankanNext(req.body && req.body.next ? req.body.next : req.query.next);
  const cocok = cekKredensial(username, password);

  catatPercobaan(req, username, cocok ? 'berhasil' : 'gagal');

  if (!cocok) {
    batasLogin.catatGagal(req, username);
    return res.status(401).render(
      'admin/login',
      dataLogin({
        galat: 'Username atau password salah',
        username,
        next: tujuan,
      })
    );
  }

  batasLogin.catatSukses(username);

  return buatSesiAdmin(req, username, function (galat) {
    if (galat) {
      return next(galat);
    }
    return res.redirect(tujuan);
  });
}

// POST /admin/logout -> menghapus sesi dan cookie lalu kembali ke halaman login
function keluar(req, res, next) {
  req.session.destroy(function (galat) {
    if (galat) {
      return next(galat);
    }

    res.clearCookie(config.session.namaCookie, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: config.session.cookieSecure,
    });
    return res.redirect('/admin/login?keluar=1');
  });
}

// POST /api/admin/login -> login JSON untuk Postman atau Thunder Client
function masukApi(req, res, next) {
  const konfigurasi = periksaKonfigurasi();
  if (!konfigurasi.siap) {
    return res.status(503).json({ pesan: 'Akses admin belum dikonfigurasi' });
  }

  const username = String(req.body && req.body.username ? req.body.username : '').trim();
  const password = String(req.body && req.body.password ? req.body.password : '');
  const cocok = cekKredensial(username, password);

  catatPercobaan(req, username, cocok ? 'berhasil' : 'gagal');

  if (!cocok) {
    batasLogin.catatGagal(req, username);
    return res.status(401).json({ pesan: 'Username atau password salah' });
  }

  batasLogin.catatSukses(username);

  return buatSesiAdmin(req, username, function (galat) {
    if (galat) {
      return next(galat);
    }
    return res.json({ success: true, data: { username } });
  });
}

// POST /api/admin/logout -> menghapus sesi tanpa mengalihkan halaman
function keluarApi(req, res, next) {
  req.session.destroy(function (galat) {
    if (galat) {
      return next(galat);
    }

    res.clearCookie(config.session.namaCookie, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: config.session.cookieSecure,
    });
    return res.json({ success: true });
  });
}

// GET /api/admin/sesi -> status login untuk klien API
function sesi(req, res) {
  if (!sesiAdminAktif(req.session)) {
    return res.status(401).json({ pesan: 'Login admin diperlukan' });
  }

  return res.json({ success: true, data: { username: req.session.username } });
}

module.exports = {
  amankanNext,
  halamanLogin,
  masuk,
  keluar,
  masukApi,
  keluarApi,
  sesi,
};
