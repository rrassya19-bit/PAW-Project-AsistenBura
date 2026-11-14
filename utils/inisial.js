// Mengambil maksimal dua huruf kapital dari kata-kata nama produk
function ambilInisial(nama) {
  // Memecah nama menjadi kata dan membuang spasi kosong
  const daftarKata = String(nama)
    .trim()
    .split(/\s+/)
    .filter(function (kata) {
      return kata.length > 0;
    });

  // Nama kosong memakai tanda tanya agar placeholder tetap terlihat
  if (daftarKata.length === 0) {
    return '?';
  }

  // Huruf pertama dari dua kata pertama dijadikan inisial kapital
  return daftarKata
    .slice(0, 2)
    .map(function (kata) {
      return kata.charAt(0).toUpperCase();
    })
    .join('');
}

module.exports = { ambilInisial };
