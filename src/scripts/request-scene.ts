/**
 * "The Request" — the scroll-driven scene behind the homepage.
 *
 * One pulse travels up a four-layer stack (data → service → api → interface)
 * while the ground fades from dark to light. Scroll position is the only
 * driver; everything here is progressive enhancement over plain HTML.
 */
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

const H = 70; // vertical distance between layers
const S = 60; // half-size of the pulse path on a layer
const SLAB = 68; // half-size of a layer slab
const SAMPLES = 160; // trail samples per layer
const PATH: [number, number][] = [[-S, -S], [-S, 20], [10, 20], [10, -30], [S, -30], [S, S]];

const DARK = { bg: '#0b0b0a', fg: '#eceae4', dim: '#a9a69e', accent: '#5cf08a' };
const LIGHT = { bg: '#f2f0ea', fg: '#111110', dim: '#55524b', accent: '#0b7a3b' };

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Position of the pulse for q in [0, 5]: four layers plus the exit. */
function pulseAt(q: number, out: THREE.Vector3): THREE.Vector3 {
  const k = Math.min(4, Math.floor(q));
  const f = clamp(q - k);
  if (k === 4) return out.set(-S, 4 * H + 10 + f * 3 * H, -S);
  const sign = k % 2 === 0 ? 1 : -1;
  const y = k * H + 10;
  if (f >= 0.8) return out.set(sign * S, y + ((f - 0.8) / 0.2) * H, sign * S);
  const lengths: number[] = [];
  let total = 0;
  for (let i = 1; i < PATH.length; i++) {
    const l = Math.abs(PATH[i][0] - PATH[i - 1][0]) + Math.abs(PATH[i][1] - PATH[i - 1][1]);
    lengths.push(l);
    total += l;
  }
  let d = (f / 0.8) * total;
  for (let i = 0; i < lengths.length; i++) {
    if (d <= lengths[i] || i === lengths.length - 1) {
      const t = clamp(d / lengths[i]);
      return out.set(
        sign * lerp(PATH[i][0], PATH[i + 1][0], t),
        y,
        sign * lerp(PATH[i][1], PATH[i + 1][1], t),
      );
    }
    d -= lengths[i];
  }
  return out;
}

function pushBox(a: number[], cx: number, y0: number, cz: number, sx: number, sy: number, sz: number) {
  const x0 = cx - sx / 2, x1 = cx + sx / 2, z0 = cz - sz / 2, z1 = cz + sz / 2, y1 = y0 + sy;
  const c = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  for (let i = 0; i < 4; i++) {
    const [ax, az] = c[i];
    const [bx, bz] = c[(i + 1) % 4];
    a.push(ax, y0, az, bx, y0, bz, ax, y1, az, bx, y1, bz, ax, y0, az, ax, y1, az);
  }
}

function pushCylinder(a: number[], r: number, h: number) {
  const n = 28;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
    const x0 = Math.cos(a0) * r, z0 = Math.sin(a0) * r, x1 = Math.cos(a1) * r, z1 = Math.sin(a1) * r;
    a.push(x0, 0, z0, x1, 0, z1, x0, h, z0, x1, h, z1);
    if (i % 7 === 0) a.push(x0, 0, z0, x0, h, z0);
  }
}

function pushRing(a: number[], r: number) {
  const n = 32;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
    a.push(0, Math.cos(a0) * r, Math.sin(a0) * r, 0, Math.cos(a1) * r, Math.sin(a1) * r);
  }
}

function segments(positions: number[], material: THREE.LineBasicMaterial) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return new THREE.LineSegments(g, material);
}

interface Prop {
  obj: THREE.Object3D;
  mat: THREE.LineBasicMaterial;
  layer: number;
  trigger: number;
  rise: boolean;
  spin: boolean;
  a: number;
}

interface Screen {
  group: THREE.Group;
  outline: THREE.LineBasicMaterial;
  fill: THREE.MeshBasicMaterial;
  trigger: number;
  a: number;
  s: number;
}

export function initRequestScene(root: HTMLElement, canvas: HTMLCanvasElement) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const frames = Array.from(root.querySelectorAll<HTMLElement>('[data-frame]'));
  const degEl = root.querySelector<HTMLElement>('[data-hud="deg"]');
  const frameEl = root.querySelector<HTMLElement>('[data-hud="frame"]');
  const depthEl = root.querySelector<HTMLElement>('[data-hud="depth"]');
  const dotEl = root.querySelector<HTMLElement>('[data-hud="dot"]');
  const DEPTHS = ['overview', 'depth −3 · data', 'depth −2 · service', 'depth −1 · api', 'depth 0 · surface', 'response'];

  /** Story coordinate: frame index plus progress through it, read at mid-viewport. */
  const story = () => {
    const probe = window.innerHeight * 0.5;
    let s = 0;
    for (let i = 0; i < frames.length; i++) {
      const r = frames[i].getBoundingClientRect();
      if (probe >= r.top) s = i + clamp((probe - r.top) / Math.max(1, r.height));
    }
    // The hero starts at rest: its progress runs from page top, not mid-viewport.
    if (s < 1) s = clamp(window.scrollY / Math.max(1, frames[0].offsetHeight - probe));
    return s;
  };

  // ── Ground + text colours (works without WebGL too) ────────────
  const cBg = new THREE.Color(), cFg = new THREE.Color(), cAccent = new THREE.Color();
  const tmpA = new THREE.Color(), tmpB = new THREE.Color();
  let lastLight: boolean | null = null;
  const paint = (t: number) => {
    cBg.copy(tmpA.set(DARK.bg)).lerp(tmpB.set(LIGHT.bg), t);
    cFg.copy(tmpA.set(DARK.fg)).lerp(tmpB.set(LIGHT.fg), t);
    cAccent.copy(tmpA.set(DARK.accent)).lerp(tmpB.set(LIGHT.accent), t);
    root.style.setProperty('--bg', `#${cBg.getHexString()}`);
    const light = t > 0.5;
    if (light !== lastLight) {
      lastLight = light;
      const p = light ? LIGHT : DARK;
      root.style.setProperty('--fg', p.fg);
      root.style.setProperty('--dim', p.dim);
      root.style.setProperty('--accent', p.accent);
      root.dataset.ground = light ? 'light' : 'dark';
    }
  };

  const hud = (s: number, deg: number) => {
    const i = Math.min(frames.length - 1, Math.floor(s));
    if (degEl) degEl.textContent = `${String(Math.round(deg) % 360).padStart(3, '0')}°`;
    if (frameEl) frameEl.textContent = `the request · frame ${i + 1} of ${frames.length}`;
    if (depthEl) depthEl.textContent = DEPTHS[i] ?? '';
    if (dotEl) dotEl.style.top = `${clamp(s / frames.length) * 100}%`;
    root.style.setProperty('--hero', String(clamp(s)));
  };

  // ── Renderer ───────────────────────────────────────────────────
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch {
    root.classList.add('no-gl');
    const flat = () => {
      const s = story();
      paint(smooth(2.7, 3.12, s - 1));
      hud(s, 40 * (s + 1));
    };
    window.addEventListener('scroll', flat, { passive: true });
    flat();
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 1, 4000);

  // ── Stack ──────────────────────────────────────────────────────
  const layerMats: THREE.LineBasicMaterial[] = [];
  const gridMats: THREE.LineBasicMaterial[] = [];
  const layerLines: THREE.LineSegments[] = [];
  const props: Prop[] = [];
  const screens: Screen[] = [];
  const lineMat = () => new THREE.LineBasicMaterial({ transparent: true, depthWrite: false });

  for (let k = 0; k < 4; k++) {
    const y = k * H;
    const slab: number[] = [];
    pushBox(slab, 0, y - 4, 0, SLAB * 2, 4, SLAB * 2);
    const m = lineMat();
    layerMats.push(m);
    const slabLines = segments(slab, m);
    layerLines.push(slabLines);
    scene.add(slabLines);

    const grid: number[] = [];
    for (let g = -40; g <= 40; g += 20) grid.push(g, y, -SLAB, g, y, SLAB, -SLAB, y, g, SLAB, y, g);
    const gm = lineMat();
    gridMats.push(gm);
    const gridLines = segments(grid, gm);
    layerLines.push(gridLines);
    scene.add(gridLines);
  }

  const addProp = (positions: number[], layer: number, x: number, yOff: number, z: number, trigger: number, rise: boolean, spin = false, rotY = 0) => {
    const mat = lineMat();
    const obj = segments(positions, mat);
    obj.position.set(x, layer * H + yOff, z);
    obj.rotation.y = rotY;
    scene.add(obj);
    props.push({ obj, mat, layer, trigger: layer + trigger, rise, spin, a: 0 });
  };

  // Data: storage cylinders rise as the pulse passes.
  ([[-30, -30, 14], [-25, 50, 18], [40, -5, 10], [35, 45, 22]] as const).forEach(([x, z, h], i) => {
    const p: number[] = [];
    pushCylinder(p, 9, h);
    addProp(p, 0, x, 0, z, 0.12 + i * 0.18, true);
  });
  // Service: boxes extrude.
  ([[30, 25, 28], [-35, -40, 18], [22, -48, 40], [-40, 5, 12], [42, 52, 22]] as const).forEach(([x, z, h], i) => {
    const p: number[] = [];
    pushBox(p, 0, 0, 0, 18, h, 18);
    addProp(p, 1, x, 0, z, 0.1 + i * 0.15, true);
  });
  // API: gate rings sit on the path; they turn and flash when crossed.
  ([[-S, -20, 0.12, Math.PI / 2], [-25, 20, 0.3, 0], [10, -5, 0.44, Math.PI / 2], [35, -30, 0.56, 0], [S, 20, 0.72, Math.PI / 2]] as const).forEach(([x, z, trig, rot]) => {
    const p: number[] = [];
    pushRing(p, 9);
    addProp(p, 2, x, 10, z, trig, false, true, rot);
  });
  // Interface: screens go from wireframe to solid, then show the real sites.
  const W = 46, HT = 29;
  const screenGeo = new THREE.PlaneGeometry(W, HT);
  const textures = (root.dataset.shots ?? '').split('|').filter(Boolean);
  ([[28, -34, 0.2], [-18, 4, 0.42], [30, 44, 0.64]] as const).forEach(([x, z, trig], i) => {
    const group = new THREE.Group();
    group.position.set(x, 3 * H + HT / 2 + 3, z);
    const outline = lineMat();
    const o: number[] = [];
    const w = W / 2, h = HT / 2;
    o.push(-w, -h, 0, w, -h, 0, w, -h, 0, w, h, 0, w, h, 0, -w, h, 0, -w, h, 0, -w, -h, 0, -w, -h, 0, -w, -h - 3, 0, w, -h, 0, w, -h - 3, 0);
    group.add(segments(o, outline));
    const fill = new THREE.MeshBasicMaterial({ color: LIGHT.fg, transparent: true, opacity: 0, side: THREE.DoubleSide });
    group.add(new THREE.Mesh(screenGeo, fill));
    scene.add(group);
    screens.push({ group, outline, fill, trigger: 3 + trig, a: 0, s: 1 });
    if (textures[i]) {
      new THREE.TextureLoader().load(textures[i], (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        // Show the top of each screenshot at the screen's 16:10 ratio.
        const img = tex.image as { width: number; height: number };
        const crop = clamp((img.width * (HT / W)) / img.height, 0.05, 1);
        tex.repeat.set(1, crop);
        tex.offset.set(0, 1 - crop);
        fill.map = tex;
        fill.color.set('#ffffff');
        fill.needsUpdate = true;
      });
    }
  });

  // ── Pulse + trail ──────────────────────────────────────────────
  const v = new THREE.Vector3();
  const trailPts: number[] = [];
  const TOTAL = 5 * SAMPLES;
  for (let i = 0; i <= TOTAL; i++) {
    pulseAt((i / TOTAL) * 5, v);
    trailPts.push(v.x, v.y, v.z);
  }
  const trailGeo = new LineGeometry();
  trailGeo.setPositions(trailPts);
  const trailMat = new LineMaterial({ color: 0xffffff, linewidth: 2.5, transparent: true, depthTest: false });
  const trail = new Line2(trailGeo, trailMat);
  trail.frustumCulled = false;
  scene.add(trail);

  const headMat = new THREE.MeshBasicMaterial({ depthTest: false });
  const head = new THREE.Mesh(new THREE.SphereGeometry(2, 20, 20), headMat);
  scene.add(head);

  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = glowCanvas.height = 128;
  const gctx = glowCanvas.getContext('2d')!;
  const grad = gctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  gctx.fillStyle = grad;
  gctx.fillRect(0, 0, 128, 128);
  const glowMat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(glowCanvas), blending: THREE.AdditiveBlending, depthTest: false, transparent: true });
  const glow = new THREE.Sprite(glowMat);
  glow.scale.setScalar(34);
  scene.add(glow);

  // ── Interaction state ──────────────────────────────────────────
  let width = 1, height = 1, wide = true;
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  let hovered = -1;
  if (!reduce) {
    window.addEventListener('pointermove', (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
  }
  root.querySelectorAll<HTMLElement>('[data-project]').forEach((el) => {
    const i = Number(el.dataset.project);
    const on = () => { hovered = i; };
    const off = () => { if (hovered === i) hovered = -1; };
    el.addEventListener('pointerenter', on);
    el.addEventListener('pointerleave', off);
    el.addEventListener('focusin', on);
    el.addEventListener('focusout', off);
  });

  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    wide = width >= 900;
    renderer.setSize(width, height, false);
    trailMat.resolution.set(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);
  resize();

  // ── Frame loop ─────────────────────────────────────────────────
  const pulse = new THREE.Vector3();
  const pulseSmooth = new THREE.Vector3();
  const target = new THREE.Vector3();
  const cLine = new THREE.Color();
  let qc = story() - 1;
  let reveal = reduce ? 1 : 0;
  let running = true;
  let first = true;
  const start = performance.now();

  const frame = (now: number) => {
    if (!running) return;
    requestAnimationFrame(frame);
    const time = (now - start) / 1000;
    const s = story();
    const lc = s - 1; // −1 hero … 4 interface done … 5 end
    qc = first || reduce ? lc : lerp(qc, lc, 0.085);
    pointer.sx = lerp(pointer.sx, pointer.x, 0.06);
    pointer.sy = lerp(pointer.sy, pointer.y, 0.06);

    const t = smooth(2.7, 3.12, qc);
    paint(t);
    cLine.copy(cFg);
    renderer.setClearColor(cBg, 1);

    const q = clamp(qc, 0, 5);
    const b = smooth(-0.9, 0.1, qc); // dive from overview into the stack
    const e = smooth(4.0, 4.6, qc); // pull back at the end
    const heroMix = clamp(-qc);

    // Draw the stack in on load.
    if (reveal < 1) reveal = Math.min(1, reveal + 0.012);
    layerLines.forEach((l, i) => {
      const count = l.geometry.getAttribute('position').count;
      const r = clamp(reveal * 1.6 - (i / layerLines.length) * 0.6);
      l.geometry.setDrawRange(0, Math.floor((count * r) / 2) * 2);
    });

    const layerOpacity = (k: number) => {
      const prox = clamp(1 - Math.abs(q - (k + 0.4)) / 1.3);
      return lerp(lerp(0.12 + 0.88 * prox, 0.8, heroMix), 0.65, e);
    };
    for (let k = 0; k < 4; k++) {
      const o = layerOpacity(k);
      layerMats[k].color.copy(cLine);
      layerMats[k].opacity = o;
      gridMats[k].color.copy(cLine);
      gridMats[k].opacity = o * 0.28;
    }

    for (const p of props) {
      const on = q >= p.trigger ? 1 : 0;
      p.a = first || reduce ? on : lerp(p.a, on, 0.1);
      const flash = clamp(1 - Math.abs(q - p.trigger) * 5);
      p.mat.color.copy(cLine).lerp(cAccent, Math.max(flash, p.spin ? p.a * 0.85 : 0));
      p.mat.opacity = layerOpacity(p.layer) * (p.rise ? 0.25 + 0.75 * p.a : 0.55 + 0.45 * p.a) * reveal;
      if (p.rise) p.obj.scale.y = 0.04 + 0.96 * p.a;
      if (p.spin) p.obj.rotation.x = p.a * Math.PI * 0.5;
    }

    screens.forEach((sc, i) => {
      const on = q >= sc.trigger ? 1 : 0;
      sc.a = first || reduce ? on : lerp(sc.a, on, 0.07);
      const focus = hovered === -1 ? 1 : hovered === i ? 1 : 0.3;
      const o = layerOpacity(3) * reveal;
      sc.outline.color.copy(cLine);
      sc.outline.opacity = o * focus;
      sc.fill.opacity = sc.a * focus * clamp(o * 1.4);
      sc.s = lerp(sc.s, hovered === i ? 1.22 : 1, 0.1);
      sc.group.scale.setScalar(sc.s);
      sc.group.rotation.y = Math.atan2(camera.position.x - sc.group.position.x, camera.position.z - sc.group.position.z);
    });

    // Pulse, trail and glow.
    pulseAt(q, pulse);
    if (first) pulseSmooth.copy(pulse);
    else pulseSmooth.lerp(pulse, 0.2);
    head.position.copy(pulse);
    glow.position.copy(pulse);
    const beat = reduce ? 1 : 1 + Math.sin(time * 4) * 0.18;
    head.scale.setScalar(beat * lerp(1, 1.25, t));
    headMat.color.copy(cAccent);
    glowMat.color.copy(cAccent);
    glowMat.opacity = (1 - t) * 0.9 * reveal;
    glow.scale.setScalar(34 * beat);
    trailMat.color.copy(cAccent);
    trailMat.opacity = reveal;
    trailGeo.instanceCount = Math.max(1, Math.floor((q / 5) * TOTAL));

    // Camera: 40° of orbit per frame of the story.
    const narrow = Math.max(1, 1.1 / camera.aspect);
    let focusY = lerp(1.5 * H, pulseSmooth.y, b);
    focusY = lerp(focusY, 1.5 * H + 30, e);
    const r = lerp(lerp(580, 275, b), 560, e) * narrow;
    // Keep the scene right of the copy on wide screens, above it on narrow ones.
    if (wide) camera.setViewOffset(width, height, -width * lerp(lerp(0.14, 0.2, b), 0.27, e), 0, width, height);
    else camera.setViewOffset(width, height, 0, height * 0.16, width, height);
    // On narrow screens the copy sits over the scene once it gets busy, so quieten it.
    canvas.style.opacity = wide ? '1' : String(lerp(1, 0.3, smooth(2.9, 3.3, qc)));
    const drift = reduce ? 0 : Math.sin(time * 0.25) * 0.07 * (1 - b);
    const theta = 0.698 * (qc + 2) + drift + pointer.sx * 0.1;
    const follow = b * (1 - e) * 0.35;
    target.set(pulseSmooth.x * follow, focusY, pulseSmooth.z * follow);
    camera.position.set(
      target.x + Math.sin(theta) * r,
      focusY + lerp(lerp(170, 95, b), 230, e) * narrow - pointer.sy * 14,
      target.z + Math.cos(theta) * r,
    );
    camera.lookAt(target);

    hud(s, 40 * (qc + 2));
    renderer.render(scene, camera);
    first = false;
  };

  document.addEventListener('visibilitychange', () => {
    const was = running;
    running = !document.hidden;
    if (running && !was) requestAnimationFrame(frame);
  });
  requestAnimationFrame(frame);
}
