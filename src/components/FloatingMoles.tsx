import React, { useId, useState, useEffect, useRef } from 'react';

type ShapeKey =
  | 'ROUND' | 'JAGGED' | 'FLAT_PATCH' | 'PAPULE'
  | 'MULTI_LOBE' | 'CLUSTER' | 'ASYMMETRIC' | 'RING'
  | 'SPECKLED' | 'OVAL';

interface MoleConfig {
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  driftX: number;
  driftY: number;
  shape: ShapeKey;
  skin: string;
  glow: string;
  opacity: number;
}

// ── 10 distinct lesion shapes ──────────────────────────────────────────────────

const SHAPES: Record<ShapeKey, (id: string) => React.ReactNode> = {

  ROUND: (id) => (
    <g>
      <defs>
        <radialGradient id={`s1-${id}`} cx="38%" cy="33%" r="65%">
          <stop offset="0%" stopColor="#c4986a"/><stop offset="100%" stopColor="#7a5230"/>
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="30" fill={`url(#s1-${id})`}/>
      <ellipse cx="40" cy="41" rx="9" ry="6" fill="rgba(255,255,255,0.13)"/>
    </g>
  ),

  JAGGED: (id) => (
    <g>
      <defs>
        <radialGradient id={`s2-${id}`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#3a1808"/><stop offset="100%" stopColor="#0d0504"/>
        </radialGradient>
      </defs>
      <path d="M50,16 C64,13 78,21 81,36 C85,53 76,65 65,70 C52,77 38,79 28,70 C18,62 17,47 22,35 C27,23 36,19 50,16 Z" fill={`url(#s2-${id})`}/>
      <circle cx="60" cy="44" r="5" fill="#1a0804" opacity="0.8"/>
      <circle cx="38" cy="58" r="4" fill="#0d0402" opacity="0.9"/>
    </g>
  ),

  FLAT_PATCH: (id) => (
    <g>
      <defs>
        <radialGradient id={`s3-${id}`} cx="45%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#d4a374"/><stop offset="100%" stopColor="#9c6a42"/>
        </radialGradient>
      </defs>
      <path d="M33,26 C45,20 62,22 72,31 C80,39 81,52 74,62 C67,72 54,77 42,74 C30,71 23,60 24,47 C25,35 22,32 33,26 Z"
            fill={`url(#s3-${id})`} opacity="0.85"/>
      <path d="M40,33 C50,28 63,32 69,41 C74,51 68,62 57,66 C46,70 35,65 31,55 C27,46 30,38 40,33 Z"
            fill="rgba(0,0,0,0.10)"/>
    </g>
  ),

  PAPULE: (id) => (
    <g>
      <defs>
        <radialGradient id={`s4-${id}`} cx="40%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#b87846"/>
          <stop offset="60%" stopColor="#8b5230"/>
          <stop offset="100%" stopColor="#5c3018"/>
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="54" rx="28" ry="22" fill={`url(#s4-${id})`}/>
      <ellipse cx="42" cy="44" rx="12" ry="8" fill="rgba(255,220,180,0.26)"/>
      <ellipse cx="40" cy="42" rx="5" ry="3" fill="rgba(255,240,210,0.34)"/>
    </g>
  ),

  MULTI_LOBE: (id) => (
    <g>
      <defs>
        <radialGradient id={`s5-${id}`} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#b8864e"/><stop offset="100%" stopColor="#5c3a16"/>
        </radialGradient>
      </defs>
      <path d="M50,20 C64,20 77,29 78,43 C79,55 71,65 59,71 C49,76 37,75 29,67 C21,58 20,46 26,36 C32,26 38,20 50,20 Z"
            fill={`url(#s5-${id})`}/>
      <circle cx="40" cy="38" r="9" fill="rgba(200,150,80,0.28)"/>
      <circle cx="61" cy="42" r="7" fill="rgba(200,150,80,0.22)"/>
      <circle cx="50" cy="57" r="8" fill="rgba(200,150,80,0.18)"/>
    </g>
  ),

  CLUSTER: (id) => (
    <g>
      <defs>
        <radialGradient id={`s6a-${id}`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#4a1e0e"/><stop offset="100%" stopColor="#1a0806"/>
        </radialGradient>
        <radialGradient id={`s6b-${id}`} cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#7b3818"/><stop offset="100%" stopColor="#2a0e06"/>
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="52" rx="22" ry="18" fill={`url(#s6a-${id})`}/>
      <circle cx="30" cy="46" r="9" fill={`url(#s6b-${id})`}/>
      <circle cx="68" cy="44" r="8" fill={`url(#s6b-${id})`}/>
      <circle cx="50" cy="31" r="7" fill={`url(#s6b-${id})`}/>
      <circle cx="37" cy="65" r="7" fill={`url(#s6b-${id})`}/>
      <circle cx="64" cy="63" r="6" fill={`url(#s6b-${id})`}/>
    </g>
  ),

  ASYMMETRIC: (id) => (
    <g>
      <defs>
        <radialGradient id={`s7-${id}`} cx="32%" cy="28%" r="75%">
          <stop offset="0%" stopColor="#5a2810"/>
          <stop offset="50%" stopColor="#2e1008"/>
          <stop offset="100%" stopColor="#100402"/>
        </radialGradient>
      </defs>
      <path d="M28,30 C37,17 54,15 66,24 C78,33 83,49 78,62 C73,74 60,79 48,77 C36,75 27,67 24,55 C21,43 20,43 28,30 Z"
            fill={`url(#s7-${id})`}/>
      <path d="M35,36 C42,27 55,26 64,33 C72,40 75,52 70,62 C65,70 54,74 44,70 C34,66 30,57 30,47 C30,38 29,44 35,36 Z"
            fill="rgba(0,0,0,0.22)"/>
    </g>
  ),

  RING: (id) => (
    <g>
      <defs>
        <radialGradient id={`s8-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e8c8a0" stopOpacity="0.2"/>
          <stop offset="50%" stopColor="#e8c8a0" stopOpacity="0.08"/>
          <stop offset="62%" stopColor="#a06830"/>
          <stop offset="100%" stopColor="#6a3e18"/>
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="32" fill={`url(#s8-${id})`}/>
      <circle cx="50" cy="50" r="16" fill="rgba(232,200,160,0.12)"/>
    </g>
  ),

  SPECKLED: (id) => (
    <g>
      <defs>
        <radialGradient id={`s9-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c49060"/><stop offset="100%" stopColor="#885030"/>
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="50" rx="30" ry="26" fill={`url(#s9-${id})`} opacity="0.7"/>
      <circle cx="44" cy="40" r="3.5" fill="#5a2810" opacity="0.8"/>
      <circle cx="57" cy="38" r="2.5" fill="#3a1808" opacity="0.9"/>
      <circle cx="38" cy="52" r="3" fill="#4a2010" opacity="0.8"/>
      <circle cx="61" cy="49" r="3.5" fill="#5a2010" opacity="0.75"/>
      <circle cx="50" cy="60" r="3" fill="#3a1808" opacity="0.85"/>
      <circle cx="42" cy="63" r="2.5" fill="#4a2010" opacity="0.70"/>
      <circle cx="58" cy="61" r="2" fill="#2a1008" opacity="0.90"/>
    </g>
  ),

  OVAL: (id) => (
    <g>
      <defs>
        <radialGradient id={`s10-${id}`} cx="36%" cy="34%" r="70%">
          <stop offset="0%" stopColor="#b88048"/><stop offset="100%" stopColor="#6a4020"/>
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="50" rx="38" ry="20" fill={`url(#s10-${id})`}/>
      <ellipse cx="38" cy="44" rx="12" ry="6" fill="rgba(255,255,255,0.10)"/>
    </g>
  ),
};

// skin background and glow per shape
const SHAPE_STYLE: Record<ShapeKey, { skin: string; glow: string }> = {
  ROUND:      { skin: '#e8b896', glow: 'rgba(196,152,106,0.55)' },
  JAGGED:     { skin: '#d49070', glow: 'rgba(80,20,8,0.60)' },
  FLAT_PATCH: { skin: '#e8c0a0', glow: 'rgba(180,120,60,0.50)' },
  PAPULE:     { skin: '#dca882', glow: 'rgba(200,130,70,0.55)' },
  MULTI_LOBE: { skin: '#e5aa84', glow: 'rgba(184,134,78,0.55)' },
  CLUSTER:    { skin: '#d8907a', glow: 'rgba(120,50,20,0.60)' },
  ASYMMETRIC: { skin: '#c89078', glow: 'rgba(80,24,10,0.60)' },
  RING:       { skin: '#e8c090', glow: 'rgba(200,120,50,0.52)' },
  SPECKLED:   { skin: '#ddb080', glow: 'rgba(180,90,40,0.55)' },
  OVAL:       { skin: '#e8b890', glow: 'rgba(180,130,70,0.50)' },
};

interface MoleProps extends MoleConfig {
  mouse: { x: number; y: number };
  cw: number;
  ch: number;
}

const Mole: React.FC<MoleProps> = ({
  x, y, size, delay, duration, driftX, driftY,
  shape, opacity, mouse, cw, ch,
}) => {
  const uid = useId().replace(/:/g, '');
  const {  glow } = SHAPE_STYLE[shape];
  const animName = `fm-${uid}`;

  // Smooth flee
  let fleeX = 0, fleeY = 0;
  if (cw > 0 && ch > 0) {
    const cx = (x / 100) * cw + size / 2;
    const cy = (y / 100) * ch + size / 2;
    const dx = cx - mouse.x;
    const dy = cy - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const FLEE_RADIUS = 145;
    if (dist < FLEE_RADIUS && dist > 0) {
      const t = (FLEE_RADIUS - dist) / FLEE_RADIUS;
      const force = t * t * 42;
      fleeX = (dx / dist) * force;
      fleeY = (dy / dist) * force;
    }
  }

  const isFleeing = fleeX !== 0 || fleeY !== 0;

  return (
    <>
      <style>{`
        @keyframes ${animName} {
          0%   { transform: translate(0px,0px) rotate(0deg); }
          25%  { transform: translate(${driftX * 0.6}px,${-driftY * 0.8}px) rotate(${driftX > 0 ? 3 : -3}deg); }
          50%  { transform: translate(${driftX}px,${-driftY}px) rotate(0deg); }
          75%  { transform: translate(${driftX * 0.3}px,${-driftY * 0.4}px) rotate(${driftX > 0 ? -2 : 2}deg); }
          100% { transform: translate(0px,0px) rotate(0deg); }
        }
      `}</style>
      {/* Outer: flee offset */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: `${x}%`,
          top: `${y}%`,
          width: size,
          height: size,
          opacity,
          pointerEvents: 'none',
          filter: `drop-shadow(0 0 ${size * 0.30}px ${glow})`,
          transform: `translate(${fleeX}px, ${fleeY}px)`,
          transition: isFleeing
            ? 'transform 0.42s cubic-bezier(0.2, 0.8, 0.3, 1)'
            : 'transform 1.9s cubic-bezier(0.22, 1, 0.36, 1)',
          willChange: 'transform',
        }}
      >
        {/* Inner: CSS keyframe drift */}
        <div style={{ animation: `${animName} ${duration}s ease-in-out ${delay}s infinite`, willChange: 'transform' }}>
          <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: 'block' }}>
            {SHAPES[shape](uid)}
          </svg>
        </div>
      </div>
    </>
  );
};

// ── Container that tracks mouse via window listener ────────────────────────────

const FloatingMolesBase: React.FC<{ moles: MoleConfig[]; fullPage?: boolean }> = ({ moles, fullPage = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: -9999, y: -9999 });
  const [csize, setCsize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setCsize({ w: e.contentRect.width, h: e.contentRect.height })
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right &&
          e.clientY >= r.top  && e.clientY <= r.bottom) {
        setMouse({ x: e.clientX - r.left, y: e.clientY - r.top });
      } else {
        setMouse({ x: -9999, y: -9999 });
      }
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div
      ref={containerRef}
      className={fullPage
        ? 'hidden md:block fixed inset-0 overflow-hidden pointer-events-none select-none'
        : 'hidden md:block absolute inset-0 overflow-hidden rounded-2xl pointer-events-none select-none'
      }
      style={fullPage ? { zIndex: 0 } : undefined}
      aria-hidden="true"
    >
      {moles.map((m, i) => (
        <Mole key={i} {...m} mouse={mouse} cw={csize.w} ch={csize.h} />
      ))}
    </div>
  );
};

// ── Mole sets ─────────────────────────────────────────────────────────────────

const HERO_MOLES: MoleConfig[] = [
  { shape: 'SPECKLED',      x: 2,  y: 4,  size: 110, delay: 0,   duration: 9,  driftX: 12,  driftY: 14,  skin: '#e8b896', glow: 'rgba(196,152,106,0.60)', opacity: 0.74 },
  { shape: 'JAGGED',     x: 86, y: 5,  size: 70, delay: 1.5, duration: 11, driftX: -10, driftY: 20,  skin: '#d49070', glow: 'rgba(80,20,8,0.60)',     opacity: 0.75 },
  { shape: 'MULTI_LOBE', x: 4,  y: 58, size: 74, delay: 3,   duration: 13, driftX: 10,  driftY: -14, skin: '#e5aa84', glow: 'rgba(184,134,78,0.55)', opacity: 0.72 },
  { shape: 'CLUSTER',    x: 83, y: 52, size: 64, delay: 0.8, duration: 10, driftX: -12, driftY: 10,  skin: '#d8907a', glow: 'rgba(120,50,20,0.60)',     opacity: 0.68 },
  { shape: 'ASYMMETRIC', x: 11, y: 32, size: 56, delay: 4,   duration: 12, driftX: 8,   driftY: 9,   skin: '#c89078', glow: 'rgba(80,24,10,0.60)',      opacity: 0.65 },
  { shape: 'SPECKLED',   x: 90, y: 76, size: 62, delay: 1,   duration: 15, driftX: -6,  driftY: -8,  skin: '#ddb080', glow: 'rgba(180,90,40,0.55)',   opacity: 0.70 },
  { shape: 'FLAT_PATCH', x: 20, y: 10, size: 54, delay: 2.2, duration: 14, driftX: 9,   driftY: 7,   skin: '#e8c0a0', glow: 'rgba(180,120,60,0.50)', opacity: 0.62 },
  { shape: 'PAPULE',     x: 70, y: 68, size: 58, delay: 3.5, duration: 12, driftX: -7,  driftY: -10, skin: '#dca882', glow: 'rgba(200,130,70,0.55)',  opacity: 0.65 },
  { shape: 'PAPULE',       x: 50, y: 3,  size: 48, delay: 2,   duration: 16, driftX: 5,   driftY: 9,   skin: '#e8c090', glow: 'rgba(200,120,50,0.52)', opacity: 0.62 },
];

const HOW_MOLES: MoleConfig[] = [
  { shape: 'ROUND',      x: 3,  y: 8,  size: 52, delay: 0,   duration: 11, driftX: 9,   driftY: 12,  skin: '#e8b896', glow: 'rgba(196,152,106,0.58)', opacity: 0.65 },
  { shape: 'JAGGED',     x: 90, y: 7,  size: 46, delay: 2,   duration: 13, driftX: -8,  driftY: 14,  skin: '#d49070', glow: 'rgba(80,20,8,0.60)',     opacity: 0.68 },
  { shape: 'MULTI_LOBE', x: 3,  y: 55, size: 50, delay: 1.5, duration: 15, driftX: 8,   driftY: -10, skin: '#e5aa84', glow: 'rgba(184,134,78,0.55)', opacity: 0.66 },
  { shape: 'CLUSTER',    x: 89, y: 52, size: 44, delay: 0.5, duration: 12, driftX: -9,  driftY: 8,   skin: '#d8907a', glow: 'rgba(120,50,20,0.58)',     opacity: 0.62 },
  { shape: 'PAPULE',       x: 46, y: 4,  size: 36, delay: 3,   duration: 16, driftX: 5,   driftY: 8,   skin: '#e8c090', glow: 'rgba(200,120,50,0.52)', opacity: 0.58 },
  { shape: 'SPECKLED',   x: 93, y: 32, size: 40, delay: 1,   duration: 14, driftX: -6,  driftY: -7,  skin: '#ddb080', glow: 'rgba(180,90,40,0.55)',   opacity: 0.62 },
  { shape: 'FLAT_PATCH', x: 2,  y: 34, size: 38, delay: 4,   duration: 13, driftX: 7,   driftY: -6,  skin: '#e8c0a0', glow: 'rgba(180,120,60,0.50)', opacity: 0.60 },
  { shape: 'OVAL',       x: 44, y: 88, size: 44, delay: 2.5, duration: 11, driftX: -5,  driftY: -8,  skin: '#e8b890', glow: 'rgba(180,130,70,0.50)', opacity: 0.60 },
  { shape: 'PAPULE',     x: 20, y: 68, size: 38, delay: 1.8, duration: 14, driftX: 7,   driftY: -8,  skin: '#dca882', glow: 'rgba(200,130,70,0.55)',  opacity: 0.62 },
  { shape: 'ASYMMETRIC', x: 70, y: 70, size: 42, delay: 3.3, duration: 12, driftX: -7,  driftY: -8,  skin: '#c89078', glow: 'rgba(80,24,10,0.58)',      opacity: 0.62 },
  { shape: 'OVAL',       x: 60, y: 18, size: 32, delay: 5,   duration: 17, driftX: -5,  driftY: 8,   skin: '#e8b890', glow: 'rgba(180,130,70,0.50)', opacity: 0.55 },
  { shape: 'SPECKLED',   x: 26, y: 22, size: 34, delay: 0.8, duration: 15, driftX: 6,   driftY: 9,   skin: '#ddb080', glow: 'rgba(180,90,40,0.52)',   opacity: 0.57 },
];

const PAGE_MOLES: MoleConfig[] = [
  // Top strip
  { shape: 'ROUND',      x: 2,  y: 3,  size: 72, delay: 0,   duration: 10, driftX: 10,  driftY: 12,  skin: '#e8b896', glow: 'rgba(196,152,106,0.58)', opacity: 0.58 },
  { shape: 'JAGGED',     x: 88, y: 2,  size: 56, delay: 1.5, duration: 12, driftX: -9,  driftY: 14,  skin: '#d49070', glow: 'rgba(80,20,8,0.60)',     opacity: 0.55 },
  { shape: 'PAPULE',       x: 47, y: 1,  size: 34, delay: 2,   duration: 16, driftX: 5,   driftY: 8,   skin: '#e8c090', glow: 'rgba(200,120,50,0.52)', opacity: 0.48 },
  { shape: 'FLAT_PATCH', x: 23, y: 9,  size: 40, delay: 6,   duration: 11, driftX: 8,   driftY: 7,   skin: '#e8c0a0', glow: 'rgba(180,120,60,0.50)', opacity: 0.50 },
  { shape: 'OVAL',       x: 64, y: 7,  size: 28, delay: 3.2, duration: 18, driftX: -5,  driftY: 9,   skin: '#e8b890', glow: 'rgba(180,130,70,0.50)', opacity: 0.46 },
  // Upper-mid
  { shape: 'ASYMMETRIC', x: 13, y: 26, size: 46, delay: 4,   duration: 13, driftX: 8,   driftY: 9,   skin: '#c89078', glow: 'rgba(80,24,10,0.58)',     opacity: 0.52 },
  { shape: 'SPECKLED',   x: 76, y: 20, size: 36, delay: 2.5, duration: 15, driftX: -6,  driftY: -7,  skin: '#ddb080', glow: 'rgba(180,90,40,0.55)',   opacity: 0.50 },
  { shape: 'PAPULE',     x: 38, y: 17, size: 26, delay: 5,   duration: 14, driftX: 5,   driftY: 8,   skin: '#dca882', glow: 'rgba(200,130,70,0.52)',  opacity: 0.44 },
  { shape: 'CLUSTER',    x: 56, y: 24, size: 22, delay: 7,   duration: 19, driftX: -4,  driftY: 6,   skin: '#d8907a', glow: 'rgba(120,50,20,0.52)',     opacity: 0.40 },
  // Left/right edges mid-height
  { shape: 'MULTI_LOBE', x: 1,  y: 46, size: 64, delay: 3,   duration: 14, driftX: 9,   driftY: -11, skin: '#e5aa84', glow: 'rgba(184,134,78,0.55)', opacity: 0.56 },
  { shape: 'CLUSTER',    x: 92, y: 44, size: 54, delay: 0.8, duration: 11, driftX: -10, driftY: 9,   skin: '#d8907a', glow: 'rgba(120,50,20,0.58)',     opacity: 0.54 },
  { shape: 'PAPULE',       x: 4,  y: 30, size: 32, delay: 5.5, duration: 17, driftX: 6,   driftY: -5,  skin: '#e8c090', glow: 'rgba(200,120,50,0.50)', opacity: 0.46 },
  { shape: 'SPECKLED',   x: 94, y: 30, size: 30, delay: 3.8, duration: 16, driftX: -5,  driftY: -6,  skin: '#ddb080', glow: 'rgba(180,90,40,0.50)',   opacity: 0.44 },
  // Center (subtle, small)
  { shape: 'OVAL',       x: 50, y: 38, size: 20, delay: 8,   duration: 21, driftX: 4,   driftY: 5,   skin: '#e8b890', glow: 'rgba(180,130,70,0.48)', opacity: 0.38 },
  { shape: 'ROUND',      x: 30, y: 52, size: 24, delay: 1.2, duration: 17, driftX: 5,   driftY: -6,  skin: '#e8b896', glow: 'rgba(196,152,106,0.50)', opacity: 0.38 },
  { shape: 'FLAT_PATCH', x: 68, y: 48, size: 22, delay: 5.5, duration: 19, driftX: -4,  driftY: 5,   skin: '#e8c0a0', glow: 'rgba(180,120,60,0.48)', opacity: 0.36 },
  // Lower-mid
  { shape: 'JAGGED',     x: 55, y: 60, size: 30, delay: 1,   duration: 13, driftX: -5,  driftY: -8,  skin: '#d49070', glow: 'rgba(80,20,8,0.55)',     opacity: 0.46 },
  { shape: 'RING',       x: 18, y: 64, size: 44, delay: 3.5, duration: 17, driftX: 6,   driftY: -7,  skin: '#e8c090', glow: 'rgba(200,120,50,0.52)', opacity: 0.50 },
  { shape: 'FLAT_PATCH', x: 79, y: 57, size: 50, delay: 2.2, duration: 14, driftX: -7,  driftY: -9,  skin: '#e8c0a0', glow: 'rgba(180,120,60,0.52)', opacity: 0.52 },
  { shape: 'PAPULE',     x: 9,  y: 70, size: 36, delay: 4.3, duration: 12, driftX: 7,   driftY: -8,  skin: '#dca882', glow: 'rgba(200,130,70,0.52)',  opacity: 0.48 },
  // Bottom strip
  { shape: 'SPECKLED',   x: 93, y: 72, size: 48, delay: 1,   duration: 15, driftX: -5,  driftY: -7,  skin: '#ddb080', glow: 'rgba(180,90,40,0.55)',   opacity: 0.54 },
  { shape: 'MULTI_LOBE', x: 4,  y: 79, size: 60, delay: 2.8, duration: 13, driftX: 8,   driftY: -10, skin: '#e5aa84', glow: 'rgba(184,134,78,0.55)', opacity: 0.56 },
  { shape: 'ASYMMETRIC', x: 84, y: 83, size: 56, delay: 0.5, duration: 11, driftX: -8,  driftY: -10, skin: '#c89078', glow: 'rgba(80,24,10,0.58)',     opacity: 0.54 },
  { shape: 'ROUND',      x: 40, y: 86, size: 38, delay: 1.2, duration: 14, driftX: 5,   driftY: -7,  skin: '#e8b896', glow: 'rgba(196,152,106,0.55)', opacity: 0.50 },
  { shape: 'SPECKLED',   x: 60, y: 91, size: 44, delay: 0.5, duration: 13, driftX: 6,   driftY: -8,  skin: '#ddb080', glow: 'rgba(180,90,40,0.55)',   opacity: 0.52 },
  { shape: 'OVAL',       x: 2,  y: 89, size: 32, delay: 5,   duration: 12, driftX: 6,   driftY: -6,  skin: '#e8b890', glow: 'rgba(180,130,70,0.50)', opacity: 0.48 },
  { shape: 'CLUSTER',    x: 24, y: 93, size: 30, delay: 6,   duration: 16, driftX: 5,   driftY: -6,  skin: '#d8907a', glow: 'rgba(120,50,20,0.52)',     opacity: 0.44 },
];

export const FloatingMoles: React.FC = () => <FloatingMolesBase moles={HERO_MOLES} />;
export const FloatingMolesHowItWorks: React.FC = () => <FloatingMolesBase moles={HOW_MOLES} />;
export const FloatingMolesPage: React.FC = () => <FloatingMolesBase moles={PAGE_MOLES} fullPage />;

// ── Mobile-only: pure CSS drift, no mouse tracking ────────────────────────────

interface SimpleMoleProps extends MoleConfig {}

const SimpleMole: React.FC<SimpleMoleProps> = ({ x, y, size, delay, duration, driftX, driftY, shape, opacity }) => {
  const uid = useId().replace(/:/g, '');
  const {  glow } = SHAPE_STYLE[shape];
  const animName = `fm-m-${uid}`;
  return (
    <>
      <style>{`
        @keyframes ${animName} {
          0%,100% { transform: translate(0px,0px) rotate(0deg); }
          50%      { transform: translate(${driftX}px,${-driftY}px) rotate(${driftX > 0 ? 2 : -2}deg); }
        }
      `}</style>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', left: `${x}%`, top: `${y}%`,
          width: size, height: size, opacity,
          pointerEvents: 'none',
          filter: `drop-shadow(0 0 ${size * 0.30}px ${glow})`,
          animation: `${animName} ${duration}s ease-in-out ${delay}s infinite`,
          willChange: 'transform',
        }}
      >
        <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: 'block' }}>
          {SHAPES[shape](uid)}
        </svg>
      </div>
    </>
  );
};

const MOBILE_MOLES: MoleConfig[] = [
  { shape: 'ROUND',      x: 1,  y: 5,  size: 34, delay: 0,   duration: 10, driftX: 7,  driftY: 8,  skin: '#e8b896', glow: 'rgba(196,152,106,0.55)', opacity: 0.55 },
  { shape: 'JAGGED',     x: 82, y: 4,  size: 28, delay: 2,   duration: 12, driftX: -6, driftY: 9,  skin: '#d49070', glow: 'rgba(80,20,8,0.58)',     opacity: 0.58 },
  { shape: 'MULTI_LOBE', x: 2,  y: 58, size: 30, delay: 1.5, duration: 14, driftX: 6,  driftY: -7, skin: '#e5aa84', glow: 'rgba(184,134,78,0.52)', opacity: 0.56 },
  { shape: 'FLAT_PATCH',    x: 80, y: 55, size: 26, delay: 3,   duration: 11, driftX: -5, driftY: 6,  skin: '#d8907a', glow: 'rgba(120,50,20,0.55)',     opacity: 0.52 },
  { shape: 'SPECKLED',   x: 85, y: 82, size: 22, delay: 1,   duration: 15, driftX: -5, driftY: -6, skin: '#ddb080', glow: 'rgba(180,90,40,0.52)',   opacity: 0.50 },
  { shape: 'OVAL',       x: 3,  y: 85, size: 18, delay: 4,   duration: 13, driftX: 5,  driftY: -5, skin: '#e8b890', glow: 'rgba(180,130,70,0.50)', opacity: 0.48 },
];

export const FloatingMolesMobile: React.FC = () => (
  <div
    className="block md:hidden fixed inset-0 overflow-hidden pointer-events-none select-none"
    style={{ zIndex: 0 }}
    aria-hidden="true"
  >
    {MOBILE_MOLES.map((m, i) => <SimpleMole key={i} {...m} />)}
  </div>
);

// ── Hero section moles for mobile (absolute inside hero card, no mouse tracking) ─

const HERO_MOBILE_MOLES: MoleConfig[] = [
  // top-right / top-left pair
  { shape: 'SPECKLED',   x: 83, y: 3,  size: 70, delay: 0,   duration: 11, driftX: -8,  driftY: 12,  skin: '#d49070', glow: 'rgba(80,20,8,0.60)',     opacity: 0.72 },
  { shape: 'OVAL',       x: 2,  y: 4,  size: 50, delay: 3,   duration: 14, driftX: 7,   driftY: 10,  skin: '#ddb080', glow: 'rgba(180,90,40,0.55)',   opacity: 0.62 },
  // mid-right / mid-left pair
  { shape: 'ASYMMETRIC', x: 80, y: 43, size: 54, delay: 1.5, duration: 12, driftX: -7,  driftY: -9,  skin: '#c89078', glow: 'rgba(80,24,10,0.60)',     opacity: 0.65 },
  { shape: 'MULTI_LOBE', x: 1,  y: 47, size: 50, delay: 2,   duration: 13, driftX: 8,   driftY: -10, skin: '#e5aa84', glow: 'rgba(184,134,78,0.55)', opacity: 0.68 },
  // bottom-right / bottom-left pair
  { shape: 'CLUSTER',    x: 83, y: 79, size: 48, delay: 0.8, duration: 10, driftX: -6,  driftY: -8,  skin: '#d8907a', glow: 'rgba(120,50,20,0.60)',     opacity: 0.65 },
  { shape: 'FLAT_PATCH', x: 2,  y: 77, size: 44, delay: 4,   duration: 15, driftX: 6,   driftY: -7,  skin: '#e8c0a0', glow: 'rgba(180,120,60,0.50)', opacity: 0.60 },
];

export const FloatingMolesHeroMobile: React.FC = () => (
  <div
    className="block md:hidden absolute inset-0 overflow-hidden rounded-2xl pointer-events-none select-none"
    aria-hidden="true"
  >
    {HERO_MOBILE_MOLES.map((m, i) => <SimpleMole key={i} {...m} />)}
  </div>
);
