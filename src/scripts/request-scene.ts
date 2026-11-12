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

function pushCircleY(a: number[], r: number, y: number) {
  const n = 28;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
    a.push(Math.cos(a0) * r, y, Math.sin(a0) * r, Math.cos(a1) * r, y, Math.sin(a1) * r);
  }
}

/** An L-shaped link along the slab between two points. */
function pushLink(a: number[], y: number, ax: number, az: number, bx: number, bz: number) {
  a.push(ax, y, az, ax, y, bz, ax, y, bz, bx, y, bz);
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
  /** Second-pass detail that fills in more slowly once the prop is active. */
  detail: THREE.LineBasicMaterial;
  d: number;
  /** Solid faces, on the layers high enough to have them. */
  solid: THREE.MeshLambertMaterial | null;
}

/** Extra linework on a layer that draws in as the pulse crosses it, and stays. */
interface LayerDetail {
  lines: THREE.LineSegments;
  mat: THREE.LineBasicMaterial;
  layer: number;
  from: number;
  to: number;
  strength: number;
}

interface Screen {
  group: THREE.Group;
  outline: THREE.LineBasicMaterial;
  fill: THREE.MeshBasicMaterial;
  inner: THREE.LineBasicMaterial;
  more: THREE.LineBasicMaterial;
  stand: THREE.MeshLambertMaterial;
  trigger: number;
  a: number;
  d: number;
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
  const layerDetails: LayerDetail[] = [];
  const lineMat = () => new THREE.LineBasicMaterial({ transparent: true, depthWrite: false, fog: false });
  // The stack turns from drawing into object on the way up: no faces on the data
  // layer, translucent ones on service, nearly solid on api, fully solid on interface.
  const SOLID = [0, 0.42, 0.8, 1];
  const SLAB_SOLID = [0, 0.22, 0.55, 0.94];
  const solidMat = () =>
    new THREE.MeshLambertMaterial({ transparent: true, opacity: 0, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const solidMesh = (geo: THREE.BufferGeometry, mat: THREE.Material) => {
    const m = new THREE.Mesh(geo, mat);
    m.renderOrder = -1;
    return m;
  };
  scene.add(new THREE.AmbientLight(0xffffff, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(0.5, 1, 0.35);
  scene.add(sun);
  const slabSolids: THREE.MeshLambertMaterial[] = [];
  const tiles: { mat: THREE.MeshLambertMaterial; layer: number }[] = [];
  const addLayerDetail = (positions: number[], layer: number, from: number, to: number, strength: number) => {
    const mat = lineMat();
    const lines = segments(positions, mat);
    scene.add(lines);
    layerDetails.push({ lines, mat, layer, from, to, strength });
  };

  for (let k = 0; k < 4; k++) {
    const y = k * H;
    const slab: number[] = [];
    pushBox(slab, 0, y - 4, 0, SLAB * 2, 4, SLAB * 2);
    const m = lineMat();
    layerMats.push(m);
    const slabLines = segments(slab, m);
    layerLines.push(slabLines);
    scene.add(slabLines);
    const slabSolid = solidMat();
    slabSolids.push(slabSolid);
    const slabMesh = solidMesh(new THREE.BoxGeometry(SLAB * 2, 4, SLAB * 2), slabSolid);
    slabMesh.position.y = y - 2;
    scene.add(slabMesh);

    const grid: number[] = [];
    for (let g = -40; g <= 40; g += 20) grid.push(g, y, -SLAB, g, y, SLAB, -SLAB, y, g, SLAB, y, g);
    const gm = lineMat();
    gridMats.push(gm);
    const gridLines = segments(grid, gm);
    layerLines.push(gridLines);
    scene.add(gridLines);

    // Detail accumulates as the request passes, and each layer up carries more of it.
    const fine: number[] = [];
    for (let g = -60; g <= 60; g += 10) {
      if (g % 20 !== 0 || Math.abs(g) > 40) fine.push(g, y, -SLAB, g, y, SLAB, -SLAB, y, g, SLAB, y, g);
    }
    if (k >= 2) for (let g = -55; g <= 55; g += 10) fine.push(g, y, -SLAB, g, y, SLAB, -SLAB, y, g, SLAB, y, g);
    addLayerDetail(fine, k, 0, 0.75, 0.2);

    const marks: number[] = [];
    if (k >= 1) {
      for (let gx = -40; gx <= 40; gx += 20) {
        for (let gz = -40; gz <= 40; gz += 20) marks.push(gx - 1.6, y + 0.1, gz, gx + 1.6, y + 0.1, gz, gx, y + 0.1, gz - 1.6, gx, y + 0.1, gz + 1.6);
      }
    }
    if (k >= 3) {
      for (let g = -65; g <= 65; g += 5) {
        const l = g % 10 === 0 ? 3.2 : 1.6;
        marks.push(g, y, SLAB, g, y, SLAB + l, g, y, -SLAB, g, y, -SLAB - l, SLAB, y, g, SLAB + l, y, g, -SLAB, y, g, -SLAB - l, y, g);
      }
    }
    if (marks.length) addLayerDetail(marks, k, 0.35, 1, 0.75);
  }

  // Links between the things on each layer.
  const DATA = [[-30, -30, 14], [-25, 50, 18], [40, -5, 10], [35, 45, 22]] as const;
  const SERVICES = [[30, 25, 28], [-35, -40, 18], [22, -48, 40], [-40, 5, 12], [42, 52, 22]] as const;
  const SCREENS = [[28, -34, 0.2], [-18, 4, 0.42], [30, 44, 0.64]] as const;
  const inset = (a: number[], y: number, r: number) => a.push(-r, y, -r, r, y, -r, r, y, -r, r, y, r, r, y, r, -r, y, r, -r, y, r, -r, y, -r);
  {
    const l0: number[] = [];
    ([[0, 1], [0, 2], [2, 3], [1, 3]] as const).forEach(([a, b]) => pushLink(l0, 0.15, DATA[a][0], DATA[a][1], DATA[b][0], DATA[b][1]));
    addLayerDetail(l0, 0, 0.3, 1, 0.45);
    const l1: number[] = [];
    ([[0, 4], [0, 2], [2, 1], [1, 3], [3, 0], [4, 3]] as const).forEach(([a, b]) => pushLink(l1, H + 0.15, SERVICES[a][0], SERVICES[a][1], SERVICES[b][0], SERVICES[b][1]));
    addLayerDetail(l1, 1, 0.2, 1, 0.5);
    const l2: number[] = [];
    inset(l2, 2 * H + 0.15, 50);
    inset(l2, 2 * H + 0.15, 30);
    l2.push(-50, 2 * H + 0.15, -50, -30, 2 * H + 0.15, -30, 50, 2 * H + 0.15, 50, 30, 2 * H + 0.15, 30, -50, 2 * H + 0.15, 50, -30, 2 * H + 0.15, 30, 50, 2 * H + 0.15, -50, 30, 2 * H + 0.15, -30);
    addLayerDetail(l2, 2, 0.15, 1, 0.5);
    const l3: number[] = [];
    inset(l3, 3 * H + 0.15, 50);
    l3.push(SCREENS[0][0], 3 * H + 0.15, SCREENS[0][1], SCREENS[0][0], 3 * H + 0.15, -SLAB, SCREENS[1][0], 3 * H + 0.15, SCREENS[1][1], -SLAB, 3 * H + 0.15, SCREENS[1][1], SCREENS[2][0], 3 * H + 0.15, SCREENS[2][1], SCREENS[2][0], 3 * H + 0.15, SLAB);
    pushLink(l3, 3 * H + 0.15, SCREENS[0][0], SCREENS[0][1], SCREENS[1][0], SCREENS[1][1]);
    pushLink(l3, 3 * H + 0.15, SCREENS[1][0], SCREENS[1][1], SCREENS[2][0], SCREENS[2][1]);
    addLayerDetail(l3, 3, 0.1, 1, 0.55);
  }

  const addProp = (positions: number[], extra: number[], layer: number, x: number, yOff: number, z: number, trigger: number, rise: boolean, spin = false, rotY = 0, solidGeo: THREE.BufferGeometry | null = null) => {
    const mat = lineMat();
    const obj = segments(positions, mat);
    obj.position.set(x, layer * H + yOff, z);
    obj.rotation.y = rotY;
    const detail = lineMat();
    obj.add(segments(extra, detail));
    let solid: THREE.MeshLambertMaterial | null = null;
    if (solidGeo && SOLID[layer] > 0) {
      solid = solidMat();
      obj.add(solidMesh(solidGeo, solid));
    }
    scene.add(obj);
    props.push({ obj, mat, layer, trigger: layer + trigger, rise, spin, a: 0, detail, d: 0, solid });
  };

  // Data: storage cylinders rise as the pulse passes.
  DATA.forEach(([x, z, h], i) => {
    const p: number[] = [];
    pushCylinder(p, 9, h);
    const d: number[] = [];
    pushCircleY(d, 9, h / 3);
    pushCircleY(d, 9, (2 * h) / 3);
    pushCircleY(d, 4.5, h);
    for (let j = 0; j < 4; j++) {
      const a = Math.PI / 4 + (j * Math.PI) / 2;
      d.push(Math.cos(a) * 9, 0, Math.sin(a) * 9, Math.cos(a) * 9, h, Math.sin(a) * 9);
    }
    addProp(p, d, 0, x, 0, z, 0.12 + i * 0.18, true);
  });
  // Service: boxes extrude.
  SERVICES.forEach(([x, z, h], i) => {
    const p: number[] = [];
    pushBox(p, 0, 0, 0, 18, h, 18);
    const d: number[] = [];
    for (let f = 6; f < h; f += 6) d.push(-9, f, -9, 9, f, -9, 9, f, -9, 9, f, 9, 9, f, 9, -9, f, 9, -9, f, 9, -9, f, -9);
    d.push(-9, h, -9, 9, h, 9, -9, h, 9, 9, h, -9);
    pushBox(d, 0, h, 0, 8, 3, 8);
    const body = new THREE.BoxGeometry(18, h, 18).translate(0, h / 2, 0);
    addProp(p, d, 1, x, 0, z, 0.1 + i * 0.15, true, false, 0, body);
  });
  // API: gate rings sit on the path; they turn and flash when crossed.
  ([[-S, -20, 0.12, Math.PI / 2], [-25, 20, 0.3, 0], [10, -5, 0.44, Math.PI / 2], [35, -30, 0.56, 0], [S, 20, 0.72, Math.PI / 2]] as const).forEach(([x, z, trig, rot]) => {
    const p: number[] = [];
    pushRing(p, 9);
    const d: number[] = [];
    pushRing(d, 6.5);
    pushRing(d, 3.5);
    for (let j = 0; j < 16; j++) {
      const a = (j / 16) * Math.PI * 2;
      const r1 = j % 4 === 0 ? 12.5 : 11;
      d.push(0, Math.cos(a) * 9, Math.sin(a) * 9, 0, Math.cos(a) * r1, Math.sin(a) * r1);
    }
    addProp(p, d, 2, x, 10, z, trig, false, true, rot, new THREE.TorusGeometry(9, 1.1, 12, 48).rotateY(Math.PI / 2));
  });
  // Upper layers also carry small solid components sitting on the grid.
  const addTiles = (layer: number, list: readonly (readonly [number, number, number, number, number])[]) => {
    const mat = solidMat();
    const edge = lineMat();
    const lines: number[] = [];
    for (const [x, z, sx, sz, h] of list) {
      const mesh = solidMesh(new THREE.BoxGeometry(sx, h, sz), mat);
      mesh.position.set(x, layer * H + h / 2, z);
      scene.add(mesh);
      pushBox(lines, x, layer * H, z, sx, h, sz);
    }
    scene.add(segments(lines, edge));
    tiles.push({ mat, layer });
    layerDetails.push({ lines: scene.children[scene.children.length - 1] as THREE.LineSegments, mat: edge, layer, from: 0.04, to: 0.36, strength: 0.8 });
  };
  addTiles(2, [[-45, 45, 16, 16, 3], [45, -52, 20, 10, 2], [-48, -48, 12, 12, 5], [48, 50, 12, 18, 2.5], [-10, -50, 18, 8, 2], [-48, 0, 8, 22, 3.5]]);
  addTiles(3, [[-48, -48, 26, 14, 2], [-52, -22, 14, 14, 4], [52, 0, 14, 30, 2], [-50, 40, 22, 22, 3], [-8, 52, 30, 10, 2], [0, -54, 22, 8, 5], [55, -52, 10, 10, 7], [-22, 30, 10, 10, 2], [52, 54, 14, 8, 3]]);

  // Interface: screens go from wireframe to solid, with an abstract page drawn on each.
  const W = 46, HT = 29;
  const screenGeo = new THREE.PlaneGeometry(W, HT);
  SCREENS.forEach(([x, z, trig], i) => {
    const group = new THREE.Group();
    group.position.set(x, 3 * H + HT / 2 + 3, z);
    const outline = lineMat();
    const o: number[] = [];
    const w = W / 2, h = HT / 2;
    o.push(-w, -h, 0, w, -h, 0, w, -h, 0, w, h, 0, w, h, 0, -w, h, 0, -w, h, 0, -w, -h, 0, -w, -h, 0, -w, -h - 3, 0, w, -h, 0, w, -h - 3, 0);
    group.add(segments(o, outline));
    const fill = new THREE.MeshBasicMaterial({ color: LIGHT.fg, transparent: true, opacity: 0, side: THREE.DoubleSide, fog: false });
    const panel = new THREE.Mesh(screenGeo, fill);
    panel.renderOrder = -1;
    group.add(panel);
    const stand = solidMat();
    const post = solidMesh(new THREE.BoxGeometry(1.6, 3, 1.6), stand);
    post.position.y = -HT / 2 - 1.5;
    group.add(post);
    const foot = solidMesh(new THREE.BoxGeometry(16, 0.9, 7), stand);
    foot.position.y = -HT / 2 - 2.6;
    group.add(foot);
    scene.add(group);
    // A different abstract layout per screen: title bar plus a few content blocks.
    const ui: number[] = [];
    const rect = (x0: number, y0: number, x1: number, y1: number) =>
      ui.push(x0, y0, 0.2, x1, y0, 0.2, x1, y0, 0.2, x1, y1, 0.2, x1, y1, 0.2, x0, y1, 0.2, x0, y1, 0.2, x0, y0, 0.2);
    ui.push(-w, h - 5, 0.2, w, h - 5, 0.2);
    if (i === 0) { rect(-w + 4, -h + 4, -2, h - 9); rect(2, 1, w - 4, h - 9); rect(2, -h + 4, w - 4, -3); }
    else if (i === 1) { rect(-w + 4, 0, w - 4, h - 9); rect(-w + 4, -h + 4, -9, -4); rect(-5, -h + 4, 5, -4); rect(9, -h + 4, w - 4, -4); }
    else { rect(-w + 4, -h + 4, -w + 14, h - 9); rect(-w + 18, -2, w - 4, h - 9); ui.push(-w + 18, -7, 0.2, w - 4, -7, 0.2, -w + 18, -11, 0.2, w - 12, -11, 0.2); }
    const inner = lineMat();
    const innerLines = segments(ui, inner);
    innerLines.renderOrder = 2;
    group.add(innerLines);
    const back = innerLines.clone();
    back.rotation.y = Math.PI;
    group.add(back);
    // Finer page furniture arrives last: window dots, text rows, a cursor.
    const fineUi: number[] = [];
    for (let j = 0; j < 3; j++) fineUi.push(-w + 2 + j * 2.4, h - 2.5, 0.2, -w + 3.2 + j * 2.4, h - 2.5, 0.2);
    fineUi.push(w - 14, h - 2.5, 0.2, w - 3, h - 2.5, 0.2);
    fineUi.push(-w + 6, h - 11.5, 0.2, -w + 13, h - 11.5, 0.2, -w + 6, h - 13.5, 0.2, -w + 11, h - 13.5, 0.2);
    fineUi.push(w - 9, -h + 6, 0.2, w - 6, -h + 6, 0.2, w - 7.5, -h + 7.5, 0.2, w - 7.5, -h + 4.5, 0.2);
    const more = lineMat();
    const moreLines = segments(fineUi, more);
    moreLines.renderOrder = 2;
    group.add(moreLines);
    const moreBack = moreLines.clone();
    moreBack.rotation.y = Math.PI;
    group.add(moreBack);
    screens.push({ group, outline, fill, inner, more, stand, trigger: 3 + trig, a: 0, d: 0, s: 1 });
  });

  // ── Surroundings: rack, ruler, compass, ground and drifting particles ──
  const GROUND = -34;
  const rackMat = lineMat();
  {
    const rack: number[] = [];
    for (const [x, z] of [[SLAB, SLAB], [SLAB, -SLAB], [-SLAB, SLAB], [-SLAB, -SLAB]]) rack.push(x, GROUND, z, x, 3 * H + 44, z);
    // A height ruler beside the stack: long ticks at each layer.
    const rx = SLAB + 14, rz = -SLAB - 14;
    rack.push(rx, GROUND, rz, rx, 3 * H + 44, rz);
    for (let y = 0; y <= 3 * H + 40; y += 10) {
      const l = y % H === 0 ? 9 : 3.5;
      rack.push(rx, y, rz, rx + l, y, rz);
    }
    scene.add(segments(rack, rackMat));
  }
  const compassMat = lineMat();
  const compassMarkMat = lineMat();
  const compassMark = segments([0, GROUND, 150, 0, GROUND, 176, -4, GROUND, 170, 0, GROUND, 176, 4, GROUND, 170, 0, GROUND, 176], compassMarkMat);
  {
    const ring: number[] = [];
    for (const r of [150, 108]) {
      for (let i = 0; i < 120; i++) {
        const a0 = (i / 120) * Math.PI * 2, a1 = ((i + 1) / 120) * Math.PI * 2;
        ring.push(Math.sin(a0) * r, GROUND, Math.cos(a0) * r, Math.sin(a1) * r, GROUND, Math.cos(a1) * r);
      }
    }
    for (let d = 0; d < 360; d += 5) {
      const a = (d / 180) * Math.PI;
      const r1 = d % 40 === 0 ? 164 : d % 10 === 0 ? 157 : 153;
      ring.push(Math.sin(a) * 150, GROUND, Math.cos(a) * 150, Math.sin(a) * r1, GROUND, Math.cos(a) * r1);
    }
    scene.add(segments(ring, compassMat));
    scene.add(compassMark);
  }
  const groundMat = new THREE.LineBasicMaterial({ transparent: true, depthWrite: false, fog: true });
  {
    const g: number[] = [];
    for (let i = -1200; i <= 1200; i += 60) g.push(i, GROUND - 0.5, -1200, i, GROUND - 0.5, 1200, -1200, GROUND - 0.5, i, 1200, GROUND - 0.5, i);
    scene.add(segments(g, groundMat));
  }
  scene.fog = new THREE.Fog(DARK.bg, 420, 1250);

  const DUST = 420;
  const dustPos = new Float32Array(DUST * 3);
  const dustSpeed = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 560;
    dustPos[i * 3 + 1] = GROUND + Math.random() * 400;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 560;
    dustSpeed[i] = 2 + Math.random() * 7;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, transparent: true, depthWrite: false, fog: false });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  scene.add(dust);

  // Traffic: small packets that keep running the route the pulse has opened.
  const packetMat = new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, fog: false });
  const packetGeo = new THREE.SphereGeometry(0.9, 10, 10);
  const packets = Array.from({ length: 7 }, () => {
    const m = new THREE.Mesh(packetGeo, packetMat);
    scene.add(m);
    return m;
  });

  // ── Labels: HTML callouts pinned to objects in the scene ───────
  interface Label {
    el: HTMLElement;
    layer: number;
    isLayer: boolean;
    anchor: (out: THREE.Vector3) => void;
    level: () => number;
    shown: boolean;
  }
  const labelRoot = document.createElement('div');
  labelRoot.className = 'rq-labels';
  labelRoot.setAttribute('aria-hidden', 'true');
  canvas.after(labelRoot);
  const labels: Label[] = [];
  const addLabel = (text: string, layer: number, isLayer: boolean, anchor: Label['anchor'], level: Label['level']) => {
    const el = document.createElement('div');
    el.className = isLayer ? 'rq-tag rq-tag-layer' : 'rq-tag';
    const span = document.createElement('span');
    span.textContent = text;
    el.append(span);
    labelRoot.append(el);
    labels.push({ el, layer, isLayer, anchor, level, shown: false });
  };
  const propLabels = [
    'PostgreSQL', 'tables', 'indexes', 'queries',
    'Spring Boot', 'Java', 'business logic', 'integration', 'enterprise platform',
    'request in', 'REST', 'validation', 'JSON', 'response out',
  ];
  const propTops = [...DATA.map((d) => d[2]), ...SERVICES.map((d) => d[2] + 3), 9, 9, 9, 9, 9];
  props.forEach((p, i) => {
    addLabel(propLabels[i], p.layer, false, (out) => {
      out.copy(p.obj.position);
      out.y += propTops[i] * (p.rise ? p.obj.scale.y : 1);
    }, () => p.d);
  });
  ['React', 'TypeScript', 'Astro'].forEach((text, i) => {
    const sc = screens[i];
    addLabel(text, 3, false, (out) => {
      out.copy(sc.group.position);
      out.y += (HT / 2) * sc.s;
    }, () => sc.d);
  });
  const corner = new THREE.Vector3();
  ['04 · data', '03 · service', '02 · api', '01 · interface'].forEach((text, k) => {
    addLabel(text, k, true, (out) => {
      // Pin to whichever slab corner is currently furthest right on screen.
      let best = -Infinity;
      for (const [x, z] of [[SLAB, SLAB], [SLAB, -SLAB], [-SLAB, SLAB], [-SLAB, -SLAB]]) {
        corner.set(x, k * H, z).project(camera);
        if (corner.x > best) {
          best = corner.x;
          out.set(x, k * H, z);
        }
      }
    }, () => 1);
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

  const headMat = new THREE.MeshBasicMaterial({ depthTest: false, fog: false });
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
  const glowMat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(glowCanvas), blending: THREE.AdditiveBlending, depthTest: false, transparent: true, fog: false });
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
  const cSolid = new THREE.Color();
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

    // Solid faces: a mid-tone between ground and line colour, shaded by the light.
    cSolid.copy(cBg).lerp(cFg, 0.17);
    const solidity = (k: number) => clamp(layerOpacity(k) * 1.6) * reveal;
    const setSolid = (m: THREE.MeshLambertMaterial, o: number) => {
      m.opacity = o;
      m.depthWrite = o > 0.7;
      m.visible = o > 0.01;
    };
    for (let k = 0; k < 4; k++) {
      slabSolids[k].color.copy(cSolid);
      setSolid(slabSolids[k], SLAB_SOLID[k] * smooth(0, 0.28, q - k) * solidity(k));
    }
    for (const tl of tiles) {
      tl.mat.color.copy(cSolid);
      setSolid(tl.mat, SOLID[tl.layer] * smooth(0.06, 0.36, q - tl.layer) * solidity(tl.layer));
    }

    // Layer detail draws in while the pulse is on that layer and stays afterwards.
    for (const d of layerDetails) {
      const level = clamp((clamp(q - d.layer) - d.from) / (d.to - d.from));
      const count = d.lines.geometry.getAttribute('position').count;
      d.lines.geometry.setDrawRange(0, Math.floor((count * level) / 2) * 2);
      d.mat.color.copy(cLine);
      d.mat.opacity = layerOpacity(d.layer) * d.strength * reveal;
    }

    for (const p of props) {
      const on = q >= p.trigger ? 1 : 0;
      p.a = first || reduce ? on : lerp(p.a, on, 0.1);
      p.d = first || reduce ? on : lerp(p.d, on, 0.06);
      const flash = clamp(1 - Math.abs(q - p.trigger) * 5);
      p.mat.color.copy(cLine).lerp(cAccent, Math.max(flash, p.spin ? p.a * 0.85 : 0));
      p.mat.opacity = layerOpacity(p.layer) * (p.rise ? 0.25 + 0.75 * p.a : 0.55 + 0.45 * p.a) * reveal;
      if (p.solid) {
        p.solid.color.copy(cSolid).lerp(cAccent, flash * 0.5);
        // Gates firm up as the pulse arrives on their layer, not one by one as it
        // crosses them, so the layer is solid well before the pulse leaves.
        const firm = p.spin ? smooth(0.02, 0.32, q - p.layer) : p.d;
        setSolid(p.solid, SOLID[p.layer] * firm * solidity(p.layer));
      }
      p.detail.color.copy(cLine);
      p.detail.opacity = layerOpacity(p.layer) * 0.55 * p.d * reveal;
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
      sc.fill.color.copy(cFg);
      sc.fill.opacity = sc.a * focus * clamp(o * 1.4);
      sc.inner.color.copy(cBg);
      sc.inner.opacity = sc.a * focus;
      sc.d = first || reduce ? on : lerp(sc.d, on, 0.025);
      sc.stand.color.copy(cSolid);
      setSolid(sc.stand, sc.a * focus * solidity(3));
      sc.more.color.copy(cBg);
      sc.more.opacity = sc.d * focus;
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

    // Surroundings.
    (scene.fog as THREE.Fog).color.copy(cBg);
    rackMat.color.copy(cLine);
    rackMat.opacity = 0.2 * reveal;
    compassMat.color.copy(cLine);
    compassMat.opacity = 0.24 * reveal;
    compassMarkMat.color.copy(cAccent);
    compassMarkMat.opacity = reveal;
    groundMat.color.copy(cLine);
    groundMat.opacity = 0.13 * reveal;
    dustMat.color.copy(cLine);
    dustMat.opacity = 0.42 * reveal;
    if (!reduce) {
      for (let i = 0; i < DUST; i++) {
        let y = dustPos[i * 3 + 1] + dustSpeed[i] * 0.016;
        if (y > GROUND + 400) y = GROUND;
        dustPos[i * 3 + 1] = y;
      }
      dustGeo.getAttribute('position').needsUpdate = true;
    }
    packetMat.color.copy(cAccent);
    packetMat.opacity = 0.85 * smooth(0.05, 0.4, q) * reveal;
    packets.forEach((m, i) => {
      const f = ((reduce ? 0 : time * 0.06) + i / packets.length) % 1;
      pulseAt(f * q, m.position);
    });

    // Camera: 40° of orbit per frame of the story.
    const narrow = Math.max(1, 1.1 / camera.aspect);
    let focusY = lerp(1.5 * H, pulseSmooth.y, b);
    focusY = lerp(focusY, 1.5 * H + 30, e);
    const r = lerp(lerp(580, 275, b), 610, e) * narrow;
    // Keep the scene right of the copy on wide screens, above it on narrow ones.
    if (wide) camera.setViewOffset(width, height, -width * lerp(lerp(0.14, 0.2, b), 0.2, e), 0, width, height);
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
    compassMark.rotation.y = theta;

    // Labels follow their objects in screen space.
    camera.updateMatrixWorld();
    for (const l of labels) {
      let o = l.isLayer
        ? Math.max(smooth(0.35, 0.9, heroMix), e) * reveal
        : l.level() * clamp(1 - Math.abs(q - (l.layer + 0.45)) / 0.75) * (1 - e) * 1.5;
      o = wide ? clamp(o) : 0;
      if (o >= 0.02) {
        l.anchor(v);
        v.project(camera);
        if (v.z > 1) o = 0;
      }
      if (o < 0.02) {
        if (l.shown) {
          l.el.style.opacity = '0';
          l.shown = false;
        }
        continue;
      }
      l.el.style.transform = `translate3d(${((v.x * 0.5 + 0.5) * width).toFixed(1)}px, ${((-v.y * 0.5 + 0.5) * height).toFixed(1)}px, 0)`;
      l.el.style.opacity = o.toFixed(2);
      l.shown = true;
    }

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
