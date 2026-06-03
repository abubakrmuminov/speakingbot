import React, { ReactNode } from 'react';

/**
 * Ensures the app is only accessible within the Telegram WebApp environment.
 * Shows a lock screen if accessed via a regular browser.
 */
interface TelegramGuardProps {
  children: ReactNode;
}

export default function TelegramGuard({ children }: TelegramGuardProps) {
  // Check for Telegram WebApp environment
  const isTelegram = Boolean(
    (window as any).Telegram?.WebApp?.initData &&
    (window as any).Telegram?.WebApp?.initData?.length > 0
  );

  const botUsername = import.meta.env.VITE_BOT_USERNAME || '@your_bot_username';

  if (!isTelegram && import.meta.env.PROD) {
    return (
      <div className="fixed inset-0 z-[9999] bg-surface flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-xs w-full glass p-10 rounded-3xl flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
          <div className="text-6xl animate-bounce">📱</div>
          <h1 className="text-2xl font-bold gradient-text">Telegram Only</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            This application is a specialized English Coach designed to run exclusively inside Telegram.
          </p>
          <div className="w-full bg-surface-elevated/50 p-4 rounded-xl border border-surface-border">
            <p className="text-xs text-slate-500 mb-1">Open it via our bot:</p>
            <p className="font-mono text-brand-400 font-bold">{botUsername}</p>
          </div>
          <a 
            href={`https://t.me/${botUsername.replace('@', '')}`}
            className="btn-primary w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <span>✈️</span> Open in Telegram
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
