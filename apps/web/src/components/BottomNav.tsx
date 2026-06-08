import { NavLink, useLocation } from 'react-router-dom';

const NAV = [
  { to: '/dashboard', label: 'Explore', icon: '🧭' },
  { to: '/reading', label: 'Dictionary', icon: '📖' },
  { to: '/session', label: 'Word', icon: '🎙' },
  { to: '/profile', label: 'Settings', icon: '⚙️' },
];

export default function BottomNav() {
  const { pathname } = useLocation();

  const isActive = (to: string) => {
    if (to === '/dashboard') return pathname === '/dashboard';
    if (to === '/profile') {
      return ['/profile', '/history', '/progress', '/milestones'].includes(pathname);
    }
    return pathname.startsWith(to);
  };

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-[100] liquid-glass border-t-0"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex h-14">
        {NAV.map((item) => {
          const active = isActive(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="flex-1 flex flex-col items-center justify-center gap-0.5"
            >
              <span className={`text-xl leading-none ${active ? 'text-accent' : 'text-text-secondary'}`}>
                {item.icon}
              </span>
              <span className={`text-[10px] ${active ? 'text-accent font-medium' : 'text-text-secondary'}`}>
                {item.label}
              </span>
              {active && <span className="w-1 h-1 rounded-full bg-accent -mt-0.5" />}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
