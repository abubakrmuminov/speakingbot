import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
}

export default function Header({ title, showBack, onBack, right }: HeaderProps) {
  const navigate = useNavigate();
  const canGoBack = showBack ?? window.history.length > 1;

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  return (
    <header className="sticky top-0 z-[100] h-14 px-4 flex items-center justify-between liquid-glass">
      <div className="w-10">
        {canGoBack && (
          <button type="button" onClick={handleBack} className="btn-icon" aria-label="Back">
            ←
          </button>
        )}
      </div>
      <span className="text-[13px] font-black uppercase tracking-widest text-text-primary px-2 truncate">
        {!showBack && title}
      </span>
      <div className="w-10 flex justify-end">{right ?? null}</div>
    </header>
  );
}
