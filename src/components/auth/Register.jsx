import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, Mail, Lock, User, Loader2, AlertCircle } from 'lucide-react';

export default function Register({ onSwitchToLogin }) {
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!displayName || !email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setError('');
      setLoading(true);
      await register(email, password, displayName);
    } catch (err) {
      setError(err.message || 'Failed to create an account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-android text-white flex flex-col items-center justify-center p-4">
      {/* App Logo & Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/10 border border-white/20 text-white mb-4 shadow-2xl backdrop-blur-md">
          <MessageSquare className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Create Account</h1>
        <p className="text-white/80 text-sm mt-1">Sign up for Chatting Web</p>
      </div>

      {/* Android GlassCard (28px radius) */}
      <div className="glass-card-android p-8 max-w-md w-full shadow-2xl">
        {error && (
          <div className="mb-4 p-3 bg-[#EF4444]/20 border border-[#EF4444]/40 rounded-xl flex items-center gap-2 text-white text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#EF4444]" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1.5">Display Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-white/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="John Doe"
                className="w-full bg-[#0F172A]/80 border border-white/15 rounded-2xl py-3 pl-10 pr-4 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#5865F2] transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-white/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-[#0F172A]/80 border border-white/15 rounded-2xl py-3 pl-10 pr-4 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#5865F2] transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-white/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full bg-[#0F172A]/80 border border-white/15 rounded-2xl py-3 pl-10 pr-4 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#5865F2] transition"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-3.5 rounded-2xl transition flex items-center justify-center text-sm shadow-xl shadow-[#5865F2]/30 disabled:opacity-50 mt-4"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'REGISTER'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-white/80">
          Already have an account?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-white hover:underline font-bold"
          >
            Log In
          </button>
        </div>
      </div>
    </div>
  );
}
