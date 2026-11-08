# pintaria

**Pintaria 3D** adalah game kuis balapan edukasi interaktif 3D berbasis AI untuk pembelajaran di kelas (IFP / Layar Sentuh & Multiplayer).

## Fitur Utama
- **Full AI Question Generator**: Guru cukup memilih atau mengetik topik materi, dan soal dibuat otomatis untuk 4 babak berbeda.
- **Dual-Provider Serverless Fallback (`/api/generate`)**: API Key tersimpan aman di sisi server (Vercel Environment Variables) dengan peralihan otomatis jika salah satu jalur sibuk.
- **Sistem Eliminasi Cepat**: Kuota kelolosan setiap babak diambil dari pemain tercepat yang mencapai garis finis.
- **Efek Suara & Backsound Interaktif**: Musik latar dan efek suara terintegrasi langsung melalui Web Audio API.

## Konfigurasi Environment Variables di Vercel
Tambahkan variabel berikut pada **Project Settings > Environment Variables** di Vercel:
- `GROQ_API_KEY`
- `GEMINI_API_KEY`
- `PRIMARY_AI` (`groq` atau `gemini`)
