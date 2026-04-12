import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { Calendar, ShieldCheck, SearchX, X, Trash2, ZoomIn, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface Scan {
    id: string;
    userId: string;
    imageUrl: string;
    disease: string;
    confidence: number;
    description?: string;
    suggestions?: string[];
    createdAt: any;
}

// Handles Firestore Timestamp, ISO string, or numeric ms
const formatDate = (createdAt: any): string => {
    try {
        if (!createdAt) return 'Unknown date';
        if (typeof createdAt?.toDate === 'function')
            return createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const d = new Date(createdAt);
        if (!isNaN(d.getTime()))
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return 'Unknown date';
    } catch { return 'Unknown date'; }
};

const toMs = (v: any): number => {
    if (!v) return 0;
    if (typeof v?.toDate === 'function') return v.toDate().getTime();
    const d = new Date(v);
    return isNaN(d.getTime()) ? 0 : d.getTime();
};

const confidenceColor = (c: number) =>
    c >= 80 ? '#22c55e' : c >= 60 ? '#f59e0b' : '#ef4444';

// ── Detail Modal ─────────────────────────────────────────────────────────────
const ScanModal: React.FC<{ scan: Scan; onClose: () => void; onDelete: (id: string) => void }> = ({ scan, onClose, onDelete }) => {
    const [step, setStep] = useState<'idle' | 'confirm' | 'deleting'>('idle');

    const handleDelete = async () => {
        if (step === 'idle') { setStep('confirm'); return; }
        setStep('deleting');
        try {
            await deleteDoc(doc(db, 'scans', scan.id));
            onDelete(scan.id);
            onClose();
            toast.success('Scan deleted');
        } catch {
            toast.error('Failed to delete scan');
            setStep('idle');
        }
    };

    return (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={onClose}>
            <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(10px)' }}/>
            <motion.div className="relative w-full max-w-lg rounded-2xl overflow-hidden z-10 max-h-[92vh] flex flex-col"
                        style={{ background: 'var(--surface)', border: '1px solid var(--br)' }}
                        initial={{ scale: 0.93, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, y: 24 }}
                        onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                     style={{ borderBottom: '1px solid var(--br)' }}>
                    <h3 className="font-extrabold text-base" style={{ color: 'var(--tx)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                        Scan Details
                    </h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: 'var(--surface2)', color: 'var(--tx3)' }}>
                        <X size={15}/>
                    </button>
                </div>

                <div className="overflow-y-auto flex-1">
                    {/* Image */}
                    <div className="relative" style={{ height: 256, background: 'var(--surface2)' }}>
                        <img src={scan.imageUrl} alt={scan.disease} className="w-full h-full object-contain"/>
                        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold"
                             style={{ background: 'rgba(0,0,0,0.72)', color: confidenceColor(scan.confidence), backdropFilter: 'blur(8px)' }}>
                            {typeof scan.confidence === 'number' ? scan.confidence.toFixed(1) : scan.confidence}%
                        </div>
                    </div>

                    <div className="p-5 space-y-4">
                        <div>
                            <p className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: 'var(--tx3)' }}>Detected condition</p>
                            <p className="text-2xl font-extrabold" style={{ color: 'var(--tx)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{scan.disease}</p>
                        </div>

                        {/* Confidence */}
                        <div>
                            <div className="flex justify-between text-xs mb-2">
                                <span style={{ color: 'var(--tx3)' }}>Confidence score</span>
                                <span style={{ color: confidenceColor(scan.confidence), fontWeight: 700 }}>
                  {typeof scan.confidence === 'number' ? scan.confidence.toFixed(1) : scan.confidence}%
                </span>
                            </div>
                            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--br2)' }}>
                                <motion.div className="h-full rounded-full"
                                            style={{ background: `linear-gradient(90deg, ${confidenceColor(scan.confidence)}77, ${confidenceColor(scan.confidence)})` }}
                                            initial={{ width: 0 }} animate={{ width: `${scan.confidence}%` }}
                                            transition={{ duration: 0.85, ease: 'easeOut' }}/>
                            </div>
                        </div>

                        {scan.description && (
                            <div className="rounded-xl p-4" style={{ background: 'var(--surface2)', border: '1px solid var(--br)' }}>
                                <p className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: 'var(--tx3)' }}>Description</p>
                                <p className="text-sm leading-relaxed" style={{ color: 'var(--tx2)' }}>{scan.description}</p>
                            </div>
                        )}

                        {scan.suggestions && scan.suggestions.length > 0 && (
                            <div className="rounded-xl p-4" style={{ background: 'var(--surface2)', border: '1px solid var(--br)' }}>
                                <p className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: 'var(--tx3)' }}>Recommendations</p>
                                <ul className="space-y-1.5">
                                    {scan.suggestions.map((s, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--tx2)' }}>
                                            <TrendingUp size={12} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }}/>{s}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--tx3)' }}>
                                <Calendar size={12}/> {formatDate(scan.createdAt)}
                            </div>
                            <button onClick={handleDelete} disabled={step === 'deleting'}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                                    style={{
                                        background: step === 'confirm' ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.08)',
                                        color: '#ef4444',
                                        border: '1px solid rgba(239,68,68,0.3)',
                                    }}>
                                {step === 'deleting'
                                    ? <span className="spin w-3 h-3 border-2 border-red-400/30 border-t-red-400 rounded-full"/>
                                    : <Trash2 size={12}/>}
                                {step === 'confirm' ? 'Confirm delete' : 'Delete scan'}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

// ── Main ─────────────────────────────────────────────────────────────────────
export const History: React.FC = () => {
    const { user, isGuest } = useAuth();
    const navigate = useNavigate();
    const [scans, setScans]       = useState<Scan[]>([]);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState<string | null>(null);
    const [selected, setSelected] = useState<Scan | null>(null);
    const [filter, setFilter]     = useState('');

    const loadScans = async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            // No orderBy — avoids composite index requirement.
            // Firestore only needs a single-field index for this query (auto-created).
            const q = query(
                collection(db, 'scans'),
                where('userId', '==', user.uid)
            );
            const snap = await getDocs(q);
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Scan));
            // Sort client-side — works for both Firestore Timestamp AND ISO string
            docs.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
            setScans(docs);
        } catch (e: any) {
            console.error('[History] Firestore error:', e);
            // Surface the real error so we can debug it
            setError(e?.message || String(e));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isGuest || !user) { setLoading(false); return; }
        loadScans();
    }, [user, isGuest]);

    const handleDelete = (id: string) => setScans(prev => prev.filter(s => s.id !== id));
    const filtered = filter
        ? scans.filter(s => s.disease?.toLowerCase().includes(filter.toLowerCase()))
        : scans;

    // ── Loading ──
    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="spin w-8 h-8 border-2 rounded-full"
                 style={{ borderColor: 'var(--br2)', borderTopColor: 'var(--accent)' }}/>
        </div>
    );

    // ── Guest ──
    if (isGuest) return (
        <div className="max-w-md mx-auto text-center py-20 space-y-5">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
                 style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                <ShieldCheck size={36}/>
            </div>
            <h2 className="text-2xl font-extrabold" style={{ color: 'var(--tx)' }}>Sign up to view history</h2>
            <p style={{ color: 'var(--tx2)' }}>Guest scans are not saved. Create a free account to track all your scans over time.</p>
            <button onClick={() => navigate('/signup')} className="btn-accent px-6 py-3 rounded-xl text-sm">
                Create free account →
            </button>
        </div>
    );

    // ── Error ──
    if (error) return (
        <div className="max-w-lg mx-auto text-center py-20 space-y-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                 style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                <AlertCircle size={28}/>
            </div>
            <h2 className="text-xl font-extrabold" style={{ color: 'var(--tx)' }}>Failed to load scans</h2>
            {/* Show the real error message to help debug */}
            <p className="text-sm px-4 py-3 rounded-xl text-left font-mono break-all"
               style={{ background: 'rgba(239,68,68,0.07)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
            </p>
            <p className="text-xs" style={{ color: 'var(--tx3)' }}>
                Make sure your <code style={{ color: 'var(--accent)' }}>.env</code> file is present in the project root and
                <code style={{ color: 'var(--accent)' }}> VITE_FIREBASE_PROJECT_ID</code> is set correctly.
            </p>
            <button onClick={loadScans}
                    className="btn-accent px-5 py-2.5 rounded-xl text-sm inline-flex items-center gap-2">
                <RefreshCw size={14}/> Retry
            </button>
        </div>
    );

    // ── Main ──
    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-8">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35 }}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold" style={{ color: 'var(--tx)' }}>Scan History</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--tx2)' }}>
                        {scans.length > 0 ? `${scans.length} scan${scans.length !== 1 ? 's' : ''} on record` : 'No scans yet'}
                    </p>
                </div>
                {scans.length > 0 && (
                    <input type="text" value={filter} onChange={e => setFilter(e.target.value)}
                           placeholder="Filter by condition…"
                           className="px-4 py-2 rounded-xl text-sm outline-none w-full sm:w-56"
                           style={{ background: 'var(--surface)', border: '1px solid var(--br)', color: 'var(--tx)' }}/>
                )}
            </motion.div>

            {filtered.length === 0 ? (
                <div className="rounded-2xl p-16 text-center"
                     style={{ background: 'var(--surface)', border: '1px solid var(--br)' }}>
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                         style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                        <SearchX size={28}/>
                    </div>
                    <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--tx)' }}>
                        {filter ? 'No matching scans' : 'No scans yet'}
                    </h3>
                    <p className="text-sm mb-5" style={{ color: 'var(--tx2)' }}>
                        {filter ? `No scans match "${filter}"` : 'Upload your first skin photo to get started.'}
                    </p>
                    {!filter && (
                        <button onClick={() => navigate('/dashboard')} className="btn-accent px-5 py-2.5 rounded-xl text-sm">
                            Start scanning →
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((scan, i) => (
                        <motion.div key={scan.id}
                                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05, duration: 0.35 }}
                                    className="rounded-2xl overflow-hidden card-hover cursor-pointer group"
                                    style={{ background: 'var(--surface)', border: '1px solid var(--br)' }}
                                    onClick={() => setSelected(scan)}>
                            {/* Image */}
                            <div className="h-44 relative overflow-hidden" style={{ background: 'var(--surface2)' }}>
                                <img src={scan.imageUrl} alt={scan.disease}
                                     className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"/>
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                     style={{ background: 'rgba(0,0,0,0.45)' }}>
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center"
                                         style={{ background: 'rgba(0,229,255,0.9)' }}>
                                        <ZoomIn size={18} style={{ color: '#070d1a' }}/>
                                    </div>
                                </div>
                                <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full text-xs font-bold"
                                     style={{ background: 'rgba(0,0,0,0.65)', color: confidenceColor(scan.confidence), backdropFilter: 'blur(8px)' }}>
                                    {typeof scan.confidence === 'number' ? scan.confidence.toFixed(1) : scan.confidence}%
                                </div>
                            </div>
                            {/* Info */}
                            <div className="p-4 space-y-2">
                                <h3 className="font-bold text-base truncate"
                                    style={{ color: 'var(--tx)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                                    {scan.disease}
                                </h3>
                                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--br2)' }}>
                                    <div className="h-full rounded-full"
                                         style={{ width: `${scan.confidence}%`,
                                             background: `linear-gradient(90deg, ${confidenceColor(scan.confidence)}77, ${confidenceColor(scan.confidence)})` }}/>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--tx3)' }}>
                                    <Calendar size={11}/> {formatDate(scan.createdAt)}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {selected && (
                    <ScanModal scan={selected} onClose={() => setSelected(null)} onDelete={handleDelete}/>
                )}
            </AnimatePresence>
        </div>
    );
};