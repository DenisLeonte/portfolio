import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const PARTICLE_COUNT_DESKTOP = 130;
const PARTICLE_COUNT_MOBILE  = 60;
const CONNECTION_DISTANCE_DESKTOP = 140;
const CONNECTION_DISTANCE_MOBILE  = 100;

interface ParticleData {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
}

export default function HeroCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);
  const webGLAvailable = useRef(true);

  useEffect(() => {
    if (!mountRef.current) return;

    // ─── WebGL Availability Check ────────────────────────────────
    try {
      const testCanvas = document.createElement('canvas');
      const ctx =
        testCanvas.getContext('webgl') ||
        testCanvas.getContext('experimental-webgl');
      if (!ctx) {
        webGLAvailable.current = false;
        return;
      }
    } catch {
      webGLAvailable.current = false;
      return;
    }

    const container = mountRef.current;
    let width = container.clientWidth;
    let height = container.clientHeight;

    const isMobile = window.innerWidth < 768;
    const PARTICLE_COUNT     = isMobile ? PARTICLE_COUNT_MOBILE     : PARTICLE_COUNT_DESKTOP;
    const CONNECTION_DISTANCE = isMobile ? CONNECTION_DISTANCE_MOBILE : CONNECTION_DISTANCE_DESKTOP;
    const MAX_CONNECTIONS    = Math.floor((PARTICLE_COUNT * (PARTICLE_COUNT - 1)) / 2);

    // ─── Scene Setup ─────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000);
    camera.position.z = 350;

    const renderer = new THREE.WebGLRenderer({
      antialias: false, // off for performance
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // ─── Particle Group (moves with mouse) ───────────────────────
    const group = new THREE.Group();
    scene.add(group);

    // ─── Particle Data ───────────────────────────────────────────
    const particles: ParticleData[] = [];
    const positions = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const x = (Math.random() - 0.5) * width * 1.6;
      const y = (Math.random() - 0.5) * height * 1.6;
      const z = (Math.random() - 0.5) * 120;

      particles.push({
        x,
        y,
        z,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
      });

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }

    // ─── Points (Particles) ──────────────────────────────────────
    const particleGeometry = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(positions, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    particleGeometry.setAttribute('position', posAttr);

    const particleMaterial = new THREE.PointsMaterial({
      color: 0x00ff41,
      size: 2.2,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
    });

    const pointCloud = new THREE.Points(particleGeometry, particleMaterial);
    group.add(pointCloud);

    // ─── Line Segments (Connections) ─────────────────────────────
    const linePositions = new Float32Array(MAX_CONNECTIONS * 6); // 2 verts × 3 floats
    const lineGeometry = new THREE.BufferGeometry();
    const linePosAttr = new THREE.BufferAttribute(linePositions, 3);
    linePosAttr.setUsage(THREE.DynamicDrawUsage);
    lineGeometry.setAttribute('position', linePosAttr);
    lineGeometry.setDrawRange(0, 0);

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x00ff41,
      transparent: true,
      opacity: 0.18,
    });

    const lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
    group.add(lineSegments);

    // ─── Mouse Parallax ──────────────────────────────────────────
    const mouse = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 50;
      mouse.y = (e.clientY / window.innerHeight - 0.5) * 50;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // ─── Resize Handler ──────────────────────────────────────────
    const handleResize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize, { passive: true });

    // ─── Animation Loop ──────────────────────────────────────────
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Move particles
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around bounds
        const halfW = width * 0.85;
        const halfH = height * 0.85;
        if (p.x > halfW) p.x = -halfW;
        if (p.x < -halfW) p.x = halfW;
        if (p.y > halfH) p.y = -halfH;
        if (p.y < -halfH) p.y = halfH;

        positions[i * 3] = p.x;
        positions[i * 3 + 1] = p.y;
        positions[i * 3 + 2] = p.z;
      }

      posAttr.needsUpdate = true;

      // Build connection line segments
      let lineCount = 0;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        for (let j = i + 1; j < PARTICLE_COUNT; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distSq = dx * dx + dy * dy;

          if (distSq < CONNECTION_DISTANCE * CONNECTION_DISTANCE) {
            const base = lineCount * 6;
            linePositions[base] = particles[i].x;
            linePositions[base + 1] = particles[i].y;
            linePositions[base + 2] = particles[i].z;
            linePositions[base + 3] = particles[j].x;
            linePositions[base + 4] = particles[j].y;
            linePositions[base + 5] = particles[j].z;
            lineCount++;
          }
        }
      }

      lineGeometry.setDrawRange(0, lineCount * 2);
      linePosAttr.needsUpdate = true;

      // Smooth mouse parallax — lerp group toward target
      target.x += (mouse.x - target.x) * 0.04;
      target.y += (mouse.y - target.y) * 0.04;
      group.position.x = target.x;
      group.position.y = -target.y;

      renderer.render(scene, camera);
    };

    animate();

    // ─── Cleanup ─────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);

      particleGeometry.dispose();
      lineGeometry.dispose();
      particleMaterial.dispose();
      lineMaterial.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Fallback gradient if WebGL not available
  if (!webGLAvailable.current) {
    return (
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(0, 255, 65, 0.06) 0%, transparent 70%)',
        }}
      />
    );
  }

  return (
    <div
      ref={mountRef}
      className="absolute inset-0"
      aria-hidden="true"
      style={{ cursor: 'default' }}
    />
  );
}
