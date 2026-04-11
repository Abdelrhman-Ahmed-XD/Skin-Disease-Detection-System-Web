import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../services/firebase';
import toast from 'react-hot-toast';

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

  const storedEmail = sessionStorage.getItem('reset_email') || '';
  const storedOtp   = sessionStorage.getItem('reset_otp')   || '';

  useEffect(() => {
    if (!storedEmail || !storedOtp) {
      toast.error('Session expired. Please request a new reset code.');
      navigate('/forgot-password');
    }
    if (step === 'otp') inputsRef.current[0]?.focus();
  }, [step]);

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

  const verifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const entered = otp.join('');
    if (entered.length < 6) { toast.error('Enter the full 6-digit code'); return; }
    if (entered !== storedOtp) {
      toast.error('Incorrect code. Please try again.');
      setOtp(['','','','','','']);
      inputsRef.current[0]?.focus();
      return;
    }
    toast.success('Code verified!');
    setStep('newpw');
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (password !== confirm) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      // Use Firebase to send a password reset email to let them change their password
      // This is the secure path since we can't update passwords directly from frontend
      await sendPasswordResetEmail(auth, storedEmail);
      sessionStorage.removeItem('reset_otp');
      sessionStorage.removeItem('reset_email');
      toast.success('Password reset email sent! Check your inbox to complete the reset.');
      setStep('done');
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
          <div className="rounded-2xl p-8" style={{ background:'var(--surface)', border:'1px solid var(--br)' }}>
            {/* Step dots */}
            <div className="flex items-center justify-center gap-2 mb-7">
              {stepOrder.map((s,i) => (
                  <div key={s} className={`step-dot ${i <= currentIdx ? 'active' : ''}`} />
              ))}
              <span className="ml-2 text-xs font-semibold" style={{ color:'var(--tx3)' }}>{stepLabels[step]}</span>
            </div>

            <AnimatePresence mode="wait">
              {/* OTP step */}
              {step === 'otp' && (
                  <motion.div key="otp" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}>
                    <div className="text-center mb-7">
                      <h1 className="text-2xl font-extrabold" style={{ color:'var(--tx)' }}>Enter reset code</h1>
                      <p className="text-sm mt-2" style={{ color:'var(--tx2)' }}>
                        We sent a 6-digit code to <strong style={{ color:'var(--tx)' }}>{storedEmail}</strong>
                      </p>
                    </div>
                    <form onSubmit={verifyOtp} className="space-y-6">
                      <div className="flex items-center justify-center gap-2.5" onPaste={handlePaste}>
                        {otp.map((digit,i) => (
                            <input key={i} ref={el => { inputsRef.current[i] = el; }}
                                   type="text" inputMode="numeric" maxLength={1} value={digit}
                                   onChange={e => handleOtpChange(i, e.target.value)}
                                   onKeyDown={e => handleOtpKeyDown(i, e)}
                                   className="otp-box" />
                        ))}
                      </div>
                      <button type="submit" disabled={otp.join('').length < 6}
                              className="btn-accent w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                        Verify code →
                      </button>
                      <p className="text-center text-xs" style={{ color:'var(--tx3)' }}>
                        Didn't get it?{' '}
                        <Link to="/forgot-password" className="hover:underline" style={{ color:'var(--accent)' }}>
                          Resend code
                        </Link>
                      </p>
                    </form>
                  </motion.div>
              )}

              {/* New password step */}
              {step === 'newpw' && (
                  <motion.div key="newpw" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}>
                    <div className="text-center mb-7">
                      <h1 className="text-2xl font-extrabold" style={{ color:'var(--tx)' }}>Reset your password</h1>
                      <p className="text-sm mt-2" style={{ color:'var(--tx2)' }}>
                        We'll send a final reset link to <strong style={{ color:'var(--tx)' }}>{storedEmail}</strong> to complete the change.
                      </p>
                    </div>
                    <form onSubmit={handleReset} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color:'var(--tx2)' }}>New password</label>
                        <div className="relative">
                          <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color:'var(--tx3)' }} />
                          <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                                 className="input-field pr-10" placeholder="Min. 6 characters" required minLength={6} />
                          <button type="button" onClick={() => setShowPw(!showPw)}
                                  className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color:'var(--tx3)' }}>
                            {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color:'var(--tx2)' }}>Confirm password</label>
                        <div className="relative">
                          <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color:'var(--tx3)' }} />
                          <input type={showPw ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}
                                 className="input-field" placeholder="Repeat password" required />
                        </div>
                      </div>
                      <button type="submit" disabled={loading}
                              className="btn-accent w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-60">
                        {loading
                            ? <span className="spin w-4 h-4 border-2 border-current/30 border-t-current rounded-full"/>
                            : <Lock size={15}/>}
                        {loading ? 'Sending link…' : 'Reset password'}
                      </button>
                    </form>
                  </motion.div>
              )}

              {/* Done */}
              {step === 'done' && (
                  <motion.div key="done" initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
                              className="text-center space-y-5 py-4">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                         style={{ background:'var(--accent-dim)', color:'var(--accent)' }}>
                      <CheckCircle2 size={32}/>
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold mb-2" style={{ color:'var(--tx)' }}>Check your email</h2>
                      <p className="text-sm leading-relaxed" style={{ color:'var(--tx2)' }}>
                        A password reset link was sent to <strong style={{ color:'var(--tx)' }}>{storedEmail}</strong>.
                        Click it to set your new password, then sign in.
                      </p>
                    </div>
                    <button onClick={() => navigate('/login')} className="btn-accent w-full py-3 rounded-xl text-sm">
                      Go to sign in →
                    </button>
                  </motion.div>
              )}
            </AnimatePresence>

            {step !== 'done' && (
                <div className="mt-6 text-center">
                  <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                        style={{ color:'var(--tx2)' }}>
                    <ArrowLeft size={14}/> Back to sign in
                  </Link>
                </div>
            )}
          </div>
        </motion.div>
      </div>
  );
};