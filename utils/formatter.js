// Mengubah angka menjadi teks rupiah, contoh: 18000 -> "Rp 18.000"
function formatRupiah(angka) {
  return 'Rp ' + Number(angka).toLocaleString('id-ID');
}

// Mengubah tanggal menjadi teks waktu Indonesia (zona Asia/Jakarta)
function formatWaktu(date) {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date);
}

module.exports = { formatRupiah, formatWaktu };
