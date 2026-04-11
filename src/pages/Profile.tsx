import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useNavigate } from 'react-router-dom';
import { Edit2, Check, X, LogOut, Mail, Calendar, Scan, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export const Profile: React.FC = () => {
  const { user, isGuest, logout } = useAuth();
  const navigate = useNavigate();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState('');
  const [draftName, setDraftName] = useState('');
  const [scanCount, setScanCount] = useState(0);
  const [joinDate, setJoinDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) { setLoading(false); return; }
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          const n = data.name || user.displayName || 'User';
          setName(n);
          setDraftName(n);
          if (data.createdAt) {
            setJoinDate(new Date(data.createdAt.toDate()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
          }
        }
        const cq = query(collection(db, 'scans'), where('userId', '==', user.uid));
        const snap2 = await getCountFromServer(cq);
        setScanCount(snap2.data().count);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [user]);

  const saveName = async () => {
    if (!draftName.trim()) { toast.error('Name cannot be empty'); return; }
    setSavingName(true);
    try {
      await updateDoc(doc(db, 'users', user!.uid), { name: draftName.trim() });
      if (auth.currentUser) await updateProfile(auth.currentUser, { displayName: draftName.trim() });
      setName(draftName.trim());
      setEditingName(false);
      toast.success('Name updated!');
    } catch { toast.error('Failed to update name'); }
    finally { setSavingName(false); }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const initials = name ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : (isGuest ? 'G' : 'U');
  const providers = user?.providerData.map(p => p.providerId) || [];

  const providerLabel = (id: string) => {
    if (id === 'google.com') return 'Google';
    if (id === 'facebook.com') return 'Facebook';
    if (id === 'password') return 'Email';
    return id;
  };

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
        <h2 className="text-2xl font-extrabold" style={{ color: 'var(--tx)' }}>Create an account</h2>
        <p style={{ color: 'var(--tx2)' }}>Guest accounts don't have a profile. Sign up for free to access your profile, save scans, and more.</p>
        <button onClick={() => navigate('/signup')} className="btn-accent px-6 py-3 rounded-xl text-sm">
          Create free account →
        </button>
      </div>
  );

  return (
      <div className="max-w-2xl mx-auto space-y-5 pb-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

          {/* Avatar + name card */}
          <div className="rounded-2xl p-7 space-y-6" style={{ background: 'var(--surface)', border: '1px solid var(--br)' }}>
            <div className="flex items-start gap-5">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-extrabold text-white flex-shrink-0"
                   style={{ background: 'var(--accent)', boxShadow: '0 8px 24px var(--accent-glow)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {initials}
              </div>
              {/* Name */}
              <div className="flex-1 min-w-0">
                {editingName ? (
                    <div className="flex items-center gap-2">
                      <input
                          type="text" value={draftName} onChange={e => setDraftName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                          className="flex-1 px-3 py-2 rounded-xl text-lg font-bold outline-none"
                          style={{ background: 'var(--surface2)', border: '1.5px solid var(--accent)', color: 'var(--tx)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                          autoFocus
                      />
                      <button onClick={saveName} disabled={savingName}
                              className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                              style={{ background: 'var(--accent)', color: '#fff' }}>
                        {savingName ? <span className="spin w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" /> : <Check size={16} />}
                      </button>
                      <button onClick={() => { setEditingName(false); setDraftName(name); }}
                              className="w-9 h-9 rounded-xl flex items-center justify-center"
                              style={{ background: 'var(--accent-dim)', color: 'var(--tx2)' }}>
                        <X size={16} />
                      </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-extrabold truncate" style={{ color: 'var(--tx)' }}>{name}</h1>
                      <button onClick={() => setEditingName(true)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
                              style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                        <Edit2 size={13} />
                      </button>
                    </div>
                )}
                <p className="text-sm mt-1" style={{ color: 'var(--tx2)' }}>{user?.email}</p>
                {providers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {providers.map(p => (
                          <span key={p} className="px-2 py-0.5 rounded-md text-xs font-semibold"
                                style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                      {providerLabel(p)}
                    </span>
                      ))}
                    </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Scan, label: 'Total scans', value: scanCount },
                { icon: Calendar, label: 'Member since', value: joinDate || '—' },
                { icon: Mail, label: 'Email', value: user?.email || '—' },
                { icon: ShieldCheck, label: 'Account status', value: user?.emailVerified ? 'Verified' : 'Active' },
              ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="rounded-xl p-4" style={{ background: 'var(--surface2)', border: '1px solid var(--br)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon size={14} style={{ color: 'var(--accent)' }} />
                      <span className="text-xs font-medium" style={{ color: 'var(--tx3)' }}>{label}</span>
                    </div>
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--tx)' }}>{String(value)}</p>
                  </div>
              ))}
            </div>
          </div>

          {/* Sign out */}
          <div className="rounded-2xl p-6 mt-4" style={{ background: 'var(--surface)', border: '1px solid var(--br)' }}>
            <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--tx)' }}>Account actions</h3>
            <button onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}>
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </motion.div>
      </div>
  );
};