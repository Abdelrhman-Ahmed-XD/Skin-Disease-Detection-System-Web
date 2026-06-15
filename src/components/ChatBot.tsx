import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, User, Loader2, AlertCircle, ExternalLink } from 'lucide-react';

const API_BASE = import.meta.env.VITE_FLASK_URL || import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';
const MAX_CHARS = 500;
const WARN_AT   = 400;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const WELCOME_MARKER = '__welcome__';
const WELCOME: Message = { role: 'assistant', content: WELCOME_MARKER };

const SUGGESTED = [
  'What is melanoma?',
  'How do I upload a photo?',
  "What's the difference between NV and MEL?",
  'What does confidence % mean?',
];

// Maps known source names → homepage URLs
const SOURCE_URLS: Record<string, string> = {
  'american academy of dermatology': 'https://www.aad.org',
  'aad': 'https://www.aad.org',
  'mayo clinic': 'https://www.mayoclinic.org',
  'world health organization': 'https://www.who.int',
  'who': 'https://www.who.int',
  'national cancer institute': 'https://www.cancer.gov',
  'nci': 'https://www.cancer.gov',
  'skin cancer foundation': 'https://www.skincancer.org',
  'isic': 'https://www.isic-archive.com',
  'medlineplus': 'https://medlineplus.gov',
  'pubmed': 'https://pubmed.ncbi.nlm.nih.gov',
};

const SKIN_KEYWORDS = [
  'melanoma', 'melanocytic', 'nevus', 'basal cell', 'bcc', 'bkl', 'keratosis',
  'lesion', 'cancer', 'carcinoma', 'skin condition', 'dermoscopy', 'dermatolog',
  'malignant', 'benign growth', 'skin cancer',
];

function hasSkinContent(text: string) {
  const l = text.toLowerCase();
  return SKIN_KEYWORDS.some(k => l.includes(k));
}

// ── Inline renderer: **bold**, *italic*, [text](url) ──────────────────────────
function inlineRender(text: string): React.ReactNode {
  const parts = text.split(/(\[[^\]]+\]\(https?:\/\/[^\)]+\)|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    const link = p.match(/^\[([^\]]+)\]\((https?:\/\/[^\)]+)\)$/);
    if (link)
      return (
        <a key={i} href={link[2]} target="_blank" rel="noreferrer"
           style={{ color: 'var(--accent)', textDecoration: 'underline dotted', cursor: 'pointer' }}>
          {link[1]}
        </a>
      );
    if (p.startsWith('**') && p.endsWith('**') && p.length > 4)
      return <strong key={i} style={{ color: 'var(--tx)', fontWeight: 700 }}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('*') && p.endsWith('*') && p.length > 2 && !p.startsWith('**'))
      return <em key={i} style={{ fontStyle: 'italic', color: 'var(--tx2)' }}>{p.slice(1, -1)}</em>;
    return p;
  });
}

// ── Full markdown renderer ────────────────────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  const refs: { label: string; url: string }[] = [];
  let inSources = false;
  let paraBuffer: string[] = [];
  let bulletBuffer: string[] = [];
  let numBuffer: string[] = [];

  const bodyStyle: React.CSSProperties = {
    margin: 0, color: 'var(--tx2)', lineHeight: 1.65, fontSize: '0.83rem',
    fontFamily: "'Inter', sans-serif",
  };
  const bulletStyle: React.CSSProperties = {
    color: 'var(--tx2)', lineHeight: 1.65, fontSize: '0.83rem',
    fontFamily: "'Inter', sans-serif",
  };

  const flushPara = (key: string) => {
    if (!paraBuffer.length) return;
    const t = paraBuffer.join(' ').trim();
    if (t) nodes.push(<p key={key} style={bodyStyle}>{inlineRender(t)}</p>);
    paraBuffer = [];
  };

  const flushBullets = (key: string) => {
    if (!bulletBuffer.length) return;
    nodes.push(
      <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {bulletBuffer.map((l, li) => (
          <div key={li} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--accent)', fontWeight: 800, fontSize: '0.7rem', lineHeight: '1.65', flexShrink: 0, marginTop: '1px' }}>•</span>
            <span style={bulletStyle}>{inlineRender(l)}</span>
          </div>
        ))}
      </div>
    );
    bulletBuffer = [];
  };

  const flushNums = (key: string) => {
    if (!numBuffer.length) return;
    nodes.push(
      <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {numBuffer.map((l, li) => (
          <div key={li} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.7rem', lineHeight: '1.65', flexShrink: 0, minWidth: '14px', marginTop: '1px' }}>{li + 1}.</span>
            <span style={bulletStyle}>{inlineRender(l)}</span>
          </div>
        ))}
      </div>
    );
    numBuffer = [];
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trimEnd();
    const k = idx;

    // Blank line — flush everything
    if (!line.trim()) {
      flushBullets(`b${k}`); flushNums(`n${k}`); flushPara(`p${k}`);
      return;
    }

    // Heading — either ### syntax or a short label ending with colon
    const isHashHeading = /^#{1,6} /.test(line);
    const isLabelHeading = !isHashHeading && /^[A-Z][^.!?\n]{0,48}:$/.test(line.trim()) && !/^[-*\d]/.test(line.trim());
    if (isHashHeading || isLabelHeading) {
      flushBullets(`b${k}`); flushNums(`n${k}`); flushPara(`p${k}`);
      const content = isHashHeading ? line.replace(/^#+\s*/, '') : line.trim().replace(/:$/, '');
      if (/source|reference/i.test(content)) { inSources = true; return; }
      inSources = false;
      nodes.push(
        <div key={`h${k}`} style={{ marginTop: '2px' }}>
          <span style={{
            display: 'inline-block',
            padding: '2px 9px',
            borderRadius: '999px',
            background: 'var(--accent-dim)',
            color: 'var(--accent)',
            fontSize: '0.63rem',
            fontWeight: 700,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            fontFamily: "'Inter', sans-serif",
            border: '1px solid rgba(0,229,255,0.22)',
          }}>
            {inlineRender(content)}
          </span>
        </div>
      );
      return;
    }

    // Sources section list items
    if (inSources && /^[-*\d]/.test(line.trim())) {
      const raw = line.replace(/^[-*\d.]\s*/, '').trim();
      const mdLink = raw.match(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/);
      if (mdLink) {
        refs.push({ label: mdLink[1], url: mdLink[2] });
      } else {
        const lower = raw.toLowerCase();
        const hit = Object.entries(SOURCE_URLS).find(([k]) => lower.includes(k));
        refs.push({ label: raw, url: hit ? hit[1] : '' });
      }
      return;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      flushBullets(`b${k}`); flushNums(`n${k}`); flushPara(`p${k}`);
      nodes.push(<hr key={`hr${k}`} style={{ border: 'none', borderTop: '1px solid var(--br)', margin: '2px 0' }}/>);
      return;
    }

    // Bullet item
    if (/^[-*]\s/.test(line.trim())) {
      flushNums(`n${k}`); flushPara(`p${k}`);
      bulletBuffer.push(line.trim().replace(/^[-*]\s/, ''));
      return;
    }

    // Numbered item
    if (/^\d+\.\s/.test(line.trim())) {
      flushBullets(`b${k}`); flushPara(`p${k}`);
      numBuffer.push(line.trim().replace(/^\d+\.\s/, ''));
      return;
    }

    // Regular paragraph text
    flushBullets(`b${k}`); flushNums(`n${k}`);
    paraBuffer.push(line);
  });

  // Flush anything remaining
  flushBullets('bend'); flushNums('nend'); flushPara('pend');

  // ── References section ────────────────────────────────────────────────────
  if (refs.length > 0) {
    nodes.push(
      <div key="refs" style={{ marginTop: '4px', paddingTop: '8px', borderTop: '1px solid var(--br)' }}>
        <p style={{ margin: '0 0 5px', fontSize: '0.68rem', fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'Inter', sans-serif" }}>
          References
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {refs.map((r, i) =>
            r.url
              ? <a key={i} href={r.url} target="_blank" rel="noreferrer"
                   style={{ fontSize: '0.77rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', textDecoration: 'none', fontFamily: "'Inter', sans-serif" }}
                   onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                   onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>
                  <ExternalLink size={10} style={{ flexShrink: 0 }}/>{r.label}
                </a>
              : <span key={i} style={{ fontSize: '0.77rem', color: 'var(--tx3)', fontFamily: "'Inter', sans-serif" }}>{r.label}</span>
          )}
        </div>
      </div>
    );
  }

  // ── Disclaimer ────────────────────────────────────────────────────────────
  if (hasSkinContent(text)) {
    nodes.push(
      <div key="disc" style={{
        marginTop: '6px', padding: '7px 10px', borderRadius: '8px',
        background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)',
        display: 'flex', gap: '7px', alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: '0.72rem', color: '#f87171', flexShrink: 0, marginTop: '1px' }}>⚠</span>
        <p style={{ margin: 0, fontSize: '0.72rem', color: '#f87171', lineHeight: 1.5, fontFamily: "'Inter', sans-serif" }}>
          For informational purposes only. Always consult a qualified dermatologist for medical advice regarding any skin condition.
        </p>
      </div>
    );
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>{nodes}</div>;
}

// ── Welcome card ──────────────────────────────────────────────────────────────
const WelcomeCard: React.FC = () => (
  <div className="flex gap-2">
    <div className="flex-shrink-0 w-7 h-7 rounded-full overflow-hidden flex items-center justify-center mt-0.5"
         style={{ background: '#cce9f3' }}>
      <img src="/sign.png" alt="SkinSight" style={{ width: '100%', height: '100%', objectFit: 'contain' }}/>
    </div>
    <div className="max-w-[84%] px-3 py-2.5"
         style={{ background: 'var(--surface2)', borderRadius: '4px 18px 18px 18px', color: 'var(--tx)' }}>
      <p className="font-bold mb-2" style={{ lineHeight: 1.2, fontSize: '0.95rem', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <span style={{ color: 'var(--accent)', fontWeight: 900, fontSize: '1.35em', letterSpacing: '-0.02em' }}>S</span>
        <span>kinSight</span>
        <span style={{ color: 'var(--tx3)', fontWeight: 400, fontSize: '0.82em', marginLeft: '5px' }}>Assistant</span>
      </p>
      <p style={{ color: 'var(--tx3)', fontSize: '0.78rem', marginBottom: '8px', fontFamily: "'Inter', sans-serif" }}>
        Your AI guide to skin health and this app.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {[
          { label: 'App guidance', detail: 'uploading, reading results, navigating' },
          { label: 'Disease info',  detail: 'NV, MEL, BKL and BCC explained' },
          { label: 'Skin health',   detail: 'general dermatology questions' },
        ].map(({ label, detail }) => (
          <div key={label} style={{ display: 'flex', gap: '7px', alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--accent)', fontWeight: 800, lineHeight: '1.55', flexShrink: 0, fontSize: '0.75rem' }}>•</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--tx2)', lineHeight: '1.55', fontFamily: "'Inter', sans-serif" }}>
              <strong style={{ color: 'var(--tx)', fontWeight: 600 }}>{label}</strong>{' '}
              <span style={{ color: 'var(--tx3)' }}>{detail}</span>
            </span>
          </div>
        ))}
      </div>
      <p style={{ fontSize: '0.75rem', color: 'var(--tx3)', marginTop: '8px', fontFamily: "'Inter', sans-serif" }}>
        How can I help you today?
      </p>
    </div>
  </div>
);

// ── Logo avatar ───────────────────────────────────────────────────────────────
const LogoAvatar: React.FC = () => (
  <div className="flex-shrink-0 w-7 h-7 rounded-full overflow-hidden flex items-center justify-center"
       style={{ background: '#cce9f3' }}>
    <img src="/sign.png" alt="SkinSight" style={{ width: '100%', height: '100%', objectFit: 'contain' }}/>
  </div>
);

// ── ChatBot ───────────────────────────────────────────────────────────────────
export const ChatBot: React.FC = () => {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [unread, setUnread]   = useState(0);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const btnRef     = useRef<HTMLButtonElement>(null);

  // ── Drag state ──
  const btnPx = typeof window !== 'undefined' && window.innerWidth < 768 ? 50 : 56;
  const btnMargin = 24;
  const [pos, setPos] = useState(() => ({
    x: typeof window !== 'undefined' ? window.innerWidth - (window.innerWidth < 768 ? 50 : 56) - 24 : 0,
    y: typeof window !== 'undefined' ? window.innerHeight - (window.innerWidth < 768 ? 50 : 56) - 24 : 0,
  }));
  const dragRef = useRef({ origX: 0, origY: 0, startMX: 0, startMY: 0, active: false, moved: false });

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Drag only on mobile viewports
    if (window.innerWidth >= 768) return;
    dragRef.current = { origX: pos.x, origY: pos.y, startMX: e.clientX, startMY: e.clientY, active: true, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startMX;
    const dy = e.clientY - dragRef.current.startMY;
    if (Math.abs(dx) + Math.abs(dy) > 5) dragRef.current.moved = true;
    setPos({
      x: Math.max(0, Math.min(window.innerWidth - btnPx, dragRef.current.origX + dx)),
      y: Math.max(0, Math.min(window.innerHeight - btnPx, dragRef.current.origY + dy)),
    });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    dragRef.current.active = false;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleBtnClick = () => {
    if (dragRef.current.moved) { dragRef.current.moved = false; return; }
    // Reset to original bottom-right position on every click
    setPos({ x: window.innerWidth - btnPx - btnMargin, y: window.innerHeight - btnPx - btnMargin });
    setOpen(o => !o);
  };

  const getPanelStyle = (): React.CSSProperties => {
    const W = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const H = typeof window !== 'undefined' ? window.innerHeight : 900;
    const panelW = Math.max(300, Math.min(400, W * 0.92));
    const btnSize = btnPx;
    const gap = 12;

    // Available space above the button (always open above, never below)
    const availableH = pos.y - gap - 8;
    const panelH = Math.max(300, Math.min(580, Math.min(H * 0.72, availableH)));

    const top = Math.max(8, pos.y - gap - panelH);

    // Right-align panel with button right edge, clamp to viewport
    let left = pos.x + btnSize - panelW;
    left = Math.max(8, Math.min(W - panelW - 8, left));

    return {
      position: 'fixed',
      top,
      left,
      width: panelW,
      height: panelH,
      zIndex: 9998,
      background: 'var(--surface)',
      border: '1px solid var(--br)',
    };
  };

  useEffect(() => {
    if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 200); }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setMessages(prev => [...prev, { role: 'user', content: trimmed }]);
    setInput('');
    setError('');
    setLoading(true);

    try {
      const history = [...messages, { role: 'user' as const, content: trimmed }]
        .filter(m => m.content !== WELCOME_MARKER)
        .slice(-10);

      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        throw new Error('__non_json__');
      }
      const data = await res.json();
      if (res.status === 503) throw new Error('__unavailable__');
      if (res.status === 429) throw new Error('__rate_limit__');
      if (!res.ok)            throw new Error(data.error || '__generic__');

      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      if (!open) setUnread(u => u + 1);
    } catch (e: any) {
      const msg: string = e.message || '';
      if (msg === '__non_json__' || msg.includes('unexpected'))
        setError('The assistant returned an unexpected response. Please try again.');
      else if (msg === '__unavailable__')
        setError('AI providers are temporarily unavailable. Please try again in a few minutes.');
      else if (msg === '__rate_limit__')
        setError('Too many messages. Please wait a moment before trying again.');
      else if (msg === '__generic__' || (!msg || msg === 'Failed to get response'))
        setError('Something went wrong. Please try again.');
      else if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network') || msg.toLowerCase().includes('failed to fetch'))
        setError('Cannot connect to the assistant. Make sure the server is running.');
      else
        setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const charsLeft   = MAX_CHARS - input.length;
  const showCounter = input.length >= WARN_AT;

  return (
    <>
      {/* ── Floating button (draggable) */}
      <button
        ref={btnRef}
        type="button"
        onClick={handleBtnClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { dragRef.current.active = false; }}
        className="rounded-full flex items-center justify-center shadow-2xl"
        style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y,
          width: btnPx,
          height: btnPx,
          background: 'var(--accent)', color: '#070d1a',
          zIndex: 9999, border: 'none',
          cursor: window.innerWidth < 768 ? 'grab' : 'pointer',
          touchAction: 'none',
          userSelect: 'none',
        }}
        aria-label="Open SkinSight Assistant"
      >
        {open ? <X size={btnPx < 56 ? 18 : 22} style={{ pointerEvents: 'none' }}/> : <MessageCircle size={btnPx < 56 ? 18 : 22} style={{ pointerEvents: 'none' }}/>}
        {!open && unread > 0 && (
          <span style={{
            position: 'absolute', top: '-4px', right: '-4px',
            width: '20px', height: '20px', borderRadius: '50%',
            background: '#ef4444', color: '#fff',
            fontSize: '10px', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>{unread}</span>
        )}
      </button>

      {/* ── Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col rounded-2xl overflow-hidden shadow-2xl"
            style={getPanelStyle()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
                 style={{ background: 'var(--accent)', color: '#070d1a' }}>
              <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                   style={{ background: '#cce9f3', border: '1.5px solid rgba(7,13,26,0.2)' }}>
                <img src="/sign.png" alt="SkinSight" style={{ width: '100%', height: '100%', objectFit: 'contain' }}/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold leading-none" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <span style={{ fontWeight: 900, fontSize: '1.1em' }}>S</span>kinSight Assistant
                </p>
                <p className="text-[10px] opacity-60 mt-0.5" style={{ fontFamily: "'Inter', sans-serif" }}>
                  AI-powered · skin health and app help
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)}
                      className="opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                      style={{ border: 'none', background: 'transparent', color: 'inherit' }}>
                <X size={18}/>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ overscrollBehavior: 'contain' }}>
              {messages.map((msg, i) => {
                if (i === 0 && msg.content === WELCOME_MARKER) {
                  return (
                    <motion.div key={0} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                      <WelcomeCard />
                    </motion.div>
                  );
                }
                return (
                  <motion.div key={i}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 overflow-hidden"
                         style={{ background: msg.role === 'user' ? 'var(--accent-dim)' : '#cce9f3', color: 'var(--accent)' }}>
                      {msg.role === 'user'
                        ? <User size={13}/>
                        : <img src="/sign.png" alt="SkinSight" style={{ width: '100%', height: '100%', objectFit: 'contain' }}/>
                      }
                    </div>
                    <div className="max-w-[84%]"
                         style={{
                           background: msg.role === 'user' ? 'var(--accent)' : 'var(--surface2)',
                           color: msg.role === 'user' ? '#070d1a' : 'var(--tx)',
                           borderRadius: msg.role === 'user' ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
                           padding: msg.role === 'user' ? '8px 13px' : '11px 13px',
                           border: msg.role === 'assistant' ? '1px solid var(--br)' : 'none',
                           fontSize: '0.83rem',
                           lineHeight: 1.55,
                           fontFamily: "'Inter', sans-serif",
                         }}>
                      {msg.role === 'user'
                        ? msg.content
                        : renderMarkdown(msg.content)
                      }
                    </div>
                  </motion.div>
                );
              })}

              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
                  <LogoAvatar />
                  <div className="px-3 py-2 rounded-2xl flex items-center gap-2"
                       style={{ background: 'var(--surface2)', borderRadius: '4px 18px 18px 18px', border: '1px solid var(--br)' }}>
                    <Loader2 size={14} className="animate-spin" style={{ color: 'var(--accent)' }}/>
                    <span style={{ fontSize: '0.78rem', color: 'var(--tx3)', fontFamily: "'Inter', sans-serif" }}>Thinking…</span>
                  </div>
                </motion.div>
              )}

              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex items-start gap-2 px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.22)' }}>
                  <AlertCircle size={13} style={{ flexShrink: 0, marginTop: '2px' }}/>
                  <span style={{ fontSize: '0.78rem', lineHeight: 1.5, fontFamily: "'Inter', sans-serif" }}>{error}</span>
                </motion.div>
              )}
              <div ref={bottomRef}/>
            </div>

            {/* Suggested questions */}
            {messages.length === 1 && !loading && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5 flex-shrink-0">
                {SUGGESTED.map(s => (
                  <button key={s} type="button" onClick={() => send(s)}
                    className="px-2 py-0.5 rounded-full font-medium cursor-pointer transition-opacity hover:opacity-80"
                    style={{
                      fontSize: 'clamp(0.62rem, 3.2vw, 0.72rem)', fontFamily: "'Inter', sans-serif",
                      background: 'var(--accent-dim)', color: 'var(--accent)',
                      border: '1px solid rgba(0,229,255,0.22)',
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-3 pb-3 pt-2 flex-shrink-0" style={{ borderTop: '1px solid var(--br)' }}>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                   style={{ background: 'var(--surface2)', border: '1px solid var(--br)' }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value.slice(0, MAX_CHARS))}
                  onKeyDown={handleKey}
                  placeholder="Ask about skin conditions or the app…"
                  disabled={loading}
                  className="flex-1 bg-transparent outline-none"
                  style={{ fontSize: '0.84rem', color: 'var(--tx)', fontFamily: "'Inter', sans-serif" }}
                />
                {showCounter && (
                  <span style={{
                    fontSize: '0.65rem', flexShrink: 0, fontFamily: "'Inter', sans-serif",
                    color: charsLeft <= 20 ? '#ef4444' : charsLeft <= 60 ? '#f59e0b' : 'var(--tx3)',
                  }}>
                    {charsLeft}
                  </span>
                )}
                <button type="button" onClick={() => send(input)} disabled={!input.trim() || loading}
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40 cursor-pointer"
                  style={{
                    background: input.trim() && !loading ? 'var(--accent)' : 'var(--br)',
                    color:      input.trim() && !loading ? '#070d1a'       : 'var(--tx3)',
                    border: 'none',
                  }}>
                  <Send size={12}/>
                </button>
              </div>
              <p className="text-center mt-1.5"
                 style={{ fontSize: '0.68rem', color: 'var(--tx3)', fontFamily: "'Inter', sans-serif" }}>
                Not a substitute for professional medical advice
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
