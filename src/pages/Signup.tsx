import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  createUserWithEmailAndPassword, updateProfile,
  sendEmailVerification,
} from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Mail, Lock, User as UserIcon, Eye, EyeOff, UserPlus, Check, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

// ── Password strength (same criteria as Profile + mobile app) ─────────────────
const PW_CHECKS = [
  { label: 'At least 8 characters',  test: (p: string) => p.length >= 8 },
  { label: 'Uppercase letter',        test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter',        test: (p: string) => /[a-z]/.test(p) },
  { label: 'A number',                test: (p: string) => /[0-9]/.test(p) },
  { label: 'Special character (!@#…)', test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];
const isStrong = (p: string) => PW_CHECKS.every(c => c.test(p));

type Step = 'form' | 'verify';

export const Signup: React.FC = () => {
  const [step, setStep]         = useState<Step>('form');
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [showCf, setShowCf]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const [pwTouched, setPwTouched] = useState(false);
  const { loginWithGoogle, loginWithFacebook } = useAuth();
  const navigate = useNavigate();

  const pwResults = PW_CHECKS.map(c => ({ ...c, pass: c.test(password) }));
  const pwScore = pwResults.filter(c => c.pass).length;
  const confirmMismatch = confirm.length > 0 && password !== confirm;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Please enter your name'); return; }
    if (!isStrong(password)) { toast.error('Password does not meet all requirements'); return; }
    if (password !== confirm) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      const nameParts = name.trim().split(' ');
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid:             cred.user.uid,
        firstName:       nameParts[0] || '',
        lastName:        nameParts.slice(1).join(' ') || '',
        email,
        photoUri:        '',
        gender:          '',
        skinColor:       '',
        darkMode:        true,
        isEmailVerified: false,
        createdAt:       new Date().toISOString(),
        updatedAt:       new Date().toISOString(),
      });
      // Send Firebase verification email
      await sendEmailVerification(cred.user);
      setStep('verify');
      toast.success('Account created! Check your email to verify.');
    } catch (error: any) {
      const msg =
          error.code === 'auth/email-already-in-use' ? 'Email already in use' :
              error.code === 'auth/weak-password'         ? 'Password is too weak' :
                  error.message || 'Failed to create account';
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const resendVerification = async () => {
    if (!auth.currentUser) return;
    setResending(true);
    try {
      await sendEmailVerification(auth.currentUser);
      toast.success('Verification email resent!');
    } catch (e: any) {
      toast.error(e.code === 'auth/too-many-requests' ? 'Too many requests — wait a moment' : 'Failed to resend');
    } finally { setResending(false); }
  };

  const handleGoogle   = async () => { await loginWithGoogle();   navigate('/dashboard'); };
  const handleFacebook = async () => { await loginWithFacebook(); navigate('/dashboard'); };

  // Strength bar color
  const barColor = pwScore <= 1 ? '#ef4444' : pwScore <= 3 ? '#f59e0b' : '#22c55e';

  return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-9rem)] py-10 px-4">
        <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-md">
          <div className="rounded-2xl p-8" style={{ background: 'var(--surface)', border: '1px solid var(--br)' }}>

            <AnimatePresence mode="wait">

              {/* ── STEP 1: Registration form ── */}
              {step === 'form' && (
                  <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="text-center mb-7">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                           style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                        <UserPlus size={22}/>
                      </div>
                      <h1 className="text-2xl font-extrabold" style={{ color: 'var(--tx)' }}>Create your account</h1>
                      <p className="text-sm mt-1.5" style={{ color: 'var(--tx2)' }}>
                        Already have one?{' '}
                        <Link to="/login" className="font-semibold hover:underline" style={{ color: 'var(--accent)' }}>Sign in</Link>
                      </p>
                    </div>

                    <form onSubmit={handleSignup} className="space-y-4">
                      {/* Full name */}
                      <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--tx2)' }}>Full name</label>
                        <div className="relative">
                          <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--tx3)' }}/>
                          <input type="text" value={name} onChange={e => setName(e.target.value)}
                                 className="input-field" placeholder="Ahmed Mohamed" required/>
                        </div>
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--tx2)' }}>Email</label>
                        <div className="relative">
                          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--tx3)' }}/>
                          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                 className="input-field" placeholder="you@example.com" required/>
                        </div>
                      </div>

                      {/* Password */}
                      <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--tx2)' }}>Password</label>
                        <div className="relative">
                          <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--tx3)' }}/>
                          <input type={showPw ? 'text' : 'password'} value={password}
                                 onChange={e => { setPassword(e.target.value); setPwTouched(true); }}
                                 className="input-field pr-10" placeholder="Create a strong password" required/>
                          <button type="button" onClick={() => setShowPw(v => !v)}
                                  className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--tx3)' }}>
                            {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                          </button>
                        </div>

                        {/* Strength bar */}
                        {pwTouched && password.length > 0 && (
                            <div className="mt-2 space-y-2">
                              <div className="flex gap-1">
                                {[1,2,3,4,5].map(i => (
                                    <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
                                         style={{ background: i <= pwScore ? barColor : 'var(--br2)' }}/>
                                ))}
                              </div>
                              <div className="space-y-1">
                                {pwResults.map(({ label, pass }) => (
                                    <div key={label} className="flex items-center gap-2">
                                      <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0"
                                           style={{ background: pass ? '#22c55e' : 'var(--br2)' }}>
                                        {pass && <Check size={8} color="#fff"/>}
                                      </div>
                                      <span className="text-xs" style={{ color: pass ? '#22c55e' : 'var(--tx3)' }}>{label}</span>
                                    </div>
                                ))}
                              </div>
                            </div>
                        )}
                      </div>

                      {/* Confirm password */}
                      <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--tx2)' }}>Confirm password</label>
                        <div className="relative">
                          <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--tx3)' }}/>
                          <input type={showCf ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}
                                 className="input-field pr-10"
                                 style={{ borderColor: confirmMismatch ? '#ef4444' : undefined }}
                                 placeholder="Repeat password" required/>
                          <button type="button" onClick={() => setShowCf(v => !v)}
                                  className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--tx3)' }}>
                            {showCf ? <EyeOff size={15}/> : <Eye size={15}/>}
                          </button>
                        </div>
                        {confirmMismatch && (
                            <p className="text-xs mt-1" style={{ color: '#ef4444' }}>Passwords do not match</p>
                        )}
                      </div>

                      <button type="submit" disabled={loading || !isStrong(password) || password !== confirm}
                              className="btn-accent w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-50">
                        {loading ? <span className="spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"/> : <UserPlus size={15}/>}
                        {loading ? 'Creating account…' : 'Create account'}
                      </button>
                    </form>

                    <div className="my-5 flex items-center gap-3">
                      <div className="flex-1 h-px" style={{ background: 'var(--br2)' }}/>
                      <span className="text-xs font-medium" style={{ color: 'var(--tx3)' }}>or sign up with</span>
                      <div className="flex-1 h-px" style={{ background: 'var(--br2)' }}/>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={handleGoogle} className="btn-ghost py-2.5 rounded-xl text-sm flex items-center justify-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Google
                      </button>
                      <button onClick={handleFacebook} className="btn-ghost py-2.5 rounded-xl text-sm flex items-center justify-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        Facebook
                      </button>
                    </div>
                  </motion.div>
              )}

              {/* ── STEP 2: Email verification sent ── */}
              {step === 'verify' && (
                  <motion.div key="verify" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                              className="text-center space-y-5 py-4">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
                         style={{ background: 'var(--accent-dim)' }}>
                      <Mail size={36} style={{ color: 'var(--accent)' }}/>
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold mb-2" style={{ color: 'var(--tx)' }}>Verify your email</h2>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--tx2)' }}>
                        We sent a verification link to{' '}
                        <strong style={{ color: 'var(--accent)' }}>{email}</strong>.
                        Click the link in that email to activate your account.
                      </p>
                    </div>

                    <div className="rounded-xl p-4 text-left space-y-2"
                         style={{ background: 'var(--surface2)', border: '1px solid var(--br)' }}>
                      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--tx3)' }}>What to do</p>
                      {[
                        '1. Open the email from SkinSight',
                        '2. Click "Verify my email" in the email',
                        '3. Come back here and continue to the app',
                      ].map(s => (
                          <p key={s} className="text-xs" style={{ color: 'var(--tx2)' }}>{s}</p>
                      ))}
                    </div>

                    <button onClick={() => navigate('/dashboard')}
                            className="btn-accent w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2">
                      Continue to app <ArrowRight size={14}/>
                    </button>

                    <p className="text-xs" style={{ color: 'var(--tx3)' }}>
                      Didn't receive it?{' '}
                      <button onClick={resendVerification} disabled={resending}
                              className="font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                        {resending ? 'Sending…' : 'Resend email'}
                      </button>
                    </p>
                  </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
  );
};