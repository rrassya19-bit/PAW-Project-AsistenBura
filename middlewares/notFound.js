// Middleware untuk URL yang tidak punya route
function notFound(req, res) {
  // Request ke API dibalas dengan JSON
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ pesan: 'Endpoint tidak ditemukan' });
  }

  // Request halaman biasa dibalas dengan teks
  res.status(404).send('Halaman tidak ditemukan');
}

module.exports = notFound;
