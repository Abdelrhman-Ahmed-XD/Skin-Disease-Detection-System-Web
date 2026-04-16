import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

type Step = 'email' | 'sent';

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const ForgotPassword: React.FC = () => {
  const [step, setStep]       = useState<Step>('email');
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error('Please enter your email'); return; }
    setLoading(true);
    try {
      const flaskUrl = import.meta.env.VITE_FLASK_URL || 'http://127.0.0.1:5000';

      // 1. Check if email exists using YOUR FLASK BACKEND
      const checkRes = await fetch(`${flaskUrl}/api/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const checkData = await checkRes.json().catch(() => ({}));

      if (!checkData.exists) {
        throw new Error('No account found with this email address.');
      }

      // 2. Generate and send OTP
      const otp = generateOTP();
      sessionStorage.setItem('reset_otp',   otp);
      sessionStorage.setItem('reset_email', email.trim());

      const res = await fetch(`${flaskUrl}/api/send-password-reset`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim(), name: 'User', otp_code: otp, source: 'web' }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to send reset email');
      }

      toast.success('Reset code sent! Check your inbox.');
      setStep('sent');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send email. Is the backend running?');
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      const flaskUrl = import.meta.env.VITE_FLASK_URL || 'http://127.0.0.1:5000';
      const newOtp = generateOTP();
      sessionStorage.setItem('reset_otp', newOtp);

      const res = await fetch(`${flaskUrl}/api/send-password-reset`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim(), name: 'User', otp_code: newOtp, source: 'web' }),
      });

      if (!res.ok) throw new Error('Failed to resend reset email');

      toast.success('A new reset code has been sent!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend email.');
    } finally { setIsResending(false); }
  };

  return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-9rem)] py-10 px-4">
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md"
        >
          <div className="rounded-2xl p-8" style={{ background: 'var(--surface)', border: '1px solid var(--br)', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
            <AnimatePresence mode="wait">
              {step === 'email' && (
                  <motion.div key="email" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="text-center mb-7">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                           style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                        <Mail size={30} />
                      </div>
                      <h1 className="text-2xl font-extrabold" style={{ color: 'var(--tx)' }}>Forgot password?</h1>
                      <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--tx2)' }}>
                        Enter your email and we'll send a 6-digit code to reset your password.
                      </p>
                    </div>
                    <form onSubmit={handleSendEmail} className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--tx2)' }}>Email address</label>
                        <div className="relative">
                          <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--tx3)' }} />

                          <input
                              type="email"
                              value={email}
                              onChange={e => setEmail(e.target.value)}
                              className="w-full pl-12 pr-4 py-4 rounded-xl text-base font-medium outline-none transition-all duration-300 border-2"
                              style={{
                                background: 'var(--surface2)',
                                color: 'var(--tx)',
                                borderColor: 'var(--br)',
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = 'var(--accent)';
                                e.target.style.boxShadow = '0 0 12px var(--accent-glow)';
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = 'var(--br)';
                                e.target.style.boxShadow = 'none';
                              }}
                              placeholder="you@example.com"
                              required
                          />
                        </div>
                      </div>
                      <button type="submit" disabled={loading || !email}
                              className="btn-accent w-full py-4 rounded-xl text-base font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition-all duration-300">
                        {loading
                            ? <span className="spin w-5 h-5 border-2 border-current/30 border-t-current rounded-full" />
                            : <Send size={18} />}
                        {loading ? 'Sending code…' : 'Send reset code'}
                      </button>
                    </form>
                  </motion.div>
              )}

              {step === 'sent' && (
                  <motion.div key="sent" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-6">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                         style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                      <Send size={30} />
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold mb-2" style={{ color: 'var(--tx)' }}>Check your inbox</h2>
                      <p className="text-base leading-relaxed" style={{ color: 'var(--tx2)' }}>
                        We sent a 6-digit code to <br/>
                        <strong style={{ color: 'var(--tx)' }}>{email}</strong>.
                      </p>
                    </div>

                    <Link to="/reset-password"
                          className="btn-accent w-full py-4 rounded-xl text-base font-bold flex items-center justify-center gap-2 transition-all duration-300">
                      Enter reset code →
                    </Link>

                    <div className="flex flex-col items-center justify-center mt-4">
                      <button onClick={handleResend} disabled={isResending}
                              className="flex items-center gap-2 text-sm font-bold hover:underline transition-all"
                              style={{ color: isResending ? 'var(--tx3)' : 'var(--accent)' }}>
                        <RefreshCw size={14} className={isResending ? 'animate-spin' : ''} />
                        {isResending ? 'Sending new code...' : "Didn't receive it? Try again"}
                      </button>
                    </div>
                  </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-8 pt-6 text-center border-t" style={{ borderColor: 'var(--br2)' }}>
              <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline transition-all duration-200"
                    style={{ color: 'var(--tx3)' }}>
                <ArrowLeft size={14} /> Back to sign in
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
  );
};