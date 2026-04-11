import React from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Brain, ShieldCheck, History, Zap, Eye, Scan } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const GithubIcon = ({ size = 14 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
    </svg>
);

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.5, ease: EASE },
};

export const Landing: React.FC = () => {
  const { user, isGuest, loginAsGuest } = useAuth();
  const navigate = useNavigate();
  const loggedIn = user || isGuest;

  const handleGuest = () => { if (!loggedIn) loginAsGuest(); navigate('/dashboard'); };

  const features = [
    { icon: Brain,      title: 'CNN Classification',  desc: 'Deep neural network trained on 10+ skin conditions classifies your photo with high accuracy.' },
    { icon: Eye,        title: 'UNet Segmentation',    desc: 'PyTorch UNet generates pixel-level masks that highlight exactly the affected skin region.' },
    { icon: Zap,        title: 'Instant Results',      desc: 'Upload an image and receive the disease name, confidence score, and full description in seconds.' },
    { icon: History,    title: 'Scan Timeline',        desc: 'Every scan is saved. Track how conditions evolve over time with your complete history.' },
    { icon: ShieldCheck,'title': 'Firebase Secured',   desc: 'Firebase Auth protects your account. Images are stored on Cloudinary with user-scoped access.' },
    { icon: Scan,       title: 'Mobile & Web',         desc: 'The same backend powers our React Native mobile app and this web platform seamlessly.' },
  ];

  const steps = [
    { n: '01', title: 'Upload a photo',      desc: 'A close-up, well-lit photo of the affected skin area works best. Supports JPG and PNG.' },
    { n: '02', title: 'AI runs the models',  desc: 'CNN classifier identifies the condition while UNet generates a segmentation overlay of the area.' },
    { n: '03', title: 'Review your results', desc: 'Get the disease name, confidence %, UNet mask, and a full description — all in seconds.' },
  ];

  const stats = [
    { val: '10+',  label: 'Conditions detected' },
    { val: 'CNN',  label: 'Classification model' },
    { val: 'UNet', label: 'Segmentation model' },
    { val: '100%', label: 'Firebase secured' },
  ];

  return (
      <div className="space-y-8 pb-20">

        {/* ── Hero ── */}
        <section className="relative overflow-hidden rounded-2xl px-6 py-14 sm:px-10 sm:py-16"
                 style={{ background: 'var(--surface)', border: '1px solid var(--br)' }}>

          {/* Ambient blobs */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none select-none">
            <div className="blob absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full"
                 style={{ background: 'radial-gradient(circle, rgba(0,229,255,0.07) 0%, transparent 65%)' }} />
            <div className="blob absolute -bottom-24 right-0 w-96 h-96 rounded-full"
                 style={{ background: 'radial-gradient(circle, rgba(0,229,255,0.05) 0%, transparent 65%)', animationDelay: '-4s' }} />
          </div>

          <div className="relative grid gap-10 lg:grid-cols-2 lg:items-center">
            {/* Left */}
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.55, ease: EASE }} className="space-y-6">

              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest"
                   style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(0,229,255,0.2)' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
                Graduation Project · Faculty of Computers &amp; AI
              </div>

              <h1 className="font-extrabold leading-[1.05]"
                  style={{ fontSize: 'clamp(2.6rem, 5.5vw, 4rem)', color: 'var(--tx)' }}>
                Detect skin<br />
                <span style={{ color: 'var(--accent)' }}>conditions</span><br />
                with AI.
              </h1>

              <p className="text-base leading-relaxed max-w-lg" style={{ color: 'var(--tx2)' }}>
                Upload a photo of your skin — SkinSight's CNN + UNet models analyze it, identify the condition,
                and generate a pixel-level segmentation map in seconds.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link to={loggedIn ? '/dashboard' : '/signup'}
                      className="btn-accent px-5 py-2.5 rounded-xl text-sm inline-flex items-center gap-2">
                  {loggedIn ? 'Open dashboard' : 'Start for free'}
                  <ArrowRight size={14} />
                </Link>
                <button onClick={handleGuest} className="btn-ghost px-5 py-2.5 rounded-xl text-sm">
                  Try as Guest
                </button>
                <a href="https://github.com/Abdelrhman-Ahmed-XD/Skin-Disease-Detection-System"
                   target="_blank" rel="noreferrer"
                   className="btn-ghost px-5 py-2.5 rounded-xl text-sm inline-flex items-center gap-2">
                  <GithubIcon size={14} /> GitHub
                </a>
              </div>

              <p className="text-xs leading-relaxed" style={{ color: 'var(--tx3)' }}>
                ⚠ Results are not a medical diagnosis. Consult a dermatologist for any concerning skin changes.
              </p>
            </motion.div>

            {/* Right — Hero card */}
            <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.08, ease: EASE }}
                        className="float mx-auto w-full max-w-[360px] lg:max-w-none">
              <div className="rounded-2xl overflow-hidden"
                   style={{ background: '#070d1a', border: '1px solid rgba(0,229,255,0.15)',
                     boxShadow: '0 24px 64px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,229,255,0.05)' }}>
                {/* Window bar */}
                <div className="flex items-center justify-between px-4 py-3"
                     style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest"
                        style={{ color: 'rgba(0,229,255,0.6)' }}>SkinSight Analysis</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: 'rgba(0,229,255,0.1)', color: '#00e5ff' }}>● Live</span>
                </div>

                {/* Scan area */}
                <div className="relative h-48 overflow-hidden"
                     style={{ background: 'rgba(0,229,255,0.02)' }}>
                  <div className="absolute inset-0 opacity-30"
                       style={{ backgroundImage: 'repeating-linear-gradient(0deg,rgba(0,229,255,0.06) 0,rgba(0,229,255,0.06) 1px,transparent 1px,transparent 28px),repeating-linear-gradient(90deg,rgba(0,229,255,0.06) 0,rgba(0,229,255,0.06) 1px,transparent 1px,transparent 28px)' }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="pring w-28 h-28 rounded-full border-2 flex items-center justify-center"
                         style={{ borderColor: 'rgba(0,229,255,0.45)' }}>
                      <div className="w-20 h-20 rounded-full"
                           style={{ background: 'radial-gradient(circle at 35% 35%, #a0786a, #6c4a3e 55%, #412a22 100%)' }} />
                    </div>
                    {/* Corner brackets */}
                    {[['top-3 left-3','border-t-2 border-l-2'],['top-3 right-3','border-t-2 border-r-2'],
                      ['bottom-3 left-3','border-b-2 border-l-2'],['bottom-3 right-3','border-b-2 border-r-2']].map(([pos, bdr], i) => (
                        <div key={i} className={`absolute ${pos} w-5 h-5 ${bdr} rounded-sm`}
                             style={{ borderColor: 'rgba(0,229,255,0.65)' }} />
                    ))}
                  </div>
                  {/* Scan line */}
                  <div className="scan-line absolute left-0 right-0 h-px"
                       style={{ background: 'linear-gradient(90deg,transparent 0%,rgba(0,229,255,0.9) 50%,transparent 100%)',
                         animation: 'scanln 2.8s ease-in-out infinite' }} />
                </div>

                {/* Result preview */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5"
                         style={{ color: 'rgba(255,255,255,0.3)' }}>Detected condition</p>
                      <p className="text-sm font-bold" style={{ color: '#f0f6ff' }}>Melanocytic Nevus</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold"
                          style={{ background: 'rgba(0,229,255,0.12)', color: '#00e5ff' }}>94.5%</span>
                  </div>
                  <div className="confidence-track">
                    <div className="confidence-fill" style={{ width: '94.5%' }} />
                  </div>
                  <div className="flex gap-1.5">
                    {['CNN Model', 'UNet Mask', 'Saved'].map(t => (
                        <span key={t} className="px-2 py-0.5 rounded-md text-[10px] font-semibold"
                              style={{ background: 'rgba(0,229,255,0.08)', color: 'rgba(0,229,255,0.75)' }}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Stats ── */}
        <motion.section {...fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map(({ val, label }) => (
              <div key={label} className="rounded-xl px-5 py-4 text-center card-hover"
                   style={{ background: 'var(--surface)', border: '1px solid var(--br)' }}>
                <p className="text-xl font-extrabold" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", color: 'var(--accent)' }}>{val}</p>
                <p className="text-xs mt-0.5 font-medium" style={{ color: 'var(--tx3)' }}>{label}</p>
              </div>
          ))}
        </motion.section>

        {/* ── Features ── */}
        <section className="space-y-5">
          <motion.div {...fadeUp} className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>Capabilities</p>
            <h2 className="text-3xl font-extrabold" style={{ color: 'var(--tx)' }}>What SkinSight can do</h2>
            <p className="text-sm" style={{ color: 'var(--tx2)' }}>Built on deep learning models trained specifically for dermatological screening.</p>
          </motion.div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {features.map(({ icon: Icon, title, desc }, i) => (
                <motion.div key={title} {...fadeUp} transition={{ duration: 0.4, delay: i * 0.05 }}
                            className="rounded-xl p-5 card-hover"
                            style={{ background: 'var(--surface)', border: '1px solid var(--br)' }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                       style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                    <Icon size={17} />
                  </div>
                  <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--tx)' }}>{title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--tx2)' }}>{desc}</p>
                </motion.div>
            ))}
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="how" className="rounded-2xl px-6 py-10 sm:px-10 space-y-7"
                 style={{ background: 'var(--surface)', border: '1px solid var(--br)' }}>
          <motion.div {...fadeUp} className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>Process</p>
            <h2 className="text-3xl font-extrabold" style={{ color: 'var(--tx)' }}>Three steps to results</h2>
          </motion.div>
          <div className="grid gap-4 lg:grid-cols-3">
            {steps.map(({ n, title, desc }, i) => (
                <motion.div key={n} {...fadeUp} transition={{ duration: 0.4, delay: i * 0.07 }}
                            className="relative rounded-xl p-5 card-hover"
                            style={{ background: 'var(--surface2)', border: '1px solid var(--br)' }}>
              <span className="text-6xl font-extrabold absolute top-3 right-4 select-none pointer-events-none leading-none"
                    style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", color: 'var(--accent-dim)', opacity: 0.6 }}>{n}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest mb-2 block" style={{ color: 'var(--accent)' }}>Step {n}</span>
                  <h3 className="text-sm font-bold mb-1.5" style={{ color: 'var(--tx)' }}>{title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--tx2)' }}>{desc}</p>
                </motion.div>
            ))}
          </div>
        </section>

        {/* ── About + CTA ── */}
        <section className="grid gap-4 lg:grid-cols-2">
          <motion.div {...fadeUp} className="rounded-xl p-7 space-y-3"
                      style={{ background: 'var(--surface)', border: '1px solid var(--br)' }}>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>About</p>
            <h2 className="text-xl font-extrabold" style={{ color: 'var(--tx)' }}>Faculty of Computers &amp; Artificial Intelligence</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--tx2)' }}>
              SkinSight is a graduation project demonstrating end-to-end AI application development —
              from training deep learning models to deploying a full-stack product across mobile and web.
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--tx2)' }}>
              <strong style={{ color: 'var(--tx)' }}>Stack:</strong> React Native · React + Vite · Python Flask ·
              TensorFlow/Keras (CNN) · PyTorch (UNet) · Firebase · Cloudinary
            </p>
            <div className="flex gap-2 pt-1 flex-wrap">
              <a href="https://github.com/Abdelrhman-Ahmed-XD/Skin-Disease-Detection-System" target="_blank" rel="noreferrer"
                 className="btn-ghost px-4 py-2 rounded-xl text-xs inline-flex items-center gap-1.5">
                <GithubIcon size={13} />Mobile App
              </a>
              <a href="https://github.com/Abdelrhman-Ahmed-XD/Skin-Disease-Detection-System-Web" target="_blank" rel="noreferrer"
                 className="btn-ghost px-4 py-2 rounded-xl text-xs inline-flex items-center gap-1.5">
                <GithubIcon size={13} />Web App
              </a>
            </div>
          </motion.div>

          <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.07 }}
                      className="rounded-xl p-7 flex flex-col justify-between"
                      style={{ background: 'var(--accent)', color: '#070d1a' }}>
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Get started</p>
              <h2 className="text-xl font-extrabold" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                Ready to analyze your skin?
              </h2>
              <p className="text-sm leading-relaxed opacity-75">
                Create a free account to scan, save your history, and track conditions over time.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 mt-5">
              <Link to="/signup"
                    className="px-5 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-1.5 transition-all hover:-translate-y-0.5"
                    style={{ background: '#070d1a', color: '#00e5ff' }}>
                Create free account <ArrowRight size={13} />
              </Link>
              <button onClick={handleGuest}
                      className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5"
                      style={{ background: 'rgba(7,13,26,0.15)', color: '#070d1a', border: '1.5px solid rgba(7,13,26,0.25)' }}>
                Try as Guest
              </button>
            </div>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="text-center pt-4 pb-1" style={{ borderTop: '1px solid var(--br)' }}>
          <p className="text-xs" style={{ color: 'var(--tx3)' }}>
            © 2025 SkinSight · Graduation Project · Faculty of Computers &amp; AI ·{' '}
            <a href="https://github.com/Abdelrhman-Ahmed-XD/Skin-Disease-Detection-System"
               className="hover:underline" style={{ color: 'var(--accent)' }}>GitHub</a>
          </p>
        </footer>
      </div>
  );
};