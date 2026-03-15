import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      const email = searchParams.get('email');

      if (!token || !email) {
        setStatus('error');
        setMessage('Invalid verification link. Please check your email for the correct link.');
        return;
      }

      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, email }),
        });
        
        const data = await res.json();

        if (res.ok) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully!');
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate('/auth');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification failed. Please try again.');
        }
      } catch (err) {
        setStatus('error');
        setMessage('Network error. Please try again later.');
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-emerald-600">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl text-center"
      >
        {status === 'loading' && (
          <>
            <div className="mb-6 flex justify-center">
              <Loader2 className="w-16 h-16 text-emerald-500 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-neutral-800 mb-4">Verifying Email</h2>
            <p className="text-neutral-500">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mb-6 flex justify-center">
              <CheckCircle className="w-16 h-16 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-neutral-800 mb-4">Email Verified!</h2>
            <p className="text-neutral-500 mb-6">{message}</p>
            <p className="text-sm text-neutral-400">Redirecting to login...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mb-6 flex justify-center">
              <AlertCircle className="w-16 h-16 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-neutral-800 mb-4">Verification Failed</h2>
            <p className="text-neutral-500 mb-6">{message}</p>
            <button
              onClick={() => navigate('/auth')}
              className="py-3 px-6 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all"
            >
              Go to Login
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
