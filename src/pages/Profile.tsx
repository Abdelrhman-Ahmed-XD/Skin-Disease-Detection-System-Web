import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { doc, updateDoc, collection, query, getCountFromServer } from 'firebase/firestore';
import {
  updateProfile, EmailAuthProvider, reauthenticateWithCredential,
  updatePassword, sendEmailVerification, verifyBeforeUpdateEmail,
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { useNavigate } from 'react-router-dom';
import {
  Check, LogOut, Mail, Calendar, Scan, ShieldCheck,
  User as UserIcon, Camera, Loader2, Lock, Eye, EyeOff,
  ChevronRight, Info, AlertTriangle, CheckCircle2, Send, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

function generateOTP(): string { return Math.floor(100000 + Math.random() * 900000).toString(); }

// ── Cloudinary upload ─────────────────────────────────────────────────────────
const uploadToCloudinary = async (file: File): Promise<string> => {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
  fd.append('folder', 'skinsight_profiles');
  const res = await fetch(
      `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', body: fd }
  );
  if (!res.ok) throw new Error('Upload failed');
  return (await res.json()).secure_url;
};

const SKIN_COLORS = [
  { label: 'Very Light', color: '#F5E0D3' }, { label: 'Light',      color: '#EACAA7' },
  { label: 'Medium',     color: '#D1A67A' }, { label: 'Tan',        color: '#B57D50' },
  { label: 'Brown',      color: '#A05C38' }, { label: 'Dark Brown', color: '#8B4513' },
  { label: 'Deep',       color: '#7A3E11' }, { label: 'Ebony',      color: '#603311' },
];
const EYE_COLORS  = [
  { name: 'Black', color: '#1a1a1a' }, { name: 'Brown', color: '#7B4B1A' },
  { name: 'Light Blue', color: '#6EB6FF' }, { name: 'Light Green', color: '#6EDB8F' },
  { name: 'Grey', color: '#9AA0A6' },
];
const HAIR_COLORS = [
  { name: 'Black', color: '#1a1a1a' }, { name: 'Brown', color: '#7B4B1A' },
  { name: 'Blonde', color: '#D4A853' }, { name: 'Red', color: '#C0392B' },
  { name: 'Grey', color: '#9AA0A6' },
];

const pwChecks = (pw: string) => [
  { label: 'At least 8 characters',  pass: pw.length >= 8 },
  { label: 'Uppercase letter',        pass: /[A-Z]/.test(pw) },
  { label: 'Lowercase letter',        pass: /[a-z]/.test(pw) },
  { label: 'A number',                pass: /[0-9]/.test(pw) },
  { label: 'Special character',       pass: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw) },
];
const isPwValid = (pw: string) => pwChecks(pw).every(c => c.pass);

const Tip: React.FC<{ text: string }> = ({ text }) => {
  const [show, setShow] = useState(false);
  return (
      <div className="relative inline-flex">
        <button onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
                onClick={() => setShow(v => !v)}
                className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
          <Info size={9}/>
        </button>
        <AnimatePresence>
          {show && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 w-52 px-3 py-2 rounded-xl text-xs leading-relaxed pointer-events-none"
                          style={{ background: 'var(--surface)', border: '1px solid var(--br)', color: 'var(--tx2)',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                {text}
              </motion.div>
          )}
        </AnimatePresence>
      </div>
  );
};

const ColorRow: React.FC<{ options: { color: string; name?: string; label?: string }[]; selected: string; onChange: (c: string) => void; }> = ({ options, selected, onChange }) => (
    <div className="flex flex-wrap gap-2 mt-2">
      {options.map(o => {
        const isSelected = selected === o.color;
        return (
            <button key={o.color} onClick={() => onChange(o.color)} title={o.name ?? o.label}
                    className="w-8 h-8 rounded-full transition-transform hover:scale-110 relative flex-shrink-0"
                    style={{ background: o.color, border: isSelected ? '2.5px solid var(--accent)' : '2px solid rgba(255,255,255,0.15)',
                      boxShadow: isSelected ? '0 0 0 3px rgba(0,229,255,0.25)' : 'none' }}>
              {isSelected && (
                  <span className="absolute inset-0 flex items-center justify-center">
              <Check size={12} color={parseInt(o.color.slice(1), 16) > 0x888888 ? '#000' : '#fff'}/>
            </span>
              )}
            </button>
        );
      })}
    </div>
);

type Tab = 'profile' | 'edit' | 'password' | 'email';

export const Profile: React.FC = () => {
  const { user, userProfile, isGuest, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('profile');

  // stats
  const [scanCount, setScanCount]         = useState(0);
  const [countLoading, setCountLoading]   = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // edit profile
  const [firstName, setFirstName]   = useState('');
  const [lastName, setLastName]     = useState('');
  const [gender, setGender]         = useState('');
  const [birthDay, setBirthDay]     = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear]   = useState('');
  const [skinColor, setSkinColor]   = useState('');
  const [eyeColor, setEyeColor]     = useState('');
  const [hairColor, setHairColor]   = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // change password
  const [curPw, setCurPw]         = useState('');
  const [newPw, setNewPw]         = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCur, setShowCur]     = useState(false);
  const [showNew, setShowNew]     = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [pwDone, setPwDone]       = useState(false);
  const [savingPw, setSavingPw]   = useState(false);

  // email change
  const [stepEmail, setStepEmail]           = useState<'form'|'otp'>('form');
  const [newEmail, setNewEmail]             = useState('');
  const [emailPw, setEmailPw]               = useState('');
  const [showEmailPw, setShowEmailPw]       = useState(false);
  const [savingEmail, setSavingEmail]       = useState(false);
  const [emailSent, setEmailSent]           = useState(false);
  const [sendingVerif, setSendingVerif]     = useState(false);

  // OTP States for Email Change
  const [emailOtp, setEmailOtp] = useState(['','','','','','']);
  const [emailServerOtp, setEmailServerOtp] = useState('');
  const [emailTimer, setEmailTimer] = useState(60);
  const [emailCanResend, setEmailCanResend] = useState(false);
  const [emailIsResending, setEmailIsResending] = useState(false);
  const emailInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!userProfile) return;
    setFirstName(userProfile.firstName || '');
    setLastName(userProfile.lastName || '');
    setGender(userProfile.gender || '');
    setBirthDay(String(userProfile.birthDay || ''));
    setBirthMonth(String(userProfile.birthMonth || ''));
    setBirthYear(String(userProfile.birthYear || ''));
    setSkinColor(userProfile.skinColor || '');
    setEyeColor((userProfile as any).eyeColor || '');
    setHairColor((userProfile as any).hairColor || '');
  }, [userProfile]);

  useEffect(() => {
    if (!user) { setCountLoading(false); return; }
    (async () => {
      try {
        const snap = await getCountFromServer(query(collection(db, 'users', user.uid, 'scans')));
        setScanCount(snap.data().count);
      } catch { } finally { setCountLoading(false); }
    })();
  }, [user]);

  // ── Handle Email Timer ──
  useEffect(() => {
    if (stepEmail !== 'otp') return;
    if (emailTimer === 0) { setEmailCanResend(true); return; }
    const interval = setInterval(() => setEmailTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [emailTimer, stepEmail]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return; }
    setUploadingPhoto(true);
    try {
      const url = await uploadToCloudinary(file);
      await updateDoc(doc(db, 'users', user.uid), { photoUri: url, updatedAt: new Date().toISOString() });
      if (auth.currentUser) await updateProfile(auth.currentUser, { photoURL: url });
      await refreshProfile();
      toast.success('Profile photo updated!');
    } catch { toast.error('Failed to upload photo'); }
    finally { setUploadingPhoto(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const saveEdit = async () => {
    if (!firstName.trim()) { toast.error('First name is required'); return; }
    setSavingEdit(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const updates: Record<string, any> = { firstName: firstName.trim(), lastName: lastName.trim(), gender, skinColor, eyeColor, hairColor, updatedAt: new Date().toISOString() };
      if (birthDay && birthMonth && birthYear) { updates.birthDay = parseInt(birthDay); updates.birthMonth = parseInt(birthMonth); updates.birthYear = parseInt(birthYear); }
      await updateDoc(doc(db, 'users', user!.uid), updates);
      if (auth.currentUser) await updateProfile(auth.currentUser, { displayName: fullName });
      await refreshProfile();
      toast.success('Profile updated!');
      setTab('profile');
    } catch { toast.error('Failed to save changes'); }
    finally { setSavingEdit(false); }
  };

  const savePassword = async () => {
    if (!curPw) { toast.error('Enter your current password'); return; }
    if (!isPwValid(newPw)) { toast.error('New password does not meet requirements'); return; }
    if (newPw !== confirmPw) { toast.error('Passwords do not match'); return; }

    setSavingPw(true);

    // ── 🛡️ PREVENT REUSING OLD PASSWORD (INVISIBLE REST API CHECK) ──
    try {
      const apiKey = auth.app.options.apiKey;

      const verifyRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user!.email, password: newPw, returnSecureToken: true })
      });

      const verifyData = await verifyRes.json();

      if (verifyRes.ok) {
        // 🚨 200 OK means the new password they typed matches their active server password
        toast.error('Your new password cannot be the same as your current password.');
        setSavingPw(false);
        return;
      } else if (verifyData.error?.message?.includes('TOO_MANY_ATTEMPTS')) {
        toast.error('Too many attempts. Please try again in a few minutes.');
        setSavingPw(false);
        return;
      }
    } catch (err) {
      console.log("Check skipped due to network error", err);
    }

    // ── PROCEED TO UPDATE PASSWORD ON FIREBASE ──
    try {
      const cred = EmailAuthProvider.credential(user!.email!, curPw);
      await reauthenticateWithCredential(auth.currentUser!, cred);
      await updatePassword(auth.currentUser!, newPw);
      setPwDone(true);
      setCurPw(''); setNewPw(''); setConfirmPw('');
      toast.success('Password changed!');
    } catch (e: any) {
      toast.error('Failed to change password or current password incorrect');
    }
    finally { setSavingPw(false); }
  };

  const requestChangeEmail = async () => {
    if (!newEmail.trim()) { toast.error('Enter a new email address'); return; }
    if (newEmail === user?.email) { toast.error('That is already your current email'); return; }
    if (!emailPw) { toast.error('Enter your password to confirm'); return; }
    setSavingEmail(true);

    try {
      const flaskUrl = import.meta.env.VITE_FLASK_URL || 'http://127.0.0.1:5000';

      // 1. Check if email exists securely via YOUR FLASK BACKEND
      const checkRes = await fetch(`${flaskUrl}/api/check-email`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: newEmail.trim() })
      });
      const checkData = await checkRes.json().catch(()=>({}));

      if (checkData.exists) {
        throw new Error('That email is already in use by another account');
      }

      // 2. Re-authenticate user
      const cred = EmailAuthProvider.credential(user!.email!, emailPw);
      await reauthenticateWithCredential(auth.currentUser!, cred);

      // 3. Send OTP
      const genOtp = generateOTP();
      setEmailServerOtp(genOtp);
      const res = await fetch(`${flaskUrl}/api/send-email-change-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail.trim(), name: userProfile?.firstName || 'User', otp_code: genOtp, source: 'web' })
      });
      if (!res.ok) throw new Error('Failed to send verification code');

      setStepEmail('otp');
      setEmailTimer(60);
      setEmailCanResend(false);
      toast.success(`Verification code sent to ${newEmail}`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to process email change');
    } finally { setSavingEmail(false); }
  };

  const handleResendEmailOtp = async () => {
    setEmailIsResending(true);
    try {
      const flaskUrl = import.meta.env.VITE_FLASK_URL || 'http://127.0.0.1:5000';
      const genOtp = generateOTP();
      setEmailServerOtp(genOtp);
      const res = await fetch(`${flaskUrl}/api/send-email-change-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail.trim(), name: userProfile?.firstName || 'User', otp_code: genOtp, source: 'web' })
      });
      if (!res.ok) throw new Error('Failed to resend verification code');

      setEmailTimer(60);
      setEmailCanResend(false);
      setEmailOtp(['','','','','','']);
      emailInputsRef.current[0]?.focus();
      toast.success('A new code has been sent!');
    } catch (e: any) {
      toast.error('Failed to resend the verification code.');
    } finally { setEmailIsResending(false); }
  };

  const verifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailOtp.join('') !== emailServerOtp) { toast.error('Invalid verification code'); return; }

    setSavingEmail(true);
    try {
      await verifyBeforeUpdateEmail(auth.currentUser!, newEmail.trim());
      await updateDoc(doc(db, 'users', user!.uid), { email: newEmail.trim(), updatedAt: new Date().toISOString() });
      setEmailSent(true);
      setStepEmail('form');
      setNewEmail(''); setEmailPw('');
      toast.success('Email successfully updated!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to finalize email update');
    } finally { setSavingEmail(false); }
  };

  const handleEmailOtpChange = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...emailOtp]; next[idx] = val.slice(-1); setEmailOtp(next);
    if (val && idx < 5) emailInputsRef.current[idx + 1]?.focus();
  };
  const handleEmailOtpKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !emailOtp[idx] && idx > 0) emailInputsRef.current[idx - 1]?.focus();
  };
  const handleEmailPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
    const next = [...emailOtp]; text.split('').forEach((c,i) => { next[i] = c; }); setEmailOtp(next);
    emailInputsRef.current[Math.min(text.length, 5)]?.focus();
  };

  const sendVerification = async () => {
    if (!auth.currentUser) return;
    setSendingVerif(true);
    try { await sendEmailVerification(auth.currentUser); toast.success('Verification email sent! Check your inbox.'); }
    catch (e: any) { toast.error('Too many requests — wait before trying again'); }
    finally { setSendingVerif(false); }
  };

  const handleLogout = async () => { await logout(); navigate('/'); };

  const fullName  = userProfile ? `${userProfile.firstName} ${userProfile.lastName}`.trim() : '';
  const initials  = userProfile ? `${userProfile.firstName?.[0] || ''}${userProfile.lastName?.[0] || ''}`.toUpperCase() : 'U';
  const providers = user?.providerData.map(p => p.providerId) || [];
  const isEmailProvider = providers.includes('password');
  const isVerified = user?.emailVerified || (userProfile as any)?.isEmailVerified === true;
  const joinDate = (() => {
    const raw = userProfile?.createdAt || user?.metadata.creationTime;
    if (!raw) return '—';
    try { return new Date(raw).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }
    catch { return '—'; }
  })();
  const skinLabel = SKIN_COLORS.find(s => s.color === (userProfile?.skinColor || skinColor))?.label;

  if (!userProfile && !isGuest) return <div className="flex items-center justify-center min-h-[60vh]"><div className="spin w-8 h-8 border-2 rounded-full" style={{ borderColor: 'var(--br2)', borderTopColor: 'var(--accent)' }}/></div>;
  if (isGuest) return (
      <div className="max-w-md mx-auto text-center py-20 space-y-5">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}><ShieldCheck size={36}/></div>
        <h2 className="text-2xl font-extrabold" style={{ color: 'var(--tx)' }}>Create an account</h2>
        <p style={{ color: 'var(--tx2)' }}>Sign up for free to access your profile, save scans, and more.</p>
        <button onClick={() => navigate('/signup')} className="btn-accent px-6 py-3 rounded-xl text-sm">Create free account →</button>
      </div>
  );

  const TABS: { id: Tab; label: string }[] = [
    { id: 'profile',  label: 'Overview' },
    { id: 'edit',     label: 'Edit Profile' },
    ...(isEmailProvider ? [ { id: 'password' as Tab, label: 'Password' }, { id: 'email' as Tab, label: 'Email' } ] : []),
  ];

  return (
      <div className="max-w-2xl mx-auto space-y-5 pb-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--br)' }}>
            <div className="flex items-center gap-5">
              <div className="relative flex-shrink-0">
                {userProfile?.photoUri ? ( <img src={userProfile.photoUri} alt={fullName} className="w-20 h-20 rounded-2xl object-cover" style={{ border: '2px solid var(--accent)', boxShadow: '0 8px 24px var(--accent-glow)' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}/> ) : ( <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-extrabold" style={{ background: 'var(--accent)', color: '#070d1a', boxShadow: '0 8px 24px var(--accent-glow)' }}>{initials}</div> )}
                <button onClick={() => fileRef.current?.click()} disabled={uploadingPhoto} className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl flex items-center justify-center transition-transform hover:scale-110" style={{ background: 'var(--accent)', color: '#070d1a', boxShadow: '0 4px 12px rgba(0,229,255,0.3)' }}>{uploadingPhoto ? <Loader2 size={14} className="animate-spin"/> : <Camera size={14}/>}</button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange}/>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-extrabold truncate" style={{ color: 'var(--tx)' }}>{fullName || 'No name set'}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-sm truncate" style={{ color: 'var(--tx2)' }}>{user?.email}</p>
                  {isEmailProvider && ( isVerified ? <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}><CheckCircle2 size={9}/> Verified</span> : <button onClick={sendVerification} disabled={sendingVerif} className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 transition-all" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>{sendingVerif ? <Loader2 size={9} className="animate-spin"/> : <Send size={9}/>} Verify email</button> )}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">{providers.map(p => ( <span key={p} className="px-2 py-0.5 rounded-md text-xs font-semibold" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>{p === 'google.com' ? 'Google' : p === 'facebook.com' ? 'Facebook' : p === 'password' ? 'Email' : p}</span> ))}</div>
              </div>
            </div>
          </div>

          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--surface)' }}>
            {TABS.map(t => ( <button key={t.id} onClick={() => { setTab(t.id); setPwDone(false); setEmailSent(false); setStepEmail('form'); }} className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all" style={{ background: tab === t.id ? 'var(--accent)' : 'transparent', color: tab === t.id ? '#070d1a' : 'var(--tx2)' }}>{t.label}</button> ))}
          </div>

          <AnimatePresence mode="wait">
            {tab === 'profile' && (
                <motion.div key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                  <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--br)' }}>
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>Account stats</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[ { icon: Scan, label: 'Total scans', value: countLoading ? '…' : scanCount }, { icon: Calendar, label: 'Member since', value: joinDate }, { icon: Mail, label: 'Email', value: user?.email || '—' }, { icon: ShieldCheck, label: 'Account status', value: isVerified ? 'Verified ✓' : 'Not verified' } ].map(({ icon: Icon, label, value }) => ( <div key={label} className="rounded-xl p-4" style={{ background: 'var(--surface2)', border: '1px solid var(--br)' }}><div className="flex items-center gap-2 mb-1"><Icon size={13} style={{ color: 'var(--accent)' }}/><span className="text-xs font-medium" style={{ color: 'var(--tx3)' }}>{label}</span></div><p className="text-sm font-semibold truncate" style={{ color: 'var(--tx)' }}>{String(value)}</p></div> ))}
                    </div>
                  </div>
                  {(userProfile?.gender || userProfile?.birthYear || userProfile?.skinColor) && (
                      <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--br)' }}>
                        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>Physical profile</p>
                        <div className="grid grid-cols-2 gap-3">
                          {userProfile.gender && ( <div className="rounded-xl p-4" style={{ background: 'var(--surface2)', border: '1px solid var(--br)' }}><div className="flex items-center gap-2 mb-1"><UserIcon size={13} style={{ color: 'var(--accent)' }}/><span className="text-xs font-medium" style={{ color: 'var(--tx3)' }}>Gender</span></div><p className="text-sm font-semibold capitalize" style={{ color: 'var(--tx)' }}>{userProfile.gender}</p></div> )}
                          {userProfile.birthYear && ( <div className="rounded-xl p-4" style={{ background: 'var(--surface2)', border: '1px solid var(--br)' }}><div className="flex items-center gap-2 mb-1"><Calendar size={13} style={{ color: 'var(--accent)' }}/><span className="text-xs font-medium" style={{ color: 'var(--tx3)' }}>Date of birth</span></div><p className="text-sm font-semibold" style={{ color: 'var(--tx)' }}>{userProfile.birthDay}/{userProfile.birthMonth}/{userProfile.birthYear}</p></div> )}
                          {userProfile.skinColor && ( <div className="rounded-xl p-4" style={{ background: 'var(--surface2)', border: '1px solid var(--br)' }}><div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: userProfile.skinColor }}/><span className="text-xs font-medium" style={{ color: 'var(--tx3)' }}>Skin tone</span></div><p className="text-sm font-semibold" style={{ color: 'var(--tx)' }}>{skinLabel || '—'}</p></div> )}
                        </div>
                      </div>
                  )}
                  <div className="rounded-2xl p-5 space-y-2" style={{ background: 'var(--surface)', border: '1px solid var(--br)' }}>
                    <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--accent)' }}>Actions</p>
                    <button onClick={() => setTab('edit')} className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all card-hover" style={{ background: 'var(--surface2)', color: 'var(--tx)' }}>Edit profile information <ChevronRight size={15} style={{ color: 'var(--tx3)' }}/></button>
                    {isEmailProvider && ( <> <button onClick={() => setTab('password')} className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all card-hover" style={{ background: 'var(--surface2)', color: 'var(--tx)' }}>Change password <ChevronRight size={15} style={{ color: 'var(--tx3)' }}/></button> <button onClick={() => setTab('email')} className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all card-hover" style={{ background: 'var(--surface2)', color: 'var(--tx)' }}>Change email address <ChevronRight size={15} style={{ color: 'var(--tx3)' }}/></button> {!isVerified && ( <button onClick={sendVerification} disabled={sendingVerif} className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all card-hover" style={{ background: 'rgba(245,158,11,0.07)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}><span className="flex items-center gap-2">{sendingVerif ? <Loader2 size={14} className="animate-spin"/> : <Mail size={14}/>} Verify email address</span><ChevronRight size={15}/></button> )} </> )}
                    <button onClick={handleLogout} className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all" style={{ background: 'rgba(239,68,68,0.07)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.14)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.07)'; }}><span className="flex items-center gap-2"><LogOut size={14}/> Sign out</span></button>
                  </div>
                </motion.div>
            )}

            {tab === 'edit' && (
                <motion.div key="edit" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-2xl p-6 space-y-6" style={{ background: 'var(--surface)', border: '1px solid var(--br)' }}>
                  <div className="flex items-center gap-2"><p className="text-base font-extrabold" style={{ color: 'var(--tx)' }}>Edit Profile</p><Tip text="Changes sync to Firestore and are visible across web and mobile."/></div>
                  <div className="grid grid-cols-2 gap-3">{[ { label: 'First name', val: firstName, set: setFirstName, tip: 'Your first name as shown in reports.' }, { label: 'Last name', val: lastName, set: setLastName, tip: 'Your last name or family name.' } ].map(({ label, val, set, tip }) => ( <div key={label}><div className="flex items-center gap-1.5 mb-1.5"><label className="text-xs font-semibold" style={{ color: 'var(--tx2)' }}>{label}</label><Tip text={tip}/></div><input type="text" value={val} onChange={e => set(e.target.value)} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: 'var(--surface2)', border: '1px solid var(--br)', color: 'var(--tx)' }}/></div> ))}</div>
                  <div><div className="flex items-center gap-1.5 mb-2"><label className="text-xs font-semibold" style={{ color: 'var(--tx2)' }}>Gender</label><Tip text="Used in PDF reports and personalised health insights."/></div><div className="flex gap-2">{['male', 'female', 'other'].map(g => ( <button key={g} onClick={() => setGender(g)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all" style={{ background: gender === g ? 'var(--accent)' : 'var(--surface2)', color: gender === g ? '#070d1a' : 'var(--tx2)', border: `1px solid ${gender === g ? 'var(--accent)' : 'var(--br)'}` }}>{g}</button> ))}</div></div>
                  <div><div className="flex items-center gap-1.5 mb-2"><label className="text-xs font-semibold" style={{ color: 'var(--tx2)' }}>Date of birth</label><Tip text="Your age is used to calculate skin cancer risk levels in reports."/></div><div className="grid grid-cols-3 gap-2">{[ { label: 'Day', val: birthDay, set: setBirthDay, placeholder: 'DD' }, { label: 'Month', val: birthMonth, set: setBirthMonth, placeholder: 'MM' }, { label: 'Year', val: birthYear, set: setBirthYear, placeholder: 'YYYY' } ].map(({ label, val, set, placeholder }) => ( <div key={label}><p className="text-[10px] font-semibold mb-1" style={{ color: 'var(--tx3)' }}>{label}</p><input type="number" value={val} onChange={e => set(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none text-center" style={{ background: 'var(--surface2)', border: '1px solid var(--br)', color: 'var(--tx)' }}/></div> ))}</div></div>
                  <div><div className="flex items-center gap-1.5 mb-1"><label className="text-xs font-semibold" style={{ color: 'var(--tx2)' }}>Skin tone</label><Tip text="Helps calibrate AI confidence thresholds for your skin type."/></div><ColorRow options={SKIN_COLORS} selected={skinColor} onChange={setSkinColor}/>{skinColor && <p className="text-xs mt-1.5" style={{ color: 'var(--accent)' }}>{SKIN_COLORS.find(s => s.color === skinColor)?.label}</p>}</div>
                  <div><div className="flex items-center gap-1.5 mb-1"><label className="text-xs font-semibold" style={{ color: 'var(--tx2)' }}>Eye colour</label><Tip text="Stored for full-report patient information."/></div><ColorRow options={EYE_COLORS} selected={eyeColor} onChange={setEyeColor}/></div>
                  <div><div className="flex items-center gap-1.5 mb-1"><label className="text-xs font-semibold" style={{ color: 'var(--tx2)' }}>Hair colour</label><Tip text="Included in the PDF patient information section."/></div><ColorRow options={HAIR_COLORS} selected={hairColor} onChange={setHairColor}/></div>
                  <div className="flex gap-3 pt-2"><button onClick={() => setTab('profile')} className="btn-ghost flex-1 py-3 rounded-xl text-sm">Cancel</button><button onClick={saveEdit} disabled={savingEdit} className="btn-accent flex-1 py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60">{savingEdit ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>}{savingEdit ? 'Saving…' : 'Save changes'}</button></div>
                </motion.div>
            )}

            {tab === 'password' && (
                <motion.div key="password" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-2xl p-6 space-y-5" style={{ background: 'var(--surface)', border: '1px solid var(--br)' }}>
                  <AnimatePresence mode="wait">
                    {pwDone ? (
                        <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8 space-y-4">
                          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto" style={{ background: 'rgba(34,197,94,0.1)' }}><CheckCircle2 size={40} color="#22c55e"/></div>
                          <h2 className="text-xl font-extrabold" style={{ color: 'var(--tx)' }}>Password changed!</h2><p className="text-sm" style={{ color: 'var(--tx2)' }}>Your password has been updated successfully.</p>
                          <button onClick={() => { setPwDone(false); setTab('profile'); }} className="btn-accent px-6 py-2.5 rounded-xl text-sm">Back to profile</button>
                        </motion.div>
                    ) : (
                        <motion.div key="form" className="space-y-5">
                          <div className="flex items-center gap-2"><p className="text-base font-extrabold" style={{ color: 'var(--tx)' }}>Change Password</p><Tip text="You need your current password to verify it's you before setting a new one."/></div>
                          {[ { label: 'Current password', val: curPw, set: setCurPw, show: showCur, toggle: () => setShowCur(v => !v), tip: 'The password you currently use to log in.' }, { label: 'New password', val: newPw, set: setNewPw, show: showNew, toggle: () => setShowNew(v => !v), tip: 'Min 8 chars, uppercase, lowercase, number, special char.' }, { label: 'Confirm new password', val: confirmPw, set: setConfirmPw, show: showConf, toggle: () => setShowConf(v => !v), tip: 'Re-type the new password to confirm.' } ].map(({ label, val, set, show, toggle, tip }) => (
                              <div key={label}>
                                <div className="flex items-center gap-1.5 mb-1.5"><label className="text-xs font-semibold" style={{ color: 'var(--tx2)' }}>{label}</label><Tip text={tip}/></div>
                                <div className="relative"><Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--tx3)' }}/><input type={show ? 'text' : 'password'} value={val} onChange={e => set(e.target.value)} className="w-full pl-9 pr-10 py-2.5 rounded-xl text-sm outline-none" style={{ background: 'var(--surface2)', border: '1px solid var(--br)', color: 'var(--tx)' }}/><button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--tx3)' }}>{show ? <EyeOff size={15}/> : <Eye size={15}/>}</button></div>
                                {label.includes('Confirm') && confirmPw && newPw !== confirmPw && ( <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#ef4444' }}><AlertTriangle size={11}/> Passwords do not match</p> )}
                              </div>
                          ))}
                          {newPw.length > 0 && ( <div className="rounded-xl p-3 space-y-1.5" style={{ background: 'var(--surface2)', border: '1px solid var(--br)' }}><p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--tx3)' }}>Requirements</p>{pwChecks(newPw).map(({ label, pass }) => ( <div key={label} className="flex items-center gap-2"><div className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: pass ? '#22c55e' : 'var(--br2)' }}>{pass && <Check size={8} color="#fff"/>}</div><span className="text-xs" style={{ color: pass ? '#22c55e' : 'var(--tx3)' }}>{label}</span></div> ))}</div> )}
                          <div className="flex gap-3 pt-1"><button onClick={() => setTab('profile')} className="btn-ghost flex-1 py-3 rounded-xl text-sm">Cancel</button><button onClick={savePassword} disabled={savingPw || !curPw || !isPwValid(newPw) || newPw !== confirmPw} className="btn-accent flex-1 py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50">{savingPw ? <Loader2 size={14} className="animate-spin"/> : <Lock size={14}/>}{savingPw ? 'Saving…' : 'Change password'}</button></div>
                        </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
            )}

            {/* ── CHANGE EMAIL ── */}
            {tab === 'email' && (
                <motion.div key="email" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-2xl p-6 space-y-5" style={{ background: 'var(--surface)', border: '1px solid var(--br)' }}>
                  <AnimatePresence mode="wait">
                    {emailSent ? (
                        <motion.div key="sent" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8 space-y-4">
                          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto" style={{ background: 'var(--accent-dim)' }}><CheckCircle2 size={36} style={{ color: 'var(--accent)' }}/></div>
                          <h2 className="text-xl font-extrabold" style={{ color: 'var(--tx)' }}>Email Updated!</h2>
                          <p className="text-sm leading-relaxed" style={{ color: 'var(--tx2)' }}>Your email address has been successfully updated to <strong style={{ color: 'var(--tx)' }}>{newEmail}</strong>.</p>
                          <button onClick={() => { setEmailSent(false); setStepEmail('form'); setTab('profile'); }} className="btn-accent px-6 py-2.5 rounded-xl text-sm">Back to profile</button>
                        </motion.div>
                    ) : stepEmail === 'otp' ? (
                        <motion.div key="otp" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}>

                          <div className="text-center mb-8">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                              <Mail size={30}/>
                            </div>
                            <h1 className="text-2xl font-extrabold" style={{ color:'var(--tx)' }}>Verify new email</h1>
                            <p className="text-sm mt-2" style={{ color:'var(--tx2)' }}>
                              We sent a 6-digit code to <br/>
                              <strong style={{ color:'var(--tx)' }}>{newEmail}</strong>
                            </p>
                          </div>

                          <form onSubmit={verifyEmailOtp} className="space-y-6">
                            <div className="flex items-center justify-center gap-3" onPaste={handleEmailPaste}>
                              {emailOtp.map((digit,i) => (
                                  <input key={i} ref={el => { emailInputsRef.current[i] = el; }}
                                         type="text" inputMode="numeric" maxLength={1} value={digit}
                                         onChange={e => handleEmailOtpChange(i, e.target.value)}
                                         onKeyDown={e => handleEmailOtpKeyDown(i, e)}
                                         className={`w-14 h-16 text-center text-2xl font-bold rounded-xl outline-none transition-all duration-200 border-2 ${
                                             digit
                                                 ? 'border-[var(--accent)] shadow-[0_0_10px_var(--accent-glow)]'
                                                 : 'border-[var(--br)] hover:border-[var(--accent)] focus:border-[var(--accent)] hover:shadow-[0_0_10px_var(--accent-glow)] focus:shadow-[0_0_10px_var(--accent-glow)]'
                                         }`}
                                         style={{ background: 'var(--surface2)', color: 'var(--tx)' }}
                                  />
                              ))}
                            </div>

                            {/* Timer & Resend Section */}
                            <div className="flex flex-col items-center justify-center mt-6">
                              {emailCanResend ? (
                                  <button type="button" onClick={handleResendEmailOtp} disabled={emailIsResending}
                                          className="flex items-center gap-2 text-sm font-bold hover:underline transition-all"
                                          style={{ color: emailIsResending ? 'var(--tx3)' : 'var(--accent)' }}>
                                    <RefreshCw size={14} className={emailIsResending ? 'animate-spin' : ''} />
                                    {emailIsResending ? 'Sending new code...' : 'Resend Code'}
                                  </button>
                              ) : (
                                  <p className="text-sm font-medium" style={{ color: 'var(--tx2)' }}>
                                    Resend code in <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>00:{emailTimer.toString().padStart(2, '0')}</span>
                                  </p>
                              )}
                            </div>

                            <button type="submit" disabled={emailOtp.join('').length < 6 || savingEmail}
                                    className="btn-accent w-full py-3.5 rounded-xl text-base font-bold flex items-center justify-center gap-2 mt-4 disabled:opacity-50 transition-all duration-300">
                              {savingEmail ? <span className="spin w-5 h-5 border-2 border-current/30 border-t-current rounded-full"/> : null}
                              {savingEmail ? 'Verifying...' : 'Verify & Update Email'}
                            </button>

                            <div className="pt-2 text-center border-t" style={{ borderColor: 'var(--br2)' }}>
                              <button type="button" onClick={() => setStepEmail('form')} className="text-xs font-semibold hover:underline" style={{ color:'var(--tx3)' }}>
                                Cancel
                              </button>
                            </div>
                          </form>
                        </motion.div>
                    ) : (
                        <motion.div key="form" className="space-y-5">
                          <div className="flex items-center gap-2"><p className="text-base font-extrabold" style={{ color: 'var(--tx)' }}>Change Email</p><Tip text="A verification link will be sent to your new email."/></div>
                          <div className="rounded-xl px-4 py-3 text-xs leading-relaxed" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#d97706' }}>⚠ Your current email: <strong>{user?.email}</strong>. Enter a new email and your password to request the change.</div>
                          <div><label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--tx2)' }}>New email address</label><div className="relative"><Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--tx3)' }}/><input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="new@example.com" className="w-full pl-9 py-2.5 rounded-xl text-sm outline-none" style={{ background: 'var(--surface2)', border: '1px solid var(--br)', color: 'var(--tx)' }}/></div></div>
                          <div>
                            <div className="flex items-center gap-1.5 mb-1.5"><label className="text-xs font-semibold" style={{ color: 'var(--tx2)' }}>Your current password</label><Tip text="Required to verify it's you before changing your email."/></div>
                            <div className="relative">
                              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--tx3)' }}/>
                              <input type={showEmailPw ? 'text' : 'password'} value={emailPw} onChange={e => setEmailPw(e.target.value)} placeholder="Current password" className="w-full pl-9 pr-10 py-2.5 rounded-xl text-sm outline-none" style={{ background: 'var(--surface2)', border: '1px solid var(--br)', color: 'var(--tx)' }}/>
                              <button type="button" onClick={() => setShowEmailPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--tx3)' }}>{showEmailPw ? <EyeOff size={15}/> : <Eye size={15}/>}</button>
                            </div>
                          </div>
                          <div className="flex gap-3 pt-1"><button onClick={() => setTab('profile')} className="btn-ghost flex-1 py-3 rounded-xl text-sm">Cancel</button><button onClick={requestChangeEmail} disabled={savingEmail || !newEmail || !emailPw} className="btn-accent flex-1 py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50">{savingEmail ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>}{savingEmail ? 'Sending…' : 'Send verification code'}</button></div>
                        </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
  );
};