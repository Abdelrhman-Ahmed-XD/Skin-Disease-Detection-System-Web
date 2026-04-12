import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { TrendingUp, ShieldCheck, Activity, Layers } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#00d4aa', '#0e7c6e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export const Reports: React.FC = () => {
    const { user, isGuest } = useAuth();
    const navigate = useNavigate();
    const [data, setData] = useState<{ name: string; value: number }[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isGuest) { setLoading(false); return; }
        if (!user) { setLoading(false); return; }
        const fetch = async () => {
            try {
                // --- SYNC FIX: Query nested subcollection ---
                const q = query(collection(db, 'users', user.uid, 'scans'));
                const snap = await getDocs(q);
                const scans = snap.docs.map(d => d.data());
                setTotal(scans.length);
                const freq: Record<string, number> = {};
                scans.forEach(s => {
                    // Fallback handles both web and mobile keys
                    const diseaseName = s.analysis || s.disease || 'Unknown';
                    if (diseaseName) {
                        freq[diseaseName] = (freq[diseaseName] || 0) + 1;
                    }
                });
                setData(Object.entries(freq).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value));
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
            <h2 className="text-2xl font-extrabold" style={{ color: 'var(--tx)' }}>Sign up for reports</h2>
            <p style={{ color: 'var(--tx2)' }}>Create an account to see charts and insights about your scan history.</p>
            <button onClick={() => navigate('/signup')} className="btn-accent px-6 py-3 rounded-xl text-sm">Create free account →</button>
        </div>
    );

    const stats = [
        { icon: Activity, label: 'Total scans', val: total },
        { icon: Layers, label: 'Unique conditions', val: data.length },
        { icon: TrendingUp, label: 'Most detected', val: data[0]?.name || '—' },
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-8">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                <h1 className="text-3xl font-extrabold" style={{ color: 'var(--tx)' }}>Health Reports</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--tx2)' }}>Insights based on your scan history.</p>
            </motion.div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {stats.map(({ icon: Icon, label, val }, i) => (
                    <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                                className="rounded-2xl p-5 card-hover"
                                style={{ background: 'var(--surface)', border: '1px solid var(--br)' }}>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                                 style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                                <Icon size={17} />
                            </div>
                            <span className="text-xs font-semibold" style={{ color: 'var(--tx3)' }}>{label}</span>
                        </div>
                        <p className="text-2xl font-extrabold truncate" style={{ color: 'var(--tx)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{val}</p>
                    </motion.div>
                ))}
            </div>

            {/* Chart */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--br)' }}>
                <h2 className="text-lg font-extrabold mb-5" style={{ color: 'var(--tx)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Condition frequency</h2>
                {data.length === 0 ? (
                    <div className="text-center py-12">
                        <TrendingUp size={32} className="mx-auto mb-3" style={{ color: 'var(--tx3)' }} />
                        <p className="text-sm" style={{ color: 'var(--tx3)' }}>No data yet. Run some scans to see your report.</p>
                        <button onClick={() => navigate('/dashboard')} className="btn-accent mt-4 px-5 py-2 rounded-xl text-sm">
                            Start scanning →
                        </button>
                    </div>
                ) : (
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value"
                                     label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                                    {data.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--br)', borderRadius: '12px', color: 'var(--tx)' }} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </motion.div>
        </div>
    );
};