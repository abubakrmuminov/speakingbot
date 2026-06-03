import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/session', label: 'Practice', icon: '🎙' },
  { to: '/reading', label: 'Reading', icon: '📖' },
  { to: '/history', label: 'History', icon: '📋' },
  { to: '/progress', label: 'Progress', icon: '📈' },
  { to: '/milestones', label: 'Achievements', icon: '🏆' },
];

export default function Layout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Nav */}
      <header className="sticky top-0 z-50 border-b border-surface-border bg-surface/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎙</span>
            <span className="font-bold text-lg gradient-text">SpeakAI</span>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `btn-ghost text-sm flex items-center gap-2 ${isActive ? 'text-white bg-surface-elevated' : ''}`
                }
              >
                <span>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 pr-3 border-r border-surface-border hidden sm:flex">
              {user?.photoUrl ? (
                <img src={user.photoUrl} alt="" className="w-8 h-8 rounded-full border border-brand-500/30" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-surface-elevated flex items-center justify-center text-xs">
                  {user?.name?.[0] ?? 'U'}
                </div>
              )}
              <span className="text-sm text-slate-300 font-medium">{user?.name ?? 'User'}</span>
            </div>
            <button onClick={handleLogout} className="btn-ghost text-xs text-slate-400">
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 border-t border-surface-border bg-surface/90 backdrop-blur-xl z-50">
        <div className="flex">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-3 text-xs gap-1 transition-colors ${
                  isActive ? 'text-brand-400' : 'text-slate-500'
                }`
              }
            >
              <span className="text-xl">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
