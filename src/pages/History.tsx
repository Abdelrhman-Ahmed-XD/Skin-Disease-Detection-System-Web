import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, query, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { Calendar, ShieldCheck, X, Trash2, ZoomIn,  AlertCircle, Monitor, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface Scan {
    id: string;
    userId: string;
    photoUri?: string;
    imageUrl?: string;
    analysis?: string;
    prediction?: string;
    disease?: string;
    confidence?: number;
    description?: string;
    suggestions?: string[];
    createdAt?: any;
    timestamp?: any;
    bodyView?: string;
    x?: number;
    y?: number;
    source?: string;
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
    const displayDisease = scan.analysis || scan.prediction || scan.disease || 'Unknown condition';

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
    const displayImage = scan.photoUri || scan.imageUrl || '';
    const displayDisease = scan.analysis || scan.prediction || scan.disease || 'Unknown condition';
    const displayDate = scan.createdAt || scan.timestamp;

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
                                <Smartphone size={10} /> App
                            </span>
                        ) : scan.source === 'web' ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] uppercase font-bold" style={{ background: 'var(--surface2)', color: 'var(--tx2)', border: '1px solid var(--br)' }}>
                                <Monitor size={10} /> Web
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
                        {scan.confidence && (
                            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold"
                                 style={{ background: 'rgba(0,0,0,0.72)', color: confidenceColor(scan.confidence), backdropFilter: 'blur(8px)' }}>
                                {scan.confidence}%
                            </div>
                        )}
                    </div>

                    <div className="p-5 space-y-4">
                        <div>
                            <p className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: 'var(--tx3)' }}>Detected condition</p>
                            <p className="text-2xl font-extrabold" style={{ color: 'var(--tx)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{displayDisease}</p>
                        </div>

                        {(scan.bodyView || scan.x !== undefined) && (
                            <div className="flex items-center gap-3">
                                <span className="px-2 py-0.5 rounded-md text-xs uppercase font-bold" style={{ background: 'var(--surface2)', color: 'var(--tx2)', border: '1px solid var(--br)' }}>
                                    View: {scan.bodyView || 'front'}
                                </span>
                                <span className="px-2 py-0.5 rounded-md text-xs font-bold" style={{ background: 'var(--surface2)', color: 'var(--tx2)', border: '1px solid var(--br)' }}>
                                    X: {Math.round(scan.x || 0)} Y: {Math.round(scan.y || 0)}
                                </span>
                            </div>
                        )}

                        {scan.description && (
                            <div className="rounded-xl p-4" style={{ background: 'var(--surface2)', border: '1px solid var(--br)' }}>
                                <p className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: 'var(--tx3)' }}>Description</p>
                                <p className="text-sm leading-relaxed" style={{ color: 'var(--tx2)' }}>{scan.description}</p>
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--tx3)' }}>
                                <Calendar size={12}/> {formatDate(displayDate)}
                            </div>
                            {/* CALLS onDeleteClick TO OPEN CONFIRMATION MODAL */}
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
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Scan));
            docs.sort((a, b) => toMs(b.createdAt || b.timestamp) - toMs(a.createdAt || a.timestamp));
            setScans(docs);
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

    const filtered = scans.filter(s => (s.analysis || s.disease || '').toLowerCase().includes(filter.toLowerCase()));

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
                {filtered.map((scan) => (
                    <motion.div key={scan.id} className="rounded-2xl overflow-hidden card-hover cursor-pointer relative" style={{ background: 'var(--surface)', border: '1px solid var(--br)' }} onClick={() => setSelected(scan)}>
                        <div className="h-44 relative overflow-hidden">
                            <img src={scan.photoUri || scan.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-105" onError={(e) => { e.currentTarget.src = 'https://placehold.co/600x400/0f172a/00e5ff?text=Image+Unavailable'; }} />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/40"><ZoomIn size={18} style={{ color: '#00e5ff' }}/></div>
                        </div>
                        <div className="p-4">
                            <h3 className="font-bold truncate" style={{ color: 'var(--tx)' }}>{scan.analysis || 'Unknown'}</h3>
                            <p className="text-xs" style={{ color: 'var(--tx3)' }}>{formatDate(scan.createdAt || scan.timestamp)}</p>
                        </div>
                    </motion.div>
                ))}
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