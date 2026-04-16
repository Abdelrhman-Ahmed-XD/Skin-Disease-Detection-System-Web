import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, ArrowLeft, Check, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import toast from 'react-hot-toast';

const pwChecks = (pw: string) => [
  { label: 'At least 8 characters',   pass: pw.length >= 8 },
  { label: 'Uppercase letter',         pass: /[A-Z]/.test(pw) },
  { label: 'Lowercase letter',         pass: /[a-z]/.test(pw) },
  { label: 'A number',                 pass: /[0-9]/.test(pw) },
  { label: 'Special character (!@#…)', pass: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw) },
];
const isPwValid = (pw: string) => pwChecks(pw).every(c => c.pass);

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

type Step = 'otp' | 'newpw' | 'done';

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [step,     setStep]     = useState<Step>('otp');
  const [otp,      setOtp]      = useState(['','','','','','']);
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // ── Timer & Resend States ──
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const storedEmail = sessionStorage.getItem('reset_email') || '';

  // Only check session on mount
  useEffect(() => {
    const email = sessionStorage.getItem('reset_email');
    const otpCode = sessionStorage.getItem('reset_otp');
    if (!email || !otpCode) {
      toast.error('Session expired. Please request a new reset code.');
      navigate('/forgot-password');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (step === 'otp') inputsRef.current[0]?.focus();
  }, [step]);

  // ── Handle Timer ──
  useEffect(() => {
    if (step !== 'otp') return;
    if (timer === 0) { setCanResend(true); return; }
    const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [timer, step]);

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

  const handleResendOtp = async () => {
    setIsResending(true);
    try {
      const flaskUrl = import.meta.env.VITE_FLASK_URL || 'http://127.0.0.1:5000';
      const newOtp = generateOTP();
      sessionStorage.setItem('reset_otp', newOtp);

      const res = await fetch(`${flaskUrl}/api/send-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: storedEmail, name: 'User', otp_code: newOtp, source: 'web' })
      });

      if (!res.ok) throw new Error('Failed to resend code');

      setTimer(60);
      setCanResend(false);
      setOtp(['','','','','','']);
      inputsRef.current[0]?.focus();
      toast.success('A new reset code has been sent!');
    } catch (error: any) {
      toast.error('Failed to resend the reset code.');
    } finally { setIsResending(false); }
  };

  const verifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const entered = otp.join('');
    const currentStoredOtp = sessionStorage.getItem('reset_otp');
    if (entered.length < 6) { toast.error('Enter the full 6-digit code'); return; }
    if (entered !== currentStoredOtp) {
      toast.error('Incorrect code. Please try again.');
      setOtp(['','','','','','']);
      inputsRef.current[0]?.focus();
      return;
    }
    toast.success('Code verified!');
    setStep('newpw');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPwValid(password)) { toast.error('Password does not meet all requirements'); return; }
    if (password !== confirm)  { toast.error('Passwords do not match'); return; }
    setLoading(true);

    // ── 🛡️ PREVENT REUSING OLD PASSWORD CHECK ──
    try {
      await signInWithEmailAndPassword(auth, storedEmail, password);
      // If it succeeds, they typed their CURRENT password!
      await auth.signOut();
      toast.error('Your new password cannot be the same as your current password.');
      setLoading(false);
      return;
    } catch (err: any) {
      if (err.code === 'auth/too-many-requests') {
        toast.error('Too many attempts. Please try again in a few minutes.');
        setLoading(false);
        return;
      }
      // 'auth/wrong-password' means the password is brand new, so we continue!
    }

    try {
      const flaskUrl = import.meta.env.VITE_FLASK_URL || 'http://127.0.0.1:5000';
      const res = await fetch(`${flaskUrl}/api/update-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: storedEmail, new_password: password }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update password');
      }

      toast.success('Password updated successfully!');

      try {
        await signInWithEmailAndPassword(auth, storedEmail, password);
        sessionStorage.removeItem('reset_otp');
        sessionStorage.removeItem('reset_email');
        navigate('/dashboard');
      } catch (loginErr) {
        setStep('done');
      }

    } catch (error: any) {
      toast.error(error.message || 'Failed to reset password');
    } finally { setLoading(false); }
  };

  const stepOrder: Step[] = ['otp','newpw','done'];
  const currentIdx = stepOrder.indexOf(step);
  const stepLabels: Record<Step,string> = { otp:'Verify code', newpw:'New password', done:'Done' };

  return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-9rem)] py-10 px-4">
        <motion.div
            initial={{ opacity:0, y:20, scale:0.97 }}
            animate={{ opacity:1, y:0, scale:1 }}
            transition={{ duration:0.4, ease:[0.22,1,0.36,1] }}
            className="w-full max-w-md"
        >
          {/* Apply responsive padding to the card from p-8 to p-5 sm:p-8 */}
          <div className="rounded-2xl p-5 sm:p-8" style={{ background:'var(--surface)', border:'1px solid var(--br)', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>

            <div className="flex items-center justify-center gap-2 mb-7">
              {stepOrder.map((s,i) => (
                  <div key={s} className={`step-dot ${i <= currentIdx ? 'active' : ''}`} />
              ))}
              <span className="ml-2 text-xs font-semibold" style={{ color:'var(--tx3)' }}>{stepLabels[step]}</span>
            </div>

            <AnimatePresence mode="wait">
              {step === 'otp' && (
                  <motion.div key="otp" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}>
                    <div className="text-center mb-7">
                      <h1 className="text-2xl font-extrabold" style={{ color:'var(--tx)' }}>Enter reset code</h1>
                      <p className="text-sm mt-2" style={{ color:'var(--tx2)' }}>
                        We sent a 6-digit code to <strong style={{ color:'var(--tx)' }}>{storedEmail}</strong>
                      </p>
                    </div>
                    <form onSubmit={verifyOtp} className="space-y-6">

                      {/* Apply responsive gap here: from gap-3 to gap-1 sm:gap-3 */}
                      <div className="flex items-center justify-center gap-1 sm:gap-3" onPaste={handlePaste}>
                        {otp.map((digit,i) => (
                            <input key={i} ref={el => { inputsRef.current[i] = el; }}
                                   type="text" inputMode="numeric" maxLength={1} value={digit}
                                   onChange={e => handleOtpChange(i, e.target.value)}
                                   onKeyDown={e => handleOtpKeyDown(i, e)}
                                   className={`w-10 sm:w-14 h-16 text-center text-2xl font-bold rounded-xl outline-none transition-all duration-200 border-2 ${
                                       digit
                                           ? 'border-[var(--accent)] shadow-[0_0_10px_var(--accent-glow)]'
                                           : 'border-[var(--br)] hover:border-[var(--accent)] focus:border-[var(--accent)] hover:shadow-[0_0_10px_var(--accent-glow)] focus:shadow-[0_0_10px_var(--accent-glow)]'
                                   }`}
                                   style={{ background: 'var(--surface2)', color: 'var(--tx)' }}
                            />
                        ))}
                      </div>

                      <div className="flex flex-col items-center justify-center mt-6 mb-2">
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

                      <button type="submit" disabled={otp.join('').length < 6}
                              className="btn-accent w-full py-3.5 rounded-xl text-base font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all duration-300">
                        Verify code →
                      </button>
                    </form>
                  </motion.div>
              )}

              {step === 'newpw' && (
                  <motion.div key="newpw" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}>
                    <div className="text-center mb-7">
                      <h1 className="text-2xl font-extrabold" style={{ color:'var(--tx)' }}>Reset your password</h1>
                      <p className="text-sm mt-2" style={{ color:'var(--tx2)' }}>
                        Set your new password below.
                      </p>
                    </div>
                    <form onSubmit={handleResetPassword} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color:'var(--tx2)' }}>New password</label>
                        <div className="relative">
                          <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color:'var(--tx3)' }} />
                          <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                                 className="input-field pr-10" placeholder="Min. 8 characters" required />
                          <button type="button" onClick={() => setShowPw(!showPw)}
                                  className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color:'var(--tx3)' }}>
                            {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                          </button>
                        </div>
                        {password.length > 0 && (
                            <div className="mt-2.5 rounded-xl p-3 space-y-1.5"
                                 style={{ background: 'var(--surface2)', border: '1px solid var(--br)' }}>
                              {pwChecks(password).map(({ label, pass }) => (
                                  <div key={label} className="flex items-center gap-2">
                                    <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0"
                                         style={{ background: pass ? '#22c55e' : 'var(--br2)' }}>
                                      {pass && <Check size={8} color="#fff"/>}
                                    </div>
                                    <span className="text-xs" style={{ color: pass ? '#22c55e' : 'var(--tx3)' }}>{label}</span>
                                  </div>
                              ))}
                            </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color:'var(--tx2)' }}>Confirm password</label>
                        <div className="relative">
                          <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color:'var(--tx3)' }} />
                          <input type={showPw ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}
                                 className="input-field" placeholder="Repeat password" required />
                        </div>
                      </div>
                      <button type="submit" disabled={loading || !isPwValid(password) || password !== confirm}
                              className="btn-accent w-full py-3.5 rounded-xl text-base font-bold flex items-center justify-center gap-2 mt-2 disabled:opacity-60 transition-all duration-300">
                        {loading
                            ? <span className="spin w-4 h-4 border-2 border-current/30 border-t-current rounded-full"/>
                            : <Lock size={15}/>}
                        {loading ? 'Updating…' : 'Reset password'}
                      </button>
                    </form>
                  </motion.div>
              )}

              {step === 'done' && (
                  <motion.div key="done" initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
                              className="text-center space-y-5 py-4">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                         style={{ background:'var(--accent-dim)', color:'var(--accent)' }}>
                      <CheckCircle2 size={32}/>
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold mb-2" style={{ color:'var(--tx)' }}>Password updated</h2>
                      <p className="text-sm leading-relaxed" style={{ color:'var(--tx2)' }}>
                        Your password has been successfully reset. You can now sign in with your new password.
                      </p>
                    </div>
                    <button onClick={() => navigate('/login')} className="btn-accent w-full py-4 rounded-xl text-base font-bold transition-all duration-300">
                      Go to sign in →
                    </button>
                  </motion.div>
              )}
            </AnimatePresence>

            {step !== 'done' && (
                <div className="mt-8 pt-4 text-center border-t" style={{ borderColor: 'var(--br2)' }}>
                  <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline transition-all duration-200"
                        style={{ color:'var(--tx3)' }}>
                    <ArrowLeft size={14}/> Back to sign in
                  </Link>
                </div>
            )}
          </div>
        </motion.div>
      </div>
  );
};