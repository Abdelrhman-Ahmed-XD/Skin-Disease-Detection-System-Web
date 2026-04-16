import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { TrendingUp, ShieldCheck, Activity, Layers, Download, FileText, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';

const COLORS = ['#00e5ff', '#0ea5e9', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981', '#f97316'];

interface Scan {
    id: string;
    photoUri?: string;
    imageUrl?: string;
    analysis?: string;
    disease?: string;
    confidence?: number;
    description?: string;
    createdAt?: any;
    bodyView?: string;
}

const formatDate = (v: any): string => {
    if (!v) return 'Unknown date';
    try {
        if (typeof v?.toDate === 'function') return v.toDate().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        return new Date(v).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return 'Unknown date'; }
};

// ── Convert image URL to base64 for embedding in PDF ──────────────────────
const urlToBase64 = async (url: string): Promise<string> => {
    try {
        const res = await fetch(url);
        const blob = await res.blob();
        return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch { return ''; }
};

// ── Build HTML for a single scan report page ──────────────────────────────
const buildReportHTML = (params: {
    reportIndex: number;
    date: string;
    analysis: string;
    confidence: number;
    description: string;
    imageBase64: string;
    patientName: string;
    email: string;
    gender: string;
    skinColor: string;
    birthYear?: number;
    birthMonth?: number;
    birthDay?: number;
}) => {
    const age = params.birthYear
        ? `${new Date().getFullYear() - params.birthYear} years`
        : 'N/A';
    const dob = params.birthYear
        ? `${params.birthDay ?? '?'}/${params.birthMonth ?? '?'}/${params.birthYear}`
        : 'N/A';

    return `
    <div class="page">
      <div class="header">
        <div class="brand"><span class="brand-s">S</span>kinSight</div>
        <div class="tagline">Snap · Detect · Protect</div>
        <div class="divider"></div>
      </div>
      <div class="banner"><p>Skin Analysis Report</p></div>
      <div class="report-bar">
        <div class="report-num">Report #${params.reportIndex + 1}</div>
        <div class="report-date">${params.date}</div>
      </div>
      <div class="patient-section">
        <div class="section-title">Patient Information</div>
        <div class="patient-grid">
          <div class="info-item"><div class="info-label">Name</div><div class="info-value">${params.patientName || 'N/A'}</div></div>
          <div class="info-item"><div class="info-label">Email</div><div class="info-value">${params.email || 'N/A'}</div></div>
          <div class="info-item"><div class="info-label">Gender</div><div class="info-value" style="text-transform:capitalize">${params.gender || 'N/A'}</div></div>
          <div class="info-item"><div class="info-label">Age</div><div class="info-value">${age}</div></div>
          <div class="info-item"><div class="info-label">Date of birth</div><div class="info-value">${dob}</div></div>
          <div class="info-item"><div class="info-label">Skin tone</div><div class="info-value" style="display:flex;align-items:center;gap:6px">${params.skinColor ? `<span style="width:14px;height:14px;border-radius:50%;background:${params.skinColor};display:inline-block;border:1px solid #ccc"></span>` : ''}N/A</div></div>
        </div>
      </div>
      ${params.imageBase64 ? `
      <div class="image-section">
        <img src="${params.imageBase64}" alt="Scan image"/>
      </div>` : ''}
      <div class="analysis-section">
        <div class="section-title">Analysis Results</div>
        <div class="condition-row">
          <div class="condition-name">${params.analysis || 'Unknown condition'}</div>
          <div class="confidence-badge">${params.confidence?.toFixed(1) ?? '—'}% confidence</div>
        </div>
        ${params.confidence ? `
        <div class="confidence-bar-wrap">
          <div class="confidence-bar" style="width:${Math.min(params.confidence, 100)}%"></div>
        </div>` : ''}
        ${params.description ? `
        <div class="description-box">
          <div class="description-label">Description</div>
          <div class="description-text">${params.description}</div>
        </div>` : ''}
      </div>
      <div class="warning-section">
        <div class="warning-box">
          ⚠️ <strong>Medical Disclaimer:</strong> This report is generated by an AI model and is for informational purposes only.
          Always consult a qualified dermatologist or healthcare provider for any skin concerns.
        </div>
      </div>
      <div class="footer">
        <div class="footer-divider"></div>
        <div class="footer-brand"><span class="footer-s">S</span>kinSight</div>
        <div class="footer-copy">© 2026 SkinSight — Graduation Project · Faculty of Computers &amp; AI</div>
        <div class="footer-email">📧 skinsight.help.2025@gmail.com</div>
      </div>
    </div>`;
};

const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, 'Times New Roman', serif; background: #D8E9F0; padding: 20px; }
  .page { max-width: 700px; margin: 0 auto 40px; background: #D8E9F0; border-radius: 16px; overflow: hidden; page-break-after: always; }
  .header { background: #004F7F; padding: 32px 24px 24px; text-align: center; }
  .brand { font-size: 42px; font-weight: bold; color: #fff; letter-spacing: 2px; }
  .brand-s { color: #00A3A3; font-size: 50px; }
  .tagline { color: #C5E3ED; font-size: 12px; margin-top: 4px; letter-spacing: 3px; font-style: italic; }
  .divider { width: 50px; height: 3px; background: #00A3A3; margin: 12px auto 0; border-radius: 10px; }
  .banner { background: #00A3A3; padding: 8px 20px; text-align: center; }
  .banner p { color: #fff; font-size: 13px; font-style: italic; }
  .report-bar { background: #fff; border-left: 1px solid #C5E3ED; border-right: 1px solid #C5E3ED; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; }
  .report-num { font-size: 20px; font-weight: bold; color: #004F7F; }
  .report-date { font-size: 12px; color: #6B7280; font-family: system-ui; }
  .patient-section { background: #fff; border-left: 1px solid #C5E3ED; border-right: 1px solid #C5E3ED; padding: 16px 24px; border-top: 1px solid #E5F0F6; }
  .section-title { font-size: 13px; font-weight: bold; color: #004F7F; margin-bottom: 12px; font-family: system-ui; text-transform: uppercase; letter-spacing: .5px; }
  .patient-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  .info-item { background: #F4FBFF; border-radius: 8px; padding: 10px 12px; border: 1px solid #C5E3ED; }
  .info-label { font-size: 10px; color: #9CA3AF; font-family: system-ui; margin-bottom: 3px; text-transform: uppercase; letter-spacing: .5px; }
  .info-value { font-size: 13px; font-weight: bold; color: #1F2937; font-family: system-ui; }
  .image-section { background: #fff; border-left: 1px solid #C5E3ED; border-right: 1px solid #C5E3ED; padding: 0 24px 20px; text-align: center; }
  .image-section img { max-width: 100%; max-height: 300px; border-radius: 12px; border: 3px solid #C5E3ED; object-fit: cover; }
  .analysis-section { background: #fff; border-left: 1px solid #C5E3ED; border-right: 1px solid #C5E3ED; padding: 16px 24px; }
  .condition-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .condition-name { font-size: 20px; font-weight: bold; color: #004F7F; font-family: system-ui; }
  .confidence-badge { background: #004F7F; color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-family: system-ui; font-weight: bold; }
  .confidence-bar-wrap { height: 8px; background: #E5F0F6; border-radius: 6px; overflow: hidden; margin-bottom: 14px; }
  .confidence-bar { height: 100%; background: linear-gradient(90deg, #004F7F, #00A3A3); border-radius: 6px; }
  .description-box { background: #F4FBFF; border-radius: 10px; padding: 14px 16px; border: 1px solid #C5E3ED; }
  .description-label { font-size: 10px; color: #9CA3AF; font-family: system-ui; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .5px; }
  .description-text { font-size: 13px; color: #374151; line-height: 1.7; font-family: system-ui; }
  .warning-section { background: #fff; border-left: 1px solid #C5E3ED; border-right: 1px solid #C5E3ED; padding: 0 24px 20px; }
  .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #856404; line-height: 1.6; font-family: system-ui; }
  .footer { background: #004F7F; padding: 24px 20px; text-align: center; }
  .footer-divider { width: 40px; height: 2px; background: #00A3A3; margin: 0 auto 16px; border-radius: 10px; }
  .footer-brand { font-size: 18px; font-weight: bold; color: #fff; margin-bottom: 4px; }
  .footer-s { color: #00A3A3; }
  .footer-copy { color: #C5E3ED; font-size: 11px; font-family: system-ui; }
  .footer-email { color: #8ab4c9; font-size: 10px; margin-top: 4px; font-family: system-ui; }
  @media print { .page { margin: 0; border-radius: 0; } }
`;

// ── Download a PDF from HTML string ──────────────────────────────────────────
const downloadPDF = (html: string, filename: string) => {
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${filename}</title><style>${CSS}</style></head><body>${html}</body></html>`;
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
        win.onload = () => { win.print(); };
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
};

// ── Tooltip ───────────────────────────────────────────────────────────────────
const Tip: React.FC<{ text: string }> = ({ text }) => {
    const [show, setShow] = useState(false);
    return (
        <div className="relative inline-flex">
            <button onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
                    className="w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                <Info size={9}/>
            </button>
            <AnimatePresence>
                {show && (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 w-52 px-3 py-2 rounded-xl text-xs leading-relaxed pointer-events-none"
                                style={{ background: 'var(--surface)', border: '1px solid var(--br)', color: 'var(--tx2)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                        {text}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ── Main component ────────────────────────────────────────────────────────────
export const Reports: React.FC = () => {
    const { user, userProfile, isGuest } = useAuth();
    const navigate = useNavigate();
    const [scans, setScans]       = useState<Scan[]>([]);
    const [chartData, setChartData] = useState<{ name: string; value: number }[]>([]);
    const [loading, setLoading]   = useState(true);
    const [dlId, setDlId]         = useState<string | null>(null);
    const [dlAll, setDlAll]       = useState(false);
    const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');

    useEffect(() => {
        if (isGuest || !user) { setLoading(false); return; }
        (async () => {
            try {
                const snap = await getDocs(query(collection(db, 'users', user.uid, 'scans')));
                const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Scan));
                setScans(docs);
                const freq: Record<string, number> = {};
                docs.forEach(s => {
                    const name = s.analysis || s.disease || 'Unknown';
                    freq[name] = (freq[name] || 0) + 1;
                });
                setChartData(Object.entries(freq).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value));
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        })();
    }, [user, isGuest]);

    const buildParams = (scan: Scan, idx: number) => ({
        reportIndex:  idx,
        date:         formatDate(scan.createdAt),
        analysis:     scan.analysis || scan.disease || 'Unknown condition',
        confidence:   scan.confidence ?? 0,
        description:  scan.description || '',
        imageBase64:  '',
        patientName:  userProfile ? `${userProfile.firstName} ${userProfile.lastName}`.trim() : (user?.displayName || 'N/A'),
        email:        userProfile?.email || user?.email || 'N/A',
        gender:       userProfile?.gender || 'N/A',
        skinColor:    userProfile?.skinColor || '',
        birthYear:    userProfile?.birthYear,
        birthMonth:   userProfile?.birthMonth,
        birthDay:     userProfile?.birthDay,
    });

    const downloadOne = async (scan: Scan, idx: number) => {
        if (dlId || dlAll) return;
        setDlId(scan.id);
        try {
            const imgUrl = scan.photoUri || scan.imageUrl || '';
            const base64 = imgUrl ? await urlToBase64(imgUrl) : '';
            const params = { ...buildParams(scan, idx), imageBase64: base64 };
            downloadPDF(buildReportHTML(params), `SkinSight_Report_${idx + 1}`);
            toast.success('Report opened — use your browser Print → Save as PDF');
        } catch { toast.error('Failed to generate report'); }
        finally { setDlId(null); }
    };

    const downloadAll = async () => {
        if (dlId || dlAll || scans.length === 0) return;
        setDlAll(true);
        try {
            const pages: string[] = [];
            for (let i = 0; i < scans.length; i++) {
                const imgUrl = scans[i].photoUri || scans[i].imageUrl || '';
                const base64 = imgUrl ? await urlToBase64(imgUrl) : '';
                pages.push(buildReportHTML({ ...buildParams(scans[i], i), imageBase64: base64 }));
            }
            downloadPDF(pages.join('\n'), 'SkinSight_All_Reports');
            toast.success('All reports opened — Print → Save as PDF');
        } catch { toast.error('Failed to generate reports'); }
        finally { setDlAll(false); }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="spin w-8 h-8 border-2 rounded-full" style={{ borderColor: 'var(--br2)', borderTopColor: 'var(--accent)' }}/>
        </div>
    );

    if (isGuest) return (
        <div className="max-w-md mx-auto text-center py-20 space-y-5">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
                 style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                <ShieldCheck size={36}/>
            </div>
            <h2 className="text-2xl font-extrabold" style={{ color: 'var(--tx)' }}>Sign up for reports</h2>
            <p style={{ color: 'var(--tx2)' }}>Create an account to see charts and download PDF reports of your scans.</p>
            <button onClick={() => navigate('/signup')} className="btn-accent px-6 py-3 rounded-xl text-sm">Create free account →</button>
        </div>
    );

    const stats = [
        { icon: Activity,   label: 'Total scans',       val: scans.length },
        { icon: Layers,     label: 'Unique conditions',  val: chartData.length },
        { icon: TrendingUp, label: 'Most detected',      val: chartData[0]?.name || '—' },
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-8">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
                        className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold" style={{ color: 'var(--tx)' }}>Health Reports</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--tx2)' }}>Insights and PDF exports based on your scan history.</p>
                </div>
                {scans.length > 0 && (
                    <button onClick={downloadAll} disabled={dlAll}
                            className="btn-accent px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 disabled:opacity-60">
                        {dlAll
                            ? <span className="spin w-4 h-4 border-2 border-current/30 border-t-current rounded-full"/>
                            : <Download size={15}/>}
                        {dlAll ? 'Generating…' : 'Download all PDFs'}
                    </button>
                )}
            </motion.div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {stats.map(({ icon: Icon, label, val }, i) => (
                    <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.07 }}
                                className="rounded-2xl p-5 card-hover"
                                style={{ background: 'var(--surface)', border: '1px solid var(--br)' }}>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                                 style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                                <Icon size={17}/>
                            </div>
                            <span className="text-xs font-semibold" style={{ color: 'var(--tx3)' }}>{label}</span>
                        </div>
                        <p className="text-2xl font-extrabold truncate"
                           style={{ color: 'var(--tx)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{val}</p>
                    </motion.div>
                ))}
            </div>

            {/* Chart */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--br)' }}>
                <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-extrabold" style={{ color: 'var(--tx)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                            Condition frequency
                        </h2>
                        <Tip text="Shows how often each detected condition appeared across all your scans."/>
                    </div>
                    {chartData.length > 0 && (
                        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface2)' }}>
                            {(['pie', 'bar'] as const).map(t => (
                                <button key={t} onClick={() => setChartType(t)}
                                        className="px-3 py-1 rounded-md text-xs font-semibold capitalize transition-all"
                                        style={{ background: chartType === t ? 'var(--accent)' : 'transparent',
                                            color: chartType === t ? '#070d1a' : 'var(--tx2)' }}>
                                    {t} chart
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {chartData.length === 0 ? (
                    <div className="text-center py-12">
                        <TrendingUp size={32} className="mx-auto mb-3" style={{ color: 'var(--tx3)' }}/>
                        <p className="text-sm" style={{ color: 'var(--tx3)' }}>No data yet. Run some scans to see your report.</p>
                        <button onClick={() => navigate('/dashboard')} className="btn-accent mt-4 px-5 py-2 rounded-xl text-sm">
                            Start scanning →
                        </button>
                    </div>
                ) : (
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            {chartType === 'pie' ? (
                                <PieChart>
                                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={40} outerRadius={60}
                                         paddingAngle={4} dataKey="value"
                                         label={({ cx, cy, midAngle, outerRadius, name, percent, fill }) => {
                                             const RADIAN = Math.PI / 180;
                                             const radius = outerRadius + 12;
                                             // @ts-ignore
                                             const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                             // @ts-ignore
                                             const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                             return (
                                                 <text x={x} y={y} fill={fill} fontSize="11" fontWeight="bold" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                                                     {`${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                                 </text>
                                             );
                                         }}
                                         labelLine={{ stroke: 'var(--tx3)', strokeWidth: 1 }}>
                                        {chartData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]}/>)}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--br)', borderRadius: '12px', color: 'var(--tx)' }}/>
                                    <Legend/>
                                </PieChart>
                            ) : (
                                <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--br)"/>
                                    <XAxis dataKey="name" tick={{ fill: 'var(--tx3)', fontSize: 11 }} axisLine={false}/>
                                    <YAxis tick={{ fill: 'var(--tx3)', fontSize: 11 }} axisLine={false}/>
                                    <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--br)', borderRadius: '12px', color: 'var(--tx)' }}/>
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                        {chartData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]}/>)}
                                    </Bar>
                                </BarChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                )}
            </motion.div>

            {/* Per-scan report cards */}
            {scans.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                            className="space-y-4">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-extrabold" style={{ color: 'var(--tx)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                            Individual reports
                        </h2>
                        <Tip text="Each card represents one scan. Click 'Download PDF' to export a full branded report for that scan."/>
                    </div>

                    {scans.map((scan, i) => {
                        const condition = scan.analysis || scan.disease || 'Unknown condition';
                        const imgUrl = scan.photoUri || scan.imageUrl || '';
                        const conf = scan.confidence ?? 0;
                        const confColor = conf >= 80 ? '#22c55e' : conf >= 60 ? '#f59e0b' : '#ef4444';

                        return (
                            <motion.div key={scan.id}
                                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.04 }}
                                        className="rounded-2xl overflow-hidden"
                                        style={{ background: 'var(--surface)', border: '1px solid var(--br)' }}>
                                <div className="flex gap-4 p-4 sm:p-5">
                                    {/* Thumbnail */}
                                    {imgUrl && (
                                        <div className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden"
                                             style={{ background: 'var(--surface2)', border: '1px solid var(--br)' }}>
                                            <img src={imgUrl} alt={condition} className="w-full h-full object-cover"
                                                 onError={e => { e.currentTarget.src = 'https://placehold.co/80x80/0f172a/00e5ff?text=N/A'; }}/>
                                        </div>
                                    )}

                                    {/* Details */}
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div className="flex items-start justify-between gap-2 flex-wrap">
                                            <div>
                                                <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--tx3)' }}>
                                                    Report #{i + 1}
                                                </p>
                                                <h3 className="font-extrabold text-base truncate"
                                                    style={{ color: 'var(--tx)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                                                    {condition}
                                                </h3>
                                            </div>
                                            <span className="text-sm font-bold flex-shrink-0" style={{ color: confColor }}>
                        {conf.toFixed(1)}%
                      </span>
                                        </div>

                                        {/* Confidence bar */}
                                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--br2)' }}>
                                            <div className="h-full rounded-full"
                                                 style={{ width: `${conf}%`, background: `linear-gradient(90deg, ${confColor}77, ${confColor})` }}/>
                                        </div>

                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                            <p className="text-xs" style={{ color: 'var(--tx3)' }}>{formatDate(scan.createdAt)}</p>
                                            <button onClick={() => downloadOne(scan, i)} disabled={dlId === scan.id || dlAll}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                                                    style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(0,229,255,0.2)' }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.2)'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent-dim)'; }}>
                                                {dlId === scan.id
                                                    ? <span className="spin w-3 h-3 border-2 border-current/30 border-t-current rounded-full"/>
                                                    : <FileText size={12}/>}
                                                {dlId === scan.id ? 'Generating…' : 'Download PDF'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>
            )}
        </div>
    );
};