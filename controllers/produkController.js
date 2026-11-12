// Controller produk: mengatur alur request dan response tanpa menulis query
const produkModel = require('../models/produkModel');

// GET /api/produk -> seluruh produk dari database
async function daftar(req, res, next) {
  try {
    const data = await produkModel.ambilSemua();
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}

// GET /api/produk/:id -> satu produk berdasarkan id
async function detail(req, res, next) {
  try {
    const data = await produkModel.ambilBerdasarkanId(req.idProduk);
    if (!data) {
      return res.status(404).json({ pesan: 'Produk tidak ditemukan' });
    }
    return res.status(200).json(data);
  } catch (err) {
    return next(err);
  }
}

// POST /api/produk -> membuat produk baru
async function buat(req, res, next) {
  try {
    const data = await produkModel.tambah(req.produkTervalidasi);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

// PUT /api/produk/:id -> mengubah produk yang sudah ada
async function ubah(req, res, next) {
  try {
    const data = await produkModel.ubah(req.idProduk, req.produkTervalidasi);
    if (!data) {
      return res.status(404).json({ pesan: 'Produk tidak ditemukan' });
    }
    return res.status(200).json(data);
  } catch (err) {
    return next(err);
  }
}

// DELETE /api/produk/:id -> menghapus produk
async function hapus(req, res, next) {
  try {
    const data = await produkModel.hapus(req.idProduk);
    if (!data) {
      return res.status(404).json({ pesan: 'Produk tidak ditemukan' });
    }
    return res.status(200).json({ pesan: 'Produk berhasil dihapus', data });
  } catch (err) {
    return next(err);
  }
}

module.exports = { daftar, detail, buat, ubah, hapus };
