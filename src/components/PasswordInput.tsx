import React, { useState } from 'react';
import { Eye, EyeOff, Check, X } from 'lucide-react';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  name?: string;
  required?: boolean;
}

export default function PasswordInput({ value, onChange, placeholder = "Password", name = "password", required = false }: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const requirements = [
    { label: 'At least 6 characters', valid: value.length >= 6 },
    { label: 'Uppercase letter (A-Z)', valid: /[A-Z]/.test(value) },
    { label: 'Lowercase letter (a-z)', valid: /[a-z]/.test(value) },
    { label: 'Numeric character (0-9)', valid: /[0-9]/.test(value) },
  ];

  const isValid = requirements.every(r => r.valid);

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          name={name}
          required={required}
          className={`w-full px-4 py-3 pr-12 border rounded-xl focus:ring-2 outline-none transition-all ${
            value.length > 0 
              ? isValid 
                ? 'border-emerald-500 focus:ring-emerald-200' 
                : 'border-red-300 focus:ring-red-200'
              : 'border-neutral-200 focus:ring-emerald-500'
          }`}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
        >
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>

      {value.length > 0 && (
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
                <X size={14} className="text-neutral-300" />
              )}
              {req.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
