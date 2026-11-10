/**
 * EduXPlay 3D - Konfigurasi Firebase Realtime Database
 * Digunakan untuk koneksi multiplayer real-time antara Guru (IFP/Laptop) & Siswa (HP).
 *
 * CARA MENDAPATKAN CONFIG GRATIS DI FIREBASE (2 Menit):
 * 1. Buka https://console.firebase.google.com/
 * 2. Klik "Add Project" / "Buat Proyek" (misal: "eduxplay-game")
 * 3. Di menu kiri pilih "Build" > "Realtime Database" > Klik "Create Database" (pilih server Singapore / US)
 * 4. Pada tab "Rules" di Realtime Database, atur rule read & write ke true:
 *    {
 *      "rules": {
 *        "rooms": {
 *          "$roomId": {
 *            ".read": true,
 *            ".write": true
 *          }
 *        }
 *      }
 *    }
 * 5. Buka Project Settings (ikon gerigi) > tab "General" > scroll ke "Your apps" > klik ikon Web (</>)
 * 6. Salin nilai firebaseConfig ke bawah ini atau simpan lewat menu Pengaturan Firebase di game!
 */

window.DEFAULT_FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

window.getFirebaseConfig = function() {
  try {
    const saved = localStorage.getItem('eduxplay_firebase_cfg');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && (parsed.databaseURL || parsed.apiKey)) {
        return parsed;
      }
    }
  } catch (e) {}
  return window.DEFAULT_FIREBASE_CONFIG;
};

window.saveFirebaseConfig = function(cfg) {
  try {
    localStorage.setItem('eduxplay_firebase_cfg', JSON.stringify(cfg));
    return true;
  } catch (e) {
    return false;
  }
};

window.isFirebaseConfigured = function() {
  const cfg = window.getFirebaseConfig();
  return !!(cfg && cfg.databaseURL && cfg.databaseURL.trim().length > 0 && !cfg.databaseURL.includes('isi_database_url'));
};
