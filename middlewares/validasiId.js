// Middleware validasi parameter :id produk
function validasiId(req, res, next) {
  const teksId = String(req.params.id);

  // ID harus berupa deretan angka dan bernilai lebih dari nol
  const id = /^\d+$/.test(teksId) ? Number(teksId) : NaN;
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ pesan: 'ID produk harus bilangan bulat positif' });
  }

  // Menyimpan id yang sudah divalidasi untuk dipakai controller
  req.idProduk = id;
  return next();
}

module.exports = validasiId;
