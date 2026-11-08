/**
 * Pintaria 3D - 3D Game Asset Icon & Character Model Renderer
 * Merender aset 3D (karakter, gamepad, roket, pulau arena, tiket VIP, robot AI, mahkota, medali)
 * menggunakan Three.js + geometri GLB game (AS) dengan auto-framing penuh & pencahayaan studio 3D.
 */

const CHAR_COLORS = [
  { id: 'merah',  name: 'Merah',  hex: '#e5484d', num: 0xe5484d, rim: 0xff8a80, light: '#ffe5e7' },
  { id: 'biru',   name: 'Biru',   hex: '#2f7de1', num: 0x2f7de1, rim: 0x82b1ff, light: '#e3f0ff' },
  { id: 'hijau',  name: 'Hijau',  hex: '#2bb673', num: 0x2bb673, rim: 0x69f0ae, light: '#dcfce7' },
  { id: 'kuning', name: 'Kuning', hex: '#f5a623', num: 0xf5a623, rim: 0xffe57f, light: '#fef3c7' },
  { id: 'ungu',   name: 'Ungu',   hex: '#8b4de0', num: 0x8b4de0, rim: 0xd580ff, light: '#f3e8ff' },
  { id: 'pink',   name: 'Pink',   hex: '#f73b82', num: 0xf73b82, rim: 0xff80ab, light: '#fce7f3' },
  { id: 'oranye', name: 'Oranye', hex: '#ff6d00', num: 0xff6d00, rim: 0xffab40, light: '#ffedd5' },
  { id: 'toska',  name: 'Toska',  hex: '#00acc1', num: 0x00acc1, rim: 0x84ffff, light: '#cffafe' }
];

const ICONS = {};

function init3DIcons() {
  if (typeof THREE === 'undefined') return;

  const size = 220;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(size, size, false);
    renderer.setPixelRatio(1);
  } catch (e) {
    return;
  }

  const scene = new THREE.Scene();
  const fov = 34;
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);

  // Pencahayaan Studio 3D Game (Key + Fill + Golden Rim + Bottom Bounce)
  const amb = new THREE.AmbientLight(0xffffff, 0.72);
  const keyLight = new THREE.DirectionalLight(0xfff9e6, 1.05);
  keyLight.position.set(4, 7, 6);
  const fillLight = new THREE.DirectionalLight(0x90caf9, 0.55);
  fillLight.position.set(-5, 2, 4);
  const rimLight = new THREE.DirectionalLight(0xffe082, 0.65);
  rimLight.position.set(0, 5, -5);
  scene.add(amb, keyLight, fillLight, rimLight);

  const mat = (color, shininess = 95, emissive = 0x000000) =>
    new THREE.MeshPhongMaterial({
      color,
      shininess,
      specular: 0x555555,
      emissive
    });

  const hasAS = typeof AS !== 'undefined' && AS;

  /**
   * Auto-Framing Renderer: memusatkan grup 3D dan mengatur jarak kamera otomatis
   * agar objek 3D mengisi ~88% kanvas ikon (tidak kekecilan).
   */
  function renderGroup(buildFn, rx = 0.22, ry = -0.32, rz = 0, padScale = 1.12) {
    const wrapper = new THREE.Group();
    const inner = new THREE.Group();
    buildFn(inner);
    inner.rotation.set(rx, ry, rz);
    wrapper.add(inner);
    scene.add(wrapper);

    wrapper.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(wrapper);
    const center = new THREE.Vector3();
    const bsize = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(bsize);

    inner.position.sub(center);
    wrapper.updateMatrixWorld(true);

    const maxDim = Math.max(bsize.x, bsize.y, bsize.z * 0.65, 0.5);
    const halfFovRad = (fov * Math.PI) / 360;
    const dist = (maxDim / 2 / Math.tan(halfFovRad)) * padScale;

    camera.position.set(0, 0, dist);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);

    const url = canvas.toDataURL('image/png');
    scene.remove(wrapper);
    return url;
  }

  /**
   * Helper merakit karakter 3D Pintaria (menggunakan GLB AS jika sudah siap, atau geometri identik)
   */
  function buildCharacterMesh(colHex, rimHex, pose = 'wave') {
    const g = new THREE.Group();
    const mBody = mat(colHex, 105);
    const mRim = mat(rimHex || colHex, 120);
    const mSkin = mat(0xffe0bd, 75);
    const mDark = mat(0x2c384e, 85);
    const mEye = mat(0x111111, 140);
    const mWhite = mat(0xffffff, 140);
    const mGold = mat(0xffd54f, 135, 0x332200);

    // Podium / Pedestal 3D di bawah kaki karakter
    const padBase = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 1.02, 0.22, 32), mDark);
    padBase.position.y = -0.11;
    const padTop = new THREE.Mesh(new THREE.CylinderGeometry(0.84, 0.88, 0.08, 32), mBody);
    padTop.position.y = 0.02;
    const padRing = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.055, 14, 32), mRim);
    padRing.rotation.x = Math.PI / 2;
    padRing.position.y = 0.03;
    g.add(padBase, padTop, padRing);

    const charG = new THREE.Group();
    charG.position.y = 0.04;
    // Di game.js, model GLB karakter menghadap -Z; putar Math.PI agar menghadap kamera (+Z)
    charG.rotation.y = Math.PI;

    // Badan (Torso)
    const body = new THREE.Mesh(
      (hasAS && AS.torso) ? AS.torso : new THREE.CylinderGeometry(0.36, 0.44, 0.82, 20),
      mBody
    );
    body.position.y = (hasAS && AS.torso) ? 0.65 : 1.05;
    charG.add(body);

    // Lencana Bintang Emas di dada (-Z adalah depan karakter)
    const badge = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), mGold);
    badge.position.set(0, 1.08, -0.39);
    badge.scale.set(1, 1, 0.45);
    charG.add(badge);

    // Kepala (Head)
    const head = new THREE.Mesh(
      (hasAS && AS.head) ? AS.head : new THREE.SphereGeometry(0.37, 24, 20),
      mSkin
    );
    head.position.y = (hasAS && AS.head) ? 1.34 : 1.7;
    charG.add(head);

    // Topi (Cap)
    const cap = new THREE.Mesh(
      (hasAS && AS.cap) ? AS.cap : new THREE.SphereGeometry(0.39, 24, 16, 0, Math.PI * 2, 0, 1.3),
      mBody
    );
    cap.position.y = (hasAS && AS.cap) ? 1.78 : 1.74;
    if (!(hasAS && AS.cap)) {
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.08, 0.32), mRim);
      visor.position.set(0, 1.78, -0.28);
      charG.add(visor);
    }
    charG.add(cap);

    // Mata + Kilau Mata (menghadap -Z)
    [-0.14, 0.14].forEach((x) => {
      const eye = new THREE.Mesh(
        (hasAS && AS.eye) ? AS.eye : new THREE.SphereGeometry(0.058, 14, 14),
        mEye
      );
      eye.position.set(x, (hasAS && AS.eye) ? 1.665 : 1.71, -0.33);
      const shine = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 10), mWhite);
      shine.position.set(x - 0.02, 1.71, -0.38);
      charG.add(eye, shine);
    });

    // Kaki (Legs)
    [-0.18, 0.18].forEach((x, idx) => {
      const p = new THREE.Group();
      p.position.set(x, 0.65, 0);
      const leg = new THREE.Mesh(
        (hasAS && AS.leg) ? AS.leg : new THREE.BoxGeometry(0.22, 0.65, 0.25),
        mDark
      );
      leg.position.y = (hasAS && AS.leg) ? -0.65 : -0.3;
      p.add(leg);
      p.rotation.x = idx === 0 ? 0.22 : -0.22;
      charG.add(p);
    });

    // Tangan (Arms)
    [-0.52, 0.52].forEach((x, idx) => {
      const p = new THREE.Group();
      p.position.set(x, 1.35, 0);
      const arm = new THREE.Mesh(
        (hasAS && AS.arm) ? AS.arm : new THREE.BoxGeometry(0.17, 0.55, 0.17),
        mBody
      );
      arm.position.y = (hasAS && AS.arm) ? -0.55 : -0.25;
      p.add(arm);
      if (pose === 'wave' && idx === 0) {
        p.rotation.z = -2.4;
        p.rotation.x = 0.2;
      } else {
        p.rotation.z = idx === 0 ? -0.28 : 0.28;
        p.rotation.x = 0.25;
      }
      charG.add(p);
    });

    g.add(charG);
    return g;
  }

  // Render 8 Karakter 3D untuk Pemilih Karakter (Tahap 1)
  CHAR_COLORS.forEach((c) => {
    ICONS['char_' + c.id] = renderGroup(
      (g) => {
        g.add(buildCharacterMesh(c.num, c.rim, 'wave'));
      },
      0.12,
      -0.28,
      0,
      1.06
    );
  });

  // 1. PLAY (Karakter 3D Berlari Melompati Gawang + Perisai Play Emas)
  ICONS.play = renderGroup(
    (g) => {
      // Perisai heksagonal 3D hijau zamrud + bingkai emas
      const shield = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.36, 6), mat(0x1fa855, 110));
      shield.rotation.x = Math.PI / 2;
      shield.position.z = -0.2;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.14, 16, 32), mat(0xffd54f, 135));
      rim.position.z = -0.05;
      // Segitiga Play 3D Putih Glossy
      const tri = new THREE.Mesh(new THREE.ConeGeometry(0.76, 1.28, 3), mat(0xffffff, 140));
      tri.rotation.z = -Math.PI / 2;
      tri.rotation.y = Math.PI / 6;
      tri.position.set(0.1, 0, 0.18);
      // Bintang aksen di sudut atas
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), mat(0xffea00, 140, 0x332200));
      star.position.set(0.85, 0.85, 0.25);
      g.add(shield, rim, tri, star);
    },
    0.16,
    -0.24,
    0,
    1.05
  );

  // 2. GLOBE / BUAT RUANG (Pulau Arena Dunia 3D + Cincin Orbit Emas + Pin Pemain)
  ICONS.globe = renderGroup(
    (g) => {
      const ocean = new THREE.Mesh(new THREE.SphereGeometry(1.05, 28, 24), mat(0x1e88e5, 115));
      // Pulau benua hijau 3D di permukaan bola dunia
      const land1 = new THREE.Mesh(new THREE.SphereGeometry(0.55, 18, 16), mat(0x43a047, 90));
      land1.position.set(-0.35, 0.35, 0.72);
      land1.scale.set(1.2, 0.85, 0.45);
      const land2 = new THREE.Mesh(new THREE.SphereGeometry(0.48, 18, 16), mat(0x66bb6a, 90));
      land2.position.set(0.45, -0.25, 0.78);
      land2.scale.set(1.1, 0.9, 0.45);
      // Cincin orbit emas tebal
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.38, 0.13, 16, 40), mat(0xffca28, 135));
      ring.rotation.x = 1.12;
      ring.rotation.y = 0.32;
      // Pin lokasi merah 3D di atas bola dunia
      const pinHead = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 16), mat(0xff5252, 130));
      pinHead.position.set(0.15, 1.18, 0.35);
      const pinCone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.45, 16), mat(0xff5252, 130));
      pinCone.rotation.x = Math.PI;
      pinCone.position.set(0.15, 0.92, 0.35);
      g.add(ocean, land1, land2, ring, pinHead, pinCone);
    },
    0.2,
    -0.25,
    0,
    1.04
  );

  // 3. TICKET / GABUNG RUANG (Tiket Emas VIP Arcade 3D + Bintang Berlian)
  ICONS.ticket = renderGroup(
    (g) => {
      const outer = new THREE.Mesh(new THREE.BoxGeometry(2.15, 1.32, 0.36), mat(0xff8f00, 110));
      const inner = new THREE.Mesh(new THREE.BoxGeometry(1.82, 1.0, 0.42), mat(0xffd54f, 125));
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.44, 0), mat(0xffffff, 140));
      star.position.set(0, 0, 0.28);
      const gemL = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 14), mat(0xe53935, 135));
      gemL.position.set(-0.62, 0, 0.26);
      const gemR = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 14), mat(0x2979ff, 135));
      gemR.position.set(0.62, 0, 0.26);
      g.add(outer, inner, star, gemL, gemR);
    },
    0.18,
    -0.26,
    0.14,
    1.05
  );

  // 4. AI / MAGIC ROBOT (Kepala Robot AI 3D Cerdas + Bintang Kristal Emas)
  ICONS.ai = renderGroup(
    (g) => {
      // Kepala Robot 3D Ungu-Biru
      const head = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.1, 1.05), mat(0x7c3aed, 115));
      const visor = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.56, 0.22), mat(0x1a103c, 135));
      visor.position.set(0, 0.04, 0.48);
      // Mata neon cyan bercahaya
      [-0.26, 0.26].forEach((x) => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), mat(0x00e5ff, 140, 0x0088aa));
        eye.position.set(x, 0.05, 0.56);
        g.add(eye);
      });
      // Antena emas di atas kepala
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.45, 14), mat(0xffd54f, 120));
      rod.position.y = 0.72;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), mat(0xffea00, 140, 0x553300));
      bulb.position.y = 0.98;
      // Telinga robot
      [-0.76, 0.76].forEach((x) => {
        const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.22, 18), mat(0xffb300, 125));
        ear.rotation.z = Math.PI / 2;
        ear.position.set(x, 0.02, 0);
        g.add(ear);
      });
      // Bintang kristal ajaib di samping
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.36, 0), mat(0xffd54f, 140, 0x442200));
      star.position.set(0.88, 0.68, 0.35);
      g.add(head, visor, rod, bulb, star);
    },
    0.16,
    -0.26,
    0,
    1.05
  );

  // 5. ROCKET (Roket 3D Turbo Peluncur)
  ICONS.rocket = renderGroup(
    (g) => {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.56, 1.35, 28), mat(0xffffff, 120));
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.51, 0.53, 0.32, 28), mat(0xffb300, 125));
      stripe.position.y = -0.25;
      const nose = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.72, 28), mat(0xe53935, 115));
      nose.position.y = 1.02;
      const winRim = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.07, 14, 24), mat(0xffb300, 130));
      winRim.position.set(0, 0.22, 0.46);
      const win = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 18), mat(0x29b6f6, 140, 0x003366));
      win.position.set(0, 0.22, 0.42);
      const flame1 = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.78, 20), mat(0xff6d00, 130, 0x662200));
      flame1.rotation.x = Math.PI;
      flame1.position.y = -1.02;
      const flame2 = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.52, 16), mat(0xffea00, 140, 0x665500));
      flame2.rotation.x = Math.PI;
      flame2.position.set(0, -0.92, 0.15);
      [-0.55, 0.55].forEach((x) => {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.65, 0.16), mat(0xe53935, 105));
        fin.position.set(x, -0.42, 0);
        fin.rotation.z = x < 0 ? 0.25 : -0.25;
        g.add(fin);
      });
      g.add(body, stripe, nose, winRim, win, flame1, flame2);
    },
    0.15,
    -0.25,
    -0.42,
    1.04
  );

  // 6. CROWN (Mahkota Raja Juara 3D Emas Berpermata)
  ICONS.crown = renderGroup(
    (g) => {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.88, 0.62, 28), mat(0xffb300, 130));
      base.position.y = -0.25;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.94, 0.13, 16, 32), mat(0xffea00, 140));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -0.52;
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.82, 16), mat(0xffca28, 135));
        spike.position.set(Math.sin(ang) * 0.82, 0.35, Math.cos(ang) * 0.82);
        const gemCol = i % 2 === 0 ? 0xe53935 : 0x00e676;
        const gem = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 16), mat(gemCol, 140));
        gem.position.set(Math.sin(ang) * 0.82, 0.78, Math.cos(ang) * 0.82);
        g.add(spike, gem);
      }
      const frontGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), mat(0x2979ff, 140));
      frontGem.position.set(0, -0.22, 0.96);
      g.add(base, ring, frontGem);
    },
    0.24,
    -0.28,
    0,
    1.05
  );

  // 7. MEDALS (Medali Piala 3D Emas, Perak, Perunggu)
  const makeMedal = (col, rimCol) =>
    renderGroup(
      (g) => {
        const rib1 = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.95, 0.16), mat(0xe53935, 85));
        rib1.position.set(-0.26, 0.58, -0.14);
        rib1.rotation.z = 0.24;
        const rib2 = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.95, 0.16), mat(0x1e88e5, 85));
        rib2.position.set(0.26, 0.58, -0.14);
        rib2.rotation.z = -0.24;
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 0.28, 32), mat(col, 135));
        disc.rotation.x = Math.PI / 2;
        disc.position.y = -0.22;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.12, 16, 32), mat(rimCol, 140));
        ring.position.set(0, -0.22, 0.1);
        const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), mat(0xffffff, 140));
        star.position.set(0, -0.22, 0.22);
        g.add(rib1, rib2, disc, ring, star);
      },
      0.16,
      -0.22,
      0,
      1.05
    );

  ICONS.medal1 = makeMedal(0xffb300, 0xffe57f);
  ICONS.medal2 = makeMedal(0xb0bec5, 0xffffff);
  ICONS.medal3 = makeMedal(0xd87a42, 0xffcc80);

  // 8. FLAG (Bendera Balap Garis Finis 3D)
  ICONS.flag = renderGroup(
    (g) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 2.25, 16), mat(0xffca28, 130));
      pole.position.x = -0.72;
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), mat(0xe53935, 135));
      knob.position.set(-0.72, 1.18, 0);
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 3; c++) {
          const isWhite = (r + c) % 2 === 0;
          const tile = new THREE.Mesh(
            new THREE.BoxGeometry(0.48, 0.48, 0.2),
            mat(isWhite ? 0xffffff : 0x1a1a2e, 105)
          );
          tile.position.set(-0.22 + c * 0.46, 0.65 - r * 0.46, (c % 2) * 0.08);
          g.add(tile);
        }
      }
      g.add(pole, knob);
    },
    0.16,
    -0.22,
    0.08,
    1.05
  );

  // 9. CLOCK / TIMER (Stopwatch Balap 3D)
  ICONS.clock = renderGroup(
    (g) => {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.02, 0.38, 32), mat(0xffffff, 115));
      body.rotation.x = Math.PI / 2;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.16, 16, 32), mat(0xff7043, 125));
      const topBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.34, 18), mat(0xffb300, 130));
      topBtn.position.y = 1.24;
      const h1 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.6, 0.16), mat(0x241454, 100));
      h1.position.set(0, 0.22, 0.24);
      const h2 = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.16, 0.16), mat(0xe53935, 100));
      h2.position.set(0.2, 0, 0.24);
      g.add(body, rim, topBtn, h1, h2);
    },
    0.18,
    -0.24,
    0,
    1.05
  );

  // 10. USERS / PLAYERS (2 Karakter Mini 3D)
  ICONS.users = renderGroup(
    (g) => {
      const makePawn = (col, x, z, sc) => {
        const p = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.48, 0.9, 20), mat(col, 110));
        body.position.y = -0.3;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 22, 18), mat(0xffe0bd, 95));
        head.position.y = 0.45;
        const cap = new THREE.Mesh(
          new THREE.SphereGeometry(0.44, 22, 14, 0, Math.PI * 2, 0, 1.35),
          mat(col, 120)
        );
        cap.position.y = 0.5;
        p.add(body, head, cap);
        p.position.set(x, 0, z);
        p.scale.setScalar(sc);
        return p;
      };
      g.add(makePawn(0xe5484d, -0.45, 0.22, 1.0), makePawn(0x2f7de1, 0.48, -0.18, 0.9));
    },
    0.16,
    -0.2,
    0,
    1.05
  );

  // 11. SOUND ON & SOUND OFF (Speaker 3D)
  ICONS.soundOn = renderGroup(
    (g) => {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.72, 0.55), mat(0xffffff, 115));
      box.position.x = -0.48;
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.32, 0.92, 24), mat(0xffca28, 130));
      cone.rotation.z = Math.PI / 2;
      cone.position.x = 0.05;
      const w1 = new THREE.Mesh(
        new THREE.TorusGeometry(0.62, 0.11, 14, 28, Math.PI * 0.75),
        mat(0x5ee08f, 130)
      );
      w1.rotation.z = -Math.PI * 0.375;
      w1.position.x = 0.38;
      g.add(box, cone, w1);
    },
    0.18,
    -0.24,
    0,
    1.05
  );

  ICONS.soundOff = renderGroup(
    (g) => {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.72, 0.55), mat(0xb0bec5, 85));
      box.position.x = -0.48;
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.32, 0.92, 24), mat(0x90a4ae, 85));
      cone.rotation.z = Math.PI / 2;
      cone.position.x = 0.05;
      const c1 = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.24, 0.24), mat(0xe53935, 120));
      c1.rotation.z = Math.PI / 4;
      c1.position.set(0.62, 0, 0.32);
      const c2 = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.24, 0.24), mat(0xe53935, 120));
      c2.rotation.z = -Math.PI / 4;
      c2.position.set(0.62, 0, 0.32);
      g.add(box, cone, c1, c2);
    },
    0.18,
    -0.24,
    0,
    1.05
  );

  // 12. CHECK & CROSS (Lencana 3D Centang Hijau & Silang Merah)
  ICONS.check = renderGroup(
    (g) => {
      const bg = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.12, 0.34, 32), mat(0x2bb673, 115));
      bg.rotation.x = Math.PI / 2;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.1, 14, 32), mat(0x69f0ae, 130));
      rim.position.z = 0.08;
      const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.7, 0.32), mat(0xffffff, 140));
      p1.rotation.z = 0.75;
      p1.position.set(-0.28, -0.1, 0.22);
      const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.22, 0.32), mat(0xffffff, 140));
      p2.rotation.z = -0.68;
      p2.position.set(0.24, 0.06, 0.22);
      g.add(bg, rim, p1, p2);
    },
    0.16,
    -0.2,
    0,
    1.05
  );

  ICONS.cross = renderGroup(
    (g) => {
      const bg = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.12, 0.34, 32), mat(0xe5484d, 115));
      bg.rotation.x = Math.PI / 2;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.1, 14, 32), mat(0xff8a80, 130));
      rim.position.z = 0.08;
      const p1 = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.32, 0.32), mat(0xffffff, 140));
      p1.rotation.z = Math.PI / 4;
      p1.position.z = 0.22;
      const p2 = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.32, 0.32), mat(0xffffff, 140));
      p2.rotation.z = -Math.PI / 4;
      p2.position.z = 0.22;
      g.add(bg, rim, p1, p2);
    },
    0.16,
    -0.2,
    0,
    1.05
  );

  // 13. MENU, BACK & FIRE
  ICONS.menu = renderGroup(
    (g) => {
      [-0.58, 0, 0.58].forEach((y, i) => {
        const bar = new THREE.Mesh(
          new THREE.BoxGeometry(1.85, 0.38, 0.38),
          mat(i === 1 ? 0xffd54f : 0xffffff, 130)
        );
        bar.position.y = y;
        g.add(bar);
      });
    },
    0.16,
    -0.2,
    0,
    1.06
  );

  ICONS.back = renderGroup(
    (g) => {
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.46, 0.38), mat(0xffffff, 125));
      shaft.position.x = 0.28;
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.72, 0.96, 3), mat(0xffd54f, 135));
      head.rotation.z = Math.PI / 2;
      head.position.x = -0.48;
      g.add(shaft, head);
    },
    0.16,
    -0.2,
    0,
    1.06
  );

  ICONS.fire = renderGroup(
    (g) => {
      const outer = new THREE.Mesh(new THREE.ConeGeometry(0.82, 1.75, 20), mat(0xff5722, 125, 0x551100));
      outer.position.y = 0.12;
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.18, 18), mat(0xffea00, 140, 0x665500));
      inner.position.set(0, -0.05, 0.28);
      const base = new THREE.Mesh(new THREE.SphereGeometry(0.74, 20, 18), mat(0xff7043, 115));
      base.position.y = -0.36;
      g.add(outer, inner, base);
    },
    0.14,
    -0.2,
    0.1,
    1.05
  );

  renderer.dispose();
}

/**
 * Helper pembuat tag gambar ikon 3D
 */
function gi(name, px = 28, cls = 'gi') {
  const src = ICONS[name] || '';
  if (!src) return '';
  return `<img class="${cls}" src="${src}" width="${px}" height="${px}" alt="" draggable="false">`;
}

init3DIcons();
