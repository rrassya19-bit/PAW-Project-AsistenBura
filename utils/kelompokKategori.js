// Mengelompokkan daftar produk berdasarkan kategori untuk kebutuhan tampilan
function kelompokkanProduk(daftarProduk) {
  // Peta kategori dipakai agar urutan kemunculan kategori tetap terjaga
  const petaKategori = new Map();

  // Setiap produk dimasukkan ke kelompok kategorinya
  daftarProduk.forEach((produk) => {
    if (!petaKategori.has(produk.kategori)) {
      petaKategori.set(produk.kategori, []);
    }
    petaKategori.get(produk.kategori).push(produk);
  });

  // Mengubah peta menjadi array kelompok yang siap dirender
  return Array.from(petaKategori, ([nama, produk]) => ({
    nama,
    produk,
    jumlah: produk.length,
  }));
}

module.exports = { kelompokkanProduk };
