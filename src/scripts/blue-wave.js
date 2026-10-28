import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function makeRibbonGeometry(segsAlong = 220, segsAcross = 36) {
  const coords = [];
  const colors = [];

  for (let c = 0; c <= segsAcross; c++) {
    const v = (c / segsAcross) * 2 - 1;
    const edgeDist = Math.abs(v);
    const fade = Math.pow(1 - edgeDist, 1.4);
    const r = 0.35 * fade;
    const g = 0.78 * fade;
    const b = 1.0 * fade;

    for (let a = 0; a < segsAlong; a++) {
      const u0 = a / segsAlong;
      const u1 = (a + 1) / segsAlong;
      const ef0 = Math.pow(Math.sin(Math.PI * u0), 0.7);
      const ef1 = Math.pow(Math.sin(Math.PI * u1), 0.7);
      coords.push(u0, v, u1, v);
      colors.push(r * ef0, g * ef0, b * ef0, r * ef1, g * ef1, b * ef1);
    }
  }


  const geometry = new THREE.BufferGeometry();
  const vertexCount = coords.length / 2;
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3),
  );
  geometry.setAttribute(
    'color',
    new THREE.BufferAttribute(new Float32Array(colors), 3),
  );
  geometry.userData.coords = new Float32Array(coords);
  return geometry;
}

function pathPoint(u, time, offset) {
  const t = time * 0.045;
  const arc = u * Math.PI * 2;
  const env = Math.pow(Math.sin(Math.PI * u), 0.42);
  const oy = offset * 0.2;
  const oz = offset * 0.35;
  return new THREE.Vector3(
    -4.15 + u * 11.4 + Math.sin(arc + 0.3 + t) * env * 1.55,
    0.5 - u * 0.35
      + Math.sin(arc * 1.2 + 1.3 - t * 0.65) * env * 0.8
      + oy,
    Math.cos(arc * 0.85 + 0.18 - t) * env * 2.3
      + Math.sin(arc * 1.6 - t * 0.35) * env * 0.72
      + oz,
  );
}

function frameAt(u, time, offset) {
  const t = time * 0.045;
  const centre = pathPoint(u, time, offset);
  const before = pathPoint(Math.max(0, u - 0.004), time, offset);
  const after = pathPoint(Math.min(1, u + 0.004), time, offset);
  const tangent = new THREE.Vector3().subVectors(after, before).normalize();

  const zRef = new THREE.Vector3(0, 0, 1);
  const normal = new THREE.Vector3().crossVectors(tangent, zRef);
  if (normal.lengthSq() < 0.01) {
    normal.crossVectors(tangent, new THREE.Vector3(1, 0, 0));
  }
  normal.normalize();
  const binormal = new THREE.Vector3()
    .crossVectors(tangent, normal)
    .normalize();

  const twist =
    u * Math.PI * 2.8 - 0.55 + Math.sin(u * Math.PI * 2.0 - t) * 0.4;
  const cos = Math.cos(twist);
  const sin = Math.sin(twist);
  const rolledNormal = new THREE.Vector3(
    normal.x * cos + binormal.x * sin,
    normal.y * cos + binormal.y * sin,
    normal.z * cos + binormal.z * sin,
  );

  const body = Math.pow(Math.sin(Math.PI * u), 0.38);
  const width = 0.55 + body * 1.2 + Math.sin(u * Math.PI * 3.5 - t) * 0.12;

  return { centre, normal: rolledNormal, width, body, t };
}

function updateRibbon(mesh, time, offset) {
  const pos = mesh.geometry.attributes.position;
  const coords = mesh.geometry.userData.coords;
  const cache = new Map();

  for (let i = 0; i < pos.count; i++) {
    const u = coords[i * 2];
    const v = coords[i * 2 + 1];

    let frame = cache.get(u);
    if (!frame) {
      frame = frameAt(u, time, offset);
      cache.set(u, frame);
    }

    const ribbonOffset = v * frame.width;

    pos.setXYZ(
      i,
      frame.centre.x + frame.normal.x * ribbonOffset,
      frame.centre.y + frame.normal.y * ribbonOffset,
      frame.centre.z + frame.normal.z * ribbonOffset,
    );
  }

  pos.needsUpdate = true;
}

// `outro` mirrors the ribbon to the left for the closing contact section.
export function mountBlueWave(canvas, { variant = 'hero' } = {}) {
  const outro = variant === 'outro';
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
  renderer.setClearColor(0x000000, 1);
  renderer.toneMapping = THREE.NoToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);
  camera.position.set(0, 0, 9.6);

  const group = new THREE.Group();
  group.position.set(3.45, 0.0, 0);
  group.rotation.set(-0.02, -0.06, -0.04);
  scene.add(group);

  const ribbonLayers = [
    { offset: 0, opacity: 0.62 },
    { offset: 1.8, opacity: 0.16 },
    { offset: -1.55, opacity: 0.11 },
  ];
  const ribbons = ribbonLayers.map(({ offset, opacity }) => {
    const geometry = makeRibbonGeometry();
    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.LineSegments(geometry, material);
    group.add(mesh);
    return { mesh, geometry, material, offset, opacity };
  });

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(canvas.clientWidth, canvas.clientHeight),
    0.38,
    0.22,
    0.28,
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  const clock = new THREE.Clock();
  const reduced = prefersReducedMotion();
  const timeOffset = 12.0;
  let raf = 0;

  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();

    const mobile = w < 600;
    const tablet = w >= 600 && w < 1024;

    if (outro) {
      group.position.set(mobile ? -0.4 : -2.6, mobile ? -1.2 : -0.2, 0);
      group.scale.set(mobile ? -0.62 : -1.0, mobile ? 0.62 : 1.0, 1);
      bloomPass.strength = mobile ? 0.22 : 0.32;
    } else if (mobile) {
      group.position.set(1.2, 1.6, 0);
      group.scale.setScalar(0.48);
      bloomPass.strength = 0.25;
    } else if (tablet) {
      group.position.set(2.4, 0.6, 0);
      group.scale.setScalar(0.78);
      bloomPass.strength = 0.32;
    } else {
      group.position.set(3.45, 0.0, 0);
      group.scale.setScalar(1.05);
      bloomPass.strength = 0.38;
    }

    const opacityScale = mobile ? 0.6 : tablet ? 0.85 : 1;
    ribbons.forEach((ribbon) => {
      ribbon.material.opacity = ribbon.opacity * opacityScale;
    });
  };

  const render = () => {
    const time = reduced ? 2.4 : clock.getElapsedTime() + timeOffset + (outro ? 40 : 0);
    ribbons.forEach(({ mesh, offset }) => updateRibbon(mesh, time, offset));
    composer.render();
    if (!reduced && visible) raf = requestAnimationFrame(render);
  };

  // Only animate while the canvas is on screen, so two waves cost one.
  let visible = true;
  const visibility = new IntersectionObserver(([entry]) => {
    const wasVisible = visible;
    visible = entry.isIntersecting;
    if (visible && !wasVisible && !reduced) raf = requestAnimationFrame(render);
    if (!visible) cancelAnimationFrame(raf);
  });
  visibility.observe(canvas);

  resize();
  render();
  window.addEventListener('resize', resize);

  return () => {
    cancelAnimationFrame(raf);
    visibility.disconnect();
    window.removeEventListener('resize', resize);
    ribbons.forEach(({ geometry, material }) => {
      geometry.dispose();
      material.dispose();
    });
    composer.dispose();
    renderer.dispose();
  };
}
