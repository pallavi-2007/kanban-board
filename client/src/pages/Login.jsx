import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Kanban, Eye, EyeOff, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/boards');
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to login. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-brand-bg">
      {/* Left Hero Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-navy text-white flex-col justify-between p-12 relative overflow-hidden select-none">
        {/* Subtle background glow */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-brand-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <Kanban className="w-6 h-6" />
          </div>
          <span className="font-bold text-xl tracking-tight">KanbanBoard</span>
        </div>

        {/* Hero Message */}
        <div className="max-w-md space-y-4 relative z-10">
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
            Plan. Organize. <br />
            <span className="text-indigo-400">Achieve Together.</span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed">
            Create boards, manage tasks, assign members and get things done — all in real time.
          </p>

          <div className="pt-4 space-y-2.5 text-sm text-slate-300">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Real-time instant synchronization</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>AI task breakdown powered by Gemini</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Fluid drag and drop Kanban workflow</span>
            </div>
          </div>
        </div>

        {/* Demo Seed Shortcut Reminder */}
        <div className="p-4 rounded-xl bg-brand-navy-light/70 border border-brand-navy-border relative z-10">
          <p className="text-xs text-slate-400 font-medium">
            Demo account: <span className="text-indigo-300 font-mono">priya@demo.com</span> /{' '}
            <span className="text-indigo-300 font-mono">Password123</span>
          </p>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div>
            <div className="flex items-center gap-2 lg:hidden mb-6">
              <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center text-white">
                <Kanban className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg text-brand-text">KanbanBoard</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-brand-text tracking-tight">
              Welcome back!
            </h2>
            <p className="mt-2 text-sm text-brand-text-secondary">
              Log in to your account to access your boards.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text-secondary mb-2">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white text-brand-text placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-colors text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text-secondary mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white text-brand-text placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-colors text-sm pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold text-sm shadow-sm shadow-indigo-500/30 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Login</span>
              )}
            </button>
          </form>

          <div className="text-center pt-2">
            <p className="text-sm text-brand-text-secondary">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-semibold text-brand-primary hover:text-brand-primary-hover transition-colors"
              >
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
