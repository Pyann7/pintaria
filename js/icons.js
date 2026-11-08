/**
 * Pintaria 3D - Procedural 3D Game Icon Generator (Sand3D-style 3D-as-Code Assembly)
 * Merender ikon 3D asli menggunakan Three.js (pencahayaan studio 3 titik + material glossy 3D)
 * untuk seluruh tombol menu, HUD, dan podium tanpa menggunakan emoji teks.
 */

const ICONS = {};

function init3DIcons() {
  if (typeof THREE === 'undefined') return;

  const size = 128;
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
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
  camera.position.set(0, 0.4, 4.2);
  camera.lookAt(0, 0, 0);

  // Studio 3-Point Lighting untuk efek 3D Game Profesional
  const amb = new THREE.AmbientLight(0xffffff, 0.65);
  const keyLight = new THREE.DirectionalLight(0xffffff, 0.95);
  keyLight.position.set(3, 5, 4);
  const rimLight = new THREE.DirectionalLight(0x90caf9, 0.55);
  rimLight.position.set(-4, -2, 2);
  scene.add(amb, keyLight, rimLight);

  const mat = (color, shininess = 90, emissive = 0x000000) =>
    new THREE.MeshPhongMaterial({
      color,
      shininess,
      specular: 0x666666,
      emissive
    });

  function renderGroup(buildFn, rx = 0.22, ry = -0.28, rz = 0) {
    const group = new THREE.Group();
    buildFn(group);
    group.rotation.set(rx, ry, rz);
    scene.add(group);
    renderer.render(scene, camera);
    const url = canvas.toDataURL('image/png');
    scene.remove(group);
    return url;
  }

  // 1. PLAY (Segitiga Prisma 3D di atas Schild Bulat)
  ICONS.play = renderGroup((g) => {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.35, 32), mat(0x1b8a4b));
    base.rotation.x = Math.PI / 2;
    base.position.z = -0.15;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.12, 16, 32), mat(0x5ee08f));
    rim.position.z = -0.05;
    const tri = new THREE.Mesh(new THREE.ConeGeometry(0.68, 1.15, 3), mat(0xffffff, 120));
    tri.rotation.z = -Math.PI / 2;
    tri.rotation.y = Math.PI / 6;
    tri.position.set(0.08, 0, 0.15);
    g.add(base, rim, tri);
  }, 0.18, -0.25, 0);

  // 2. ROOM / GLOBE (Bola Dunia 3D dengan Cincin Orbit)
  ICONS.globe = renderGroup((g) => {
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.95, 28, 24), mat(0x2979ff, 100));
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.22, 0.09, 14, 36), mat(0xffd54f, 120));
    ring1.rotation.x = 1.1;
    ring1.rotation.y = 0.35;
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.06, 12, 32), mat(0x80d8ff, 100));
    ring2.rotation.y = Math.PI / 2;
    g.add(sphere, ring1, ring2);
  }, 0.25, -0.3, 0);

  // 3. TICKET / JOIN (Tiket Emas 3D dengan Bintang)
  ICONS.ticket = renderGroup((g) => {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.15, 0.32), mat(0xffb300, 100));
    const inner = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.82, 0.36), mat(0xffca28, 110));
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), mat(0xffffff, 130));
    star.position.z = 0.2;
    g.add(body, inner, star);
  }, 0.2, -0.28, 0.12);

  // 4. MAGIC / AI (Tongkat Kristal Bintang 3D)
  ICONS.ai = renderGroup((g) => {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 1.7, 16), mat(0x4a148c, 90));
    stick.rotation.z = -Math.PI / 4;
    stick.position.set(-0.25, -0.25, 0);
    const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.58, 0), mat(0xffd54f, 140, 0x332200));
    tip.position.set(0.35, 0.35, 0.15);
    const s1 = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), mat(0xe040fb, 130));
    s1.position.set(-0.55, 0.65, 0.2);
    const s2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), mat(0x00e5ff, 130));
    s2.position.set(0.75, -0.35, 0.2);
    g.add(stick, tip, s1, s2);
  }, 0.15, -0.2, 0);

  // 5. ROCKET (Roket 3D Peluncur)
  ICONS.rocket = renderGroup((g) => {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.35, 24), mat(0xf5f7fa, 110));
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.65, 24), mat(0xe53935, 100));
    nose.position.y = 1.0;
    const win = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), mat(0x29b6f6, 130));
    win.position.set(0, 0.15, 0.35);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.65, 16), mat(0xff9100, 120, 0x552200));
    flame.rotation.x = Math.PI;
    flame.position.y = -0.95;
    [-0.45, 0.45].forEach((x) => {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.55, 0.12), mat(0xe53935, 90));
      fin.position.set(x, -0.45, 0);
      g.add(fin);
    });
    g.add(body, nose, win, flame);
  }, 0.15, -0.25, -0.45);

  // 6. CROWN (Mahkota Juara 3D Emas)
  ICONS.crown = renderGroup((g) => {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.82, 0.55, 24), mat(0xffb300, 125));
    base.position.y = -0.25;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.1, 14, 28), mat(0xffea00, 140));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.5;
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.75, 12), mat(0xffca28, 125));
      spike.position.set(Math.sin(ang) * 0.78, 0.32, Math.cos(ang) * 0.78);
      const gem = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 14), mat(i % 2 ? 0xe53935 : 0x00e676, 140));
      gem.position.set(Math.sin(ang) * 0.78, 0.72, Math.cos(ang) * 0.78);
      g.add(spike, gem);
    }
    g.add(base, ring);
  }, 0.28, -0.3, 0);

  // 7. MEDALS (Medali 3D Emas, Perak, Perunggu)
  const makeMedal = (col, rimCol) =>
    renderGroup((g) => {
      const rib1 = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.9, 0.12), mat(0xe53935, 70));
      rib1.position.set(-0.22, 0.55, -0.15);
      rib1.rotation.z = 0.22;
      const rib2 = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.9, 0.12), mat(0xb71c1c, 70));
      rib2.position.set(0.22, 0.55, -0.15);
      rib2.rotation.z = -0.22;
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.24, 28), mat(col, 130));
      disc.rotation.x = Math.PI / 2;
      disc.position.y = -0.22;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.09, 14, 28), mat(rimCol, 140));
      ring.position.set(0, -0.22, 0.08);
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), mat(0xffffff, 140));
      star.position.set(0, -0.22, 0.18);
      g.add(rib1, rib2, disc, ring, star);
    }, 0.18, -0.25, 0);

  ICONS.medal1 = makeMedal(0xffb300, 0xffe57f);
  ICONS.medal2 = makeMedal(0xb0bec5, 0xeceff1);
  ICONS.medal3 = makeMedal(0xd87a42, 0xffab76);

  // 8. FLAG (Bendera Garis Finis 3D)
  ICONS.flag = renderGroup((g) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.2, 14), mat(0xcfd8dc, 120));
    pole.position.x = -0.65;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 14), mat(0xffb300, 130));
    knob.position.set(-0.65, 1.15, 0);
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        const isWhite = (r + c) % 2 === 0;
        const tile = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.16), mat(isWhite ? 0xffffff : 0x212121, 95));
        tile.position.set(-0.2 + c * 0.44, 0.65 - r * 0.44, (c % 2) * 0.06);
        g.add(tile);
      }
    }
    g.add(pole, knob);
  }, 0.18, -0.22, 0.08);

  // 9. CLOCK / TIMER (Stopwatch 3D)
  ICONS.clock = renderGroup((g) => {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.35, 32), mat(0xffffff, 100));
    body.rotation.x = Math.PI / 2;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.14, 16, 32), mat(0xff7043, 115));
    const topBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.3, 16), mat(0xffb300, 120));
    topBtn.position.y = 1.15;
    const h1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.12), mat(0x2a1a5e, 90));
    h1.position.set(0, 0.2, 0.22);
    const h2 = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.14, 0.12), mat(0xe53935, 90));
    h2.position.set(0.18, 0, 0.22);
    g.add(body, rim, topBtn, h1, h2);
  }, 0.2, -0.25, 0);

  // 10. USERS / PLAYERS (Avatar Pion 3D)
  ICONS.users = renderGroup((g) => {
    const makePawn = (col, x, z, sc) => {
      const p = new THREE.Group();
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.0, 20), mat(col, 105));
      body.position.y = -0.35;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 18), mat(col, 115));
      head.position.y = 0.45;
      p.add(body, head);
      p.position.set(x, 0, z);
      p.scale.setScalar(sc);
      return p;
    };
    g.add(makePawn(0x2979ff, -0.38, 0.18, 0.95), makePawn(0xff5fa2, 0.45, -0.2, 0.85));
  }, 0.18, -0.2, 0);

  // 11. SOUND ON & SOUND OFF (Speaker 3D)
  ICONS.soundOn = renderGroup((g) => {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.65, 0.5), mat(0xffffff, 110));
    box.position.x = -0.45;
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.28, 0.85, 24), mat(0xffd54f, 120));
    cone.rotation.z = Math.PI / 2;
    cone.position.x = 0.05;
    const w1 = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.09, 12, 24, Math.PI * 0.75), mat(0xffffff, 120));
    w1.rotation.z = -Math.PI * 0.375;
    w1.position.x = 0.35;
    g.add(box, cone, w1);
  }, 0.18, -0.25, 0);

  ICONS.soundOff = renderGroup((g) => {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.65, 0.5), mat(0xb0bec5, 80));
    box.position.x = -0.45;
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.28, 0.85, 24), mat(0x90a4ae, 80));
    cone.rotation.z = Math.PI / 2;
    cone.position.x = 0.05;
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.2, 0.2), mat(0xe53935, 110));
    c1.rotation.z = Math.PI / 4;
    c1.position.set(0.6, 0, 0.3);
    const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.2, 0.2), mat(0xe53935, 110));
    c2.rotation.z = -Math.PI / 4;
    c2.position.set(0.6, 0, 0.3);
    g.add(box, cone, c1, c2);
  }, 0.18, -0.25, 0);

  // 12. CHECK (Centang Hijau 3D) & CROSS (Silang Merah 3D)
  ICONS.check = renderGroup((g) => {
    const bg = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.3, 28), mat(0x2bb673, 105));
    bg.rotation.x = Math.PI / 2;
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.65, 0.28), mat(0xffffff, 130));
    p1.rotation.z = 0.75;
    p1.position.set(-0.28, -0.1, 0.2);
    const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.15, 0.28), mat(0xffffff, 130));
    p2.rotation.z = -0.68;
    p2.position.set(0.22, 0.06, 0.2);
    g.add(bg, p1, p2);
  }, 0.18, -0.22, 0);

  ICONS.cross = renderGroup((g) => {
    const bg = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.3, 28), mat(0xe5484d, 105));
    bg.rotation.x = Math.PI / 2;
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.28, 0.28), mat(0xffffff, 130));
    p1.rotation.z = Math.PI / 4;
    p1.position.z = 0.2;
    const p2 = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.28, 0.28), mat(0xffffff, 130));
    p2.rotation.z = -Math.PI / 4;
    p2.position.z = 0.2;
    g.add(bg, p1, p2);
  }, 0.18, -0.22, 0);

  // 13. MENU (3 Bar 3D) & BACK (Panah 3D) & FIRE (Bola Api Turbo 3D)
  ICONS.menu = renderGroup((g) => {
    [-0.55, 0, 0.55].forEach((y) => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.34, 0.34), mat(0xffffff, 120));
      bar.position.y = y;
      g.add(bar);
    });
  }, 0.18, -0.22, 0);

  ICONS.back = renderGroup((g) => {
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.42, 0.35), mat(0xffffff, 120));
    shaft.position.x = 0.25;
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.65, 0.9, 3), mat(0xffd54f, 125));
    head.rotation.z = Math.PI / 2;
    head.position.x = -0.5;
    g.add(shaft, head);
  }, 0.18, -0.2, 0);

  ICONS.fire = renderGroup((g) => {
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.65, 18), mat(0xff5722, 120, 0x441100));
    outer.position.y = 0.1;
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.1, 16), mat(0xffea00, 140, 0x554400));
    inner.position.set(0, -0.05, 0.25);
    const base = new THREE.Mesh(new THREE.SphereGeometry(0.68, 18, 16), mat(0xff7043, 110));
    base.position.y = -0.35;
    g.add(outer, inner, base);
  }, 0.15, -0.2, 0.1);

  renderer.dispose();
}

/**
 * Helper pembuat tag gambar ikon 3D
 */
function gi(name, px = 26) {
  const src = ICONS[name] || '';
  if (!src) return '';
  return `<img class="gi" src="${src}" width="${px}" height="${px}" alt="" draggable="false">`;
}

init3DIcons();
