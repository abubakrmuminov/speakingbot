import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'neutral';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  neutral: 'ℹ',
};

const ICON_COLORS: Record<ToastType, string> = {
  success: 'text-[#34a853]',
  error: 'text-[#d93025]',
  neutral: 'text-text-secondary',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'neutral') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-[calc(56px+env(safe-area-inset-bottom,0px)+12px)] left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 w-full max-w-[480px] px-4 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="liquid-glass rounded-xl h-10 flex items-center gap-2 px-4 mx-auto w-fit max-w-full animate-fade-up"
          >
            <span className={`text-sm font-medium ${ICON_COLORS[t.type]}`}>{ICONS[t.type]}</span>
            <span className="text-[13px] text-text-primary truncate">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
