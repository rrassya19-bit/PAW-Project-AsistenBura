// Middleware untuk URL yang tidak punya route
const fs = require('fs');
const path = require('path');

function notFound(req, res) {
  // Request ke API dibalas dengan JSON
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ pesan: 'Endpoint tidak ditemukan' });
  }

  // Request halaman dirender dengan template 404 bila sudah tersedia
  const berkas404 = path.join(__dirname, '..', 'views', '404.ejs');
  if (fs.existsSync(berkas404)) {
    return res.status(404).render('404', { judul: 'Halaman Tidak Ditemukan', halaman: '' });
  }

  // Sementara balas teks selama template 404 belum dibuat
  res.status(404).send('Halaman tidak ditemukan');
}

module.exports = notFound;
