import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Lock, ArrowRight, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PasswordInput from '../components/PasswordInput';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying reset link...');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    if (!token || !email) {
      setStatus('error');
      setMessage('Invalid reset link. Please request a new password reset.');
    } else {
      setStatus('success');
      setMessage('Enter your new password below.');
    }
  }, [token, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, newPassword: password }),
      });
      
      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setMessage(data.message || 'Password reset successfully!');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/auth');
        }, 3000);
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (err) {
      setError('Network error. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-emerald-600">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl"
      >
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black tracking-tighter text-emerald-600 mb-2">Vitu</h1>
          <p className="text-neutral-500 font-medium">Reset your password</p>
        </div>

        {status === 'loading' && (
          <>
            <div className="mb-6 flex justify-center">
              <Loader2 className="w-16 h-16 text-emerald-500 animate-spin" />
            </div>
            <p className="text-center text-neutral-500">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mb-6 flex justify-center">
              <AlertCircle className="w-16 h-16 text-red-500" />
            </div>
            <p className="text-center text-neutral-500 mb-6">{message}</p>
            <button
              onClick={() => navigate('/auth')}
              className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
            >
              Go to Login
            </button>
          </>
        )}

        {status === 'success' && token && email && (
          <>
            <div className="mb-6 flex justify-center">
              <CheckCircle className="w-16 h-16 text-emerald-500" />
            </div>
            <p className="text-center text-neutral-500 mb-6">{message}</p>

            {message.includes('successfully') ? (
              <p className="text-center text-sm text-neutral-400">Redirecting to login...</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-4 bg-red-50 text-red-600 text-sm font-medium rounded-2xl border border-red-100 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">New Password</label>
                  <PasswordInput
                    value={password}
                    onChange={setPassword}
                    placeholder="Enter new password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 z-10" size={20} />
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? 'Resetting...' : 'Reset Password'}
                  {!isSubmitting && <ArrowRight size={20} />}
                </button>
              </form>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
