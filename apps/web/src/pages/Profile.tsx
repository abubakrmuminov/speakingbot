import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const MENU = [
  { to: '/history', icon: '📋', label: 'History', desc: 'Past speaking & reading sessions' },
  { to: '/progress', icon: '📈', label: 'Progress', desc: 'Fluency charts & activity' },
  { to: '/milestones', icon: '🏆', label: 'Milestones', desc: 'Achievements & streaks' },
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
    <div className="space-y-6">
      <div className="flex items-center gap-4 py-2">
        {user?.photoUrl ? (
          <img src={user.photoUrl} alt="" className="w-14 h-14 rounded-full border border-line" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-bg-subtle flex items-center justify-center text-xl font-medium text-text-secondary">
            {user?.name?.[0] ?? 'U'}
          </div>
        )}
        <div>
          <h2 className="font-serif text-xl text-text-primary">{user?.name ?? 'Learner'}</h2>
          <p className="text-[13px] text-text-secondary">{user?.email ?? user?.telegramUsername ?? ''}</p>
        </div>
      </div>

      <div className="divider" />

      <div>
        {MENU.map((item) => (
          <button
            key={item.to}
            type="button"
            onClick={() => navigate(item.to)}
            className="list-item w-full flex items-center gap-4 text-left"
          >
            <span className="text-2xl">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-medium text-text-primary">{item.label}</div>
              <div className="text-[12px] text-text-secondary">{item.desc}</div>
            </div>
            <span className="text-text-secondary">›</span>
          </button>
        ))}
      </div>

      <button type="button" onClick={handleLogout} className="btn-secondary">
        Sign out
      </button>
    </div>
  );
}
