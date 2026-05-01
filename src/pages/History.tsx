import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, query, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { Calendar, ShieldCheck, X, Trash2, ZoomIn,  AlertCircle, Monitor, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

// ── 🔥 NEW: Interface updated to support the nested 'result' object 🔥 ──
interface ScanResult {
    disease?: string;
    confidence?: number;
    segmentedUrl?: string;
    description?: string;
    tips?: string[];
    precautions?: string[];
    sources?: string[];
    status?: string;
}

interface Scan {
    id: string;
    userId?: string;
    photoUri?: string;
    imageUrl?: string;
    createdAt?: any;
    timestamp?: any;
    bodyView?: string;
    x?: number;
    y?: number;
    source?: string;
    reportNum?: number;

    // The new nested structure
    result?: ScanResult;

    // Legacy fields (Kept so your old scans don't break!)
    analysis?: string;
    prediction?: string;
    disease?: string;
    confidence?: number;
    description?: string;
    suggestions?: string[];
    tips?: string[];
    precautions?: string[];
    sources?: string[];
    segmentedUrl?: string;
    status?: string;
}

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

// ── Confirmation Modal ──────────────────────────────────────────────────────
const DeleteConfirmModal: React.FC<{
    scan: Scan;
    onClose: () => void;
    onConfirm: () => Promise<void>;
}> = ({ scan, onClose, onConfirm }) => {
    const [isDeleting, setIsDeleting] = useState(false);

    // Safely look in result first, then fallback to old structure
    const displayDisease = scan.result?.disease || scan.analysis || scan.prediction || scan.disease || 'Unknown condition';

    const handleConfirm = async () => {
        setIsDeleting(true);
        await onConfirm();
    };

    return (
        <motion.div className="fixed inset-0 z-[70] flex items-center justify-center p-4"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={onClose}>
            <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(10px)' }}/>
            <motion.div className="relative w-full max-w-sm rounded-2xl overflow-hidden z-10 p-6 text-center"
                        style={{ background: 'var(--surface)', border: '1px solid var(--br)' }}
                        initial={{ scale: 0.93, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, y: 24 }}
                        onClick={e => e.stopPropagation()}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 mx-auto"
                     style={{ background: 'rgba(255,0,0,0.1)', color: '#ff0000' }}>
                    <AlertCircle size={28} />
                </div>
                <h3 className="text-lg font-extrabold mb-2" style={{ color: 'var(--tx)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    Delete this scan?
                </h3>
                <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--tx2)' }}>
                    Are you sure you want to delete <strong style={{ color: 'var(--tx)' }}>{displayDisease}</strong>? This cannot be undone.
                </p>
                <div className="flex gap-3">
                    <button onClick={onClose} disabled={isDeleting}
                            className="btn-ghost flex-1 py-2.5 rounded-xl text-sm font-semibold">
                        Cancel
                    </button>
                    <button onClick={handleConfirm} disabled={isDeleting}
                            className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                            style={{ background: '#ff0000', color: 'white' }}>
                        {isDeleting ? <span className="spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : 'Delete'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

// ── Detail Modal ─────────────────────────────────────────────────────────────
const ScanModal: React.FC<{ scan: Scan; onClose: () => void; onDeleteClick: () => void }> = ({ scan, onClose, onDeleteClick }) => {

    // Safely extract all variables, checking 'result' folder first!
    const displayImage = scan.photoUri || scan.imageUrl || '';
    const displayDate = scan.createdAt || scan.timestamp;
    const displayDisease = scan.result?.disease || scan.analysis || scan.prediction || scan.disease || 'Unknown condition';
    const displayConfidence = scan.result?.confidence ?? scan.confidence;
    const displaySegmentedUrl = scan.result?.segmentedUrl ?? scan.segmentedUrl;
    const displayDescription = scan.result?.description ?? scan.description;
    const displayTips = scan.result?.tips ?? scan.tips;
    const displayPrecautions = scan.result?.precautions ?? scan.precautions;
    const displaySources = scan.result?.sources ?? scan.sources;

    const [confidenceDisplay, setConfidenceDisplay] = useState(0);

    useEffect(() => {
        if (displayConfidence == null) return;
        const target = displayConfidence;
        let cur = 0;
        const step = target / 40;
        const iv = setInterval(() => {
            cur += step;
            if (cur >= target) { setConfidenceDisplay(target); clearInterval(iv); }
            else setConfidenceDisplay(Math.round(cur));
        }, 25);
        return () => clearInterval(iv);
    }, [displayConfidence]);

    return (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={onClose}>
            <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(10px)' }}/>
            <motion.div className="relative w-full max-w-lg rounded-2xl overflow-hidden z-10 max-h-[92vh] flex flex-col"
                        style={{ background: 'var(--surface)', border: '1px solid var(--br)' }}
                        initial={{ scale: 0.93, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, y: 24 }}
                        onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                     style={{ borderBottom: '1px solid var(--br)' }}>
                    <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-base" style={{ color: 'var(--tx)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                            Scan Details
                        </h3>
                        {scan.source === 'mobile' ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] uppercase font-bold" style={{ background: 'var(--surface2)', color: 'var(--tx2)', border: '1px solid var(--br)' }}>
                                <Smartphone size={11} /> App
                            </span>
                        ) : scan.source === 'web' ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] uppercase font-bold" style={{ background: 'var(--surface2)', color: 'var(--tx2)', border: '1px solid var(--br)' }}>
                                <Monitor size={11} /> Web
                            </span>
                        ) : null}
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: 'var(--surface2)', color: 'var(--tx3)' }}>
                        <X size={15}/>
                    </button>
                </div>

                <div className="overflow-y-auto flex-1">
                    <div className="relative" style={{ height: 256, background: 'var(--surface2)' }}>
                        <img src={displayImage} alt={displayDisease} className="w-full h-full object-contain"
                             onError={(e) => { e.currentTarget.src = 'https://placehold.co/600x400/0f172a/00e5ff?text=Image+Unavailable'; }} />
                        {displayConfidence != null && displayConfidence > 0 && (
                            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold"
                                 style={{ background: 'rgba(0,0,0,0.72)', color: confidenceColor(displayConfidence), backdropFilter: 'blur(8px)' }}>
                                {displayConfidence}%
                            </div>
                        )}
                    </div>

                    <div className="p-5 space-y-4">
                        <div>
                            <p className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: 'var(--tx3)' }}>
                                {scan.reportNum ? `Report #${scan.reportNum} • ` : ''}Detected condition
                            </p>
                            <p className="text-2xl font-extrabold" style={{ color: 'var(--tx)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{displayDisease}</p>
                        </div>

                        {displayConfidence != null && displayConfidence > 0 && (
                            <div className="rounded-xl p-4 w-full" style={{ background: 'var(--surface2)', border: '1px solid var(--br)' }}>
                                <div className="flex items-end justify-between mb-2">
                                    <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--tx3)' }}>Confidence score</p>
                                    <span className="text-lg font-extrabold" style={{ color: confidenceColor(confidenceDisplay) }}>{confidenceDisplay}%</span>
                                </div>
                                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--br)' }}>
                                    <motion.div className="h-full rounded-full transition-all duration-75 ease-out"
                                                style={{ width: `${confidenceDisplay}%`, background: `linear-gradient(90deg, ${confidenceColor(displayConfidence)}77, ${confidenceColor(displayConfidence)})` }} />
                                </div>
                            </div>
                        )}

                        {(scan.bodyView && scan.bodyView !== 'N/A') && (
                            <div className="flex items-center gap-3">
                                <span className="px-2 py-0.5 rounded-md text-xs uppercase font-bold" style={{ background: 'var(--surface2)', color: 'var(--tx2)', border: '1px solid var(--br)' }}>
                                    View: {scan.bodyView}
                                </span>
                            </div>
                        )}

                        {displaySegmentedUrl && (
                            <div className="rounded-xl p-4" style={{ background: 'var(--surface2)', border: '1px solid var(--br)' }}>
                                <p className="text-[10px] uppercase tracking-widest font-bold mb-3" style={{ color: 'var(--tx3)' }}>U-Net Segmentation Mask</p>
                                <div className="relative rounded-xl overflow-hidden border-2 w-full max-w-[150px] aspect-square flex items-center justify-center mx-auto" style={{ borderColor: 'var(--accent)', background: '#060c10' }}>
                                    <img src={displaySegmentedUrl} alt="Segmented Mask" className="w-full h-full object-contain opacity-90" />
                                </div>
                            </div>
                        )}

                        {displayDescription && (
                            <div className="rounded-xl p-4" style={{ background: 'var(--surface2)', border: '1px solid var(--br)' }}>
                                <p className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: 'var(--tx3)' }}>Description</p>
                                <p className="text-sm leading-relaxed" style={{ color: 'var(--tx2)' }}>{displayDescription}</p>
                            </div>
                        )}

                        {displayTips && displayTips.length > 0 && (
                            <div className="rounded-xl p-4" style={{ background: 'var(--surface2)', border: '1px solid var(--br)' }}>
                                <p className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: 'var(--tx3)' }}>Recommendations & Care</p>
                                <ul className="space-y-1.5">
                                    {displayTips.map((s, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--tx2)' }}>
                                            <span className="opacity-50 mt-[1px]">•</span>
                                            <span>{s}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {displayPrecautions && displayPrecautions.length > 0 && (
                            <div className="rounded-xl p-4 border border-red-500/30 bg-red-500/5">
                                <p className="text-[10px] uppercase tracking-widest font-bold mb-2 text-red-400">When to see a doctor</p>
                                <ul className="space-y-1.5">
                                    {displayPrecautions.map((s, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-red-200">
                                            <span className="opacity-50 mt-[1px]">•</span>
                                            <span>{s}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {displaySources && displaySources.length > 0 && (
                            <div className="rounded-xl p-4" style={{ background: 'var(--surface2)', border: '1px solid var(--br)' }}>
                                <p className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: 'var(--tx3)' }}>Clinical Sources & References</p>
                                <ul className="space-y-1.5">
                                    {displaySources.map((s, i) => {
                                        const match = s.match(/(.+?)\s*\((https?:\/\/[^\)]+)\)/);
                                        return (
                                            <li key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--tx3)' }}>
                                                <span className="opacity-50 mt-[1px]">•</span>
                                                {match ? (
                                                    <a href={match[2]} target="_blank" rel="noopener noreferrer" className="transition-colors duration-200" style={{ color: 'var(--tx3)', textDecoration: 'none' }}
                                                       onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.textDecoration = 'underline'; }}
                                                       onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--tx3)'; e.currentTarget.style.textDecoration = 'none'; }}>
                                                        {match[1]}
                                                    </a>
                                                ) : (
                                                    <span>{s}</span>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--tx3)' }}>
                                <Calendar size={12}/> {formatDate(displayDate)}
                            </div>
                            <button onClick={onDeleteClick}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:bg-red-500/10"
                                    style={{ color: '#ff0000' }}>
                                <Trash2 size={13}/> Delete scan
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export const History: React.FC = () => {
    const { user, isGuest } = useAuth();
    const navigate = useNavigate();
    const [scans, setScans]       = useState<Scan[]>([]);
    const [loading, setLoading]   = useState(true);
    const [selected, setSelected] = useState<Scan | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Scan | null>(null);
    const [filter, setFilter]     = useState('');

    const loadScans = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const q = query(collection(db, 'users', user.uid, 'scans'));
            const snap = await getDocs(q);
            const docs = snap.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    ...data,
                    source: data.source || 'mobile',
                } as Scan;
            });

            docs.sort((a, b) => toMs(b.createdAt || b.timestamp) - toMs(a.createdAt || a.timestamp));

            const docsWithNum = docs.map((d, i) => ({ ...d, reportNum: docs.length - i }));

            setScans(docsWithNum);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        if (isGuest || !user) { setLoading(false); return; }
        loadScans();
    }, [user, isGuest]);

    const confirmDelete = async () => {
        if (!deleteTarget || !user) return;
        try {
            await deleteDoc(doc(db, 'users', user.uid, 'scans', deleteTarget.id));
            setScans(prev => prev.filter(s => s.id !== deleteTarget.id));
            toast.success('Scan deleted');
            if (selected?.id === deleteTarget.id) setSelected(null);
            setDeleteTarget(null);
        } catch { toast.error('Failed to delete'); }
    };

    const filtered = scans.filter(s => {
        const cond = s.result?.disease || s.analysis || s.disease || '';
        return cond.toLowerCase().includes(filter.toLowerCase());
    });

    if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="spin w-8 h-8 border-2 rounded-full" style={{ borderColor: 'var(--br2)', borderTopColor: 'var(--accent)' }}/></div>;

    if (isGuest) return (
        <div className="max-w-md mx-auto text-center py-20 space-y-5">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}><ShieldCheck size={36}/></div>
            <h2 className="text-2xl font-extrabold" style={{ color: 'var(--tx)' }}>Sign up to view history</h2>
            <button onClick={() => navigate('/signup')} className="btn-accent px-6 py-3 rounded-xl text-sm">Create free account →</button>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-8">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold" style={{ color: 'var(--tx)' }}>Scan History</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--tx2)' }}>{scans.length} scans on record</p>
                </div>
                <input type="text" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter by condition…" className="px-4 py-2 rounded-xl text-sm outline-none w-full sm:w-56" style={{ background: 'var(--surface)', border: '1px solid var(--br)', color: 'var(--tx)' }}/>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((scan) => {
                    const condition = scan.result?.disease || scan.analysis || scan.disease || 'Unknown condition';
                    const conf = scan.result?.confidence ?? scan.confidence;

                    return (
                        <motion.div key={scan.id} className="rounded-2xl overflow-hidden card-hover cursor-pointer group" style={{ background: 'var(--surface)', border: '1px solid var(--br)' }} onClick={() => setSelected(scan)}>
                            <div className="h-44 relative overflow-hidden">
                                <img src={scan.photoUri || scan.imageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(e) => { e.currentTarget.src = 'https://placehold.co/600x400/0f172a/00e5ff?text=Image+Unavailable'; }} />
                                {/* Hover overlay */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(0,0,0,0.4)' }}>
                                    <ZoomIn size={22} style={{ color: '#00e5ff' }}/>
                                </div>
                                {/* Source badge — top left */}
                                <div className="absolute top-2 left-2">
                                    {scan.source === 'mobile' ? (
                                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] uppercase font-bold backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.6)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }}>
                                        <Smartphone size={10}/>
                                    </span>
                                    ) : scan.source === 'web' ? (
                                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] uppercase font-bold backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.6)', color: '#00e5ff', border: '1px solid rgba(0,229,255,0.3)' }}>
                                        <Monitor size={10}/>
                                    </span>
                                    ) : null}
                                </div>
                                {/* Confidence — top right */}
                                {conf != null && conf > 0 && (
                                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-sm"
                                         style={{ background: 'rgba(0,0,0,0.65)', color: confidenceColor(conf) }}>
                                        {typeof conf === 'number' ? conf.toFixed(1) : conf}%
                                    </div>
                                )}
                            </div>
                            <div className="p-4 space-y-1">
                                {scan.reportNum && (
                                    <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--tx3)' }}>
                                        Report #{scan.reportNum}
                                    </p>
                                )}
                                <h3 className="font-bold truncate" style={{ color: 'var(--tx)' }}>{condition}</h3>
                                <p className="text-xs" style={{ color: 'var(--tx3)' }}>{formatDate(scan.createdAt || scan.timestamp)}</p>
                            </div>
                        </motion.div>
                    )
                })}
            </div>

            <AnimatePresence>
                {selected && <ScanModal scan={selected} onClose={() => setSelected(null)} onDeleteClick={() => setDeleteTarget(selected)} />}
            </AnimatePresence>
            <AnimatePresence>
                {deleteTarget && <DeleteConfirmModal scan={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} />}
            </AnimatePresence>
        </div>
    );
};