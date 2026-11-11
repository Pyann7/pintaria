// Game Configuration & Maps Data (Full AI Question Mode - 4 Babak)
const MAPS = [
  { n: 'Padang Hijau', sky: 0x87ceeb, gr: 0x4caf50, t: 0, c: 0xff9800, mv: 0, lk: 1500, back: 1, rule: 'Lompat pagar! Salah: dipukul balok, mundur 1' },
  { n: 'Gletser Es', sky: 0xcfeaff, gr: 0xb3e5fc, t: 1, c: 0x1e88e5, mv: 1, lk: 1500, back: 1, rule: 'Seluncur es! Salah: ditabrak bola salju, mundur 1' },
  { n: 'Gunung Lava', sky: 0x4a1010, gr: 0x5d4037, t: 2, c: 0xff3d00, mv: 2, lk: 2500, back: 1, rule: 'Terbang roket! Salah: disembur lava, mundur 1' },
  { n: 'Kota Permen', sky: 0xffc1e3, gr: 0xf8bbd0, t: 3, c: 0x7e57c2, mv: 3, lk: 1500, back: 1, rule: 'Loncat trampolin! Salah: dipalu, mundur 1' }
];

const TOTAL_ROUNDS = MAPS.length; // 4 Babak per permainan
let TRACK = 5, DUR = 70; // Default 20 soal = 4 babak x 5 langkah lintasan
const L = 48, W = 52, KM = { k: [.5, .4, .4], n: [.7, .5, .5], s: [.85, .7, .6] };
const PM = {};

function rng(s) {
  return () => {
    s |= 0;
    s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function pool() {
  return G.q || [];
}

/**
 * Membagi bank soal secara merata dan terpisah untuk masing-masing dari 4 babak (r = 0, 1, 2, 3)
 * sehingga soal di Babak 1, 2, 3, dan 4 tidak pernah sama/berulang antar-babak.
 */
function roundPool(r) {
  const all = pool();
  if (!all.length) return [];
  const roundIdx = Math.max(0, Math.min(TOTAL_ROUNDS - 1, r || 0));
  const perRound = Math.max(1, Math.floor(all.length / TOTAL_ROUNDS));
  const start = roundIdx * perRound;
  const end = roundIdx === TOTAL_ROUNDS - 1 ? all.length : start + perRound;
  const subset = all.slice(start, end);
  return subset.length ? subset : all;
}

/**
 * Menghitung panjang lintasan (langkah per babak) otomatis dari jumlah soal:
 * Panjang Lintasan = Jumlah Soal ÷ 4 Babak
 */
function calcTrackFromQuestions(questionCount) {
  const n = Number(questionCount) || 20;
  return Math.max(2, Math.floor(n / TOTAL_ROUNDS));
}

function perm(n, seed) {
  const k = n + '_' + seed;
  if (PM[k]) return PM[k];
  const R = rng(seed * 131 + n), a = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(R() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return PM[k] = a;
}

function getQ(r, i, playerIdx = 0) {
  const R = rng((r + 1) * 1000 + playerIdx * 137 + i * 7 + 13);
  const P = roundPool(r);
  let q, a, w;
  if (P.length) {
    const order = perm(P.length, (r + 1) * 31 + playerIdx * 17);
    const x = P[order[i % P.length]];
    q = x[0];
    a = x[1];
    w = x.slice(2);
  } else {
    let A = 1 + Math.floor(R() * (r ? 9 : 20)), B = 1 + Math.floor(R() * (r ? 9 : 20));
    const t = r == 0 ? (R() < .5 ? '+' : '-') : r == 1 ? '×' : r == 2 ? (R() < .5 ? '÷' : '+') : '×';
    if (t == '-' && B > A) [A, B] = [B, A];
    if (t == '÷') A *= B;
    const v = t == '+' ? A + B : t == '-' ? A - B : t == '×' ? A * B : A / B;
    q = `${A} ${t} ${B} = ?`;
    a = String(v);
    const s = new Set([a]);
    while (s.size < 4) s.add(String(Math.max(0, v + (Math.floor(R() * 7) - 3 || 4))));
    w = [...s].slice(1);
  }
  const o = [a, ...w.slice(0, 3)].map(t => [R(), t]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
  return { q, o, a };
}

/* =========================================================================
   BANK SOAL KURIKULUM BAWAAN (OFFLINE / FALLBACK QUESTION BANK)
   Memastikan game selalu 100% bisa dimainkan walau server AI sedang sibuk/offline.
   ========================================================================= */

const CURRICULUM_BANKS = {
  'Matematika': [
    { q: 'Hasil dari 15 × 8 adalah...', a: '120', w: ['110', '125', '130'] },
    { q: 'Bentuk persen dari pecahan 3/4 adalah...', a: '75%', w: ['50%', '60%', '80%'] },
    { q: 'Sebuah persegi memiliki sisi 9 cm. Kelilingnya adalah...', a: '36 cm', w: ['81 cm', '27 cm', '45 cm'] },
    { q: 'Hasil dari 144 ÷ 12 + 25 adalah...', a: '37', w: ['35', '39', '42'] },
    { q: 'KPK dari bilangan 6 dan 8 adalah...', a: '24', w: ['12', '48', '18'] },
    { q: 'FPB dari bilangan 24 dan 36 adalah...', a: '12', w: ['6', '18', '24'] },
    { q: 'Rumus luas segitiga adalah...', a: '1/2 × alas × tinggi', w: ['alas × tinggi', 'sisi × sisi', '2 × (alas + tinggi)'] },
    { q: 'Nilai dari 2³ + 3² adalah...', a: '17', w: ['15', '19', '25'] },
    { q: 'Sudut yang besarnya tepat 90 derajat disebut sudut...', a: 'Siku-siku', w: ['Lancip', 'Tumpul', 'Lurus'] },
    { q: 'Hasil dari (-15) + 28 adalah...', a: '13', w: ['-13', '43', '-43'] },
    { q: 'Volume kubus dengan panjang rusuk 5 cm adalah...', a: '125 cm³', w: ['25 cm³', '150 cm³', '100 cm³'] },
    { q: 'Pecahan 2/5 senilai dengan desimal...', a: '0,4', w: ['0,2', '0,25', '0,5'] },
    { q: 'Berapakah jumlah simetri lipat pada persegi panjang?', a: '2', w: ['4', '1', '3'] },
    { q: 'Sebuah segitiga memiliki sisi 6 cm, 8 cm, dan 10 cm. Kelilingnya adalah...', a: '24 cm', w: ['48 cm', '14 cm', '28 cm'] },
    { q: 'Hasil dari 250 - 65 × 3 adalah...', a: '55', w: ['555', '65', '45'] },
    { q: 'Berapa jumlah titik sudut pada bangun limas segi empat?', a: '5', w: ['4', '6', '8'] },
    { q: 'Nilai desimal dari 7/10 adalah...', a: '0,7', w: ['0,07', '7,0', '0,77'] },
    { q: 'Hasil akar kuadrat dari 169 (√169) adalah...', a: '13', w: ['11', '12', '14'] },
    { q: 'Jika 3x = 21, maka nilai x adalah...', a: '7', w: ['6', '8', '9'] },
    { q: 'Jari-jari lingkaran adalah 7 cm. Keliling lingkaran tersebut adalah...', a: '44 cm', w: ['22 cm', '88 cm', '154 cm'] },
    { q: 'Hasil dari 5/8 + 2/8 adalah...', a: '7/8', w: ['7/16', '3/8', '1'] },
    { q: 'Bilangan prima antara 10 dan 20 adalah...', a: '11, 13, 17, 19', w: ['11, 15, 17, 19', '13, 15, 17', '11, 13, 19, 21'] },
    { q: 'Hasil dari 100 ÷ 4 × 5 adalah...', a: '125', w: ['5', '20', '250'] },
    { q: 'Sebuah balok memiliki ukuran 4 cm × 3 cm × 2 cm. Volumenya adalah...', a: '24 cm³', w: ['18 cm³', '12 cm³', '20 cm³'] }
  ],
  'IPAS / Sains': [
    { q: 'Planet yang dijuluki sebagai "Planet Merah" adalah...', a: 'Mars', w: ['Venus', 'Jupiter', 'Merkurius'] },
    { q: 'Proses perubahan wujud zat dari cair menjadi gas disebut...', a: 'Menguap', w: ['Mencair', 'Membeku', 'Menyublim'] },
    { q: 'Tumbuhan hijau membuat makanannya sendiri melalui proses...', a: 'Fotosintesis', w: ['Respirasi', 'Transpirasi', 'Fermentasi'] },
    { q: 'Organ tubuh manusia yang berfungsi memompa darah ke seluruh tubuh adalah...', a: 'Jantung', w: ['Paru-paru', 'Hati', 'Ginjal'] },
    { q: 'Zat hijau daun yang berperan penting menyerap cahaya matahari adalah...', a: 'Klorofil', w: ['Stomata', 'Floem', 'Xilem'] },
    { q: 'Hewan pemakan tumbuhan disebut...', a: 'Herbivora', w: ['Karnivora', 'Omnivora', 'Insektivora'] },
    { q: 'Planet terbesar di dalam Tata Surya kita adalah...', a: 'Jupiter', w: ['Saturnus', 'Bumi', 'Neptunus'] },
    { q: 'Alat pernapasan utama pada manusia adalah...', a: 'Paru-paru', w: ['Insang', 'Trakea', 'Kulit'] },
    { q: 'Peristiwa jatuhnya titik-titik air dari awan ke bumi disebut...', a: 'Presipitasi (Hujan)', w: ['Evaporasi', 'Kondensasi', 'Infiltrasi'] },
    { q: 'Kutub magnet yang senama (misal Utara dan Utara) jika didekatkan akan...', a: 'Tolak-menolak', w: ['Tarik-menarik', 'Diam saja', 'Menempel kuat'] },
    { q: 'Sumber energi terbesar dan utama bagi kehidupan di bumi adalah...', a: 'Matahari', w: ['Batu bara', 'Minyak bumi', 'Listrik'] },
    { q: 'Perubahan wujud dari padat langsung menjadi gas tanpa mencair disebut...', a: 'Menyublim', w: ['Mengembun', 'Mengkristal', 'Menguap'] },
    { q: 'Lapisan udara yang menyelimuti planet bumi disebut...', a: 'Atmosfer', w: ['Litosfer', 'Hidrosfer', 'Biosfer'] },
    { q: 'Gaya yang menyebabkan benda jatuh ke bawah menuju pusat bumi adalah gaya...', a: 'Gravitasi', w: ['Pegas', 'Gesek', 'Magnet'] },
    { q: 'Dalam rantai makanan, tumbuhan hijau bertindak sebagai...', a: 'Produsen', w: ['Konsumen I', 'Konsumen II', 'Pengurai'] },
    { q: 'Perputaran bumi pada porosnya disebut rotasi. Rotasi bumi menyebabkan...', a: 'Terjadinya siang dan malam', w: ['Pergantian musim', 'Gerhana matahari', 'Pasang surut air laut'] },
    { q: 'Hewan yang berkembang biak dengan cara bertelur disebut...', a: 'Ovipar', w: ['Vivipar', 'Ovovivipar', 'Mamalia'] },
    { q: 'Contoh benda yang dapat menghantarkan panas dengan baik (konduktor) adalah...', a: 'Aluminium', w: ['Kayu', 'Karet', 'Plastik'] },
    { q: 'Gas yang dihirup manusia saat bernapas adalah...', a: 'Oksigen (O₂)', w: ['Karbon dioksida (CO₂)', 'Nitrogen', 'Hidrogen'] },
    { q: 'Bunyi tidak dapat merambat melalui...', a: 'Ruang hampa udara', w: ['Benda padat', 'Benda cair', 'Udara bebas'] },
    { q: 'Pusat tata surya kita adalah...', a: 'Matahari', w: ['Bumi', 'Bulan', 'Jupiter'] },
    { q: 'Berikut ini contoh energi yang terbarukan (ramah lingkungan) adalah...', a: 'Energi Angin', w: ['Minyak Bumi', 'Batu Bara', 'Gas Alam'] },
    { q: 'Katak bernapas saat masih berudu (kecebong) menggunakan...', a: 'Insang', w: ['Paru-paru', 'Kulit', 'Trakea'] },
    { q: 'Bagian mata yang mengatur banyaknya cahaya yang masuk adalah...', a: 'Pupil', w: ['Kornea', 'Retina', 'Lensa'] }
  ],
  'Bahasa Indonesia': [
    { q: 'Penulisan kata baku yang benar adalah...', a: 'Apotek', w: ['Apotik', 'Apotiek', 'Apoteek'] },
    { q: 'Gagasan utama atau pokok pembahasan dalam suatu paragraf disebut...', a: 'Ide pokok', w: ['Kalimat penjelas', 'Kesimpulan', 'Ringkasan'] },
    { q: 'Lawan kata (antonim) dari kata "optimis" adalah...', a: 'Pesimis', w: ['Kritis', 'Praktis', 'Dinamis'] },
    { q: 'Majas yang mengumpamakan benda mati seolah-olah hidup dan bertindak seperti manusia adalah...', a: 'Personifikasi', w: ['Metafora', 'Hiperbola', 'Litotes'] },
    { q: 'Persamaan kata (sinonim) dari kata "kolektif" adalah...', a: 'Bersama-sama', w: ['Sendiri-sendiri', 'Terpisah', 'Berurutan'] },
    { q: 'Sajak akhir pada pantun yang baik dan benar berpola...', a: 'a - b - a - b', w: ['a - a - a - a', 'a - a - b - b', 'a - b - b - a'] },
    { q: 'Tanda baca yang digunakan untuk memisahkan unsur-unsur dalam suatu perincian adalah...', a: 'Koma (,)', w: ['Titik (.)', 'Titik dua (:)', 'Titik koma (;)'] },
    { q: 'Dua baris pertama dalam pantun disebut...', a: 'Sampiran', w: ['Isi', 'Bait', 'Tema'] },
    { q: 'Bentuk kata yang baku di bawah ini adalah...', a: 'Praktik', w: ['Praktek', 'Praktikkan', 'Praktekkan'] },
    { q: 'Antonim dari kata "konkret" adalah...', a: 'Abstrak', w: ['Nyata', 'Faktual', 'Jelas'] },
    { q: 'Kalimat yang disusun sesuai dengan kaidah tata bahasa yang berlaku disebut kalimat...', a: 'Efektif', w: ['Majemuk', 'Pasif', 'Langsung'] },
    { q: 'Kata hubung yang menyatakan hubungan pertentangan adalah...', a: 'Tetapi', w: ['Dan', 'Atau', 'Karena'] },
    { q: 'Penulisan kata baku yang tepat adalah...', a: 'Jadwal', w: ['Jadual', 'Jatwal', 'Jadwall'] },
    { q: 'Ungkapan "panjang tangan" memiliki arti...', a: 'Suka mencuri', w: ['Suka menolong', 'Dermawan', 'Suka memukul'] },
    { q: 'Teks yang berisi laporan hasil pengamatan terhadap suatu objek disebut teks...', a: 'Hasil Observasi', w: ['Narasi', 'Fabel', 'Negosiasi'] },
    { q: 'Sinonim dari kata "evaluasi" adalah...', a: 'Penilaian', w: ['Pemeriksaan', 'Perencanaan', 'Pengawasan'] },
    { q: 'Kata baku untuk nama hari libur mingguan umat muslim adalah...', a: 'Jumat', w: ['Jum\'at', 'Jum at', 'Jumaat'] },
    { q: 'Cerita rakyat fiksi yang tokoh-tokoh utamanya diperankan oleh hewan disebut...', a: 'Fabel', w: ['Legenda', 'Mite', 'Sage'] },
    { q: 'Awalan "me-" jika digabung dengan kata dasar "sapu" akan menjadi...', a: 'Menyapu', w: ['Mesapu', 'Mempersapu', 'Mengsapu'] },
    { q: 'Kata "izin" merupakan kata baku dari bentuk tidak baku...', a: 'Ijin', w: ['Idzin', 'Idjin', 'Isin'] }
  ],
  'Bahasa Inggris': [
    { q: 'What is the opposite of the word "happy"?', a: 'Sad', w: ['Angry', 'Tired', 'Bored'] },
    { q: 'Which animal is known as "The King of the Jungle"?', a: 'Lion', w: ['Elephant', 'Tiger', 'Gorilla'] },
    { q: 'Complete the sentence: "She ... to school every morning."', a: 'goes', w: ['go', 'going', 'gone'] },
    { q: 'What is the English word for "perpustakaan"?', a: 'Library', w: ['Laboratory', 'Bookstore', 'Classroom'] },
    { q: 'The day after Wednesday is...', a: 'Thursday', w: ['Tuesday', 'Friday', 'Saturday'] },
    { q: 'What color do you get if you mix red and yellow?', a: 'Orange', w: ['Purple', 'Green', 'Brown'] },
    { q: 'Complete: "There are seven days in a ..."', a: 'week', w: ['month', 'year', 'century'] },
    { q: 'What is the past tense of the verb "eat"?', a: 'Ate', w: ['Eaten', 'Eats', 'Eating'] },
    { q: 'Which one is a fruit?', a: 'Apple', w: ['Carrot', 'Potato', 'Onion'] },
    { q: 'What is the opposite of "hot"?', a: 'Cold', w: ['Warm', 'Cool', 'Dry'] },
    { q: 'What time is it if the big hand is on 12 and the small hand on 3?', a: 'Three o\'clock', w: ['Twelve o\'clock', 'Quarter past three', 'Half past three'] },
    { q: 'Complete: "I have two ... to see with."', a: 'eyes', w: ['ears', 'hands', 'legs'] },
    { q: 'What is the plural form of "child"?', a: 'Children', w: ['Childs', 'Childes', 'Childer'] },
    { q: 'The English word for "matahari terbit" is...', a: 'Sunrise', w: ['Sunset', 'Sunlight', 'Sunshine'] },
    { q: 'Complete: "They ... playing football in the field now."', a: 'are', w: ['is', 'am', 'was'] }
  ],
  'Pendidikan Pancasila': [
    { q: 'Lambang sila kedua Pancasila (Kemanusiaan yang adil dan beradab) adalah...', a: 'Rantai Emas', w: ['Bintang Emas', 'Pohon Beringin', 'Kepala Banteng'] },
    { q: 'Semboyan bangsa Indonesia "Bhinneka Tunggal Ika" memiliki arti...', a: 'Berbeda-beda tetapi tetap satu jua', w: ['Bersatu kita teguh bercerai kita runtuh', 'Maju bersama menuju kejayaan', 'Adil dan makmur merata'] },
    { q: 'Sila pertama Pancasila dilambangkan dengan simbol...', a: 'Bintang Emas', w: ['Rantai Emas', 'Pohon Beringin', 'Padi dan Kapas'] },
    { q: 'Lambang sila kelima Pancasila (Keadilan sosial bagi seluruh rakyat Indonesia) adalah...', a: 'Padi dan Kapas', w: ['Kepala Banteng', 'Pohon Beringin', 'Bintang'] },
    { q: 'Semboyan Bhinneka Tunggal Ika tertulis dalam kitab Sutasoma karangan...', a: 'Mpu Tantular', w: ['Mpu Prapanca', 'Mpu Gandring', 'Mpu Sedah'] },
    { q: 'Hari Lahir Pancasila diperingati setiap tanggal...', a: '1 Juni', w: ['1 Oktober', '17 Agustus', '28 Oktober'] },
    { q: 'Pohon Beringin merupakan lambang dari sila ke...', a: 'Ketiga (3)', w: ['Pertama (1)', 'Kedua (2)', 'Keempat (4)'] },
    { q: 'Musyawarah untuk mufakat merupakan pengamalan Pancasila sila ke...', a: 'Keempat (4)', w: ['Kedua (2)', 'Ketiga (3)', 'Kelima (5)'] },
    { q: 'Teks Proklamasi Kemerdekaan Indonesia diketik oleh tokoh nasional...', a: 'Sayuti Melik', w: ['Sukarni', 'BM Diah', 'Achmad Soebardjo'] },
    { q: 'Hari Kemerdekaan Republik Indonesia diperingati pada tanggal...', a: '17 Agustus 1945', w: ['1 Juni 1945', '28 Oktober 1928', '20 Mei 1908'] }
  ],
  'Pengetahuan Umum': [
    { q: 'Ibu kota provinsi Jawa Barat adalah...', a: 'Bandung', w: ['Semarang', 'Surabaya', 'Bogor'] },
    { q: 'Samudra terluas dan terdalam di dunia adalah...', a: 'Samudra Pasifik', w: ['Samudra Atlantik', 'Samudra Hindia', 'Samudra Arktik'] },
    { q: 'Candi Buddha terbesar di dunia yang terletak di Magelang, Jawa Tengah adalah...', a: 'Candi Borobudur', w: ['Candi Prambanan', 'Candi Mendut', 'Candi Sewu'] },
    { q: 'Satelit alami yang mengorbit planet bumi adalah...', a: 'Bulan', w: ['Titan', 'Phobos', 'Europa'] },
    { q: 'Benua terbesar di dunia berdasarkan luas wilayahnya adalah...', a: 'Benua Asia', w: ['Benua Afrika', 'Benua Amerika', 'Benua Eropa'] },
    { q: 'Alat musik tradisional khas Jawa Barat yang terbuat dari bambu adalah...', a: 'Angklung', w: ['Sasando', 'Kolintang', 'Gamelan'] },
    { q: 'Danau vulkanik terbesar di Indonesia dan Asia Tenggara adalah...', a: 'Danau Toba', w: ['Danau Singkarak', 'Danau Matano', 'Danau Poso'] },
    { q: 'Gunung tertinggi di pulau Jawa adalah...', a: 'Gunung Semeru', w: ['Gunung Slamet', 'Gunung Merapi', 'Gunung Bromo'] },
    { q: 'Hewan khas Indonesia yang hanya hidup di pulau Flores dan sekitarnya adalah...', a: 'Komodo', w: ['Anoa', 'Orangutan', 'Bekantan'] },
    { q: 'Lagu kebangsaan negara Republik Indonesia adalah...', a: 'Indonesia Raya', w: ['Bagimu Negeri', 'Garuda Pancasila', 'Satu Nusa Satu Bangsa'] }
  ]
};

/**
 * Generator Soal Aritmatika Dinamis (Jika bank soal habis atau untuk jumlah soal besar 32/48)
 */
function makeMathProcedural(seed, r = 0) {
  const R = rng(seed * 7919 + 31);
  const ops = ['+', '-', '×', '÷'];
  const op = ops[Math.floor(R() * ops.length)];
  let A = 10 + Math.floor(R() * 40), B = 2 + Math.floor(R() * 20);
  if (op === '-') {
    if (B > A) [A, B] = [B, A];
  } else if (op === '÷') {
    A = B * (2 + Math.floor(R() * 12));
  }
  const v = op === '+' ? A + B : op === '-' ? A - B : op === '×' ? A * B : Math.floor(A / B);
  const q = `Hitunglah nilai dari: ${A} ${op} ${B} = ...`;
  const a = String(v);
  const wrongSet = new Set();
  while (wrongSet.size < 3) {
    const delta = (Math.floor(R() * 9) - 4) || 3;
    const candidate = String(Math.max(0, v + delta));
    if (candidate !== a) wrongSet.add(candidate);
  }
  return { q, a, w: [...wrongSet] };
}

/**
 * Mengambil paket soal kurikulum siap saji sesuai Mapel dan Jumlah Soal.
 * Mengembalikan string berformat baris pipa: q|a|w1|w2|w3\n...
 */
function generateCurriculumQuestions(jenjang = 'SD', kelas = '5', mapel = 'Matematika', count = 20) {
  const targetCount = Number(count) || 20;
  let pool = CURRICULUM_BANKS[mapel];
  if (!pool || !pool.length) {
    if (mapel.includes('Sains') || mapel.includes('IPA')) pool = CURRICULUM_BANKS['IPAS / Sains'];
    else if (mapel.includes('Inggris')) pool = CURRICULUM_BANKS['Bahasa Inggris'];
    else if (mapel.includes('Indonesia')) pool = CURRICULUM_BANKS['Bahasa Indonesia'];
    else if (mapel.includes('Pancasila') || mapel.includes('IPS') || mapel.includes('Sejarah')) pool = CURRICULUM_BANKS['Pendidikan Pancasila'];
    else pool = CURRICULUM_BANKS['Matematika'];
  }

  // Acak urutan soal
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  const selected = [];

  for (let i = 0; i < targetCount; i++) {
    if (i < shuffled.length) {
      selected.push(shuffled[i]);
    } else {
      // Jika bank habis, lengkapi dengan aritmatika dinamis atau variasi pengetahuan umum
      if (mapel === 'Matematika') {
        selected.push(makeMathProcedural(i * 17 + 101));
      } else {
        const altPool = CURRICULUM_BANKS['Pengetahuan Umum'];
        selected.push(altPool[i % altPool.length]);
      }
    }
  }

  const sanitize = (s) => String(s ?? '').replace(/[|\n\r]/g, ' ').trim();
  const lines = selected.map(item => [
    sanitize(item.q),
    sanitize(item.a),
    ...item.w.slice(0, 3).map(sanitize)
  ].join('|'));

  return lines.join('\n');
}

// Ekspos ke window agar dapat dipanggil dari mana saja
window.generateCurriculumQuestions = generateCurriculumQuestions;
window.CURRICULUM_BANKS = CURRICULUM_BANKS;
