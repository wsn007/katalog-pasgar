import React, { useState } from 'react';
import { X, Shield, Lock, Mail, ArrowRight, KeyRound, AlertCircle } from 'lucide-react';
import { getSupabaseClient } from '../lib/supabase';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
  onShowToast: (message: string) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onShowToast,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        // Attempt Supabase Auth login
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (authError) {
          // If Supabase failed or user is using demo account
          if (email.trim() === 'admin@pasgararifs.com' && password.trim() === 'admin123') {
            onSuccess(email.trim());
            onShowToast('Login Administrator Berhasil (Mode Akses Demo)');
            onClose();
            return;
          }
          setError(authError.message || 'Email atau password salah');
          setLoading(false);
          return;
        }

        if (data.user) {
          onSuccess(data.user.email || email.trim());
          onShowToast('Login Supabase Administrator Berhasil');
          onClose();
          return;
        }
      }

      // Local / standard demo authentication fallback
      if (
        (email.trim().toLowerCase() === 'admin@pasgararifs.com' && password.trim() === 'admin123') ||
        (email.trim().toLowerCase() === 'admin' && password.trim() === 'admin')
      ) {
        onSuccess(email.trim());
        onShowToast('Login Administrator Berhasil');
        onClose();
      } else {
        setError('Email atau password administrator tidak valid.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Terjadi kendala autentikasi. Silakan periksa kembali.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('admin@pasgararifs.com');
    setPassword('admin123');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#D71920] flex items-center justify-center text-white">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Portal Administrator</h3>
              <p className="text-xs text-slate-400">PASGAR ARIF S Restricted Area</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Administrator
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@pasgararifs.com"
                className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:border-[#D71920] focus:bg-white outline-hidden transition-all"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:border-[#D71920] focus:bg-white outline-hidden transition-all font-mono"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#D71920] hover:bg-[#99131A] text-white font-extrabold text-sm rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              <span>{loading ? 'Memverifikasi...' : 'Masuk ke Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Demo Access Button */}
          <div className="pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleFillDemo}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#D71920]" />
              <span>Gunakan Akun Evaluasi (admin@pasgararifs.com)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
