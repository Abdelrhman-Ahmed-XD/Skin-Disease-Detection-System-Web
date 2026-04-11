import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { doc, updateDoc, collection, query, where, getCountFromServer } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useNavigate } from 'react-router-dom';
import { Edit2, Check, X, LogOut, Mail, Calendar, Scan, ShieldCheck, User as UserIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export const Profile: React.FC = () => {
  const { user, userProfile, isGuest, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [editingName, setEditingName] = useState(false);
  const [draftFirst, setDraftFirst] = useState('');
  const [draftLast, setDraftLast]   = useState('');
  const [scanCount, setScanCount]   = useState(0);
  const [savingName, setSavingName] = useState(false);
  const [countLoading, setCountLoading] = useState(true);

  useEffect(() => {
    if (userProfile) {
      setDraftFirst(userProfile.firstName);
      setDraftLast(userProfile.lastName);
    }
  }, [userProfile]);

  useEffect(() => {
    const loadCount = async () => {
      if (!user) { setCountLoading(false); return; }
      try {
        const cq = query(collection(db, 'scans'), where('userId', '==', user.uid));
        const snap = await getCountFromServer(cq);
        setScanCount(snap.data().count);
      } catch (e) { console.error(e); }
      finally { setCountLoading(false); }
    };
    loadCount();
  }, [user]);

  const saveName = async () => {
    if (!draftFirst.trim()) { toast.error('First name cannot be empty'); return; }
    setSavingName(true);
    try {
      const fullName = `${draftFirst.trim()} ${draftLast.trim()}`.trim();
      await updateDoc(doc(db, 'users', user!.uid), {
        firstName: draftFirst.trim(),
        lastName: draftLast.trim(),
        updatedAt: new Date().toISOString(),
      });
      if (auth.currentUser) await updateProfile(auth.currentUser, { displayName: fullName });
      await refreshProfile();
      setEditingName(false);
      toast.success('Name updated!');
    } catch { toast.error('Failed to update name'); }
    finally { setSavingName(false); }
  };

  const handleLogout = async () => { await logout(); navigate('/'); };

  // Format join date from ISO string (mobile app stores it as string)
  const joinDate = (() => {
    const raw = userProfile?.createdAt || user?.metadata.creationTime;
    if (!raw) return '—';
    try { return new Date(raw).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }
    catch { return '—'; }
  })();

  const fullName   = userProfile ? `${userProfile.firstName} ${userProfile.lastName}`.trim() : '';
  const initials   = userProfile
      ? `${userProfile.firstName[0] || ''}${userProfile.lastName[0] || ''}`.toUpperCase()
      : (isGuest ? 'G' : 'U');
  const providers  = user?.providerData.map(p => p.providerId) || [];
  const providerLabel = (id: string) =>
      id === 'google.com' ? 'Google' : id === 'facebook.com' ? 'Facebook' : id === 'password' ? 'Email' : id;

  if (!userProfile && !isGuest) return (
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

              {/* Avatar — shows photo from Cloudinary if available */}
              {userProfile?.photoUri ? (
                  <img
                      src={userProfile.photoUri}
                      alt={fullName}
                      className="w-20 h-20 rounded-2xl object-cover flex-shrink-0"
                      style={{ boxShadow: '0 8px 24px var(--accent-glow)', border: '2px solid var(--accent)' }}
                  />
              ) : (
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-extrabold text-white flex-shrink-0"
                       style={{ background: 'var(--accent)', boxShadow: '0 8px 24px var(--accent-glow)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    {initials}
                  </div>
              )}

              {/* Name */}
              <div className="flex-1 min-w-0">
                {editingName ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                            type="text" value={draftFirst} onChange={e => setDraftFirst(e.target.value)}
                            placeholder="First name"
                            className="flex-1 px-3 py-2 rounded-xl text-base font-bold outline-none"
                            style={{ background: 'var(--surface2)', border: '1.5px solid var(--accent)', color: 'var(--tx)' }}
                            autoFocus
                        />
                        <input
                            type="text" value={draftLast} onChange={e => setDraftLast(e.target.value)}
                            placeholder="Last name"
                            className="flex-1 px-3 py-2 rounded-xl text-base font-bold outline-none"
                            style={{ background: 'var(--surface2)', border: '1.5px solid var(--accent)', color: 'var(--tx)' }}
                            onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                        />
                        <button onClick={saveName} disabled={savingName}
                                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ background: 'var(--accent)', color: '#fff' }}>
                          {savingName ? <span className="spin w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" /> : <Check size={16} />}
                        </button>
                        <button onClick={() => { setEditingName(false); setDraftFirst(userProfile?.firstName || ''); setDraftLast(userProfile?.lastName || ''); }}
                                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ background: 'var(--accent-dim)', color: 'var(--tx2)' }}>
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-extrabold truncate" style={{ color: 'var(--tx)' }}>{fullName || 'No name set'}</h1>
                      <button onClick={() => setEditingName(true)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
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

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Scan,       label: 'Total scans',    value: countLoading ? '…' : scanCount },
                { icon: Calendar,   label: 'Member since',   value: joinDate },
                { icon: Mail,       label: 'Email',          value: user?.email || '—' },
                { icon: ShieldCheck,label: 'Account status', value: userProfile?.isEmailVerified ? 'Verified' : 'Active' },
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

            {/* Extra profile info from mobile app data */}
            {(userProfile?.gender || userProfile?.birthYear) && (
                <div className="grid grid-cols-2 gap-3">
                  {userProfile?.gender && (
                      <div className="rounded-xl p-4" style={{ background: 'var(--surface2)', border: '1px solid var(--br)' }}>
                        <div className="flex items-center gap-2 mb-1">
                          <UserIcon size={14} style={{ color: 'var(--accent)' }} />
                          <span className="text-xs font-medium" style={{ color: 'var(--tx3)' }}>Gender</span>
                        </div>
                        <p className="text-sm font-semibold capitalize" style={{ color: 'var(--tx)' }}>{userProfile.gender}</p>
                      </div>
                  )}
                  {userProfile?.birthYear && (
                      <div className="rounded-xl p-4" style={{ background: 'var(--surface2)', border: '1px solid var(--br)' }}>
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar size={14} style={{ color: 'var(--accent)' }} />
                          <span className="text-xs font-medium" style={{ color: 'var(--tx3)' }}>Date of birth</span>
                        </div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--tx)' }}>
                          {userProfile.birthDay}/{userProfile.birthMonth}/{userProfile.birthYear}
                        </p>
                      </div>
                  )}
                </div>
            )}
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