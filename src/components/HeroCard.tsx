import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion'; // Added useInView

// ── Phase configuration ─────────────────────────────────────────────────────
type Phase = 'photo' | 'unet' | 'cnn' | 'score';
const PHASES: Phase[] = ['photo', 'unet', 'cnn', 'score'];
const DURATIONS: Record<Phase, number> = { photo: 3000, unet: 2800, cnn: 2800, score: 3800 };

const LESION_PATH = "M60,15 C76,11 92,22 96,39 C100,56 95,70 86,78 C77,86 64,89 51,86 C38,83 25,76 20,63 C15,50 19,34 30,25 C41,15 46,18 60,15 Z";

// ── Lesion SVG ──────────────────────────────────────────────────────────────
const LesionSVG = ({ opacity = 1, showSeg = false }: { opacity?: number; showSeg?: boolean }) => (
    <svg viewBox="0 0 120 105" style={{ width: '100%', height: '100%', opacity }}>
        <defs>
            <radialGradient id="lskin" cx="42%" cy="38%" r="58%">
                <stop offset="0%" stopColor="#7a4528"/>
                <stop offset="35%" stopColor="#4e2515"/>
                <stop offset="70%" stopColor="#8f5c3a"/>
                <stop offset="100%" stopColor="#b8895a" stopOpacity="0.5"/>
            </radialGradient>
            <radialGradient id="dark1" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#2e1208" stopOpacity="0.9"/>
                <stop offset="100%" stopColor="#2e1208" stopOpacity="0"/>
            </radialGradient>
            <radialGradient id="dark2" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#6b3520" stopOpacity="0.65"/>
                <stop offset="100%" stopColor="#6b3520" stopOpacity="0"/>
            </radialGradient>
            <radialGradient id="segGlow" cx="50%" cy="50%" r="55%">
                <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.22"/>
                <stop offset="100%" stopColor="#00e5ff" stopOpacity="0.04"/>
            </radialGradient>
            <filter id="sf"><feGaussianBlur stdDeviation="2.5"/></filter>
            <filter id="sf2"><feGaussianBlur stdDeviation="1.2"/></filter>
        </defs>

        <path d={LESION_PATH} fill="url(#lskin)"/>
        <ellipse cx="50" cy="44" rx="17" ry="13" fill="url(#dark1)" filter="url(#sf)"/>
        <ellipse cx="69" cy="57" rx="11" ry="9"  fill="url(#dark2)" filter="url(#sf2)"/>
        <ellipse cx="40" cy="62" rx="9"  ry="7"  fill="url(#dark1)" filter="url(#sf2)" opacity="0.45"/>
        <path d={LESION_PATH} fill="none" stroke="rgba(100,50,20,0.35)" strokeWidth="1.2"/>

        {showSeg && (
            <g>
                <path d={LESION_PATH} fill="url(#segGlow)"/>
                <path d={LESION_PATH} fill="none" stroke="#00e5ff" strokeWidth="1.8"
                      strokeDasharray="5 2.5" opacity="0.9"/>
                <line x1="58" y1="45" x2="58" y2="65" stroke="#00e5ff" strokeWidth="0.7" opacity="0.55"/>
                <line x1="46" y1="55" x2="72" y2="55" stroke="#00e5ff" strokeWidth="0.7" opacity="0.55"/>
                <circle cx="58" cy="55" r="2.5" fill="none" stroke="#00e5ff" strokeWidth="1" opacity="0.7"/>
                <line x1="20" y1="91" x2="96" y2="91" stroke="#00e5ff" strokeWidth="0.6" opacity="0.4"/>
                <text x="58" y="100" textAnchor="middle" fill="#00e5ff" fontSize="5.5" opacity="0.65">76 × 71 px</text>
                <rect x="36" y="43" width="44" height="11" rx="3" fill="rgba(0,229,255,0.12)" stroke="rgba(0,229,255,0.45)" strokeWidth="0.7"/>
                <text x="58" y="51" textAnchor="middle" fill="#00e5ff" fontSize="5.5" fontWeight="bold" opacity="0.9">LESION MASK</text>
            </g>
        )}
    </svg>
);

// ── CNN Layers ──────────────────────────────────────────────────────────────
const CNN_LAYERS = [
    { label: 'Input',   w: 44, color: '#60a5fa' },
    { label: 'Conv1',   w: 38, color: '#818cf8' },
    { label: 'Conv2',   w: 32, color: '#a78bfa' },
    { label: 'Pool',    w: 26, color: '#c084fc' },
    { label: 'Dense',   w: 20, color: '#e879f9' },
    { label: 'Output',  w: 14, color: '#00e5ff' },
];

const CNNViz: React.FC<{ active: boolean }> = ({ active }) => (
    <div className="flex items-end justify-center gap-1.5 h-20 px-2">
        {CNN_LAYERS.map(({ label, w, color }, i) => (
            <motion.div key={label} className="flex flex-col items-center gap-1"
                        initial={{ opacity: 0, scaleY: 0 }}
                        animate={active ? { opacity: 1, scaleY: 1 } : {}}
                        transition={{ delay: i * 0.15, duration: 0.4, ease: 'easeOut' }}
                        style={{ transformOrigin: 'bottom' }}>
                <motion.div
                    animate={active ? { opacity: [0.6, 1, 0.6] } : {}}
                    transition={{ repeat: Infinity, duration: 1.4, delay: i * 0.2 }}
                    style={{ width: w, height: w * 1.1, background: color + '33', border: `1.5px solid ${color}88`, borderRadius: 4 }}/>
                <span style={{ fontSize: 6, color: color + 'cc', fontWeight: 600 }}>{label}</span>
            </motion.div>
        ))}
    </div>
);

const ScoreCounter: React.FC<{ active: boolean; target: number }> = ({ active, target }) => {
    const [val, setVal] = useState(0);
    useEffect(() => {
        if (!active) { setVal(0); return; }
        let cur = 0;
        const step = target / 55;
        const iv = setInterval(() => {
            cur += step;
            if (cur >= target) { setVal(target); clearInterval(iv); }
            else setVal(parseFloat(cur.toFixed(1)));
        }, 22);
        return () => clearInterval(iv);
    }, [active, target]);
    return <motion.span style={{ color: '#00e5ff' }} animate={active ? { scale: [0.8, 1] } : {}}>{val.toFixed(1)}%</motion.span>;
};

const LABEL: Record<Phase, string> = {
    photo: '① Lesion captured',
    unet:  '② UNet segmentation',
    cnn:   '③ CNN processing',
    score: '④ Confidence score',
};

// ── Main HeroCard ────────────────────────────────────────────────────────────
export const HeroCard: React.FC = () => {
    const [phase, setPhase] = useState<Phase>('photo');
    const timerRef = useRef<ReturnType<typeof setTimeout>>();
    const containerRef = useRef<HTMLDivElement>(null);

    // ADDED: useInView hook so the animation waits until the card is visible
    const isInView = useInView(containerRef, { once: true, amount: 0.2 });

    useEffect(() => {
        if (!isInView) return; // Wait until the user scrolls to it

        const advance = (cur: Phase) => {
            const next = PHASES[(PHASES.indexOf(cur) + 1) % PHASES.length] as Phase;
            timerRef.current = setTimeout(() => { setPhase(next); advance(next); }, DURATIONS[cur]);
        };
        advance('photo');
        return () => clearTimeout(timerRef.current);
    }, [isInView]);

    const showSeg   = phase === 'unet' || phase === 'cnn' || phase === 'score';
    const lesionOp  = phase === 'unet' ? 0.45 : phase === 'cnn' || phase === 'score' ? 0.3 : 1;

    return (
        <div ref={containerRef} className="rounded-2xl overflow-hidden w-full border transition-all duration-300"
             style={{
                 background: 'var(--surface)',
                 borderColor: 'var(--br)',
                 boxShadow: '0 24px 64px rgba(0,0,0,0.1)',
             }}>

            {/* Window Chrome */}
            <div className="flex items-center justify-between px-4 py-3 border-b"
                 style={{
                     background: 'var(--bg2)',
                     borderColor: 'var(--br)'
                 }}>
                <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/60"/>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60"/>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/60"/>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: 'var(--tx2)' }}>SkinSight Analysis</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1"
                      style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent)' }}/>Live
        </span>
            </div>

            {/* Main Image Area (340px) */}
            <div className="relative mx-4 mt-4 rounded-xl overflow-hidden"
                 style={{ height: 340, background: 'rgba(0,0,0,0.6)', border: '1px solid var(--br)' }}>

                {/* ── Dynamic Skin Background ── */}
                <AnimatePresence>
                    {(phase === 'photo' || phase === 'unet') && (
                        <motion.div
                            key="skin-bg"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: phase === 'photo' ? 1 : 0.15 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.8 }}
                            className="absolute inset-0 z-0"
                            style={{
                                background: 'radial-gradient(circle, #e8c9a0 0%, #b8895a 100%)',
                                filter: 'contrast(1.1) brightness(0.9)',
                            }}
                        >
                            <div className="absolute inset-0 opacity-20"
                                 style={{ backgroundImage: 'radial-gradient(#8b5e3c 0.5px, transparent 0.5px)', backgroundSize: '8px 8px' }}/>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Digital Grid */}
                <div className="absolute inset-0 opacity-10 z-[1]"
                     style={{ backgroundImage: 'repeating-linear-gradient(0deg,rgba(0,229,255,0.06) 0,rgba(0,229,255,0.06) 1px,transparent 1px,transparent 24px),repeating-linear-gradient(90deg,rgba(0,229,255,0.06) 0,rgba(0,229,255,0.06) 1px,transparent 1px,transparent 24px)' }}/>

                {/* Corner Brackets */}
                {['top-3 left-3', 'top-3 right-3 rotate-90', 'bottom-3 left-3 -rotate-90', 'bottom-3 right-3 rotate-180'].map((cls, i) => (
                    <div key={i} className={`absolute ${cls} w-5 h-5 z-20 opacity-40`}>
                        <svg viewBox="0 0 16 16" fill="none"><path d="M0 6 L0 0 L6 0" stroke="#00e5ff" strokeWidth="1.8"/></svg>
                    </div>
                ))}

                {/* The Lesion Container */}
                <div className="absolute inset-0 flex items-center justify-center p-5 z-10">
                    <div style={{ width: 220, height: 210 }}>
                        <motion.div
                            style={{ width: '100%', height: '100%' }}
                            animate={{ opacity: lesionOp, scale: phase === 'photo' ? 0.95 : 1 }}
                            transition={{ duration: 0.7 }}>
                            <LesionSVG showSeg={showSeg}/>
                        </motion.div>
                    </div>
                </div>

                {/* CNN Layer Overlay */}
                <AnimatePresence>
                    {phase === 'cnn' && (
                        <motion.div key="cnn"
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px]">
                            <p className="text-[9px] font-bold uppercase tracking-widest mb-2 text-[#00e5ff]/60">Neural network layers</p>
                            <CNNViz active={phase === 'cnn'}/>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Score Overlay */}
                <AnimatePresence>
                    {phase === 'score' && (
                        <motion.div key="score-overlay"
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px]">
                            <div className="text-center">
                                <p className="text-3xl font-extrabold text-white">
                                    <ScoreCounter active={phase === 'score'} target={94.5}/>
                                </p>
                                <p className="text-[9px] uppercase tracking-widest mt-1 text-[#00e5ff]/50">confidence</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Phase Pill */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center z-30">
                    <AnimatePresence mode="wait">
                        <motion.div key={phase} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                                    className="px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest shadow-lg border"
                                    style={{
                                        background: 'var(--accent-dim)',
                                        color: 'var(--accent)',
                                        borderColor: 'var(--accent-glow)'
                                    }}>
                            {LABEL[phase]}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Progress Dots */}
                <div className="absolute top-4 left-0 right-0 flex justify-center gap-1.5 z-30">
                    {PHASES.map(p => (
                        <motion.div key={p} animate={{ width: phase === p ? 18 : 6, background: phase === p ? 'var(--accent)' : 'var(--br2)' }}
                                    transition={{ duration: 0.3 }}
                                    style={{ height: 5, borderRadius: 999 }}/>
                    ))}
                </div>
            </div>

            {/* Bottom Panel */}
            <div className="px-6 py-5 space-y-4">
                <AnimatePresence mode="wait">
                    {phase === 'score' ? (
                        <motion.div key="score" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <p className="text-[9px] uppercase tracking-widest font-bold mb-0.5"
                                       style={{ color: 'var(--tx3)' }}>Detected condition</p>
                                    <p className="text-sm font-extrabold" style={{ color: 'var(--tx)' }}>Melanocytic Nevus</p>
                                </div>
                                <p className="text-xl font-extrabold" style={{ color: 'var(--accent)' }}>
                                    <ScoreCounter active={phase === 'score'} target={94.5}/>
                                </p>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg2)' }}>
                                <motion.div className="h-full rounded-full"
                                            style={{ background: 'linear-gradient(90deg, #00b4d8, var(--accent))' }}
                                            initial={{ width: 0 }} animate={{ width: '94.5%' }} transition={{ duration: 1.3 }}/>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                            <div className="h-4 w-2/3 rounded-md animate-pulse" style={{ background: 'var(--bg2)' }}/>
                            <div className="h-1.5 rounded-full animate-pulse" style={{ background: 'var(--bg2)' }}/>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex gap-2 flex-wrap">
                    {[ { label: 'UNet Mask', active: showSeg }, { label: 'CNN Model', active: phase === 'cnn' || phase === 'score' }, { label: 'Saved', active: phase === 'score' }].map(({ label, active }) => (
                        <motion.span key={label} animate={{ opacity: active ? 1 : 0.25 }}
                                     className="px-2 py-0.5 rounded-md text-[10px] font-semibold border"
                                     style={{
                                         background: 'var(--accent-dim)',
                                         color: 'var(--accent)',
                                         borderColor: 'var(--br)'
                                     }}>
                            {label}
                        </motion.span>
                    ))}
                </div>
            </div>
        </div>
    );
};