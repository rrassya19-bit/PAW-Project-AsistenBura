// Data menu gabungan dari beberapa edisi menu Bura Bura Coffee.
const daftarProduk = [
  {
    id: 1,
    nama: 'Boring Dirty',
    kategori: 'Espresso & Filter Coffee',
    harga: 45000,
    hargaMaks: null,
    deskripsi: 'Ristretto & Special Distilled Milk',
    tersedia: true,
  },
  {
    id: 2,
    nama: 'Dirty',
    kategori: 'Espresso & Filter Coffee',
    harga: 35000, // TODO cek harga dengan menu asli
    hargaMaks: null,
    deskripsi: 'Ristretto & Distilled Milk',
    tersedia: true,
  },
  {
    id: 3,
    nama: 'Magic',
    kategori: 'Espresso & Filter Coffee',
    harga: 32000,
    hargaMaks: 37000, // TODO cek harga dengan menu asli
    deskripsi: 'Ristretto & Milk / Distilled Milk',
    tersedia: true,
  },
  {
    id: 4,
    nama: 'ESP-19',
    kategori: 'Espresso & Filter Coffee',
    harga: 30000,
    hargaMaks: null,
    deskripsi: 'Cold Whip Cream & Hot Lungo',
    tersedia: true,
  },
  {
    id: 5,
    nama: 'Montblanc',
    kategori: 'Espresso & Filter Coffee',
    harga: 37000,
    hargaMaks: null,
    deskripsi: 'Cold brew topped with Citrusy Cold Foam',
    tersedia: true,
  },
  {
    id: 6,
    nama: 'White',
    kategori: 'Espresso & Filter Coffee',
    harga: 32000, // TODO cek harga dengan menu asli
    hargaMaks: null,
    deskripsi: 'Cafe Latte, Cappuccino',
    tersedia: true,
  },
  {
    id: 7,
    nama: 'Black',
    kategori: 'Espresso & Filter Coffee',
    harga: 28000, // TODO cek harga dengan menu asli
    hargaMaks: null,
    deskripsi: 'Americano, Long Black',
    tersedia: true,
  },
  {
    id: 8,
    nama: 'On The Rock',
    kategori: 'Espresso & Filter Coffee',
    harga: 28000, // TODO cek harga dengan menu asli
    hargaMaks: null,
    deskripsi: 'Espresso & Ice',
    tersedia: true,
  },
  {
    id: 9,
    nama: 'Split Shot',
    kategori: 'Espresso & Filter Coffee',
    harga: 35000,
    hargaMaks: null,
    deskripsi: 'White & Espresso',
    tersedia: true,
  },
  {
    id: 10,
    nama: 'Espresso',
    kategori: 'Espresso & Filter Coffee',
    harga: 25000,
    hargaMaks: null,
    deskripsi: 'Espresso',
    tersedia: true,
  },
  {
    id: 11,
    nama: 'Americano Lemon',
    kategori: 'Espresso & Filter Coffee',
    harga: 28000,
    hargaMaks: null,
    deskripsi: 'Espresso, Lemon',
    tersedia: true,
  },
  {
    id: 12,
    nama: 'LeTonic',
    kategori: 'Espresso & Filter Coffee',
    harga: 30000, // TODO cek harga dengan menu asli
    hargaMaks: null,
    deskripsi: 'Espresso, Tonic Water, Lemon',
    tersedia: true,
  },
  {
    id: 13,
    nama: 'Homongger',
    kategori: 'Espresso & Filter Coffee',
    harga: 30000, // TODO cek harga dengan menu asli
    hargaMaks: null,
    deskripsi: 'Espresso, Honey, Lemon, Ginger, Tonic Water',
    tersedia: true,
  },
  {
    id: 14,
    nama: 'Filter (Seasonal)',
    kategori: 'Espresso & Filter Coffee',
    harga: 30000,
    hargaMaks: 35000, // TODO cek harga dengan menu asli
    deskripsi: 'Menu seasonal',
    tersedia: true,
  },
  {
    id: 15,
    nama: 'Butterscotch',
    kategori: 'Coffee Milk Based',
    harga: 25000, // TODO cek harga dengan menu asli
    hargaMaks: null,
    deskripsi: 'Espresso, butterscotch sauce, milk',
    tersedia: true,
  },
  {
    id: 16,
    nama: 'Coodo',
    kategori: 'Coffee Milk Based',
    harga: 28000, // TODO cek harga dengan menu asli
    hargaMaks: null,
    deskripsi: 'Espresso, avocado, choco, milk',
    tersedia: true,
  },
  {
    id: 17,
    nama: 'Salted Caramel',
    kategori: 'Coffee Milk Based',
    harga: 25000, // TODO cek harga dengan menu asli
    hargaMaks: null,
    deskripsi: 'Espresso, salted caramel sauce, milk',
    tersedia: true,
  },
  {
    id: 18,
    nama: 'Brownie',
    kategori: 'Coffee Milk Based',
    harga: 25000, // TODO cek harga dengan menu asli
    hargaMaks: null,
    deskripsi: 'Espresso, brown sugar, milk',
    tersedia: true,
  },
  {
    id: 19,
    nama: 'Chunky Monkey',
    kategori: 'Coffee Milk Based',
    harga: 28000, // TODO cek harga dengan menu asli
    hargaMaks: null,
    deskripsi: 'Espresso, choco, banana syrup, milk',
    tersedia: true,
  },
  {
    id: 20,
    nama: 'Zupresso',
    kategori: 'Coffee Non Milk Based',
    harga: 25000,
    hargaMaks: null,
    deskripsi: 'Espresso, yuzu syrup',
    tersedia: true,
  },
  {
    id: 21,
    nama: 'Choco',
    kategori: 'Non Coffee',
    harga: 28000, // TODO cek harga dengan menu asli
    hargaMaks: null,
    deskripsi: 'Chocolate, Milk',
    tersedia: true,
  },
  {
    id: 22,
    nama: 'Matcha',
    kategori: 'Non Coffee',
    harga: 28000, // TODO cek harga dengan menu asli
    hargaMaks: null,
    deskripsi: 'Matcha, Milk',
    tersedia: true,
  },
  {
    id: 23,
    nama: 'Butterscotch Classic',
    kategori: 'Non Coffee',
    harga: 25000, // TODO cek harga dengan menu asli
    hargaMaks: null,
    deskripsi: 'Butterscotch, regal crumbs, milk',
    tersedia: true,
  },
  {
    id: 24,
    nama: 'Green Moss',
    kategori: 'Non Coffee',
    harga: 25000, // TODO cek harga dengan menu asli
    hargaMaks: null,
    deskripsi: 'Avocado, chocolate, milk',
    tersedia: true,
  },
  {
    id: 25,
    nama: 'Red Velvet',
    kategori: 'Non Coffee',
    harga: 25000,
    hargaMaks: null,
    deskripsi: 'Red velvet, milk',
    tersedia: true,
  },
  {
    id: 26,
    nama: 'Honey Spice',
    kategori: 'Non Coffee',
    harga: 25000,
    hargaMaks: null,
    deskripsi: 'Honey, Lemon, Ginger, Tonic Water',
    tersedia: true,
  },
  {
    id: 27,
    nama: 'Breezy Blue',
    kategori: 'Non Coffee',
    harga: 25000,
    hargaMaks: null,
    deskripsi: 'Blue citrus, lemon, tonic water', // TODO cek bahan dengan menu asli
    tersedia: true,
  },
  {
    id: 28,
    nama: 'Lychee Tea',
    kategori: 'Tea & Others',
    harga: 25000, // TODO cek harga dengan menu asli
    hargaMaks: null,
    deskripsi: 'Classic Shaken Lychee Tea',
    tersedia: true,
  },
  {
    id: 29,
    nama: 'Kombucha Bons',
    kategori: 'Tea & Others',
    harga: 25000,
    hargaMaks: null,
    deskripsi: 'Add cup & ice (+Rp 2.000)',
    tersedia: true,
  },
  {
    id: 30,
    nama: 'Ready-To-Drink',
    kategori: 'Tea & Others',
    harga: 30000,
    hargaMaks: null,
    deskripsi: 'Assorted Flavors',
    tersedia: true,
  },
  {
    id: 31,
    nama: 'Extra Shot',
    kategori: 'Additional',
    harga: 5000,
    hargaMaks: null,
    deskripsi: 'Biaya tambahan',
    tersedia: true,
  },
  {
    id: 32,
    nama: 'Extra Sugar',
    kategori: 'Additional',
    harga: 3000,
    hargaMaks: null,
    deskripsi: 'Biaya tambahan',
    tersedia: true,
  },
  {
    id: 33,
    nama: 'Oatside',
    kategori: 'Additional',
    harga: 6000,
    hargaMaks: null,
    deskripsi: 'Biaya tambahan',
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
