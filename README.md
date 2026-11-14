# PAW Project Asisten Bura

Aplikasi web pengelolaan menu **Bura Bura Coffee** untuk tugas Pengembangan Aplikasi Web. Aplikasi menampilkan daftar menu kedai kopi dengan tampilan beranda yang dipertahankan dari Week 7, lalu menyediakan CRUD produk penuh melalui REST API dengan data yang tersimpan di PostgreSQL. Halaman pengelolaan produk berada di area admin terproteksi HTTP Basic Authentication dan memakai bahasa visual yang sama dengan beranda.

## Teknologi

- Node.js dan Express.js 5
- EJS sebagai view engine
- Tailwind CSS melalui CDN dengan preflight dimatikan agar CSS desain lama tidak berubah
- CSS utama hasil pemulihan desain Week 7 berada di partial `views/partials/style.ejs`
- JavaScript sisi klien tanpa library berada di partial `views/partials/scripts/`
- PostgreSQL dengan driver `pg` (node-postgres) memakai `Pool`, tanpa ORM
- HTTP Basic Authentication untuk area admin, tanpa sesi dan tanpa tabel pengguna
- Arsitektur MVC

## Struktur Folder

```
config/        Konfigurasi aplikasi dan koneksi database (config/database.js)
controllers/   Alur request dan response; tidak menulis query SQL
middlewares/   Logger, validasi, autentikasi admin, notFound, dan errorHandler
models/        Seluruh operasi dan query database
routes/        Pemetaan endpoint ke controller, termasuk area /admin
views/         Template EJS (partials, style.ejs, scripts/*.ejs, beranda, admin, 404, error)
utils/         Fungsi bantu format rupiah, waktu, dan pengelompokan kategori
database/      Skema SQL, data awal, dan skrip seed
scripts/       Skrip uji API
app.js         Titik masuk aplikasi
```

## Prasyarat

- Node.js 18 atau lebih baru
- PostgreSQL yang sedang berjalan
- Terminal PowerShell (contoh perintah memakai `curl.exe`)

## Menjalankan dari Nol

1. Buat database PostgreSQL:

   ```sql
   CREATE DATABASE bura_db;
   ```

   Bisa juga lewat PowerShell:

   ```powershell
   psql -U postgres -c "CREATE DATABASE bura_db;"
   ```

2. Salin file contoh konfigurasi menjadi `.env`, lalu isi kata sandi PostgreSQL Anda:

   ```powershell
   Copy-Item .env.example .env
   ```

   Variabel yang dipakai: `PORT`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `ADMIN_USER`, `ADMIN_PASSWORD`. Isi `ADMIN_USER` dan `ADMIN_PASSWORD` dengan akun admin pilihan Anda; jangan memakai nilai contoh di server nyata.

3. Pasang dependensi:

   ```powershell
   npm install
   ```

4. Buat tabel dan isi data awal (33 produk):

   ```powershell
   npm run seed
   ```

   Seed bersifat idempotent: bila tabel sudah berisi data, seed tidak menggandakan data. Untuk membuang tabel lama dan mengisi ulang:

   ```powershell
   npm run seed -- --reset
   ```

5. Jalankan server:

   ```powershell
   npm run dev
   ```

   Server berjalan di `http://localhost:3000`. Terminal akan menampilkan `Akses admin: aktif` bila `ADMIN_USER` dan `ADMIN_PASSWORD` terisi, atau `Akses admin: BELUM dikonfigurasi` bila belum. Terminal juga menampilkan `Database terhubung` bila koneksi berhasil.

## Akses Admin

Halaman pengelolaan menu hanya tersedia di area admin:

| Halaman | Alamat |
| --- | --- |
| Daftar menu | `/admin` |
| Form tambah produk | `/admin/tambah` |
| Form ubah produk | `/admin/:id/ubah` |

Area ini memakai HTTP Basic Authentication. Saat membuka `/admin`, peramban menampilkan dialog login; masukkan nilai `ADMIN_USER` sebagai nama pengguna dan `ADMIN_PASSWORD` sebagai kata sandi. Kredensial yang sama dipakai otomatis oleh form dan tombol hapus saat mengirim request ke API.

Aturan akses:

- `GET /api/status`, `GET /api/produk`, dan `GET /api/produk/:id` tetap publik.
- `POST`, `PUT`, dan `DELETE` pada `/api/produk` wajib menyertakan kredensial admin.
- Tanpa kredensial atau dengan kredensial salah, server membalas `401` dan header `WWW-Authenticate`.
- Bila `ADMIN_USER` atau `ADMIN_PASSWORD` kosong, server membalas `503` dengan pesan `Akses admin belum dikonfigurasi di server`.
- Kata sandi admin sebaiknya minimal 8 karakter; server hanya mencetak peringatan bila lebih pendek, bukan menolak konfigurasi.

## Endpoint REST

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| GET | `/api/status` | Status server dan database (publik) |
| GET | `/api/produk` | Seluruh produk (publik) |
| GET | `/api/produk/:id` | Satu produk berdasarkan id (publik) |
| POST | `/api/produk` | Menambah produk (wajib admin) |
| PUT | `/api/produk/:id` | Mengubah produk (wajib admin) |
| DELETE | `/api/produk/:id` | Menghapus produk (wajib admin) |

Endpoint tulis memakai header `Authorization: Basic ...`. Contoh di bawah memakai `-u` dari `curl.exe`; ganti `admin:ganti_dengan_password_kuat` dengan kredensial pada `.env` Anda.

### Contoh Request dan Response

`GET /api/status`

```powershell
curl.exe http://localhost:3000/api/status
```

```json
{
  "status": "aktif",
  "aplikasi": "Asisten Bura",
  "versi": "1.0.0",
  "waktu": "2026-11-12T01:00:00.000Z",
  "database": "terhubung"
}
```

`GET /api/produk`

```powershell
curl.exe http://localhost:3000/api/produk
```

```json
[
  {
    "id": 1,
    "nama": "Boring Dirty",
    "kategori": "Espresso & Filter Coffee",
    "harga": 45000,
    "hargaMaks": null,
    "deskripsi": "Ristretto & Special Distilled Milk",
    "tersedia": true,
    "dibuatPada": "2026-11-12T01:00:00.000Z",
    "diubahPada": "2026-11-12T01:00:00.000Z"
  }
]
```

`GET /api/produk/1`

```powershell
curl.exe http://localhost:3000/api/produk/1
```

Response `200` berisi satu objek produk seperti contoh di atas. Bila id tidak ada, response `404`:

```json
{ "pesan": "Produk tidak ditemukan" }
```

`POST /api/produk`

```powershell
curl.exe -X POST http://localhost:3000/api/produk -u admin:ganti_dengan_password_kuat -H "Content-Type: application/json" -d "{\"nama\":\"Dirty Latte\",\"kategori\":\"Coffee Milk Based\",\"harga\":35000,\"hargaMaks\":null,\"deskripsi\":\"Ristretto & Distilled Milk\",\"tersedia\":true}"
```

Response `201` berisi objek produk yang baru dibuat, termasuk `id`, `dibuatPada`, dan `diubahPada`.

`PUT /api/produk/1`

```powershell
curl.exe -X PUT http://localhost:3000/api/produk/1 -u admin:ganti_dengan_password_kuat -H "Content-Type: application/json" -d "{\"nama\":\"Boring Dirty Baru\",\"kategori\":\"Espresso & Filter Coffee\",\"harga\":46000,\"hargaMaks\":null,\"deskripsi\":\"Ristretto & Special Distilled Milk\",\"tersedia\":true}"
```

Response `200` berisi objek yang sudah diperbarui. Bila id tidak ada, response `404`.

`DELETE /api/produk/1`

```powershell
curl.exe -X DELETE http://localhost:3000/api/produk/1 -u admin:ganti_dengan_password_kuat
```

```json
{
  "pesan": "Produk berhasil dihapus",
  "data": {
    "id": 1,
    "nama": "Boring Dirty",
    "kategori": "Espresso & Filter Coffee",
    "harga": 45000,
    "hargaMaks": null,
    "deskripsi": "Ristretto & Special Distilled Milk",
    "tersedia": true,
    "dibuatPada": "2026-11-12T01:00:00.000Z",
    "diubahPada": "2026-11-12T01:00:00.000Z"
  }
}
```

Bila validasi gagal, response `400`:

```json
{
  "pesan": "Validasi gagal",
  "kesalahan": ["Nama wajib diisi", "Harga harus bilangan bulat minimal 0"]
}
```

Respons autentikasi pada endpoint tulis:

```json
{ "pesan": "Autentikasi admin diperlukan" }
```

Response di atas berstatus `401` bila kredensial tidak dikirim atau salah. Bila server belum memiliki `ADMIN_USER` atau `ADMIN_PASSWORD`, endpoint tulis membalas `503`:

```json
{ "pesan": "Akses admin belum dikonfigurasi di server" }
```

## Cara Menguji

### Uji otomatis API

Jalankan server di satu terminal:

```powershell
npm run dev
```

Jalankan pengujian di terminal lain:

```powershell
npm run uji
```

Skrip `scripts/uji-api.js` menguji seluruh endpoint CRUD, memeriksa langsung perubahan data ke database setelah setiap operasi, membersihkan data uji, dan mencetak `PASS`/`FAIL` beserta ringkasan. Skrip juga menguji penolakan `401` untuk operasi tulis tanpa kredensial atau dengan kredensial salah. Kredensial admin dibaca dari `.env` yang sama dengan server dan tidak pernah dicetak. Skrip keluar dengan kode 1 bila ada langkah yang gagal.

### Uji manual dengan Thunder Client atau Postman

1. Jalankan `npm run dev`.
2. Buat request `GET` ke `http://localhost:3000/api/produk` dan pastikan response `200` berisi array produk tanpa perlu kredensial.
3. Buat request `GET` ke `http://localhost:3000/api/produk/1` dan pastikan response `200` berisi satu produk.
4. Buat request `POST` ke `http://localhost:3000/api/produk` dengan body JSON berisi `nama`, `kategori`, `harga`, `hargaMaks`, `deskripsi`, dan `tersedia`, serta Authorization tipe Basic berisi `ADMIN_USER` dan `ADMIN_PASSWORD`. Pastikan response `201`.
5. Buat request `PUT` ke `http://localhost:3000/api/produk/<id>` dengan body JSON yang sudah diubah dan Authorization Basic yang sama. Pastikan response `200` dan nilainya berubah.
6. Buat request `DELETE` ke `http://localhost:3000/api/produk/<id>` dengan Authorization Basic yang sama. Pastikan response `200`.
7. Ulangi `GET` ke id yang baru dihapus dan pastikan response `404`.
8. Kirim ulang `POST` tanpa Authorization dan pastikan response `401` berisi `Autentikasi admin diperlukan`.

### Uji manual frontend

1. Buka `http://localhost:3000` dan pastikan tampilan beranda sama dengan desain Week 7: header transparan, hero, galeri, video, dan menu dari database. Menu tampil dikelompokkan per kategori dengan harga berformat rupiah.
2. Pastikan navigasi publik dan hero tidak lagi menampilkan tautan ke area pengelolaan.
3. Buka `http://localhost:3000/admin`; peramban meminta kredensial Basic. Masukkan `ADMIN_USER` dan `ADMIN_PASSWORD` dari `.env`.
4. Dari daftar menu admin, klik **Tambah Menu**, isi form, dan simpan. Pastikan produk baru muncul di daftar admin dan beranda.
5. Klik **Ubah** pada salah satu produk, ubah nilainya, lalu simpan. Pastikan data terbaru tampil di daftar dan form ubah terisi data dari database.
6. Klik **Hapus**, setujui dialog konfirmasi, lalu pastikan produk hilang dari daftar dan beranda.
7. Periksa database dengan `psql` atau pgAdmin untuk memastikan penambahan, perubahan, dan penghapusan benar-benar tercermin di tabel `produk`.
8. Buka `http://localhost:3000/admin/99999/ubah` dan alamat ngawur untuk memastikan halaman 404 tampil rapi dengan gaya yang sama. Buka juga alamat lama halaman pengelolaan untuk memastikan sudah tidak tersedia.

## Catatan Keamanan

- File `.env` berisi kredensial database dan akun admin, dan **tidak diunggah** ke repository karena sudah masuk `.gitignore`.
- Gunakan `.env.example` sebagai contoh konfigurasi tanpa rahasia.
- HTTP Basic Authentication mengirim kredensial pada setiap request; gunakan HTTPS saat aplikasi dipasang di server publik.
- Perbandingan kredensial admin memakai `crypto.timingSafeEqual` atas digest SHA-256 agar waktu pembandingan tidak membocorkan informasi.
- Seluruh query memakai parameter `$1`, `$2`, dan seterusnya; tidak ada penggabungan string SQL dengan input pengguna.
