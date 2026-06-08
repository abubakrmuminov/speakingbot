import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import LottieDuck from '../components/LottieDuck';

const MENU_GROUPS = [
  {
    label: 'Progress & Data',
    items: [
      { to: '/history', icon: '📋', label: 'Session History', desc: 'Speaking & Reading logs' },
      { to: '/progress', icon: '📉', label: 'Performance', desc: 'Fluency & accuracy charts' },
      { to: '/milestones', icon: '🏆', label: 'Achievements', desc: 'Your streaks & goals' },
    ]
  },
  {
    label: 'Resources',
    items: [
      { to: '/reading', icon: '📖', label: 'Dictionary', desc: 'Academic reading practice' },
      { to: '/session', icon: '🎙', label: 'Word Activity', desc: 'Interactive speaking' },
    ]
  }
];

export default function Profile() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="space-y-8 animate-fade-up pb-8">
      {/* Profile Hero */}
      <div className="card-liquid !p-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent via-purple-500 to-accent opacity-50" />
        <div className="relative inline-block mb-4">
          {user?.photoUrl ? (
            <img src={user.photoUrl} alt="" className="w-24 h-24 rounded-full border-4 border-white shadow-xl mx-auto object-cover" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-accent text-white flex items-center justify-center text-4xl font-black shadow-xl mx-auto">
              {user?.name?.[0] ?? 'L'}
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 bg-white dark:bg-bg-subtle p-1.5 rounded-full shadow-lg border border-line">
            <LottieDuck type="hello" size={32} />
          </div>
        </div>
        <h2 className="font-serif text-2xl text-text-primary mb-1 tracking-tight">{user?.name ?? 'Learner'}</h2>
        <p className="text-[13px] text-text-secondary font-medium italic opacity-70">
          {user?.email ?? user?.telegramUsername ?? 'Enthusiastic Learner'}
        </p>
      </div>

      {/* Grouped Settings */}
      <div className="space-y-6">
        {MENU_GROUPS.map((group) => (
          <div key={group.label} className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-widest text-text-secondary px-4 opacity-60">
              {group.label}
            </p>
            <div className="bg-surface/50 border border-line rounded-[24px] overflow-hidden divide-y divide-line/30">
              {group.items.map((item) => (
                <button
                  key={item.to}
                  type="button"
                  onClick={() => navigate(item.to)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-bg-subtle active:bg-line/20"
                >
                  <span className="text-2xl">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-bold text-text-primary tracking-tight">{item.label}</div>
                    <div className="text-[12px] text-text-secondary">{item.desc}</div>
                  </div>
                  <span className="text-text-secondary opacity-40 text-lg font-serif">›</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2 px-1">
        <button 
          type="button" 
          onClick={handleLogout} 
          className="w-full py-4 px-6 rounded-2xl border-2 border-red-500/20 text-[#d93025] font-black uppercase tracking-widest text-[12px] transition-all hover:bg-red-500/5 active:scale-[0.98]"
        >
          Logout Session
        </button>
      </div>
    </div>
  );
}
