import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Mail, Lock, User as UserIcon, Eye, EyeOff, UserPlus, Check, ArrowRight, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const PW_CHECKS = [
  { label: 'At least 8 characters',  test: (p: string) => p.length >= 8 },
  { label: 'Uppercase letter',        test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter',        test: (p: string) => /[a-z]/.test(p) },
  { label: 'A number',                test: (p: string) => /[0-9]/.test(p) },
  { label: 'Special character (!@#…)', test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];
const isStrong = (p: string) => PW_CHECKS.every(c => c.test(p));

function generateOTP(): string { return Math.floor(100000 + Math.random() * 900000).toString(); }

type Step = 'form' | 'otp' | 'done';

export const Signup: React.FC = () => {
  const [step, setStep]         = useState<Step>('form');
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [showCf, setShowCf]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [pwTouched, setPwTouched] = useState(false);

  // ── OTP & Timer States ──
  const [otp, setOtp] = useState(['','','','','','']);
  const [serverOtp, setServerOtp] = useState('');
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const { loginWithGoogle, loginWithFacebook } = useAuth();
  const navigate = useNavigate();

  const pwResults = PW_CHECKS.map(c => ({ ...c, pass: c.test(password) }));
  const pwScore = pwResults.filter(c => c.pass).length;
  const confirmMismatch = confirm.length > 0 && password !== confirm;

  // ── Handle Timer ──
  useEffect(() => {
    if (step !== 'otp') return;
    if (timer === 0) { setCanResend(true); return; }
    const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [timer, step]);

  // ── Sends the initial OTP ──
  const handleSignupRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Please enter your name'); return; }
    if (!isStrong(password)) { toast.error('Password does not meet all requirements'); return; }
    if (password !== confirm) { toast.error('Passwords do not match'); return; }

    setLoading(true);
    try {
      const flaskUrl = import.meta.env.VITE_FLASK_URL || 'http://127.0.0.1:5000';

      // 1. Check if email exists securely via YOUR FLASK BACKEND
      const checkRes = await fetch(`${flaskUrl}/api/check-email`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
      });
      const checkData = await checkRes.json().catch(()=>({}));

      if (checkData.exists) {
        throw new Error('Email is already registered. Please sign in.');
      }

      // 2. Send OTP
      const genOtp = generateOTP();
      setServerOtp(genOtp);
      const res = await fetch(`${flaskUrl}/api/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, otp_code: genOtp, source: 'web' })
      });

      if (!res.ok) throw new Error('Failed to send verification code to this email');

      setStep('otp');
      setTimer(60);
      setCanResend(false);
      toast.success('Verification code sent to your email!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account');
    } finally { setLoading(false); }
  };

  // ── Resends the OTP ──
  const handleResendOtp = async () => {
    setIsResending(true);
    try {
      const flaskUrl = import.meta.env.VITE_FLASK_URL || 'http://127.0.0.1:5000';
      const genOtp = generateOTP();
      setServerOtp(genOtp);
      const res = await fetch(`${flaskUrl}/api/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, otp_code: genOtp, source: 'web' })
      });

      if (!res.ok) throw new Error('Failed to resend code');

      setTimer(60);
      setCanResend(false);
      setOtp(['','','','','','']); // Clear inputs
      inputsRef.current[0]?.focus();
      toast.success('A new code has been sent!');
    } catch (error: any) {
      toast.error('Failed to resend the verification code.');
    } finally { setIsResending(false); }
  };

  // ── OTP Input Handlers ──
  const handleOtpChange = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp]; next[idx] = val.slice(-1); setOtp(next);
    if (val && idx < 5) inputsRef.current[idx + 1]?.focus();
  };
  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) inputsRef.current[idx - 1]?.focus();
  };
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
    const next = [...otp]; text.split('').forEach((c,i) => { next[i] = c; }); setOtp(next);
    inputsRef.current[Math.min(text.length, 5)]?.focus();
  };

  // ── Verifies OTP and Creates Account ──
  const verifyOtpAndCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.join('').length < 6) { toast.error('Enter the full 6-digit code'); return; }
    if (otp.join('') !== serverOtp) { toast.error('Invalid verification code'); return; }

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
        isEmailVerified: true,
        createdAt:       new Date().toISOString(),
        updatedAt:       new Date().toISOString(),
      });
      setStep('done');
      toast.success('Account created successfully!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to create account');
    } finally { setLoading(false); }
  };

  const handleGoogle   = async () => { await loginWithGoogle();   navigate('/dashboard'); };
  const handleFacebook = async () => { await loginWithFacebook(); navigate('/dashboard'); };

  const barColor = pwScore <= 1 ? '#ef4444' : pwScore <= 3 ? '#f59e0b' : '#22c55e';

  return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-9rem)] py-10 px-4">
        <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-md">
          <div className="rounded-2xl p-8" style={{ background: 'var(--surface)', border: '1px solid var(--br)', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
            <AnimatePresence mode="wait">

              {/* ── FORM ── */}
              {step === 'form' && (
                  <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                    <div className="text-center mb-7">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                           style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                        <UserPlus size={22}/>
                      </div>
                      <h1 className="text-2xl font-extrabold" style={{ color: 'var(--tx)' }}>Create your account</h1>
                      <p className="text-sm mt-1.5" style={{ color: 'var(--tx2)' }}>
                        Already have one? <Link to="/login" className="font-semibold hover:underline" style={{ color: 'var(--accent)' }}>Sign in</Link>
                      </p>
                    </div>

                    <form onSubmit={handleSignupRequest} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--tx2)' }}>Full name</label>
                        <div className="relative">
                          <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--tx3)' }}/>
                          <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="Ahmed Mohamed" required/>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--tx2)' }}>Email</label>
                        <div className="relative">
                          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--tx3)' }}/>
                          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" placeholder="you@example.com" required/>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--tx2)' }}>Password</label>
                        <div className="relative">
                          <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--tx3)' }}/>
                          <input type={showPw ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setPwTouched(true); }} className="input-field pr-10" placeholder="Create a strong password" required/>
                          <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--tx3)' }}>{showPw ? <EyeOff size={15}/> : <Eye size={15}/>}</button>
                        </div>
                        {pwTouched && password.length > 0 && (
                            <div className="mt-2 space-y-2">
                              <div className="flex gap-1">
                                {[1,2,3,4,5].map(i => <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300" style={{ background: i <= pwScore ? barColor : 'var(--br2)' }}/>)}
                              </div>
                              <div className="space-y-1">
                                {pwResults.map(({ label, pass }) => (
                                    <div key={label} className="flex items-center gap-2">
                                      <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: pass ? '#22c55e' : 'var(--br2)' }}>{pass && <Check size={8} color="#fff"/>}</div>
                                      <span className="text-xs" style={{ color: pass ? '#22c55e' : 'var(--tx3)' }}>{label}</span>
                                    </div>
                                ))}
                              </div>
                            </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--tx2)' }}>Confirm password</label>
                        <div className="relative">
                          <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--tx3)' }}/>
                          <input type={showCf ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} className="input-field pr-10" style={{ borderColor: confirmMismatch ? '#ef4444' : undefined }} placeholder="Repeat password" required/>
                          <button type="button" onClick={() => setShowCf(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--tx3)' }}>{showCf ? <EyeOff size={15}/> : <Eye size={15}/>}</button>
                        </div>
                        {confirmMismatch && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>Passwords do not match</p>}
                      </div>
                      <button type="submit" disabled={loading || !isStrong(password) || password !== confirm} className="btn-accent w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-50">
                        {loading ? <span className="spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"/> : <UserPlus size={15}/>}
                        {loading ? 'Sending code…' : 'Create account'}
                      </button>
                    </form>

                    <div className="my-5 flex items-center gap-3">
                      <div className="flex-1 h-px" style={{ background: 'var(--br2)' }}/><span className="text-xs font-medium" style={{ color: 'var(--tx3)' }}>or sign up with</span><div className="flex-1 h-px" style={{ background: 'var(--br2)' }}/>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={handleGoogle} className="btn-ghost py-2.5 rounded-xl text-sm flex items-center justify-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                        Google
                      </button>
                      <button onClick={handleFacebook} className="btn-ghost py-2.5 rounded-xl text-sm flex items-center justify-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        Facebook
                      </button>
                    </div>
                  </motion.div>
              )}

              {/* ── OTP ENTRY ── */}
              {step === 'otp' && (
                  <motion.div key="otp" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}>

                    <div className="text-center mb-8">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                        <Mail size={30}/>
                      </div>
                      <h1 className="text-2xl font-extrabold" style={{ color:'var(--tx)' }}>Check your email</h1>
                      <p className="text-sm mt-2" style={{ color:'var(--tx2)' }}>
                        We sent a 6-digit verification code to <br/>
                        <strong style={{ color:'var(--tx)' }}>{email}</strong>
                      </p>
                    </div>

                    <form onSubmit={verifyOtpAndCreateAccount} className="space-y-6">
                      <div className="flex items-center justify-center gap-1.5 sm:gap-3" onPaste={handlePaste}>
                        {otp.map((digit,i) => (
                            <input key={i} ref={el => { inputsRef.current[i] = el; }}
                                   type="text" inputMode="numeric" maxLength={1} value={digit}
                                   onChange={e => handleOtpChange(i, e.target.value)}
                                   onKeyDown={e => handleOtpKeyDown(i, e)}
                                   className={`w-10 h-12 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-bold rounded-lg sm:rounded-xl outline-none transition-all duration-200 border-2 ${
                                       digit
                                           ? 'border-[var(--accent)] shadow-[0_0_8px_var(--accent-glow)]'
                                           : 'border-[var(--br)] hover:border-[var(--accent)] focus:border-[var(--accent)] hover:shadow-[0_0_8px_var(--accent-glow)] focus:shadow-[0_0_8px_var(--accent-glow)]'
                                   }`}
                                   style={{ background: 'var(--surface2)', color: 'var(--tx)' }}
                            />
                        ))}
                      </div>

                      {/* ── Beautiful Timer & Resend Section ── */}
                      <div className="flex flex-col items-center justify-center mt-6">
                        {canResend ? (
                            <button type="button" onClick={handleResendOtp} disabled={isResending}
                                    className="flex items-center gap-2 text-sm font-bold hover:underline transition-all"
                                    style={{ color: isResending ? 'var(--tx3)' : 'var(--accent)' }}>
                              <RefreshCw size={14} className={isResending ? 'animate-spin' : ''} />
                              {isResending ? 'Sending new code...' : 'Resend Code'}
                            </button>
                        ) : (
                            <p className="text-sm font-medium" style={{ color: 'var(--tx2)' }}>
                              Resend code in <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>00:{timer.toString().padStart(2, '0')}</span>
                            </p>
                        )}
                      </div>

                      <button type="submit" disabled={otp.join('').length < 6 || loading}
                              className="btn-accent w-full py-3.5 rounded-xl text-base font-bold flex items-center justify-center gap-2 mt-4 disabled:opacity-50 transition-all duration-300">
                        {loading ? <span className="spin w-5 h-5 border-2 border-current/30 border-t-current rounded-full"/> : null}
                        {loading ? 'Verifying...' : 'Verify Email'}
                      </button>

                      <div className="pt-2 text-center border-t" style={{ borderColor: 'var(--br2)' }}>
                        <button type="button" onClick={() => setStep('form')} className="text-xs font-semibold hover:underline" style={{ color:'var(--tx3)' }}>
                          Wrong email address? Go back
                        </button>
                      </div>
                    </form>
                  </motion.div>
              )}

              {/* ── DONE ── */}
              {step === 'done' && (
                  <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6 py-6">
                    <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto" style={{ background: 'rgba(34,197,94,0.1)' }}>
                      <Check size={44} color="#22c55e"/>
                    </div>
                    <div>
                      <h2 className="text-2xl font-extrabold mb-2" style={{ color: 'var(--tx)' }}>Account verified!</h2>
                      <p className="text-base leading-relaxed" style={{ color: 'var(--tx2)' }}>Your email has been verified and your account is ready to use.</p>
                    </div>
                    <button onClick={() => navigate('/dashboard')} className="btn-accent w-full py-4 rounded-xl text-base font-bold flex items-center justify-center gap-2">
                      Go to Dashboard <ArrowRight size={18}/>
                    </button>
                  </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
  );
};