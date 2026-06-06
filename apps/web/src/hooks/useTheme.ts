import { useEffect } from 'react';

type ColorScheme = 'light' | 'dark';

function getTelegramScheme(): ColorScheme {
  const scheme = (window as any).Telegram?.WebApp?.colorScheme;
  return scheme === 'dark' ? 'dark' : 'light';
}

export function useTheme() {
  useEffect(() => {
    const apply = () => {
      document.documentElement.setAttribute('data-theme', getTelegramScheme());
    };

    apply();

    const tg = (window as any).Telegram?.WebApp;
    tg?.onEvent?.('themeChanged', apply);

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onMq = () => {
      if (!tg?.colorScheme) apply();
    };
    mq.addEventListener('change', onMq);

    return () => {
      tg?.offEvent?.('themeChanged', apply);
      mq.removeEventListener('change', onMq);
    };
  }, []);
}
