# EduXPlay 3D - Game Kuis Balapan Edukasi 3D

**EduXPlay 3D** adalah game kuis balapan edukasi interaktif 3D dengan AI generator soal dan sistem multiplayer real-time ala Quizizz/Kahoot untuk pembelajaran di kelas (Layar IFP / Laptop Guru & HP Siswa).

---

## 🚀 Fitur Unggulan

1. **Alur Ruang Kelas Ala Quizizz / Kahoot**:
   - Guru klik **BUAT RUANG** ➔ Sistem langsung meng-generate **Kode Ruang** unik 5-digit.
   - Guru masuk ke **Lobby Ruang Kelas** yang menampilkan kode ruang besar dan **Daftar Siswa Bergabung** secara real-time.
   - Guru dapat menyiapkan & membuat soal otomatis dengan AI langsung di dalam lobby selagi siswa bergabung.
   - Begitu siswa siap, Guru klik **MULAI PERMAINAN SEKARANG** untuk memulai balapan 3D serentak!
2. **Koneksi Siswa Mudah & Cepat**:
   - Siswa membuka web di HP, klik **GABUNG RUANG**, memilih karakter/warna, mengetikkan nama & kode ruang.
   - Siswa masuk ke **Ruang Tunggu Siswa** sambil melihat karakter 3D mereka dan daftar teman sekelas.
3. **Arsitektur Terbaik: Vercel Hosting + Firebase Realtime Database**:
   - **Vercel**: Menjalankan frontend web yang sangat cepat & Serverless Function AI (`/api/generate`) untuk Gemini & Groq.
   - **Firebase Realtime Database**: Menangani sinkronisasi WebSocket real-time antar perangkat (IFP Guru & 30+ HP Siswa) dengan latensi sub-50ms (100% Gratis di Firebase Spark Tier).
   - **Fallback Lokal Otomatis (BroadcastChannel)**: Jika Firebase belum diisi, game otomatis berjalan dalam Mode Lokal Multi-Tab sehingga bisa langsung diuji coba dengan membuka 2 tab browser di laptop.
4. **Full AI Question Generator**:
   - Guru cukup memilih Jenjang (SD, SMP, SMA, Umum), Kelas, Mapel, dan topik materi spesifik. AI otomatis menyusun soal berkualitas untuk 4 babak balapan berbeda.
5. **Kamera 3D Personal Siswa**:
   - Setiap siswa di HP-nya memiliki kamera sudut pandang ketiga (mengikuti karakternya sendiri saat menjawab soal dan melompati rintangan).
   - Layar IFP / Laptop Guru menyiarkan arena balapan kelas secara menyeluruh.

---

## 🛠️ Cara Setup Firebase Realtime Database (Gratis 2 Menit)

Game ini dapat dimainkan langsung secara lokal (multi-tab di laptop yang sama). Namun untuk dimainkan **lintas perangkat** (Guru di Laptop/IFP dan puluhan Siswa di HP masing-masing), ikuti langkah mudah berikut:

1. Buka [Firebase Console](https://console.firebase.google.com/) dan buat project baru (misal: `eduxplay-kelas`).
2. Di menu sebelah kiri, pilih **Build** > **Realtime Database** > klik **Create Database** (pilih region terdekat: Singapore / US).
3. Pada tab **Rules** di Realtime Database, atur permission read & write:
   ```json
   {
     "rules": {
       "rooms": {
         "$roomId": {
           ".read": true,
           ".write": true
         }
       }
     }
   }
   ```
   Lalu klik **Publish**.
4. Klik ikon gerigi (Project Settings) > tab **General** > scroll ke bawah ke bagian **Your apps** > klik ikon Web (`</>`) untuk mendaftarkan web app.
5. Salin nilai `databaseURL` (misal: `https://eduxplay-kelas-default-rtdb.asia-southeast1.firebasedatabase.app`) dan `apiKey`.
6. Ada 2 cara mudah memasukkan konfigurasi ke game:
   - **Cara 1 (Langsung dari Game)**: Klik tombol **⚙️ Server** di pojok kanan atas game, lalu paste Database URL dan klik Simpan.
   - **Cara 2 (File Kode)**: Buka file `js/firebase-config.js` dan isi `databaseURL` pada objek `DEFAULT_FIREBASE_CONFIG`.

---

## ☁️ Deployment ke Vercel

1. Push atau upload folder project ini ke repository GitHub Anda.
2. Buka [Vercel Dashboard](https://vercel.com/) dan klik **Add New Project** > pilih repository Anda.
3. Pada menu **Environment Variables**, tambahkan:
   - `GROQ_API_KEY`: API Key Groq Anda
   - `GEMINI_API_KEY`: API Key Google Gemini Anda
   - `PRIMARY_AI`: `groq` atau `gemini`
4. Klik **Deploy**! Web siap digunakan oleh seluruh siswa di kelas.
