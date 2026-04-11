import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { Calendar, ShieldCheck, SearchX } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export const History: React.FC = () => {
    const { user, isGuest } = useAuth();
    const navigate = useNavigate();
    const [scans, setScans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isGuest) { setLoading(false); return; }
        if (!user) { setLoading(false); return; }
        const fetch = async () => {
            try {
                const q = query(collection(db, 'scans'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
                const snap = await getDocs(q);
                setScans(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        fetch();
    }, [user, isGuest]);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="spin w-8 h-8 border-2 rounded-full" style={{ borderColor: 'var(--br2)', borderTopColor: 'var(--accent)' }} />
        </div>
    );

    if (isGuest) return (
        <div className="max-w-md mx-auto text-center py-20 space-y-5">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
                 style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                <ShieldCheck size={36} />
            </div>
            <h2 className="text-2xl font-extrabold" style={{ color: 'var(--tx)' }}>Sign up to view history</h2>
            <p style={{ color: 'var(--tx2)' }}>Guest scans are not saved. Create a free account to track all your scans over time.</p>
            <button onClick={() => navigate('/signup')} className="btn-accent px-6 py-3 rounded-xl text-sm">
                Create free account →
            </button>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-8">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                <h1 className="text-3xl font-extrabold" style={{ color: 'var(--tx)' }}>Scan History</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--tx2)' }}>
                    {scans.length > 0 ? `${scans.length} scan${scans.length !== 1 ? 's' : ''} on record` : 'No scans yet'}
                </p>
            </motion.div>

            {scans.length === 0 ? (
                <div className="rounded-2xl p-16 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--br)' }}>
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                         style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                        <SearchX size={28} />
                    </div>
                    <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--tx)' }}>No scans yet</h3>
                    <p className="text-sm mb-5" style={{ color: 'var(--tx2)' }}>Upload your first skin photo to get started.</p>
                    <button onClick={() => navigate('/dashboard')} className="btn-accent px-5 py-2.5 rounded-xl text-sm">
                        Start scanning →
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {scans.map((scan, i) => (
                        <motion.div
                            key={scan.id}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.06, duration: 0.35 }}
                            className="rounded-2xl overflow-hidden card-hover"
                            style={{ background: 'var(--surface)', border: '1px solid var(--br)' }}
                        >
                            {/* Image */}
                            <div className="h-44 relative" style={{ background: 'var(--surface2)' }}>
                                <img src={scan.imageUrl} alt={scan.disease} className="w-full h-full object-cover" />
                                <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full text-xs font-bold"
                                     style={{ background: 'rgba(0,0,0,0.65)', color: 'var(--accent)', backdropFilter: 'blur(8px)' }}>
                                    {typeof scan.confidence === 'number' ? scan.confidence.toFixed(1) : scan.confidence}%
                                </div>
                            </div>
                            {/* Info */}
                            <div className="p-4 space-y-2">
                                <h3 className="font-bold text-base truncate" style={{ color: 'var(--tx)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                                    {scan.disease}
                                </h3>
                                <div className="confidence-track">
                                    <div className="confidence-fill" style={{ width: `${scan.confidence}%` }} />
                                </div>
                                <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--tx3)' }}>
                                    <Calendar size={11} />
                                    {scan.createdAt ? new Date(scan.createdAt.toDate()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Just now'}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};