import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';

export default function Landing() {
  useTheme();
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
  }, [navigate, setAuth]);

  return (
    <div className="app-shell">
      <div className="app-column min-h-screen px-4">
        <div className="flex-1 flex flex-col items-center justify-center text-center py-12 animate-fade-up">
          <span className="text-[64px] mb-6">🎙</span>
          <h1 className="font-serif text-2xl text-text-primary mb-3">
            Speak. Learn. Improve.
          </h1>
          <p className="text-[15px] text-text-secondary leading-relaxed max-w-xs mb-10">
            Practice English with an AI that corrects you in real time
          </p>

          <div className="w-full max-w-sm space-y-3 mb-8 text-left">
            {[
              { icon: '🎙', text: 'Real conversations with AI scenarios' },
              { icon: '⚡', text: 'Instant grammar & pronunciation feedback' },
              { icon: '📈', text: 'Track fluency, streaks & milestones' },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3 text-[15px] text-text-primary">
                <span>{f.icon}</span>
                {f.text}
              </div>
            ))}
          </div>

          <div className="w-full max-w-sm card">
            <h2 className="font-serif text-lg text-text-primary mb-4 text-center">Get Started</h2>
            <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-3">
              <input
                id="email"
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
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
              {error && (
                <p className="text-sm text-[#d93025] bg-red-500/5 rounded-lg px-3 py-2">{error}</p>
              )}
              <button id="login-btn" type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in / Register'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
