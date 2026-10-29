// CATATAN: Data menu di bawah ini masih DATA CONTOH.
// Nantinya akan diganti dengan data asli Bura Bura Coffee.
const daftarProduk = [
  {
    id: 1,
    nama: 'Kopi Susu Gula Aren',
    kategori: 'Kopi',
    harga: 18000,
    deskripsi: 'Espresso dengan susu segar dan manisnya gula aren.',
    tersedia: true,
  },
  {
    id: 2,
    nama: 'Americano Dingin',
    kategori: 'Kopi',
    harga: 15000,
    deskripsi: 'Kopi hitam dingin yang segar, cocok untuk pagi hari.',
    tersedia: true,
  },
  {
    id: 3,
    nama: 'Matcha Latte',
    kategori: 'Non-Kopi',
    harga: 22000,
    deskripsi: 'Matcha lembut dipadukan dengan susu, disajikan dingin.',
    tersedia: true,
  },
  {
    id: 4,
    nama: 'Es Teh Lemon',
    kategori: 'Non-Kopi',
    harga: 12000,
    deskripsi: 'Teh manis dingin dengan perasan lemon segar.',
    tersedia: true,
  },
  {
    id: 5,
    nama: 'Roti Bakar Cokelat',
    kategori: 'Makanan',
    harga: 16000,
    deskripsi: 'Roti bakar hangat dengan isian cokelat yang melimpah.',
    tersedia: true,
  },
];

// Mengambil semua menu
function getAll() {
  return daftarProduk;
}

// Mengambil satu menu berdasarkan id
function getById(id) {
  return daftarProduk.find((produk) => produk.id === Number(id));
}

module.exports = { getAll, getById };
