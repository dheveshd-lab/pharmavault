import React, { useRef, useEffect } from 'react';

interface FuturisticPharmaSceneProps {
  isActive: boolean;
  backgroundImage: string;
}

interface Particle {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  alpha: number;
  baseAlpha: number;
  color: string;
  pulseSpeed: number;
  pulseOffset: number;
}

export const FuturisticPharmaScene: React.FC<FuturisticPharmaSceneProps> = ({
  isActive,
  backgroundImage,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Layers for multi-depth parallax
  const bgRef = useRef<HTMLDivElement>(null);
  const layer3Ref = useRef<HTMLDivElement>(null); // deep background pills & molecular elements
  const layer2Ref = useRef<HTMLDivElement>(null); // midground tablets & vials
  const layer1Ref = useRef<HTMLDivElement>(null); // large foreground capsules & bottles

  // Individual item refs for gentle independent floating / rotation
  const capsule1Ref = useRef<HTMLDivElement>(null);
  const capsule2Ref = useRef<HTMLDivElement>(null);
  const capsule3Ref = useRef<HTMLDivElement>(null);
  const vial1Ref = useRef<HTMLDivElement>(null);
  const bottle1Ref = useRef<HTMLDivElement>(null);
  const tablet1Ref = useRef<HTMLDivElement>(null);
  const tablet2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive) return;

    // Check prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const prefersReducedMotion = mediaQuery.matches;

    // Parallax targets & currents (lerped)
    let mouseTargetX = 0;
    let mouseTargetY = 0;
    let mouseCurrentX = 0;
    let mouseCurrentY = 0;

    let scrollTargetY = 0;
    let scrollCurrentY = 0;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchTargetX = 0;
    let touchTargetY = 0;

    let animationFrameId: number;
    let time = 0;

    // Canvas particle setup
    const canvas = canvasRef.current;
    const ctx = canvas ? canvas.getContext('2d') : null;
    let particles: Particle[] = [];

    const initParticles = (width: number, height: number) => {
      const count = window.innerWidth < 768 ? 16 : 32;
      particles = [];
      const colors = ['#22d3ee', '#38bdf8', '#06b6d4', '#67e8f9', '#a5f3fc', '#ffffff'];

      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 2.2 + 0.8,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.3 - 0.15, // slight upward natural drift
          alpha: Math.random() * 0.6 + 0.2,
          baseAlpha: Math.random() * 0.5 + 0.2,
          color: colors[Math.floor(Math.random() * colors.length)],
          pulseSpeed: Math.random() * 0.02 + 0.01,
          pulseOffset: Math.random() * Math.PI * 2,
        });
      }
    };

    const handleResize = () => {
      if (!canvas || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      initParticles(rect.width, rect.height);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Mouse pointer listener on container & window
    const handlePointerMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Check if mouse is anywhere within or near the hero container
      if (
        e.clientX >= rect.left - 150 &&
        e.clientX <= rect.right + 150 &&
        e.clientY >= rect.top - 150 &&
        e.clientY <= rect.bottom + 150
      ) {
        mouseTargetX = Math.max(-1, Math.min(1, (e.clientX - centerX) / (rect.width / 2)));
        mouseTargetY = Math.max(-1, Math.min(1, (e.clientY - centerY) / (rect.height / 2)));
      } else {
        mouseTargetX = 0;
        mouseTargetY = 0;
      }
    };

    const handleMouseLeave = () => {
      mouseTargetX = 0;
      mouseTargetY = 0;
    };

    // Scroll listener
    const handleScroll = () => {
      scrollTargetY = window.scrollY || document.documentElement.scrollTop || 0;
    };

    // Touch listeners (passive, non-interfering with page scrolling)
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && containerRef.current) {
        const deltaX = e.touches[0].clientX - touchStartX;
        const deltaY = e.touches[0].clientY - touchStartY;
        const rect = containerRef.current.getBoundingClientRect();
        touchTargetX = Math.max(-1, Math.min(1, deltaX / (rect.width / 3)));
        touchTargetY = Math.max(-1, Math.min(1, deltaY / (rect.height / 3)));
      }
    };

    const handleTouchEnd = () => {
      touchTargetX = 0;
      touchTargetY = 0;
    };

    const container = containerRef.current;
    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    if (container) {
      container.addEventListener('mouseleave', handleMouseLeave, { passive: true });
      container.addEventListener('touchstart', handleTouchStart, { passive: true });
      container.addEventListener('touchmove', handleTouchMove, { passive: true });
      container.addEventListener('touchend', handleTouchEnd, { passive: true });
    }

    // Main animation loop (60 FPS GPU-accelerated)
    const animate = () => {
      time += 0.02;

      // Smooth interpolation (lerp)
      const lerpFactor = prefersReducedMotion ? 0.02 : 0.06;
      const combinedTargetX = mouseTargetX + touchTargetX * 0.7;
      const combinedTargetY = mouseTargetY + touchTargetY * 0.7;

      mouseCurrentX += (combinedTargetX - mouseCurrentX) * lerpFactor;
      mouseCurrentY += (combinedTargetY - mouseCurrentY) * lerpFactor;
      scrollCurrentY += (scrollTargetY - scrollCurrentY) * 0.08;

      const scrollOffset = Math.min(scrollCurrentY * 0.15, 60);
      const scrollScale = Math.max(0.92, 1 - scrollCurrentY * 0.0003);

      if (!prefersReducedMotion) {
        // Multi-depth layer translations
        // Layer 4: Deep Background (subtle stability)
        if (bgRef.current) {
          const bgX = mouseCurrentX * 6;
          const bgY = mouseCurrentY * 4 - scrollOffset * 0.2;
          bgRef.current.style.transform = `translate3d(${bgX}px, ${bgY}px, 0) scale(1.05)`;
        }

        // Layer 3: Molecular elements & background pills (depth 3)
        if (layer3Ref.current) {
          const l3X = mouseCurrentX * 12;
          const l3Y = mouseCurrentY * 10 - scrollOffset * 0.45;
          layer3Ref.current.style.transform = `translate3d(${l3X}px, ${l3Y}px, 0)`;
        }

        // Layer 2: Midground tablets, vials (depth 2)
        if (layer2Ref.current) {
          const l2X = mouseCurrentX * 22;
          const l2Y = mouseCurrentY * 18 - scrollOffset * 0.75;
          layer2Ref.current.style.transform = `translate3d(${l2X}px, ${l2Y}px, 0) scale(${scrollScale})`;
        }

        // Layer 1: Foreground large capsules, hero bottles (depth 1 - moves most)
        if (layer1Ref.current) {
          const l1X = mouseCurrentX * 36;
          const l1Y = mouseCurrentY * 28 - scrollOffset * 1.05;
          layer1Ref.current.style.transform = `translate3d(${l1X}px, ${l1Y}px, 0) scale(${scrollScale})`;
        }

        // Gentle floating wobble & rotations for individual capsules
        if (capsule1Ref.current) {
          const floatY = Math.sin(time + 1.2) * 9;
          const rotZ = 22 + Math.cos(time * 0.8) * 4 + mouseCurrentX * 8;
          capsule1Ref.current.style.transform = `translate3d(0, ${floatY}px, 0) rotate(${rotZ}deg)`;
        }

        if (capsule2Ref.current) {
          const floatY = Math.cos(time * 0.9) * 11;
          const rotZ = -34 + Math.sin(time * 0.7) * 5 - mouseCurrentX * 7;
          capsule2Ref.current.style.transform = `translate3d(0, ${floatY}px, 0) rotate(${rotZ}deg)`;
        }

        if (bottle1Ref.current) {
          const floatY = Math.sin(time * 0.95 + 1) * 7;
          const rotZ = 6 + Math.cos(time * 0.7) * 2 + mouseCurrentX * 3;
          bottle1Ref.current.style.transform = `translate3d(0, ${floatY}px, 0) rotate(${rotZ}deg)`;
        }

        if (capsule3Ref.current) {
          const floatY = Math.sin(time * 1.1 + 2.5) * 8;
          const rotZ = 12 + Math.cos(time + 1) * 3 + mouseCurrentX * 5;
          capsule3Ref.current.style.transform = `translate3d(0, ${floatY}px, 0) rotate(${rotZ}deg)`;
        }

        if (vial1Ref.current) {
          const floatY = Math.cos(time * 0.85 + 0.5) * 7;
          const rotZ = -4 + Math.sin(time * 0.6) * 2 + mouseCurrentX * 3;
          vial1Ref.current.style.transform = `translate3d(0, ${floatY}px, 0) rotate(${rotZ}deg)`;
        }

        if (tablet1Ref.current) {
          const floatY = Math.sin(time * 1.3) * 6;
          const rotZ = 45 + Math.cos(time) * 4;
          tablet1Ref.current.style.transform = `translate3d(0, ${floatY}px, 0) rotate(${rotZ}deg)`;
        }

        if (tablet2Ref.current) {
          const floatY = Math.cos(time * 1.15 + 1.8) * 8;
          const rotZ = -15 + Math.sin(time * 0.9) * 3;
          tablet2Ref.current.style.transform = `translate3d(0, ${floatY}px, 0) rotate(${rotZ}deg)`;
        }
      }

      // Render glowing floating particles on canvas
      if (ctx && canvas && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);

        // Particle parallax offset
        const particleOffsetX = mouseCurrentX * 15;
        const particleOffsetY = mouseCurrentY * 12 - scrollOffset * 0.4;

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];

          if (!prefersReducedMotion) {
            p.x += p.vx;
            p.y += p.vy;

            // Wrap around edges
            if (p.x < -10) p.x = rect.width + 10;
            if (p.x > rect.width + 10) p.x = -10;
            if (p.y < -10) p.y = rect.height + 10;
            if (p.y > rect.height + 10) p.y = -10;
          }

          // Pulsing opacity
          const alpha = p.baseAlpha + Math.sin(time * 1.5 + p.pulseOffset) * 0.2;

          ctx.beginPath();
          ctx.arc(p.x + particleOffsetX * 0.5, p.y + particleOffsetY * 0.5, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0.05, Math.min(1, alpha));
          ctx.shadowBlur = 8;
          ctx.shadowColor = p.color;
          ctx.fill();
        }

        // Connect nearby particles with subtle glowing cyan lines (molecular mesh)
        ctx.shadowBlur = 0;
        ctx.lineWidth = 0.5;
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 75) {
              const lineAlpha = (1 - dist / 75) * 0.15;
              ctx.strokeStyle = `rgba(56, 189, 248, ${lineAlpha})`;
              ctx.beginPath();
              ctx.moveTo(particles[i].x + particleOffsetX * 0.5, particles[i].y + particleOffsetY * 0.5);
              ctx.lineTo(particles[j].x + particleOffsetX * 0.5, particles[j].y + particleOffsetY * 0.5);
              ctx.stroke();
            }
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handlePointerMove);
      if (container) {
        container.removeEventListener('mouseleave', handleMouseLeave);
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [isActive]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-auto select-none"
      style={{ touchAction: 'pan-y' }}
      aria-hidden="true"
    >
      {/* LAYER 4: Deep Laboratory Background Image with Depth & Cyan Glow */}
      <div
        ref={bgRef}
        className="absolute -inset-4 transition-transform duration-75 ease-out will-change-transform"
      >
        <img
          src={backgroundImage}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover object-center scale-105"
        />
        {/* Soft volumetric cyan light beams */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Atmospheric Overlays: Ensures left-side text stays 100% crisp and readable */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/40 pointer-events-none" />

      {/* LAYER 3: Particles Canvas & Distant Molecular Hexagons */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-1"
      />

      <div
        ref={layer3Ref}
        className="absolute inset-0 pointer-events-none z-2 will-change-transform transition-transform duration-75 ease-out"
      >
        {/* Distant Molecular Structure Diagram 1 */}
        <svg
          className="absolute top-8 right-24 w-40 h-40 opacity-25 text-cyan-400"
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        >
          <polygon points="50,15 80,32 80,68 50,85 20,68 20,32" strokeDasharray="3,3" />
          <polygon points="50,25 72,38 72,62 50,75 28,62 28,38" />
          <line x1="50" y1="15" x2="50" y2="5" />
          <line x1="80" y1="68" x2="90" y2="74" />
          <circle cx="50" cy="5" r="2.5" fill="#38bdf8" />
          <circle cx="90" cy="74" r="2.5" fill="#38bdf8" />
          <circle cx="50" cy="50" r="3" fill="#06b6d4" />
        </svg>

        {/* Distant Out-of-Focus Soft Tablet 1 */}
        <div
          ref={tablet2Ref}
          className="absolute top-16 right-[38%] w-9 h-9 rounded-full bg-gradient-to-br from-cyan-300/40 via-teal-400/20 to-slate-800/60 border border-cyan-400/30 backdrop-blur-xs shadow-lg filter blur-[1px] transform -rotate-12"
        >
          <div className="absolute inset-1 rounded-full border border-white/20" />
        </div>

        {/* Distant Floating Pill 2 */}
        <div className="absolute bottom-16 right-[44%] w-14 h-6 rounded-full bg-gradient-to-r from-teal-400/30 to-blue-400/20 border border-teal-300/30 backdrop-blur-xs filter blur-[1.5px] transform rotate-45" />
      </div>

      {/* LAYER 2: Midground Tablets & Precision Glass Medicine Vial */}
      <div
        ref={layer2Ref}
        className="absolute inset-0 pointer-events-none z-3 will-change-transform transition-transform duration-75 ease-out"
      >
        {/* Floating Scored Pharmaceutical Tablet (Round Biconvex with Deboss) */}
        <div
          ref={tablet1Ref}
          className="absolute top-10 right-48 sm:right-64 w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-[0_15px_30px_-5px_rgba(6,182,212,0.4)] border border-cyan-300/60 bg-gradient-to-br from-slate-100 via-teal-100 to-cyan-200 text-slate-700 flex items-center justify-center filter drop-shadow-md"
          style={{
            boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.9), inset 0 -3px 6px rgba(14,116,144,0.4), 0 12px 28px -4px rgba(6,182,212,0.45)',
          }}
        >
          {/* Tablet Score Line */}
          <div className="w-full h-[2px] bg-slate-400/70 shadow-[0_1px_1px_rgba(255,255,255,0.8)]" />
          {/* Subtle Pharmaceutical Brand Stamp */}
          <span className="absolute text-[8px] font-mono font-bold tracking-widest text-slate-500/80 -translate-y-2">
            PV
          </span>
          <span className="absolute text-[8px] font-mono font-bold tracking-widest text-slate-500/80 translate-y-2">
            500
          </span>
          {/* Specular Glint */}
          <div className="absolute top-1 left-2 w-4 h-2 rounded-full bg-white/80 blur-[0.5px] transform -rotate-45" />
        </div>

        {/* Midground Glass Medicine Vial with Liquid Level & Aluminum Cap */}
        <div
          ref={vial1Ref}
          className="hidden sm:block absolute bottom-12 right-64 w-16 h-28 rounded-2xl bg-gradient-to-b from-cyan-950/40 via-teal-900/30 to-slate-900/70 border border-cyan-400/40 backdrop-blur-md shadow-[0_20px_40px_-10px_rgba(6,182,212,0.4)] overflow-hidden"
          style={{
            boxShadow: 'inset 0 0 12px rgba(34,211,238,0.25), 0 16px 36px -6px rgba(8,145,178,0.5)',
          }}
        >
          {/* Metal Vial Crimp Seal Cap */}
          <div className="w-full h-5 bg-gradient-to-r from-slate-300 via-slate-100 to-slate-400 border-b border-slate-400 flex items-center justify-center shadow-xs">
            <div className="w-6 h-1 rounded-full bg-teal-600/60" />
          </div>
          {/* Neck glass ring */}
          <div className="w-full h-1.5 bg-cyan-400/20 border-b border-cyan-300/30" />
          {/* Liquid level inside with meniscus */}
          <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-cyan-500/60 via-teal-400/40 to-cyan-300/25 border-t border-cyan-200/60">
            <div className="absolute -top-1 inset-x-0 h-2 bg-cyan-200/50 rounded-full blur-[1px]" />
          </div>
          {/* Glass Reflection Highlight Streak */}
          <div className="absolute top-7 left-1.5 w-1 h-18 bg-white/40 rounded-full blur-[0.5px]" />
          <div className="absolute top-9 right-1.5 w-0.5 h-14 bg-cyan-300/30 rounded-full" />
          {/* Sterile Micro-label */}
          <div className="absolute top-8 left-3.5 right-3.5 h-6 bg-white/15 border border-white/25 rounded flex items-center justify-center">
            <div className="w-5 h-0.5 bg-cyan-300/80 rounded" />
          </div>
        </div>

        {/* Small floating capsule in midground */}
        <div
          ref={capsule3Ref}
          className="absolute bottom-8 right-28 sm:right-36 w-20 h-8 rounded-full shadow-[0_12px_28px_-6px_rgba(6,182,212,0.45)] border border-cyan-300/50 overflow-hidden flex items-center"
          style={{
            boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.7), 0 14px 28px -5px rgba(6,182,212,0.4)',
          }}
        >
          {/* Half 1: Deep Navy Blue */}
          <div className="w-1/2 h-full bg-gradient-to-r from-blue-900 via-indigo-800 to-blue-700" />
          {/* Half 2: Luminous Cyan */}
          <div className="w-1/2 h-full bg-gradient-to-r from-cyan-500 via-cyan-400 to-teal-300" />
          {/* Joint band */}
          <div className="absolute left-1/2 -translate-x-1/2 h-full w-[2px] bg-white/40 shadow-xs" />
          {/* Specular gloss streak */}
          <div className="absolute top-1 inset-x-2 h-1.5 rounded-full bg-gradient-to-r from-white/70 via-white/50 to-white/20 blur-[0.3px]" />
        </div>
      </div>

      {/* LAYER 1: Large Foreground Floating Capsules & Premium Glass Reflections */}
      <div
        ref={layer1Ref}
        className="absolute inset-0 pointer-events-none z-4 will-change-transform transition-transform duration-75 ease-out"
      >
        {/* Large Primary 3D Floating Capsule 1 (Electric Cyan & Pure Pharmaceutical White) */}
        <div
          ref={capsule1Ref}
          className="absolute top-8 sm:top-10 right-4 sm:right-12 w-28 sm:w-36 h-12 sm:h-15 rounded-full shadow-[0_25px_50px_-10px_rgba(6,182,212,0.55)] border border-cyan-200/80 overflow-hidden flex items-center filter drop-shadow-2xl"
          style={{
            boxShadow:
              'inset 0 3px 6px rgba(255,255,255,0.9), inset 0 -3px 6px rgba(6,182,212,0.5), 0 20px 45px -8px rgba(6,182,212,0.6)',
          }}
        >
          {/* Left half: Luminous Electric Cyan / Teal */}
          <div className="w-1/2 h-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-teal-300 flex items-center justify-center relative">
            {/* Inner glow highlight */}
            <div className="absolute inset-0 bg-radial from-cyan-200/40 via-transparent to-transparent" />
          </div>

          {/* Right half: Crisp Sterile Pharmaceutical White with Studio Sheen */}
          <div className="w-1/2 h-full bg-gradient-to-r from-slate-100 via-white to-slate-200 relative flex items-center justify-center">
            <span className="text-[9px] sm:text-[10px] font-mono font-bold tracking-wider text-slate-400/80 uppercase">
              FEFO
            </span>
          </div>

          {/* Precision Capsule Central Joint Ring */}
          <div className="absolute left-1/2 -translate-x-1/2 h-full w-[3px] bg-cyan-200/90 shadow-[0_0_8px_rgba(34,211,238,0.8)] z-10" />

          {/* High-Gloss Specular Highlight Strip (Studio Softbox Glass Reflection) */}
          <div className="absolute top-1.5 inset-x-3 h-2 sm:h-2.5 rounded-full bg-gradient-to-r from-white/90 via-white/70 to-white/30 blur-[0.4px] z-20 pointer-events-none" />

          {/* Secondary Lower Ambient Bounce Light */}
          <div className="absolute bottom-1 inset-x-4 h-1.5 rounded-full bg-cyan-300/40 blur-[1px] pointer-events-none" />
        </div>

        {/* Large Secondary 3D Floating Capsule 2 (Cobalt Sapphire & Coral Emerald) */}
        <div
          ref={capsule2Ref}
          className="absolute top-32 sm:top-36 right-16 sm:right-28 w-24 sm:w-32 h-10 sm:h-13 rounded-full shadow-[0_22px_45px_-8px_rgba(14,165,233,0.5)] border border-sky-300/70 overflow-hidden flex items-center filter drop-shadow-2xl"
          style={{
            boxShadow:
              'inset 0 3px 5px rgba(255,255,255,0.85), inset 0 -3px 5px rgba(3,105,161,0.5), 0 18px 40px -8px rgba(14,165,233,0.5)',
          }}
        >
          {/* Left half: Deep Cobalt Blue */}
          <div className="w-1/2 h-full bg-gradient-to-r from-blue-700 via-indigo-600 to-sky-500" />

          {/* Right half: Translucent Smoked Glass / Teal Pearl */}
          <div className="w-1/2 h-full bg-gradient-to-r from-teal-400 via-emerald-300 to-teal-200 flex items-center justify-center">
            <span className="text-[8px] sm:text-[9px] font-mono font-bold tracking-wider text-teal-900/60 uppercase">
              VAULT
            </span>
          </div>

          {/* Central Joint Ring */}
          <div className="absolute left-1/2 -translate-x-1/2 h-full w-[2.5px] bg-white/70 shadow-xs z-10" />

          {/* Specular Gloss Reflection */}
          <div className="absolute top-1 inset-x-3 h-2 rounded-full bg-gradient-to-r from-white/85 via-white/60 to-white/20 blur-[0.4px] z-20" />
        </div>

        {/* Floating Pharmaceutical Glass Medicine Bottle with Dropper Pipette (Foreground Depth) */}
        <div
          ref={bottle1Ref}
          className="hidden lg:block absolute bottom-6 right-8 w-18 h-32 rounded-3xl bg-gradient-to-b from-cyan-900/60 via-slate-900/80 to-slate-950/90 border border-cyan-300/50 backdrop-blur-md shadow-[0_25px_50px_-10px_rgba(6,182,212,0.5)] overflow-hidden"
          style={{
            boxShadow:
              'inset 0 0 15px rgba(34,211,238,0.3), inset 0 2px 4px rgba(255,255,255,0.7), 0 20px 45px -8px rgba(6,182,212,0.5)',
          }}
        >
          {/* Black/Charcoal Dropper Bulb */}
          <div className="w-8 h-4 mx-auto mt-1 rounded-t-lg bg-gradient-to-t from-slate-700 to-slate-900 border-t border-slate-500 shadow-xs" />
          {/* Collar ring */}
          <div className="w-10 h-2 mx-auto bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-500 rounded-sm shadow-xs" />
          {/* Bottle Body Liquid Volume */}
          <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-cyan-600/70 via-teal-500/50 to-cyan-400/30 border-t border-cyan-200/70">
            <div className="absolute -top-1 inset-x-0 h-2 bg-cyan-200/60 rounded-full blur-[1px]" />
          </div>
          {/* Vertical Glass Specular Highlight Streak */}
          <div className="absolute top-8 left-2 w-1.5 h-20 bg-white/45 rounded-full blur-[0.6px]" />
          {/* Clinical Label */}
          <div className="absolute top-10 left-3 right-3 h-8 bg-slate-950/60 border border-cyan-400/40 rounded-md flex flex-col items-center justify-center p-0.5">
            <span className="text-[7px] font-mono font-bold text-cyan-300 tracking-wider">
              SOL. 100ml
            </span>
            <div className="w-7 h-0.5 bg-teal-400/80 rounded mt-0.5" />
          </div>
        </div>
      </div>
    </div>
  );
};
