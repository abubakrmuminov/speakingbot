import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';
import LottieDuck from '../components/LottieDuck';


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
    <div className="app-shell overflow-hidden">
      <div className="app-column min-h-screen px-6 relative">
        {/* Background Decorative Blur */}
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-accent/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="flex-1 flex flex-col items-center justify-center text-center py-12 animate-fade-up relative z-10">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-full scale-75 animate-pulse" />
            <LottieDuck type="hello" size={240} className="relative z-10" />
          </div>

          <div className="space-y-4 mb-10">
            <h1 className="font-serif text-[38px] font-black text-text-primary tracking-tight leading-[1.1]">
              Grow with <span className="text-accent underline decoration-4 decoration-accent/20 underline-offset-4">Word</span>
            </h1>
            <p className="text-[15px] font-medium text-text-secondary leading-relaxed max-w-[280px] mx-auto opacity-80">
              Your personal AI professor for English fluency and pronunciation.
            </p>
          </div>

          <div className="w-full max-w-sm grid grid-cols-1 gap-3 mb-10 text-left">
            {[
              { icon: '🎙', t: 'Real AI Scenarios', d: 'Natural conversations' },
              { icon: '⚡', t: 'Instant Phonics', d: 'Visual feedback' },
              { icon: '🏆', t: 'Streak System', d: 'Daily milestones' },
            ].map((f) => (
              <div key={f.t} className="flex items-center gap-4 p-4 rounded-2xl bg-surface/40 border border-line backdrop-blur-md">
                <span className="text-2xl">{f.icon}</span>
                <div className="flex-1">
                   <h4 className="text-[13px] font-black uppercase tracking-widest text-text-primary">{f.t}</h4>
                   <p className="text-[11px] text-text-secondary font-bold uppercase opacity-60">{f.d}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="w-full max-w-sm card-liquid !p-8 shadow-2xl relative border-t-2 border-white/50">
            <h2 className="font-serif text-xl font-black text-text-primary mb-6">Enter the Classroom</h2>
            <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary px-2 opacity-70">Email Address</label>
                <input
                  id="email"
                  type="email"
                  className="input !rounded-2xl !py-4"
                  placeholder="name@university.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1 text-left">
                 <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary px-2 opacity-70">Password</label>
                <input
                  id="password"
                  type="password"
                  className="input !rounded-2xl !py-4"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              {error && (
                <p className="text-[12px] font-bold text-[#d93025] bg-red-500/5 rounded-xl px-4 py-3 border border-red-500/10 italic">
                  ⚠️ {error}
                </p>
              )}
              <button id="login-btn" type="submit" className="btn-primary !py-4 shadow-lg shadow-accent/20" disabled={loading}>
                {loading ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Preparing Module...</span>
                  </div>
                ) : 'Begin Journey →'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
