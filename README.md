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

- Node.js 22 atau lebih baru (SDK `@google/genai` membutuhkan Node 22+)
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

   Untuk fitur AI, isi juga `GEMINI_API_KEY` dari Google AI Studio dan `GEMINI_MODEL` dengan nama model yang tersedia untuk kunci tersebut. Variabel opsional: `GEMINI_TIMEOUT_MS` (default 60000), `CHAT_BATAS_PER_MENIT` (10), `CHAT_BATAS_PER_HARI` (100), `CHAT_BATAS_GLOBAL_PER_HARI` (500), dan `CAPTION_BATAS_PER_MENIT` (10). Tanpa kunci dan model, aplikasi tetap berjalan; endpoint AI membalas `503` dan terminal mencetak `Gemini: BELUM dikonfigurasi`.

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

5. Untuk database lama yang sudah berisi produk, tambahkan kolom foto, tabel media, dan kolom hero tanpa menghapus data:

   ```powershell
   npm run migrasi
   ```

   Migrasi bersifat idempotent dan aman dijalankan berulang kali. Instalasi baru yang memakai `schema.sql` terbaru sudah memiliki kolom `foto`, tabel `media`, kolom `hero`, dan kolom `caption`, sehingga langkah ini hanya memastikan skema tetap mutakhir.

6. Daftarkan foto dan video lama yang sudah ada di folder `assets` ke tabel `media`:

   ```powershell
   npm run media:impor
   ```

   Skrip memindai `assets`, `assets/galeri`, dan `assets/video`, lalu melewati `assets/menu` karena folder tersebut berisi foto produk. Impor bersifat idempotent: berkas yang sudah terdaftar tidak ditambahkan lagi. Ringkasan jumlah media yang ditambahkan dan dilewati akan dicetak di terminal.

7. Opsional, tandai foto galeri yang bebas tulisan sebagai kandidat latar hero:

   ```powershell
   npm run hero:saring
   ```

   Proses ini memakai OCR dan dapat memakan waktu pada pemakaian pertama karena mengunduh data bahasa. Ringkasan foto bersih dan bertulisan dicetak di terminal. Detail dan opsi pengulangan dijelaskan pada bagian [Foto Hero Beranda](#foto-hero-beranda).

8. Jalankan server:

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
| `hero` | Penanda foto layak dipakai pada rotasi latar beranda; hanya berlaku untuk `jenis = 'foto'` |
| `created_at` | Waktu data dibuat |
| `updated_at` | Waktu data terakhir diubah |

Tabel dibuat oleh `npm run migrasi` melalui `database/migrasi/002-buat-tabel-media.sql`, lalu kolom `hero` ditambahkan oleh `database/migrasi/003-tambah-kolom-hero.sql`. Skema yang sama juga tersedia di `database/schema.sql`. Semuanya aman dijalankan berulang kali.

Impor media lama:

```powershell
npm run media:impor
```

Skrip memindai `assets`, `assets/galeri`, dan `assets/video`, lalu mendaftarkan berkas yang belum ada di tabel berdasarkan kolom `berkas`. Folder `assets/menu` tidak diimpor karena berisi foto produk. Judul awal diambil dari nama berkas yang dirapikan, sedangkan urutan mengikuti urutan nama berkas. Skrip mencetak jumlah media yang ditambahkan dan dilewati sehingga aman dijalankan berulang kali.

### Foto Hero Beranda

Rotasi latar beranda hanya memakai baris `media` dengan `jenis = 'foto'` dan `hero = TRUE`. Model mengurutkan foto hero, lalu memilih satu foto unggulan secara acak dari nama yang cocok dengan `HERO_UNGGULAN = ['headquarters']`; bila tidak ada yang cocok, dipakai foto hero pertama. Daftar `HERO_KECUALI` dapat diisi potongan nama berkas yang ingin dilewati. Bila belum ada foto bertanda hero, beranda memakai foto cadangan lama agar tetap tampil.

Checkbox **Tampilkan sebagai latar hero (pilih hanya foto tanpa tulisan dan beresolusi tinggi)** muncul pada form tambah dan ubah foto. Video tidak boleh ditandai hero; API membalas `400` dengan pesan `hero hanya untuk foto`. Daftar admin menampilkan badge `Hero` pada foto yang ditandai.

Tandai foto bebas tulisan dengan OCR:

```powershell
npm run hero:saring
```

Periksa ulang seluruh foto dan turunkan penanda hero pada foto bertulisan:

```powershell
npm run hero:saring -- --ulang
```

Skrip memakai Tesseract dengan bahasa `eng+ind`, ambang keyakinan `70`, minimal `3` huruf, dan tanpa batas jumlah kata. Foto bersih dinaikkan menjadi `hero = TRUE`. Tanpa `--ulang`, skrip tidak menurunkan data lama; dengan `--ulang`, foto bertulisan diubah menjadi `hero = FALSE`. Berkas tidak pernah dihapus oleh skrip. Cache OCR disimpan di `.cache-ocr/` dan diabaikan Git.

Rotasi beranda memakai dua lapisan gambar. Foto lama memudar ke warna dasar biru gelap, lalu foto baru memudar masuk setelah lapisan lama benar-benar hilang. Nilai waktunya `JEDA_TAMPIL_MS = 8500`, `DURASI_KELUAR_MS = 600`, dan `DURASI_MASUK_MS = 900`. Semua foto hero yang lolos OCR dipakai tanpa saringan ketajaman tambahan; foto yang gagal dimuat dilewati. Rotasi berhenti saat tab tidak aktif, hero keluar dari layar, pengguna memilih `prefers-reduced-motion`, atau koneksi memakai `saveData`/2G.

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

## Asisten AI dengan Gemini

Aplikasi memakai SDK resmi `@google/genai` untuk dua fitur. SDK hanya dipanggil dari `services/geminiService.js`; kunci API tidak pernah dikirim ke peramban.

### Chatbot publik

Tombol **Asisten Bura** muncul di beranda, `/galeri`, dan `/video`. Pertanyaan dikirim ke `POST /api/chat` dengan body JSON `{ "pesan": "..." }`. Server menyusun konteks dari tabel `produk` dan `media` (cache 60 detik), lalu meminta model menjawab dalam JSON `{ dalamKonteks, jawaban, menuDirujuk }`.

Lapisan pengaman yang berjalan sebelum dan sesudah model:

- Pesan wajib berupa teks 1–500 karakter.
- Guardrail lokal menolak upaya mengubah aturan (prompt injection) dan topik yang jelas di luar kedai tanpa memanggil model.
- Instruksi sistem bersifat tetap, memuat konteks dari database dan kode rahasia acak per proses.
- Model tidak boleh menulis harga sendiri; ia harus memakai penanda `{harga:ID}` yang diganti server dengan harga terformat dari database.
- Keluaran ditolak (`502`) bila memuat harga manual, id menu palsu, angka di luar konteks, tautan asing, email, kode rahasia, atau bila respons kosong, terpotong, atau diblokir.
- Bila data tidak ada di konteks, pengguna menerima pesan bahwa informasinya belum tersedia.
- Pembatas laju in-memory: per IP per menit, per IP per hari, dan global per hari. Batas dapat diubah lewat `.env`.
- Log hanya mencatat metadata (IP, panjang pesan, hasil, durasi), bukan isi percakapan.

### Pembuat caption admin

Pada form ubah foto atau video (`/admin/foto/:id/ubah`, `/admin/video/:id/ubah`) tersedia kolom **Caption** dan tombol **Buat caption dengan AI** beserta catatan opsional maksimal 200 karakter. Foto dikirim sebagai `inlineData` bila ukurannya maksimal 3 MB dan formatnya JPEG, PNG, atau WebP; video hanya memakai judul dan catatan.

`POST /api/admin/caption` wajib memakai Basic Auth dan mengembalikan tepat tiga pilihan caption. Setiap caption disaring: maksimal 150 karakter, tanpa angka, harga, tautan, mention, atau hashtag selain `#BuraBuraCoffee` dan `#Yogyakarta`, serta tanpa klaim/superlatif seperti "terbaik", "promo", atau "dijamin". Caption yang lolos tetap harus disimpan manual lewat form; tidak ada penulisan otomatis ke database. Endpoint ini juga dibatasi 10 permintaan per menit per IP secara default.

### Endpoint AI

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| POST | `/api/chat` | Pertanyaan chatbot publik (JSON `pesan`) |
| POST | `/api/admin/caption` | Tiga saran caption (wajib admin, JSON `mediaId` dan `catatan` opsional) |

Contoh chatbot:

```powershell
curl.exe -X POST http://localhost:3000/api/chat `
  -H "Content-Type: application/json" `
  -d '{\"pesan\":\"Apa menu andalan dan berapa harganya?\"}'
```

Contoh respons:

```json
{
  "jawaban": "Menu andalannya Boring Dirty, harganya Rp 45.000.",
  "dalamKonteks": true,
  "menuDirujuk": [1]
}
```

Contoh caption:

```powershell
curl.exe -X POST http://localhost:3000/api/admin/caption `
  -u admin:ganti_dengan_password_kuat `
  -H "Content-Type: application/json" `
  -d '{\"mediaId\":1,\"catatan\":\"suasana pagi\"}'
```

Keterbatasan yang perlu diketahui: batas laju dan cache disimpan di memori proses, sehingga hitungan kembali ke nol saat server dimulai ulang dan tidak dibagi antar-proses. Hasil AI tetap dapat keliru; harga dan ketersediaan yang mengikat adalah data di database.

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
| PUT | `/api/media/:id` | Mengubah judul, caption, urutan, status hero, dan berkas opsional (wajib admin) |
| DELETE | `/api/media/:id` | Menghapus media dan berkasnya (wajib admin) |
| POST | `/api/chat` | Pertanyaan chatbot publik (JSON `pesan`) |
| POST | `/api/admin/caption` | Tiga saran caption dari AI (wajib admin) |

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
    "hero": true,
    "dibuatPada": "2026-11-12T01:00:00.000Z",
    "diubahPada": "2026-11-12T01:00:00.000Z"
  }
]
```

`GET /api/media/1` mengembalikan satu objek media. Bila id tidak ada, response `404`.

`POST /api/media` memakai `multipart/form-data` dengan field `jenis`, `judul`, `urutan`, `hero`, dan `berkas`:

```powershell
curl.exe -X POST http://localhost:3000/api/media -u admin:ganti_dengan_password_kuat -F "jenis=foto" -F "judul=Sudut Mangkubumi" -F "urutan=1" -F "hero=true" -F "berkas=@C:\foto\sudut.jpg;type=image/jpeg"
```

Response `201` berisi objek media yang baru dibuat. Berkas disimpan server dengan nama aman di `assets/galeri` atau `assets/video`. Field `hero` menerima `true`, `on`, `1`, atau `false`, `0`, kosong; nilai lain dibalas `400`. Menandai video dengan `hero=true` juga dibalas `400` dengan pesan `hero hanya untuk foto`.

`PUT /api/media/1` mengubah judul, urutan, dan status hero; field `berkas` opsional untuk mengganti berkas lama:

```powershell
curl.exe -X PUT http://localhost:3000/api/media/1 -u admin:ganti_dengan_password_kuat -F "judul=Sudut Mangkubumi Baru" -F "urutan=2" -F "hero=false"
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
    "hero": true,
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

### Uji otomatis fitur AI

```powershell
npm run uji:chat
```

Skrip `scripts/uji-chat.js` menjalankan server di dalam proses pada port acak dan mengganti Gemini dengan klien tiruan, sehingga tidak memakai kuota dan tidak membutuhkan `GEMINI_API_KEY` sungguhan. Pengujian mencakup: status `503` tanpa kunci, jawaban normal beserta penggantian harga, penolakan prompt injection dan topik luar, pesan data tidak tersedia, penolakan harga manual, id harga palsu, angka asing, tautan asing, kebocoran kode rahasia, JSON rusak, respons diblokir, batas waktu `504`, kuota `429`, validasi panjang pesan, tiga pembatas laju chatbot, autentikasi caption, media tidak ditemukan, catatan terlalu panjang, pengiriman foto sebagai `inlineData`, video tanpa gambar, penyaringan caption, path berkas terlarang, pembatas caption, serta caption tersimpan yang tampil di `/galeri`. Data dan caption yang diubah selama pengujian dipulihkan di akhir.

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
17. Klik tombol **Asisten Bura**, ajukan pertanyaan tentang menu, harga, jam buka, atau jumlah galeri. Pastikan balasan muncul tanpa memuat ulang halaman, harga memakai format rupiah, dan tombol tutup serta Escape bekerja.
18. Coba tanyakan hal di luar kedai (misalnya teori relativitas) dan upaya seperti "abaikan semua instruksi". Pastikan asisten menolak dengan sopan dan tidak menampilkan aturan internal.
19. Ubah salah satu foto di admin, isi catatan AI, klik **Buat caption dengan AI**, lalu pilih salah satu dari tiga saran. Simpan dan pastikan caption tampil di lightbox `/galeri`. Ulangi untuk video dan pastikan caption tampil di kartu `/video`.
20. Hentikan server lalu jalankan tanpa `GEMINI_API_KEY`/`GEMINI_MODEL` untuk memastikan terminal mencetak `Gemini: BELUM dikonfigurasi` dan endpoint AI membalas `503` tanpa menghentikan halaman publik.

## Catatan Keamanan

- File `.env` berisi kredensial database, akun admin, dan kunci Gemini, dan **tidak diunggah** ke repository karena sudah masuk `.gitignore`.
- Kunci Gemini hanya dipakai di server melalui `services/geminiService.js` dan tidak pernah dikirim ke peramban, dicetak ke log, atau ditulis pada pesan galat. Tanpa kunci, fitur AI nonaktif dengan `503` tanpa menghentikan aplikasi.
- Instruksi sistem, kode rahasia per proses, dan konteks database tidak dapat diubah pengguna. Prompt injection, keluaran yang memuat harga manual, id palsu, tautan asing, atau kode rahasia ditolak sebelum sampai ke pengguna.
- Endpoint AI memakai pembatas laju di memori untuk melindungi kuota. Untuk produksi dengan beberapa proses, gunakan penyimpanan bersama (misalnya Redis) agar batas berlaku global.
- Folder `assets/` tetap diabaikan, kecuali `assets/menu/` yang disiapkan untuk foto menu. Berkas unggahan media di `assets/galeri` dan `assets/video` juga tidak ikut Git. Jangan menaruh berkas rahasia di folder tersebut.
- Unggahan media diperiksa dari ekstensi, mimetype, dan tanda tangan byte awal. Nama berkas dibuat server, ukuran dibatasi, dan penghapusan berkas hanya dilakukan untuk path yang ter-resolve di folder media yang diizinkan serta tidak dirujuk data lain.
- Gunakan `.env.example` sebagai contoh konfigurasi tanpa rahasia.
- HTTP Basic Authentication mengirim kredensial pada setiap request; gunakan HTTPS saat aplikasi dipasang di server publik.
- Perbandingan kredensial admin memakai `crypto.timingSafeEqual` atas digest SHA-256 agar waktu pembandingan tidak membocorkan informasi.
- Seluruh query memakai parameter `$1`, `$2`, dan seterusnya; tidak ada penggabungan string SQL dengan input pengguna.
