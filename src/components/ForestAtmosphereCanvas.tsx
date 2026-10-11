'use client';

import React, {useEffect, useRef, useState} from 'react';
import * as THREE from 'three';

interface ForestAtmosphereCanvasProps {
  backgroundIntensity?: number;
}

export default function ForestAtmosphereCanvas({
  backgroundIntensity = 1,
}: ForestAtmosphereCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let renderer: THREE.WebGLRenderer | null = null;
    let animationFrameId = 0;

    try {
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x050706, 0.045);

      const camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        0.1,
        100
      );
      camera.position.set(0, 0.4, 9);

      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);

      const canvasEl = renderer.domElement;
      canvasEl.style.width = '100%';
      canvasEl.style.height = '100%';
      canvasEl.style.display = 'block';
      container.innerHTML = '';
      container.appendChild(canvasEl);

      const handleContextLost = (e: Event) => {
        e.preventDefault();
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
      };
      const handleContextRestored = () => {
        animate();
      };
      canvasEl.addEventListener('webglcontextlost', handleContextLost, false);
      canvasEl.addEventListener('webglcontextrestored', handleContextRestored, false);

      const ambientLight = new THREE.AmbientLight(0x0c100c, 1.4);
      scene.add(ambientLight);

      const canopyLight = new THREE.DirectionalLight(0xb8e66a, 1.1);
      canopyLight.position.set(3, 8, 4);
      scene.add(canopyLight);

      const mossRimLight = new THREE.PointLight(0x8ebb4d, 1.2, 22);
      mossRimLight.position.set(-4, 2, 3);
      scene.add(mossRimLight);

      const particleCount = 130;
      const positions = new Float32Array(particleCount * 3);
      const speeds = new Float32Array(particleCount);

      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 20;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 1;
        speeds[i] = Math.random() * 0.004 + 0.0015;
      }

      const sporeGeometry = new THREE.BufferGeometry();
      sporeGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const dotCanvas = document.createElement('canvas');
      dotCanvas.width = 64;
      dotCanvas.height = 64;
      const ctx = dotCanvas.getContext('2d');
      if (ctx) {
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, 'rgba(184, 230, 106, 0.9)');
        grad.addColorStop(0.4, 'rgba(168, 217, 92, 0.35)');
        grad.addColorStop(1, 'rgba(8, 11, 8, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
      }
      const sporeTexture = new THREE.CanvasTexture(dotCanvas);

      const sporeMaterial = new THREE.PointsMaterial({
        size: 0.14,
        map: sporeTexture,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const sporePoints = new THREE.Points(sporeGeometry, sporeMaterial);
      scene.add(sporePoints);

      const rockGroup = new THREE.Group();
      const rockGeo = new THREE.IcosahedronGeometry(1.6, 1);
      const rockMat = new THREE.MeshStandardMaterial({
        color: 0x0b100b,
        roughness: 0.88,
        metalness: 0.12,
        flatShading: true,
        transparent: true,
        opacity: 0.42,
      });

      const rock1 = new THREE.Mesh(rockGeo, rockMat);
      rock1.position.set(-6.5, -2.8, -5.5);
      rock1.scale.set(1.8, 1.1, 1.4);
      rockGroup.add(rock1);

      const rock2 = new THREE.Mesh(rockGeo, rockMat);
      rock2.position.set(6.8, -2.4, -6.2);
      rock2.scale.set(2.1, 1.3, 1.5);
      rockGroup.add(rock2);

      scene.add(rockGroup);

      let targetMouseX = 0;
      let targetMouseY = 0;
      let currentMouseX = 0;
      let currentMouseY = 0;
      let targetScrollY = 0;
      let currentScrollY = 0;

      const handleMouseMove = (e: MouseEvent) => {
        targetMouseX = (e.clientX / window.innerWidth - 0.5) * 0.7;
        targetMouseY = (e.clientY / window.innerHeight - 0.5) * 0.45;
      };

      const handleScroll = () => {
        targetScrollY = window.scrollY || 0;
      };

      const handleResize = () => {
        if (!renderer) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };

      window.addEventListener('mousemove', handleMouseMove, {passive: true});
      window.addEventListener('scroll', handleScroll, {passive: true});
      window.addEventListener('resize', handleResize);

      let clock = 0;
      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);
        clock += 0.008;

        currentMouseX += (targetMouseX - currentMouseX) * 0.04;
        currentMouseY += (targetMouseY - currentMouseY) * 0.04;
        currentScrollY += (targetScrollY - currentScrollY) * 0.05;

        const scrollOffset = Math.min(currentScrollY * 0.0018, 1.8);
        camera.position.x = currentMouseX * 0.85;
        camera.position.y = 0.4 - currentMouseY * 0.55 - scrollOffset * 0.65;
        camera.position.z = 9 - scrollOffset * 0.45;
        camera.lookAt(0, -scrollOffset * 0.35, 0);

        if (!prefersReducedMotion) {
          const posAttr = sporeGeometry.getAttribute('position') as THREE.BufferAttribute;
          for (let i = 0; i < particleCount; i++) {
            let y = posAttr.getY(i);
            let x = posAttr.getX(i);
            y += speeds[i];
            x += Math.sin(clock + i) * 0.0012;
            if (y > 6) y = -6;
            posAttr.setXY(i, x, y);
          }
          posAttr.needsUpdate = true;

          rock1.rotation.y = Math.sin(clock * 0.3) * 0.06;
          rock2.rotation.y = Math.cos(clock * 0.25) * 0.06;
        }

        renderer?.render(scene, camera);
      };

      animate();

      return () => {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);
        canvasEl.removeEventListener('webglcontextlost', handleContextLost);
        canvasEl.removeEventListener('webglcontextrestored', handleContextRestored);
        sporeGeometry.dispose();
        sporeMaterial.dispose();
        sporeTexture.dispose();
        rockGeo.dispose();
        rockMat.dispose();
        renderer?.dispose();
      };
    } catch {
      return;
    }
  }, []);

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none bg-[#050706]"
      aria-hidden="true"
    >
      {!imgError ? (
        <img
          src="/src/assets/images/lumi_dark_forest_bg_1791463263455.jpg"
          alt="Atmospheric dark forest moss and wet stone background"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="absolute inset-0 w-full h-full object-cover object-center scale-[1.03] transition-opacity duration-700"
          style={{
            opacity: 0.78 * backgroundIntensity,
            filter: 'contrast(1.06) saturate(0.92) brightness(0.84)',
          }}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 22%, rgba(96, 122, 58, 0.28) 0%, rgba(12, 16, 12, 0.85) 52%, #050706 100%)',
          }}
        />
      )}

      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 75% 50% at 50% 14%, rgba(184, 230, 106, 0.11) 0%, rgba(96, 122, 58, 0.07) 42%, rgba(5, 7, 6, 0.55) 100%)',
        }}
      />

      <div ref={mountRef} className="absolute inset-0 w-full h-full opacity-90" />

      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(5,7,6,0.32) 0%, rgba(5,7,6,0.14) 26%, rgba(8,11,8,0.48) 65%, rgba(5,7,6,0.84) 100%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          boxShadow: 'inset 0 0 160px rgba(0, 0, 0, 0.82)',
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
