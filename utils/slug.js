// Membuat slug yang aman dari nama produk untuk nama berkas foto menu
function buatSlug(nama) {
  // Mengubah teks menjadi Unicode terurai agar tanda diakritik dapat dibuang
  const tanpaDiakritik = String(nama)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Huruf kecil, ampersand menjadi "dan", lalu karakter lain menjadi tanda hubung
  const slug = tanpaDiakritik
    .toLowerCase()
    .replace(/&/g, ' dan ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug;
}

module.exports = { buatSlug };
