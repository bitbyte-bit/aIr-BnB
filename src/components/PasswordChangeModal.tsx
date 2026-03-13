import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Loader2, Lock, Eye, EyeOff } from 'lucide-react';

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  userName: string;
}

export default function PasswordChangeModal({ isOpen, onClose, userId, userName }: PasswordChangeModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const requirements = [
    { label: 'At least 6 characters', valid: newPassword.length >= 6 },
    { label: 'Uppercase letter (A-Z)', valid: /[A-Z]/.test(newPassword) },
    { label: 'Lowercase letter (a-z)', valid: /[a-z]/.test(newPassword) },
    { label: 'Numeric character (0-9)', valid: /[0-9]/.test(newPassword) },
  ];

  const isValid = requirements.every(r => r.valid);
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValid) {
      setError('Password does not meet requirements');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/profile/${userId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        }, 2000);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to change password');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderPasswordField = (value: string, setter: (v: string) => void, field: 'current' | 'new' | 'confirm', label: string) => (
    <div className="space-y-2">
      <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative">
        <input
          type={showPasswords[field] ? "text" : "password"}
          value={value}
          onChange={(e) => setter(e.target.value)}
          placeholder={`Enter ${label.toLowerCase()}`}
          className="w-full px-4 py-3 pr-12 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
          required
        />
        <button
          type="button"
          onClick={() => setShowPasswords({ ...showPasswords, [field]: !showPasswords[field] })}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
        >
          {showPasswords[field] ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                  <Lock size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-neutral-900">Change Password</h2>
                  <p className="text-sm text-neutral-500">{userName}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-neutral-400 hover:bg-neutral-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600 text-sm font-medium flex items-center gap-2">
                  <Check size={20} />
                  Password changed successfully!
                </div>
              )}

              {renderPasswordField(currentPassword, setCurrentPassword, 'current', 'Current Password')}
              
              <div className="space-y-2">
                {renderPasswordField(newPassword, setNewPassword, 'new', 'New Password')}
                
                {newPassword.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 p-3 bg-neutral-50 rounded-xl">
                    {requirements.map((req, index) => (
                      <div 
                        key={index} 
                        className={`flex items-center gap-2 text-xs font-medium ${
                          req.valid ? 'text-emerald-600' : 'text-neutral-400'
                        }`}
                      >
                        {req.valid ? (
                          <Check size={14} className="text-emerald-500" />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full border border-neutral-300 block" />
                        )}
                        {req.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {renderPasswordField(confirmPassword, setConfirmPassword, 'confirm', 'Confirm New Password')}

              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-red-500 text-sm">Passwords do not match</p>
              )}

              <button
                type="submit"
                disabled={loading || !isValid || !passwordsMatch || !currentPassword}
                className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Changing Password...
                  </>
                ) : (
                  'Change Password'
                )}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
