'use client';
import { useState } from 'react';
import { createClient } from '../lib/supabase/client';

export default function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
}) {
  const [tab, setTab] = useState<'google' | 'email'>('google');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleGoogleLogin() {
    setError('');
    setLoading(true);
    const supabase = createClient();
    if (!supabase) {
      setError('Supabase is not configured yet. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.');
      setLoading(false);
      return;
    }

    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
      setLoading(false);
    }
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    const supabase = createClient();
    if (!supabase) {
      setError('Supabase is not configured yet. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          setMessage('Account created successfully!');
          onAuthSuccess?.();
          onClose();
        } else {
          setMessage('Confirmation email sent! Please check your inbox.');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        onAuthSuccess?.();
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-card" onClick={e => e.stopPropagation()}>
        <div className="auth-header">
          <h3>Welcome to TextFlick</h3>
          <button type="button" className="ghost" onClick={onClose} aria-label="Close modal">✕</button>
        </div>
        <p className="auth-sub">Sign in to generate full stories and track your creation quota.</p>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${tab === 'google' ? 'active' : ''}`}
            onClick={() => { setTab('google'); setError(''); }}
          >
            Google
          </button>
          <button
            type="button"
            className={`auth-tab ${tab === 'email' ? 'active' : ''}`}
            onClick={() => { setTab('email'); setError(''); }}
          >
            Email & Password
          </button>
        </div>

        {tab === 'google' && (
          <div className="auth-body">
            <button
              type="button"
              className="google-btn"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.347 2.825.957 4.039l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
              </svg>
              <span>{loading ? 'Connecting…' : 'Continue with Google'}</span>
            </button>
          </div>
        )}

        {tab === 'email' && (
          <form className="auth-body" onSubmit={handleEmailAuth}>
            <label className="auth-field">
              <span>Email address</span>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@domain.com"
              />
            </label>
            <label className="auth-field">
              <span>Password</span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </label>
            <button type="submit" className="primary" disabled={loading}>
              {loading ? 'Processing…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
            <div className="auth-switch">
              {mode === 'signin' ? (
                <span>Don't have an account? <button type="button" onClick={() => { setMode('signup'); setError(''); }}>Sign Up</button></span>
              ) : (
                <span>Already have an account? <button type="button" onClick={() => { setMode('signin'); setError(''); }}>Sign In</button></span>
              )}
            </div>
          </form>
        )}

        {error && <p className="auth-error">{error}</p>}
        {message && <p className="auth-success">{message}</p>}
      </div>
    </div>
  );
}
