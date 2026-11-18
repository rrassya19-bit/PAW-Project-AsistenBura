// Pemeriksaan asal permintaan sebagai pengganti token CSRF
const METODE_TULIS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Menolak permintaan lintas situs yang membawa bukti Origin atau Sec-Fetch-Site
function periksaAsal(req, res, next) {
  if (!METODE_TULIS.has(req.method)) {
    return next();
  }

  // Peramban modern mengirim Sec-Fetch-Site; nilai cross-site selalu ditolak
  const situs = req.get('Sec-Fetch-Site');
  if (situs && situs.toLowerCase() === 'cross-site') {
    return res.status(403).json({ pesan: 'Permintaan ditolak' });
  }

  // Origin yang ada harus memiliki host yang sama dengan Host permintaan
  const asal = req.get('Origin');
  if (asal) {
    let hostAsal = '';
    try {
      hostAsal = new URL(asal).host;
    } catch (galat) {
      return res.status(403).json({ pesan: 'Permintaan ditolak' });
    }

    const hostPermintaan = String(req.get('Host') || '').toLowerCase();
    if (!hostAsal || hostAsal.toLowerCase() !== hostPermintaan) {
      return res.status(403).json({ pesan: 'Permintaan ditolak' });
    }
  }

  // Tanpa kedua header (Postman, curl, Thunder Client) permintaan tetap lolos
  return next();
}

module.exports = periksaAsal;
