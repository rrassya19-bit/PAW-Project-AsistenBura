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
  return Array.from(petaKategori, ([nama, produk], indeks) => ({
    nama,
    produk,
    jumlah: produk.length,
    // ID jangkar dibuat dari nama kategori agar navigasi menu tetap bekerja
    id: 'kategori-' + (buatSlug(nama) || 'menu') + '-' + (indeks + 1),
    // Nomor urut dua digit dipakai sebagai penanda pada daftar kategori
    nomor: String(indeks + 1).padStart(2, '0'),
  }));
}

// Mengubah teks kategori menjadi slug yang aman untuk atribut id
function buatSlug(teks) {
  return String(teks)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

module.exports = { kelompokkanProduk };