// Middleware validasi body produk untuk request POST dan PUT
function validasiProduk(req, res, next) {
  // Menampung seluruh pesan kesalahan validasi
  const kesalahan = [];

  // Membaca body dengan aman bila tidak dikirim
  const body = req.body || {};

  // Validasi nama: wajib, berupa teks, maksimal 100 karakter
  const nama = typeof body.nama === 'string' ? body.nama.trim() : '';
  if (!nama) {
    kesalahan.push('Nama wajib diisi');
  } else if (nama.length > 100) {
    kesalahan.push('Nama maksimal 100 karakter');
  }

  // Validasi kategori: wajib, berupa teks, maksimal 50 karakter
  const kategori = typeof body.kategori === 'string' ? body.kategori.trim() : '';
  if (!kategori) {
    kesalahan.push('Kategori wajib diisi');
  } else if (kategori.length > 50) {
    kesalahan.push('Kategori maksimal 50 karakter');
  }

  // Validasi harga: bilangan bulat tidak negatif, menerima angka atau string angka
  const hargaMentah = body.harga;
  const hargaTeks = typeof hargaMentah === 'string' ? hargaMentah.trim() : hargaMentah;
  const harga = hargaTeks === '' || hargaTeks === null || hargaTeks === undefined ? NaN : Number(hargaTeks);
  if (!Number.isInteger(harga) || harga < 0) {
    kesalahan.push('Harga harus bilangan bulat minimal 0');
  }

  // Validasi harga maksimum: boleh kosong, jika diisi harus bilangan bulat >= harga
  const hargaMaksMentah = body.hargaMaks;
  const hargaMaksTeks =
    typeof hargaMaksMentah === 'string' ? hargaMaksMentah.trim() : hargaMaksMentah;
  let hargaMaks = null;
  if (!(hargaMaksTeks === '' || hargaMaksTeks === null || hargaMaksTeks === undefined)) {
    hargaMaks = Number(hargaMaksTeks);
    if (!Number.isInteger(hargaMaks) || Number.isNaN(harga)) {
      kesalahan.push('Harga maksimum harus bilangan bulat');
    } else if (hargaMaks < harga) {
      kesalahan.push('Harga maksimum tidak boleh lebih kecil dari harga');
    }
  }

  // Validasi deskripsi: opsional, harus teks bila diisi
  let deskripsi = null;
  if (!(body.deskripsi === '' || body.deskripsi === null || body.deskripsi === undefined)) {
    if (typeof body.deskripsi !== 'string') {
      kesalahan.push('Deskripsi harus berupa teks');
    } else {
      deskripsi = body.deskripsi.trim() || null;
    }
  }

  // Validasi foto: opsional, boleh kosong, berupa path /media/... atau URL https
  let foto = null;
  if (!(body.foto === '' || body.foto === null || body.foto === undefined)) {
    if (typeof body.foto !== 'string') {
      kesalahan.push('Foto harus berupa teks');
    } else {
      const fotoTeks = body.foto.trim();

      if (fotoTeks.length > 255) {
        kesalahan.push('Foto maksimal 255 karakter');
      } else if (fotoTeks.length > 0) {
        const urlHttps = /^https:\/\/[^\s]+$/i.test(fotoTeks);
        const pathMedia =
          /^\/media\/[A-Za-z0-9._\-\/]+$/.test(fotoTeks) &&
          fotoTeks.indexOf('..') === -1;

        if (!urlHttps && !pathMedia) {
          kesalahan.push(
            'Foto harus berupa URL https:// atau path /media/... tanpa karakter terlarang'
          );
        } else {
          foto = fotoTeks;
        }
      }
    }
  }

  // Validasi tersedia: boolean, default true bila tidak dikirim
  let tersedia = true;
  if (!(body.tersedia === undefined || body.tersedia === null)) {
    if (typeof body.tersedia === 'boolean') {
      tersedia = body.tersedia;
    } else if (body.tersedia === 'true' || body.tersedia === 'on' || body.tersedia === '1') {
      tersedia = true;
    } else if (body.tersedia === 'false' || body.tersedia === 'off' || body.tersedia === '0') {
      tersedia = false;
    } else {
      kesalahan.push('Tersedia harus bernilai boolean');
    }
  }

  // Menghentikan proses bila ada kesalahan validasi
  if (kesalahan.length > 0) {
    return res.status(400).json({ pesan: 'Validasi gagal', kesalahan });
  }

  // Meneruskan data yang sudah dibersihkan dan dikonversi ke controller
  req.produkTervalidasi = { nama, kategori, harga, hargaMaks, deskripsi, foto, tersedia };
  return next();
}

module.exports = validasiProduk;
