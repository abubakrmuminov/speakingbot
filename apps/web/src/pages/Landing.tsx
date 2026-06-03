import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useEffect } from 'react';

export default function Landing() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.auth.email(email, password);
      setAuth({ accessToken: res.accessToken, refreshToken: res.refreshToken }, res.user as any);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initData = (window as any).Telegram?.WebApp?.initData;
    if (initData && !useAuthStore.getState().accessToken) {
      setLoading(true);
      api.auth.telegram(initData)
        .then((res: any) => {
          setAuth({ accessToken: res.accessToken, refreshToken: res.refreshToken }, res.user as any);
          navigate('/dashboard');
        })
        .catch((err) => {
          console.error('Auto-login failed:', err);
          setError('Telegram authentication failed');
        })
        .finally(() => setLoading(false));
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto animate-fade-up">
          <div className="inline-flex items-center gap-2 badge badge-blue mb-6 text-sm px-4 py-1.5">
            <span>🤖</span>
            <span>Powered by Gemini 2.5 Flash</span>
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight mb-6">
            Master <span className="gradient-text">English Speaking</span>
            <br />
            with AI Coaching
          </h1>

          <p className="text-xl text-slate-400 mb-10 max-w-lg mx-auto">
            Record yourself speaking, get instant error analysis, track your fluency progress — all in one place.
          </p>

          <div className="grid sm:grid-cols-3 gap-4 mb-16 text-left">
            {[
              { icon: '🎙', title: 'Real Conversations', desc: 'Debate, interviews, cafe chats — immersive AI scenarios' },
              { icon: '⚡', title: 'Instant Feedback', desc: 'Grammar corrections with Russian explanations in seconds' },
              { icon: '📈', title: 'Track Progress', desc: 'Fluency scores, streak, error patterns — see yourself improve' },
            ].map((f) => (
              <div key={f.title} className="card text-left">
                <div className="text-2xl mb-2">{f.icon}</div>
                <div className="font-semibold text-white mb-1">{f.title}</div>
                <div className="text-sm text-slate-400">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Auth form */}
        <div className="relative z-10 w-full max-w-sm animate-fade-up delay-200">
          <div className="card">
            <h2 className="text-xl font-bold mb-6 text-center">Get Started Free</h2>
            <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Email</label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Password</label>
                <input
                  id="password"
                  type="password"
                  className="input"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
              )}
              <button
                id="login-btn"
                type="submit"
                className="btn-primary w-full"
                disabled={loading}
              >
                {loading ? 'Signing in…' : 'Sign in / Register'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
