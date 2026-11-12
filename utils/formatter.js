// Mengubah angka menjadi teks rupiah, contoh: 18000 -> "Rp 18.000"
function formatRupiah(angka) {
  return 'Rp ' + Number(angka).toLocaleString('id-ID');
}

// Menampilkan rentang harga bila harga maksimum lebih besar dari harga utama
function formatRentangHarga(harga, hargaMaks) {
  // Harga maksimum hanya ditampilkan bila diisi dan lebih besar
  if (hargaMaks !== null && hargaMaks !== undefined && Number(hargaMaks) > Number(harga)) {
    return formatRupiah(harga) + ' – ' + formatRupiah(hargaMaks);
  }

  // Bila tidak ada rentang, cukup tampilkan harga utama
  return formatRupiah(harga);
}

// Mengubah tanggal menjadi teks waktu Indonesia (zona Asia/Jakarta)
function formatWaktu(date) {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date);
}

module.exports = { formatRupiah, formatRentangHarga, formatWaktu };
