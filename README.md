# PAW Project Asisten Bura

Aplikasi web pengelolaan menu **Bura Bura Coffee** untuk tugas Pengembangan Aplikasi Web. Beranda menampilkan menu dalam kartu berfoto yang dikelompokkan per kategori, ditambah pratinjau galeri dan video. Dokumentasi foto lengkap tersedia di `/galeri`, sedangkan seluruh video dengan kontrol pemutar tersedia di `/video`. Aplikasi menyediakan CRUD produk penuh melalui REST API dengan data yang tersimpan di PostgreSQL. Halaman pengelolaan produk berada di area admin terproteksi HTTP Basic Authentication dan memakai bahasa visual yang sama dengan beranda. Foto galeri dan video juga dikelola dari area admin, disimpan pada tabel `media`, dan disajikan dari berkas di folder `assets`.

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
views/         Template EJS (partials, style.ejs, scripts/*.ejs, beranda, galeri, video, admin, 404, error)
utils/         Fungsi bantu format rupiah, waktu, slug foto, inisial, dan pengelompokan kategori
database/      Skema SQL, data awal, seed, dan migrasi
assets/        Media galeri dan video di assets/galeri serta assets/video (tidak ikut Git), foto menu di assets/menu
scripts/       Skrip pengisian foto dan uji API
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

5. Untuk database lama yang sudah berisi produk, tambahkan kolom foto dan tabel media tanpa menghapus data:

   ```powershell
   npm run migrasi
   ```

   Migrasi bersifat idempotent dan aman dijalankan berulang kali. Instalasi baru yang memakai `schema.sql` terbaru sudah memiliki kolom `foto` dan tabel `media`, sehingga langkah ini hanya memastikan skema tetap mutakhir.

6. Daftarkan foto dan video lama yang sudah ada di folder `assets` ke tabel `media`:

   ```powershell
   npm run media:impor
   ```

   Skrip memindai `assets`, `assets/galeri`, dan `assets/video`, lalu melewati `assets/menu` karena folder tersebut berisi foto produk. Impor bersifat idempotent: berkas yang sudah terdaftar tidak ditambahkan lagi. Ringkasan jumlah media yang ditambahkan dan dilewati akan dicetak di terminal.

7. Jalankan server:

   ```powershell
   npm run dev
   ```

   Server berjalan di `http://localhost:3000`. Terminal akan menampilkan `Akses admin: aktif` bila `ADMIN_USER` dan `ADMIN_PASSWORD` terisi, atau `Akses admin: BELUM dikonfigurasi` bila belum. Terminal juga menampilkan `Database terhubung` bila koneksi berhasil.

## Halaman Publik

| Halaman | Alamat | Keterangan |
| --- | --- | --- |
| Beranda | `/` | Hero, menu kartu berfoto, cerita, pratinjau galeri/video, dan informasi kunjungan |
| Galeri | `/galeri` | Seluruh foto dengan filter koleksi dan lightbox |
| Video | `/video` | Seluruh video dengan kontrol pemutar, tanpa autoplay |

Beranda hanya menampilkan 3–4 foto dan satu video sebagai pratinjau. Blok pratinjau disembunyikan bila tidak ada media. Navigasi Galeri dan Video selalu tersedia dari header serta footer.

## Foto Menu

Setiap produk memiliki kolom `foto` opsional berisi path `/media/menu/...` atau URL `https://...`. Folder sumber foto berada di `assets/menu/`, sedangkan Express menyajikan folder `assets/` melalui prefiks `/media`.

Nama berkas mengikuti slug nama produk:

- `Espresso` → `espresso.jpg`
- `Matcha` → `matcha.jpg`
- `Filter (Seasonal)` → `filter-seasonal.jpg`
- `ESP-19` → `esp-19.jpg`
- `On The Rock` → `on-the-rock.jpg`
- `Ready-To-Drink` → `ready-to-drink.jpg`

Slug dibuat dengan menghapus diakritik, mengubah huruf menjadi kecil, mengganti `&` menjadi `dan`, lalu mengganti karakter selain huruf dan angka menjadi tanda hubung.

Isi foto otomatis untuk produk yang fotonya masih kosong:

```powershell
npm run foto:isi
```

Ganti foto yang sudah ada dengan berkas terbaru:

```powershell
npm run foto:isi -- --timpa
```

Skrip mencetak jumlah foto yang terisi dan daftar produk yang dilewati beserta alasannya. Berkas yang tidak ditemukan tidak dianggap gagal, sehingga skrip tetap idempotent.

Panduan berkas:

- Format yang didukung: JPG, JPEG, PNG, WebP, dan AVIF.
- Rasio kartu menu 4:3; ukuran 800×600 piksel sudah cukup.
- Kompres foto agar berada di bawah sekitar 300 KB.
- Jangan menyimpan video besar di repositori; letakkan video di `assets/` hanya bila memang diperlukan.
- Foto dimuat `lazy` kecuali kartu pertama, dan gambar yang gagal dimuat diganti placeholder inisial.

Field foto juga tersedia pada form tambah dan ubah produk di area admin.

## Media Galeri dan Video

Foto galeri dan video disimpan pada tabel `media`. Halaman publik `/`, `/galeri`, dan `/video` membaca tabel tersebut melalui `models/mediaModel.js`, sehingga perubahan dari area admin langsung tampil setelah halaman dimuat ulang.

| Kolom | Keterangan |
| --- | --- |
| `id` | Kunci utama otomatis |
| `jenis` | `foto` atau `video` |
| `judul` | Judul media, maksimal 100 karakter |
| `berkas` | Path URL berkas, misalnya `/media/galeri/nama-berkas.jpg`, unik per baris |
| `urutan` | Urutan tampil; nilai kecil tampil lebih dulu, lalu diurutkan berdasarkan `id` |
| `created_at` | Waktu data dibuat |
| `updated_at` | Waktu data terakhir diubah |

Tabel dibuat oleh `npm run migrasi` melalui `database/migrasi/002-buat-tabel-media.sql` dan juga tersedia di `database/schema.sql`. Keduanya aman dijalankan berulang kali.

Impor media lama:

```powershell
npm run media:impor
```

Skrip memindai `assets`, `assets/galeri`, dan `assets/video`, lalu mendaftarkan berkas yang belum ada di tabel berdasarkan kolom `berkas`. Folder `assets/menu` tidak diimpor karena berisi foto produk. Judul awal diambil dari nama berkas yang dirapikan, sedangkan urutan mengikuti urutan nama berkas. Skrip mencetak jumlah media yang ditambahkan dan dilewati sehingga aman dijalankan berulang kali.

### Pengelolaan di Admin

| Halaman | Alamat |
| --- | --- |
| Daftar foto | `/admin/foto` |
| Tambah foto | `/admin/foto/tambah` |
| Ubah foto | `/admin/foto/:id/ubah` |
| Daftar video | `/admin/video` |
| Tambah video | `/admin/video/tambah` |
| Ubah video | `/admin/video/:id/ubah` |

Daftar menampilkan kartu dengan thumbnail foto atau elemen video kecil tanpa autoplay, judul, urutan, serta tombol Ubah dan Hapus. Form tambah meminta judul, urutan, dan berkas dengan pratinjau. Form ubah menampilkan berkas saat ini dan menerima berkas baru secara opsional.

Unggahan dikirim ke `/api/media` melalui `XMLHttpRequest` dengan `FormData`, menampilkan bilah kemajuan, menonaktifkan tombol selama proses, dan menampilkan pesan kesalahan dari API. Penghapusan memakai dialog konfirmasi lalu mengirim `DELETE` ke `/api/media/:id`.

### Batas Ukuran dan Jenis Berkas

| Jenis | Format | Batas bawaan | Variabel lingkungan |
| --- | --- | --- | --- |
| Foto | JPG, JPEG, PNG, WebP | 5 MB | `UPLOAD_MAKS_FOTO_MB` |
| Video | MP4, WebM | 80 MB | `UPLOAD_MAKS_VIDEO_MB` |

Server memeriksa ekstensi, mimetype, dan tanda tangan byte awal berkas. Berkas yang tidak cocok ditolak dengan status `400` dan dihapus dari disk. Berkas yang melebihi batas dibalas `413`. Nama berkas dibuat server dari slug judul, timestamp, dan nilai acak, sehingga nama dari klien tidak dipakai mentah-mentah.

### Penyimpanan Berkas

Berkas unggahan disimpan di `assets/galeri` untuk foto dan `assets/video` untuk video, lalu disajikan melalui prefiks `/media`. Folder `assets/` diabaikan Git kecuali `assets/menu/`, sehingga berkas unggahan **tidak ikut Git**. Jangan mengandalkan folder ini untuk data permanen pada hosting dengan disk sementara (misalnya filesystem ephemeral); gunakan object storage atau volume persisten bila aplikasi dipasang di produksi.

## Akses Admin

Halaman pengelolaan menu, foto, dan video hanya tersedia di area admin:

| Halaman | Alamat |
| --- | --- |
| Daftar menu | `/admin` |
| Form tambah produk | `/admin/tambah` |
| Form ubah produk | `/admin/:id/ubah` |
| Daftar foto | `/admin/foto` |
| Tambah foto | `/admin/foto/tambah` |
| Ubah foto | `/admin/foto/:id/ubah` |
| Daftar video | `/admin/video` |
| Tambah video | `/admin/video/tambah` |
| Ubah video | `/admin/video/:id/ubah` |

Area ini memakai HTTP Basic Authentication. Saat membuka `/admin`, peramban menampilkan dialog login; masukkan nilai `ADMIN_USER` sebagai nama pengguna dan `ADMIN_PASSWORD` sebagai kata sandi. Kredensial yang sama dipakai otomatis oleh form dan tombol hapus saat mengirim request ke API.

Aturan akses:

- `GET /api/status`, `GET /api/produk`, `GET /api/produk/:id`, `GET /api/media`, dan `GET /api/media/:id` tetap publik.
- `POST`, `PUT`, dan `DELETE` pada `/api/produk` serta `/api/media` wajib menyertakan kredensial admin.
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
| GET | `/api/media` | Seluruh media, filter `?jenis=foto\|video` (publik) |
| GET | `/api/media/:id` | Satu media berdasarkan id (publik) |
| POST | `/api/media` | Menambah media dengan unggah multipart (wajib admin) |
| PUT | `/api/media/:id` | Mengubah judul, urutan, dan berkas opsional (wajib admin) |
| DELETE | `/api/media/:id` | Menghapus media dan berkasnya (wajib admin) |

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
    "foto": "/media/menu/boring-dirty.jpg",
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
curl.exe -X POST http://localhost:3000/api/produk -u admin:ganti_dengan_password_kuat -H "Content-Type: application/json" -d "{\"nama\":\"Dirty Latte\",\"kategori\":\"Coffee Milk Based\",\"harga\":35000,\"hargaMaks\":null,\"deskripsi\":\"Ristretto & Distilled Milk\",\"foto\":\"/media/menu/dirty-latte.jpg\",\"tersedia\":true}"
```

Response `201` berisi objek produk yang baru dibuat, termasuk `id`, `dibuatPada`, dan `diubahPada`.

`PUT /api/produk/1`

```powershell
curl.exe -X PUT http://localhost:3000/api/produk/1 -u admin:ganti_dengan_password_kuat -H "Content-Type: application/json" -d "{\"nama\":\"Boring Dirty Baru\",\"kategori\":\"Espresso & Filter Coffee\",\"harga\":46000,\"hargaMaks\":null,\"deskripsi\":\"Ristretto & Special Distilled Milk\",\"foto\":\"/media/menu/boring-dirty.jpg\",\"tersedia\":true}"
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
    "foto": "/media/menu/boring-dirty.jpg",
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

Aturan kolom `foto`:

- Boleh kosong atau `null`.
- Maksimal 255 karakter.
- Berupa path yang diawali `/media/` tanpa `..`, atau URL yang diawali `https://`.
- Skema seperti `javascript:` dan `data:` ditolak dengan response `400`.

Respons autentikasi pada endpoint tulis:

```json
{ "pesan": "Autentikasi admin diperlukan" }
```

Response di atas berstatus `401` bila kredensial tidak dikirim atau salah. Bila server belum memiliki `ADMIN_USER` atau `ADMIN_PASSWORD`, endpoint tulis membalas `503`:

```json
{ "pesan": "Akses admin belum dikonfigurasi di server" }
```

### Contoh Endpoint Media

`GET /api/media`

```powershell
curl.exe http://localhost:3000/api/media
curl.exe "http://localhost:3000/api/media?jenis=foto"
```

```json
[
  {
    "id": 1,
    "jenis": "foto",
    "judul": "Sudut Mangkubumi",
    "berkas": "/media/galeri/sudut-mangkubumi-1699999999999-a1b2c3d4.jpg",
    "urutan": 1,
    "dibuatPada": "2026-11-12T01:00:00.000Z",
    "diubahPada": "2026-11-12T01:00:00.000Z"
  }
]
```

`GET /api/media/1` mengembalikan satu objek media. Bila id tidak ada, response `404`.

`POST /api/media` memakai `multipart/form-data` dengan field `jenis`, `judul`, `urutan`, dan `berkas`:

```powershell
curl.exe -X POST http://localhost:3000/api/media -u admin:ganti_dengan_password_kuat -F "jenis=foto" -F "judul=Sudut Mangkubumi" -F "urutan=1" -F "berkas=@C:\foto\sudut.jpg;type=image/jpeg"
```

Response `201` berisi objek media yang baru dibuat. Berkas disimpan server dengan nama aman di `assets/galeri` atau `assets/video`.

`PUT /api/media/1` mengubah judul dan urutan; field `berkas` opsional untuk mengganti berkas lama:

```powershell
curl.exe -X PUT http://localhost:3000/api/media/1 -u admin:ganti_dengan_password_kuat -F "judul=Sudut Mangkubumi Baru" -F "urutan=2"
```

Bila berkas baru dikirim, berkas lama dihapus hanya setelah pembaruan database berhasil dan berkas lama tidak dirujuk data lain.

`DELETE /api/media/1`

```powershell
curl.exe -X DELETE http://localhost:3000/api/media/1 -u admin:ganti_dengan_password_kuat
```

```json
{
  "pesan": "Media berhasil dihapus",
  "data": {
    "id": 1,
    "jenis": "foto",
    "judul": "Sudut Mangkubumi Baru",
    "berkas": "/media/galeri/sudut-mangkubumi-1699999999999-a1b2c3d4.jpg",
    "urutan": 2,
    "dibuatPada": "2026-11-12T01:00:00.000Z",
    "diubahPada": "2026-11-12T01:05:00.000Z"
  }
}
```

Kesalahan validasi media dibalas `400`:

```json
{
  "pesan": "Validasi gagal",
  "kesalahan": ["Judul wajib diisi", "Urutan harus bilangan bulat"]
}
```

Berkas dengan ekstensi, mimetype, atau isi yang tidak cocok dibalas `400` dan berkasnya dihapus. Berkas yang melebihi batas ukuran dibalas `413` dengan pesan seperti `Ukuran foto maksimal 5 MB`.

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

Skrip `scripts/uji-api.js` menguji seluruh endpoint CRUD, memeriksa langsung perubahan data ke database setelah setiap operasi, membersihkan data uji, dan mencetak `PASS`/`FAIL` beserta ringkasan. Skrip juga menguji penyimpanan foto valid, kolom foto kosong, URL `https://`, serta penolakan `javascript:` dan `../`. Untuk media, skrip menguji unggah foto PNG valid, penolakan berkas teks yang diganti nama menjadi `.jpg`, penolakan tanpa kredensial, pembacaan publik, perubahan judul dan urutan, penggantian berkas, penghapusan baris beserta berkas, dan `404` untuk id yang tidak ada. Semua data dan berkas uji dibersihkan di akhir. Penolakan `401` untuk operasi tulis tanpa kredensial atau dengan kredensial salah tetap diuji. Kredensial admin dibaca dari `.env` yang sama dengan server dan tidak pernah dicetak. Skrip keluar dengan kode 1 bila ada langkah yang gagal.

### Uji manual dengan Thunder Client atau Postman

1. Jalankan `npm run dev`.
2. Buat request `GET` ke `http://localhost:3000/api/produk` dan pastikan response `200` berisi array produk tanpa perlu kredensial.
3. Buat request `GET` ke `http://localhost:3000/api/produk/1` dan pastikan response `200` berisi satu produk.
4. Buat request `POST` ke `http://localhost:3000/api/produk` dengan body JSON berisi `nama`, `kategori`, `harga`, `hargaMaks`, `deskripsi`, `foto`, dan `tersedia`, serta Authorization tipe Basic berisi `ADMIN_USER` dan `ADMIN_PASSWORD`. Pastikan response `201`. Coba juga `foto` berisi `javascript:alert(1)` dan pastikan response `400`.
5. Buat request `PUT` ke `http://localhost:3000/api/produk/<id>` dengan body JSON yang sudah diubah dan Authorization Basic yang sama. Pastikan response `200` dan nilainya berubah.
6. Buat request `DELETE` ke `http://localhost:3000/api/produk/<id>` dengan Authorization Basic yang sama. Pastikan response `200`.
7. Ulangi `GET` ke id yang baru dihapus dan pastikan response `404`.
8. Kirim ulang `POST` tanpa Authorization dan pastikan response `401` berisi `Autentikasi admin diperlukan`.

### Uji manual frontend

1. Buka `http://localhost:3000` dan pastikan hero, menu kartu berfoto, cerita, pratinjau galeri/video, serta informasi kunjungan tampil rapi. Menu dikelompokkan per kategori dan harga memakai format rupiah.
2. Pastikan produk tanpa foto menampilkan placeholder inisial, produk habis diberi penanda, dan gambar yang gagal dimuat tidak menampilkan ikon rusak.
3. Pastikan pratinjau galeri menampilkan 3–4 foto dan pratinjau video tidak berputar otomatis. Klik **Lihat semua foto** dan **Lihat video** untuk membuka halaman masing-masing.
4. Buka `http://localhost:3000/galeri`, coba filter koleksi, lalu klik foto untuk memastikan lightbox, tombol sebelumnya/berikutnya, dan tombol tutup bekerja.
5. Buka `http://localhost:3000/video` dan pastikan setiap video memakai kontrol pemutar serta tidak autoplay.
6. Pastikan navigasi publik dan hero tidak menampilkan tautan ke area pengelolaan.
7. Buka `http://localhost:3000/admin`; peramban meminta kredensial Basic. Masukkan `ADMIN_USER` dan `ADMIN_PASSWORD` dari `.env`.
8. Dari daftar menu admin, pastikan gambar mini atau placeholder inisial tampil. Klik **Tambah Menu**, isi form termasuk alamat foto, dan simpan. Pastikan pratinjau foto muncul dan produk baru tampil di daftar admin serta beranda.
9. Klik **Ubah** pada salah satu produk, ubah nilainya, lalu simpan. Pastikan data terbaru, termasuk foto, tampil di daftar dan form ubah terisi dari database.
10. Klik **Hapus**, setujui dialog konfirmasi, lalu pastikan produk hilang dari daftar dan beranda.
11. Periksa database dengan `psql` atau pgAdmin untuk memastikan penambahan, perubahan, dan penghapusan benar-benar tercermin di tabel `produk`, termasuk kolom `foto`.
12. Buka `http://localhost:3000/admin/foto`, tambahkan foto baru melalui **Tambah Foto**, dan pastikan bilah kemajuan berjalan, berkas muncul di `assets/galeri`, serta foto tampil di daftar admin dan `/galeri`.
13. Ubah judul dan urutan foto tersebut, lalu hapus melalui tombol **Hapus**. Pastikan baris hilang dari daftar dan `/galeri`, serta berkasnya hilang dari `assets/galeri`.
14. Ulangi langkah yang sama di `http://localhost:3000/admin/video` dengan berkas MP4 atau WebM. Pastikan elemen video di daftar memakai `preload="metadata"` dan tidak autoplay.
15. Periksa tabel `media` dengan `psql` atau pgAdmin untuk memastikan penambahan, perubahan, dan penghapusan media tercermin di database.
16. Buka `http://localhost:3000/admin/99999/ubah`, `http://localhost:3000/admin/foto/99999/ubah`, dan alamat ngawur untuk memastikan halaman 404 tampil rapi dengan gaya yang sama. Buka juga alamat lama halaman pengelolaan untuk memastikan sudah tidak tersedia.

## Catatan Keamanan

- File `.env` berisi kredensial database dan akun admin, dan **tidak diunggah** ke repository karena sudah masuk `.gitignore`.
- Folder `assets/` tetap diabaikan, kecuali `assets/menu/` yang disiapkan untuk foto menu. Berkas unggahan media di `assets/galeri` dan `assets/video` juga tidak ikut Git. Jangan menaruh berkas rahasia di folder tersebut.
- Unggahan media diperiksa dari ekstensi, mimetype, dan tanda tangan byte awal. Nama berkas dibuat server, ukuran dibatasi, dan penghapusan berkas hanya dilakukan untuk path yang ter-resolve di folder media yang diizinkan serta tidak dirujuk data lain.
- Gunakan `.env.example` sebagai contoh konfigurasi tanpa rahasia.
- HTTP Basic Authentication mengirim kredensial pada setiap request; gunakan HTTPS saat aplikasi dipasang di server publik.
- Perbandingan kredensial admin memakai `crypto.timingSafeEqual` atas digest SHA-256 agar waktu pembandingan tidak membocorkan informasi.
- Seluruh query memakai parameter `$1`, `$2`, dan seterusnya; tidak ada penggabungan string SQL dengan input pengguna.
