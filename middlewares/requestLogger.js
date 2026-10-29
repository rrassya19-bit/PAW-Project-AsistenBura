// Middleware untuk mencatat setiap request ke terminal
function requestLogger(req, res, next) {
  const waktuMulai = Date.now();

  // Status code baru diketahui setelah response selesai,
  // jadi log ditulis saat event 'finish'
  res.on('finish', () => {
    const durasi = Date.now() - waktuMulai;
    const waktu = new Date().toISOString();

    console.log(`${waktu} ${req.method} ${req.originalUrl} -> ${res.statusCode} (${durasi} ms)`);
  });

  next();
}

module.exports = requestLogger;
