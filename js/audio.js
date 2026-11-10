/**
 * EduXPlay 3D - Web Audio API Sound Effects & Backsound Engine
 * Menghasilkan musik latar (backsound) ceria ala game arcade & efek suara interaktif tanpa file MP3 eksternal.
 */

const SFX = (() => {
  let ctx = null;
  let muted = false;
  let bgmTimer = null;
  let bgmMode = ''; // 'menu' | 'race' | ''
  let stepIdx = 0;

  try {
    muted = (localStorage.getItem('eduxplay_mute') ?? localStorage.getItem('pintaria_mute')) === '1';
  } catch (e) {}

  function ensureCtx() {
    if (muted) return null;
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) ctx = new AudioCtx();
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function playTone(freq, type, duration, vol = 0.12, delay = 0, slideTo = null) {
    const c = ensureCtx();
    if (!c) return;
    const now = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = type || 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
    }

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(c.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  // Efek Suara Klik Tombol
  function click() {
    playTone(520, 'sine', 0.06, 0.1, 0, 680);
  }

  // Efek Suara Jawaban Benar + Lompat
  function correct() {
    playTone(523.25, 'triangle', 0.11, 0.14, 0);      // C5
    playTone(659.25, 'triangle', 0.11, 0.14, 0.07);   // E5
    playTone(783.99, 'triangle', 0.16, 0.15, 0.14);   // G5
    playTone(1046.5, 'sine', 0.22, 0.14, 0.21);       // C6
  }

  // Efek Suara Turbo (Benar 3x Beruntun)
  function turbo() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
    notes.forEach((n, i) => playTone(n, 'sawtooth', 0.12, 0.1, i * 0.055));
  }

  // Efek Suara Jawaban Salah / Terkena Rintangan
  function wrong() {
    playTone(240, 'sawtooth', 0.18, 0.13, 0, 140);
    playTone(165, 'sawtooth', 0.28, 0.13, 0.14, 95);
  }

  // Efek Suara Lolos Garis Finis
  function qualify() {
    const fan = [587.33, 587.33, 587.33, 783.99, 987.77, 1174.66];
    const durs = [0.09, 0.09, 0.09, 0.18, 0.18, 0.35];
    let t = 0;
    fan.forEach((f, i) => {
      playTone(f, 'triangle', durs[i], 0.16, t);
      t += durs[i] * 0.85;
    });
  }

  // Efek Suara Mulai Babak (Peluit / Start)
  function roundStart() {
    playTone(440, 'sine', 0.12, 0.12, 0);
    playTone(440, 'sine', 0.12, 0.12, 0.18);
    playTone(880, 'triangle', 0.32, 0.18, 0.36);
  }

  // Efek Suara Juara Turnamen (Grand Final Podium)
  function win() {
    const melody = [
      [523.25, 0.14], [659.25, 0.14], [783.99, 0.14], [1046.5, 0.28],
      [783.99, 0.14], [1046.5, 0.45]
    ];
    let t = 0;
    melody.forEach(([f, d]) => {
      playTone(f, 'triangle', d, 0.18, t);
      playTone(f * 0.5, 'sine', d, 0.1, t);
      t += d * 0.9;
    });
  }

  // Melodi Backsound Menu (Santai & Ceria)
  const MENU_NOTES = [
    523.25, 659.25, 783.99, 659.25,
    587.33, 698.46, 880.00, 698.46,
    523.25, 659.25, 783.99, 1046.5,
    987.77, 783.99, 698.46, 587.33
  ];

  // Melodi Backsound Balapan (Semangat & Cepat ala Party Game)
  const RACE_NOTES = [
    659.25, 659.25, 0, 659.25, 0, 523.25, 659.25, 0,
    783.99, 0, 0, 0, 392.00, 0, 0, 0,
    523.25, 0, 392.00, 0, 329.63, 0, 440.00, 0,
    493.88, 0, 466.16, 440.00, 392.00, 659.25, 783.99, 880.00
  ];
  const RACE_BASS = [
    130.81, 196.00, 130.81, 196.00,
    146.83, 220.00, 146.83, 220.00,
    164.81, 246.94, 164.81, 246.94,
    130.81, 196.00, 130.81, 261.63
  ];

  function startBgm(mode) {
    if (bgmMode === mode && bgmTimer) return;
    bgmMode = mode;
    if (bgmTimer) {
      clearInterval(bgmTimer);
      bgmTimer = null;
    }
    if (muted || !mode) return;
    stepIdx = 0;
    const tempoMs = mode === 'race' ? 165 : 280;
    bgmTimer = setInterval(() => {
      if (muted || !ctx || ctx.state !== 'running') return;
      if (bgmMode === 'menu') {
        const note = MENU_NOTES[stepIdx % MENU_NOTES.length];
        if (note) playTone(note, 'sine', 0.22, 0.045);
        if (stepIdx % 2 === 0) playTone(note * 0.5, 'triangle', 0.25, 0.03);
      } else if (bgmMode === 'race') {
        const note = RACE_NOTES[stepIdx % RACE_NOTES.length];
        const bass = RACE_BASS[Math.floor(stepIdx / 2) % RACE_BASS.length];
        if (note) playTone(note, 'triangle', 0.13, 0.055);
        if (stepIdx % 2 === 0 && bass) playTone(bass, 'sine', 0.18, 0.05);
      }
      stepIdx++;
    }, tempoMs);
  }

  function stopBgm() {
    bgmMode = '';
    if (bgmTimer) {
      clearInterval(bgmTimer);
      bgmTimer = null;
    }
  }

  function toggleMute() {
    muted = !muted;
    try {
      localStorage.setItem('eduxplay_mute', muted ? '1' : '0');
    } catch (e) {}
    updateMuteButton();
    if (muted) {
      if (bgmTimer) {
        clearInterval(bgmTimer);
        bgmTimer = null;
      }
    } else {
      ensureCtx();
      const target = typeof G !== 'undefined' && G.ph === 'play' ? 'race' : 'menu';
      bgmMode = '';
      startBgm(target);
      click();
    }
  }

  function updateMuteButton() {
    const btn = document.getElementById('sb');
    if (btn) {
      const ico = muted
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
      btn.innerHTML = `${ico}<span>${muted ? 'Suara Mati' : 'Suara Aktif'}</span>`;
      btn.className = 'gb ' + (muted ? 'alt' : 'g-a');
      btn.title = muted ? 'Aktifkan Suara' : 'Matikan Suara';
    }
  }

  // Aktifkan audio otomatis pada klik pertama pengguna di halaman
  window.addEventListener('pointerdown', (e) => {
    ensureCtx();
    if (!bgmTimer && !muted) {
      const target = typeof G !== 'undefined' && G.ph === 'play' ? 'race' : 'menu';
      startBgm(target);
    }
    if (e.target && e.target.closest && e.target.closest('button') && e.target.id !== 'sb') {
      click();
    }
  }, { passive: true });

  return {
    click,
    correct,
    turbo,
    wrong,
    qualify,
    roundStart,
    win,
    startBgm,
    stopBgm,
    toggleMute,
    updateMuteButton,
    isMuted: () => muted
  };
})();
