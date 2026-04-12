import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send } from 'lucide-react';
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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error('Please enter your email'); return; }
    setLoading(true);
    try {
      const flaskUrl = import.meta.env.VITE_FLASK_URL || 'http://127.0.0.1:5000';

      // 1. Check if email exists first
      const checkRes = await fetch(`${flaskUrl}/api/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const checkData = await checkRes.json().catch(() => ({}));

      if (!checkData.exists) {
        throw new Error('No account found with this email address.');
      }

      // 2. Generate and send OTP
      const otp = generateOTP();
      sessionStorage.setItem('reset_otp',   otp);
      sessionStorage.setItem('reset_email', email);

      const res = await fetch(`${flaskUrl}/api/send-password-reset`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, name: 'User', otp_code: otp }),
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

  return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-9rem)] py-10 px-4">
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md"
        >
          <div className="rounded-2xl p-8" style={{ background: 'var(--surface)', border: '1px solid var(--br)' }}>
            <AnimatePresence mode="wait">
              {step === 'email' && (
                  <motion.div key="email" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="text-center mb-7">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                           style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                        <Mail size={22} />
                      </div>
                      <h1 className="text-2xl font-extrabold" style={{ color: 'var(--tx)' }}>Forgot your password?</h1>
                      <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--tx2)' }}>
                        Enter your email and we'll send a 6-digit code to reset your password.
                      </p>
                    </div>
                    <form onSubmit={handleSend} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--tx2)' }}>Email address</label>
                        <div className="relative">
                          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--tx3)' }} />
                          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                 className="input-field" placeholder="you@example.com" required />
                        </div>
                      </div>
                      <button type="submit" disabled={loading}
                              className="btn-accent w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                        {loading
                            ? <span className="spin w-4 h-4 border-2 border-current/30 border-t-current rounded-full" />
                            : <Send size={15} />}
                        {loading ? 'Sending…' : 'Send reset code'}
                      </button>
                    </form>
                  </motion.div>
              )}

              {step === 'sent' && (
                  <motion.div key="sent" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-5">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                         style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                      <Send size={28} />
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold mb-2" style={{ color: 'var(--tx)' }}>Check your inbox</h2>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--tx2)' }}>
                        We sent a 6-digit code to <strong style={{ color: 'var(--tx)' }}>{email}</strong>.
                        Enter it on the next page to reset your password.
                      </p>
                    </div>
                    <Link to="/reset-password"
                          className="btn-accent w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2">
                      Enter reset code →
                    </Link>
                    <button onClick={() => setStep('email')} className="text-sm hover:underline" style={{ color: 'var(--tx3)' }}>
                      Didn't receive it? Try again
                    </button>
                  </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-6 text-center">
              <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                    style={{ color: 'var(--tx2)' }}>
                <ArrowLeft size={14} /> Back to sign in
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
  );
};