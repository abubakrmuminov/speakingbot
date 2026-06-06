import { type ReactNode } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useToast } from './Toast';

interface TelegramGuardProps {
  children: ReactNode;
}

export default function TelegramGuard({ children }: TelegramGuardProps) {
  useTheme();
  const { showToast } = useToast();

  const isTelegram = Boolean(
    (window as any).Telegram?.WebApp?.initData &&
    (window as any).Telegram?.WebApp?.initData?.length > 0,
  );

  const botUsername = import.meta.env.VITE_BOT_USERNAME || '@your_bot_username';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(botUsername);
    showToast('Copied!', 'success');
  };

  if (!isTelegram && import.meta.env.PROD) {
    return (
      <div className="app-shell min-h-screen">
        <div className="app-column min-h-screen flex flex-col items-center justify-center px-6 text-center">
          <span className="text-[64px] mb-6">📱</span>
          <h1 className="font-serif text-[22px] text-text-primary mb-3">Open in Telegram</h1>
          <p className="text-[15px] text-text-secondary leading-relaxed max-w-xs mb-8">
            This app only works inside Telegram Mini App
          </p>
          <p className="text-[13px] text-text-secondary mb-1">Find the bot:</p>
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="text-[15px] text-accent font-medium mb-8"
          >
            {botUsername}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
