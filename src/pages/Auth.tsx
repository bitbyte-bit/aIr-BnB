import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { User as UserType } from '../types';
import PasswordInput from '../components/PasswordInput';
import { useToast } from '../components/Toast';

export default function Auth({ onLogin }: { onLogin: (user: UserType) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
    const body = isLogin ? { email, password } : { email, password, name };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (res.ok) {
        if (!isLogin) {
          // Signup - show verification message
          setVerificationSent(true);
          setError('');
        } else {
          onLogin(data);
        }
      } else {
        // Check if user needs verification
        if (data.needsVerification) {
          setError(data.error);
        } else {
          setError(data.error || 'Something went wrong');
        }
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    setResendLoading(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      
      if (res.ok) {
        setError('');
        showToast('Verification email sent! Please check your inbox.', 'success');
      } else {
        setError(data.error || 'Failed to resend verification email');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      
      if (res.ok) {
        setForgotPasswordSent(true);
      } else {
        setError(data.error || 'Failed to send reset email');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
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
          <p className="text-neutral-500 font-medium">
            {verificationSent 
              ? 'Check your email to verify your account' 
              : isLogin 
                ? 'Welcome back! Please enter your details.' 
                : 'Create an account to get started.'}
          </p>
        </div>

        {verificationSent ? (
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <CheckCircle className="w-16 h-16 text-emerald-500" />
            </div>
            <p className="text-neutral-600 mb-6">
              We've sent a verification email to <strong>{email}</strong>. 
              Please check your inbox and click the verification link to activate your account.
            </p>
            <div className="space-y-4">
              <button
                onClick={() => {
                  setVerificationSent(false);
                  setIsLogin(true);
                }}
                className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                Go to Login
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        ) : forgotPasswordSent ? (
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <CheckCircle className="w-16 h-16 text-emerald-500" />
            </div>
            <p className="text-neutral-600 mb-6">
              If an account exists with this email, you will receive a password reset link shortly.
            </p>
            <div className="space-y-4">
              <button
                onClick={() => {
                  setForgotPasswordSent(false);
                  setShowForgotPassword(false);
                  setIsLogin(true);
                }}
                className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                Back to Login
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        ) : showForgotPassword ? (
          <div className="text-center">
            <p className="text-neutral-600 mb-6">
              Enter your email address and we'll send you a link to reset your password.
            </p>
            
            {error && (
              <div className="mb-6">
                <div className="p-4 bg-red-50 text-red-600 text-sm font-medium rounded-2xl border border-red-100 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                <input
                  type="email"
                  placeholder="Email Address"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <button
                onClick={handleForgotPassword}
                disabled={loading}
                className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
                {!loading && <ArrowRight size={20} />}
              </button>

              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setError('');
                }}
                className="w-full py-3 text-neutral-500 font-semibold text-sm hover:text-emerald-600 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft size={16} />
                Back to Login
              </button>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-6">
                <div className="p-4 bg-red-50 text-red-600 text-sm font-medium rounded-2xl border border-red-100 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
                {error.includes('verify your email') && (
                  <button
                    onClick={handleResendVerification}
                    disabled={resendLoading}
                    className="mt-3 w-full py-3 text-emerald-600 font-semibold text-sm hover:underline"
                  >
                    {resendLoading ? 'Sending...' : 'Resend verification email'}
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                  <input
                    type="text"
                    placeholder="Full Name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              )}
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                <input
                  type="email"
                  placeholder="Email Address"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 z-10" size={20} />
                {!isLogin ? (
                  <div className="pt-2">
                    <PasswordInput
                      value={password}
                      onChange={setPassword}
                      placeholder="Password"
                    />
                  </div>
                ) : (
                  <input
                    type="password"
                    placeholder="Password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  />
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
                {!loading && <ArrowRight size={20} />}
              </button>
            </form>

            <div className="mt-8 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm font-semibold text-neutral-500 hover:text-emerald-600 transition-colors"
              >
                {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
              </button>
            </div>

            {isLogin && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm font-semibold text-emerald-600 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
