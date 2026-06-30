# Sistem Absensi QR Code Pegawai

Sistem Absensi Pegawai berbasis QR Code dinamis yang aman, terintegrasi dengan penentuan lokasi GPS (Geolocation), pengaturan jam operasional kerja, dan role-permission. Aplikasi ini dirancang menggunakan arsitektur modern yang memisahkan Backend API (Laravel) dan Frontend SPA (React.js).

---

## 🚀 Fitur Utama

### 👤 Peran Pegawai (Employee Portal)
*   **Beranda Pegawai:** Menampilkan ringkasan kehadiran bulanan (Hadir, Terlambat, Izin, Sakit, Alpha), status absen hari ini, jam masuk/pulang, dan riwayat kehadiran terbaru.
*   **Scan QR Absensi:** Melakukan scan QR Code absensi harian menggunakan kamera perangkat (mendukung seleksi kamera depan/belakang tanpa efek *mirror* otomatis pada kamera belakang).
*   **Absensi Geolocation (GPS):** Mendukung pencatatan koordinat latitude & longitude saat melakukan absensi untuk validasi lokasi.
*   **QR Code Absensi Mandiri:** Pegawai dapat melihat dan mengunduh QR Code aktif langsung dari dashboard mereka jika diperlukan.
*   **Pengajuan Izin / Sakit:** Formulir pengajuan ketidakhadiran mandiri.
*   **Riwayat & Aktivitas:** Melihat histori absensi lengkap dan log aktivitas sistem pribadi.

### 🔑 Peran Administrator (Admin Portal)
*   **Dashboard Analitis:** Visualisasi tren kehadiran bulanan (Recharts area/bar), tingkat persentase absensi harian, jumlah pegawai aktif, terlambat, izin, sakit, mangkir, serta log audit aktivitas sistem.
*   **Manajemen Pegawai:** CRUD data pegawai, import & export data pegawai via Excel, serta fitur **Impersonasi** (login sebagai pegawai tertentu untuk tujuan simulasi/bantuan).
*   **QR Code Generator:** Membuat token QR Code harian baru dengan masa aktif yang dapat dikustomisasi secara dinamis. Dilengkapi validasi keamanan berbasis **HMAC Signature** (mencegah manipulasi/pemalsuan token QR Code).
*   **Monitoring Kehadiran:** Rekapitulasi absensi seluruh pegawai dengan filter pencarian dan export data.
*   **Manajemen Izin:** Menyetujui atau menolak pengajuan izin/sakit pegawai.
*   **Pengaturan Jam Kerja:** Konfigurasi batas jam mulai/selesai absen masuk, toleransi keterlambatan, dan jam absen pulang secara dinamis dari dashboard.

---

## 🛠️ Tech Stack

### Backend
*   **Framework:** Laravel 13 (PHP 8.3+)
*   **Autentikasi:** Laravel Sanctum (Stateful Cookie-based SPA Authentication)
*   **Database:** PostgreSQL / SQLite
*   **Broadcast:** Laravel Reverb / Pusher-js (Real-time notifications)

### Frontend
*   **Build Tool & Library:** Vite + React.js (React 19)
*   **Styling:** Tailwind CSS v4 + React Icons
*   **State Management & API Client:** TanStack React Query v5 & Axios
*   **QR Code Engine:** `html5-qrcode` & `qrcode` (untuk rendering)

---

## ⚙️ Petunjuk Instalasi & Menjalankan Aplikasi

### Prerequisites
Pastikan Anda sudah menginstal:
*   PHP >= 8.3 & Composer
*   Node.js (LTS recommended) & NPM
*   PostgreSQL (atau gunakan SQLite dengan mengubah `.env`)

---

### 1. Konfigurasi Backend
1. Masuk ke folder backend:
   ```bash
   cd backend
   ```
2. Instal dependensi PHP:
   ```bash
   composer install
   ```
3. Salin file `.env.example` menjadi `.env` dan atur database serta timezone Anda:
   ```env
   APP_NAME="Si Absensi QR Code"
   APP_ENV=local
   APP_KEY= # Generate otomatis nanti
   APP_DEBUG=true
   APP_URL=http://127.0.0.1:8000
   APP_TIMEZONE=Asia/Jakarta

   DB_CONNECTION=pgsql
   DB_HOST=127.0.0.1
   DB_PORT=5432
   DB_DATABASE=si_absensi_qrcode
   DB_USERNAME=postgres
   DB_PASSWORD=YOUR_PASSWORD

   SANCTUM_STATEFUL_DOMAINS=localhost:5173,127.0.0.1:5173
   SESSION_DRIVER=cookie
   SESSION_LIFETIME=120
   ```
4. Generate key aplikasi:
   ```bash
   php artisan key:generate
   ```
5. Jalankan migrasi dan seeder database untuk data uji:
   ```bash
   php artisan migrate --seed
   ```
6. Jalankan server Laravel:
   ```bash
   php artisan serve
   ```
   *(Backend akan mendengarkan di http://127.0.0.1:8000)*

---

### 2. Konfigurasi Frontend
1. Masuk ke folder frontend:
   ```bash
   cd ../frontend
   ```
2. Instal dependensi Node:
   ```bash
   npm install
   ```
3. Jalankan server development Vite:
   ```bash
   npm run dev
   ```
   *(Frontend akan mendengarkan di http://127.0.0.1:5173)*

4. Buka browser dan arahkan ke alamat **`http://127.0.0.1:5173`** (Sangat disarankan menggunakan IP `127.0.0.1` dibanding `localhost` di Windows demi menghindari masalah resolusi IPv6 pada CORS/Cookies).

---

## 👥 Akun Uji Coba (Default Seeder)

| Role | Email | Password | Keterangan |
|---|---|---|---|
| **Admin** | `admin@absensi.com` | `password` | Akses manajemen penuh & QR Generator |
| **Pegawai** | `budi@absensi.com` | `password` | Akses scan kehadiran harian |
| **Pegawai** | `siti@absensi.com` | `password` | Akses scan kehadiran harian |

---

## 🔒 Fitur Keamanan QR Code
Sistem ini menggunakan pengamanan tingkat tinggi untuk mencegah kecurangan absensi:
1. **Dynamic Token Expiry:** QR Code dibuat dengan batasan menit tertentu (contoh: 15 menit). Jika pegawai melakukan scan setelah waktu tersebut, backend otomatis menolaknya.
2. **HMAC SHA256 Signature:** Setiap QR Code dibubuhi tanda tangan digital berupa hash rahasia yang digenerate menggunakan `APP_KEY` server. Hal ini mencegah pegawai membuat QR Code palsu atau memanipulasi koordinat/waktu kedaluwarsa secara mandiri.
