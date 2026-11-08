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
 * Membagi bank soal AI secara merata dan terpisah untuk masing-masing dari 4 babak (r = 0, 1, 2, 3)
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
